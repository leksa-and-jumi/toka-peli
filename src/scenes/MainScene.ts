import Phaser from 'phaser';
import {
  COLORS,
  CREATURE,
  CREATURE_COLOURS,
  ERASER_WIDTH,
  FLOOR_THICKNESS,
  FLOOR_Y,
  GAME_HEIGHT,
  GAME_WIDTH,
  HELP_TEXT,
  HINT_TEXT,
  PEN_MAX_PIECE,
  PEN_MIN_STEP,
  PEN_WIDTH,
  PICTURE_REACH,
  SOLID_CELL,
  TOOL_BUTTON,
} from '../config';
import { eraseFromBody } from '../logic/bodyErase';
import { creatureColour } from '../logic/colours';
import {
  type Creature,
  type CreatureRules,
  type CreatureSize,
  stepCreature,
} from '../logic/creature';
import { type Point, shouldDrawTo } from '../logic/drawing';
import {
  boundsOf,
  eraseAlong,
  lastPicture,
  type Segment,
  splitSegment,
  type Stroke,
  toLocal,
} from '../logic/sketch';
import { SolidGrid } from '../logic/solidGrid';
import { type Tool, toggleTool, toolLabel } from '../logic/tool';

interface LivingDrawing {
  state: Creature;
  size: CreatureSize;
  /** Its lines, measured from its feet. */
  strokes: Stroke[];
  colour: number;
  art: Phaser.GameObjects.Graphics;
  body: Phaser.GameObjects.Container;
}

const RULES: CreatureRules = {
  walkSpeed: CREATURE.walkSpeed,
  gravity: CREATURE.gravity,
  maxStep: CREATURE.maxStep,
  collisionHeight: CREATURE.collisionHeight,
  worldWidth: GAME_WIDTH,
};

/**
 * Every line drawn is a bridge. Press K and the newest picture comes alive
 * and walks along the bridges. P or the corner button switches to the eraser.
 */
export class MainScene extends Phaser.Scene {
  private pen!: Phaser.GameObjects.Graphics;
  private strokes: Stroke[] = [];
  private lastPenPoint: Point | null = null;
  private readonly solid = new SolidGrid(GAME_WIDTH, GAME_HEIGHT, SOLID_CELL, FLOOR_Y);
  private living: LivingDrawing[] = [];
  /** How many drawings have woken up so far; picks the next colour. */
  private wokenCount = 0;
  private hint!: Phaser.GameObjects.Text;
  private tool: Tool = 'pen';
  private toolButton!: Phaser.GameObjects.Text;
  private eraserRing!: Phaser.GameObjects.Graphics;

  constructor() {
    super('MainScene');
  }

  create(): void {
    this.add.rectangle(0, FLOOR_Y, GAME_WIDTH, FLOOR_THICKNESS, COLORS.floor).setOrigin(0, 0);
    this.pen = this.add.graphics();
    this.setUpDrawing();

    this.add
      .text(
        GAME_WIDTH / 2,
        HELP_TEXT.y,
        'Piirrä siltoja ja ukko. K = ukko herää, P = kumi, S = pyyhi kaikki',
        {
          fontSize: HELP_TEXT.fontSize,
          color: COLORS.text,
        },
      )
      .setOrigin(0.5);
    this.hint = this.add
      .text(GAME_WIDTH / 2, HINT_TEXT.y, 'Piirrä ensin ukko! ✏️', {
        fontSize: HINT_TEXT.fontSize,
        color: COLORS.text,
      })
      .setOrigin(0.5)
      .setVisible(false);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is not available');
    }
    keyboard.on('keydown-K', () => this.wakeUp());
    keyboard.on('keydown-P', () => this.switchTool());
    keyboard.on('keydown-S', () => this.clearAll());

    this.toolButton = this.add
      .text(TOOL_BUTTON.x, TOOL_BUTTON.y, toolLabel(this.tool), {
        fontSize: TOOL_BUTTON.fontSize,
        color: COLORS.text,
      })
      .setOrigin(1, 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.switchTool());

    // Shows how big the eraser is, since the mouse arrow is hidden while erasing.
    this.eraserRing = this.add.graphics().setVisible(false);
    this.eraserRing.lineStyle(2, COLORS.eraserRing);
    this.eraserRing.strokeCircle(0, 0, ERASER_WIDTH / 2);
  }

  update(time: number, delta: number): void {
    const seconds = delta / 1000;
    for (const drawing of this.living) {
      const before = drawing.state;
      drawing.state = stepCreature(before, drawing.size, RULES, this.solid, seconds);
      const { x, y, dir, fallSpeed } = drawing.state;
      const walking = fallSpeed === 0 && x !== before.x;
      const swing = walking ? Math.sin(time * CREATURE.wobblePerMs) : 0;
      drawing.body.setPosition(x, y - Math.abs(swing) * CREATURE.hopHeight);
      drawing.body.setAngle(swing * CREATURE.wobbleDegrees);
      drawing.body.setScale(dir, 1);
    }
  }

  private setUpDrawing(): void {
    this.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        // Clicking the tool button must not draw.
        if (over.includes(this.toolButton)) return;
        this.lastPenPoint = { x: pointer.x, y: pointer.y };
        if (this.tool === 'pen') this.strokes.push([]);
        // A single click leaves a dot (or wipes one spot).
        this.useTool({ from: this.lastPenPoint, to: this.lastPenPoint });
      },
    );
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const next = { x: pointer.x, y: pointer.y };
      this.eraserRing.setPosition(next.x, next.y);
      if (!pointer.isDown || !this.lastPenPoint) return;
      if (!shouldDrawTo(this.lastPenPoint, next, PEN_MIN_STEP)) return;
      this.useTool({ from: this.lastPenPoint, to: next });
      this.lastPenPoint = next;
    });
    const stopDrawing = (): void => {
      this.lastPenPoint = null;
    };
    this.input.on('pointerup', stopDrawing);
    this.input.on('pointerupoutside', stopDrawing);
  }

  private useTool(path: Segment): void {
    if (this.tool === 'pen') {
      this.drawSegment(path);
      return;
    }
    const left = eraseAlong(this.strokes, path, ERASER_WIDTH / 2);
    if (left) {
      this.strokes = left;
      this.redrawBridges();
    }
    this.eraseLiving(path);
  }

  /** The eraser also wipes living drawings; one wiped away completely disappears. */
  private eraseLiving(path: Segment): void {
    this.living = this.living.filter((drawing) => {
      const cut = eraseFromBody(
        drawing.strokes,
        path,
        ERASER_WIDTH / 2,
        PEN_WIDTH / 2,
        drawing.state,
      );
      if (cut === null) return true;
      if (cut === 'gone') {
        drawing.body.destroy();
        return false;
      }
      drawing.strokes = cut.strokes;
      drawing.size = cut.size;
      drawing.state = {
        ...drawing.state,
        x: drawing.state.x + cut.feetShift.x,
        y: drawing.state.y + cut.feetShift.y,
      };
      drawing.art.clear();
      paintStrokes(drawing.art, cut.strokes, drawing.colour);
      return true;
    });
  }

  private switchTool(): void {
    this.tool = toggleTool(this.tool);
    this.toolButton.setText(toolLabel(this.tool));
    const erasing = this.tool === 'eraser';
    this.eraserRing.setVisible(erasing);
    this.input.setDefaultCursor(erasing ? 'none' : 'default');
  }

  private drawSegment(segment: Segment): void {
    for (const piece of splitSegment(segment, PEN_MAX_PIECE)) {
      this.strokes[this.strokes.length - 1]?.push(piece);
      paintSegment(this.pen, piece, COLORS.pen);
      this.solid.stamp(piece, PEN_WIDTH / 2);
    }
  }

  /** Turn the newest picture into a living drawing; the other lines stay bridges. */
  private wakeUp(): void {
    const picked = lastPicture(this.strokes, PICTURE_REACH);
    const pictureStrokes = picked.map((index) => this.strokes[index] ?? []);
    const bounds = boundsOf(pictureStrokes.flat(), PEN_WIDTH / 2);
    if (!bounds) {
      this.showHint();
      return;
    }
    // The body turns around its feet: the middle of its bottom edge.
    const feet = { x: (bounds.left + bounds.right) / 2, y: bounds.bottom };
    const strokes = pictureStrokes.map((stroke) => toLocal(stroke, feet));
    const colour = creatureColour(this.wokenCount, CREATURE_COLOURS);
    this.wokenCount += 1;
    const art = this.add.graphics();
    paintStrokes(art, strokes, colour);
    this.living.push({
      state: { x: feet.x, y: feet.y, fallSpeed: 0, dir: 1 },
      size: { halfWidth: (bounds.right - bounds.left) / 2, height: bounds.bottom - bounds.top },
      strokes,
      colour,
      art,
      body: this.add.container(feet.x, feet.y, [art]),
    });

    this.strokes = this.strokes.filter((_, index) => !picked.includes(index));
    this.redrawBridges();
  }

  /** Wipe everything: all lines, bridges and living drawings. */
  private clearAll(): void {
    for (const drawing of this.living) {
      drawing.body.destroy();
    }
    this.living = [];
    this.strokes = [];
    this.lastPenPoint = null;
    this.redrawBridges();
  }

  /** Paint the bridges again and remember where they are. */
  private redrawBridges(): void {
    this.pen.clear();
    this.solid.clear();
    for (const segment of this.strokes.flat()) {
      paintSegment(this.pen, segment, COLORS.pen);
      this.solid.stamp(segment, PEN_WIDTH / 2);
    }
  }

  private showHint(): void {
    this.hint.setVisible(true);
    this.time.delayedCall(HINT_TEXT.showMs, () => this.hint.setVisible(false));
  }
}

function paintStrokes(
  graphics: Phaser.GameObjects.Graphics,
  strokes: readonly Stroke[],
  colour: number,
): void {
  for (const segment of strokes.flat()) {
    paintSegment(graphics, segment, colour);
  }
}

/** Draw one round-ended pen line piece. */
function paintSegment(
  graphics: Phaser.GameObjects.Graphics,
  segment: Segment,
  colour: number,
): void {
  const { from, to } = segment;
  graphics.lineStyle(PEN_WIDTH, colour);
  graphics.lineBetween(from.x, from.y, to.x, to.y);
  graphics.fillStyle(colour);
  graphics.fillCircle(from.x, from.y, PEN_WIDTH / 2);
  graphics.fillCircle(to.x, to.y, PEN_WIDTH / 2);
}
