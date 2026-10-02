import Phaser from 'phaser';
import {
  COLORS,
  COMBAT,
  COPY_BUTTON,
  CREATURE,
  CREATURE_COLOURS,
  FIGURE_BUTTONS,
  ERASER_WIDTH,
  FLOOR_THICKNESS,
  FLOOR_Y,
  GAME_HEIGHT,
  GAME_WIDTH,
  HEALTH_BAR,
  HELP_TEXT,
  HINT_TEXT,
  PEN_MAX_PIECE,
  PEN_MIN_STEP,
  PEN_WIDTH,
  PICTURE_REACH,
  SOLID_CELL,
  TOOL_BUTTON,
  WALK_SPEED,
} from '../config';
import { eraseFromBody } from '../logic/bodyErase';
import { creatureColour } from '../logic/colours';
import {
  areFoes,
  bodyBox,
  boxAt,
  growBox,
  bounceApart,
  bumpDamage,
  mass,
  overlaps,
  pickWord,
  pushApart,
  walkSpeedFor,
} from '../logic/combat';
import {
  type Creature,
  type CreatureRules,
  type CreatureSize,
  stepCreature,
} from '../logic/creature';
import { type Point, shouldDrawTo } from '../logic/drawing';
import { type Figure, makeFigures } from '../logic/figures';
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
import { burstStars, drawHealthBar, floatNumber, poof, popWord, squash } from '../objects/effects';

interface LivingDrawing {
  /** Ready-made characters share a kind by name; every own drawing is its own kind. */
  kind: string;
  state: Creature;
  size: CreatureSize;
  /** Its lines, measured from its feet. */
  strokes: Stroke[];
  colour: number;
  art: Phaser.GameObjects.Graphics;
  body: Phaser.GameObjects.Container;
  health: number;
  healthBar: Phaser.GameObjects.Graphics;
  /** Seconds until it can be bumped again. */
  cooldown: number;
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
 * Living drawings bump into each other and lose energy until they go poof.
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
  /** Clickable things on screen; pressing them must not draw. */
  private readonly buttons = new Set<Phaser.GameObjects.GameObject>();
  private eraserRing!: Phaser.GameObjects.Graphics;
  /** The creature the player clicked; a + button above it adds copies. */
  private picked: LivingDrawing | null = null;
  /** How many copies have been made; every other copy walks the other way. */
  private copyCount = 0;
  private pickRing!: Phaser.GameObjects.Graphics;
  private copyButton!: Phaser.GameObjects.Container;

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
        'Piirrä tai valitse hahmo. K = herää, P = kumi, S = pyyhi kaikki',
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
    this.buttons.add(this.toolButton);
    this.addFigureButtons();
    this.addCopyButton();

    // Shows how big the eraser is, since the mouse arrow is hidden while erasing.
    this.eraserRing = this.add.graphics().setVisible(false);
    this.eraserRing.lineStyle(2, COLORS.eraserRing);
    this.eraserRing.strokeCircle(0, 0, ERASER_WIDTH / 2);
  }

  update(time: number, delta: number): void {
    const seconds = delta / 1000;
    for (const drawing of this.living) {
      const before = drawing.state;
      // The picked one waits, so its + button is easy to press.
      const speed = drawing === this.picked ? 0 : walkSpeedFor(drawing.size.height, WALK_SPEED);
      const rules = { ...RULES, walkSpeed: speed };
      drawing.state = stepCreature(before, drawing.size, rules, this.solid, seconds);
      drawing.cooldown = Math.max(0, drawing.cooldown - seconds);
      const { x, y, dir, fallSpeed } = drawing.state;
      const walking = fallSpeed === 0 && x !== before.x;
      const swing = walking ? Math.sin(time * CREATURE.wobblePerMs) : 0;
      drawing.body.setPosition(x, y - Math.abs(swing) * CREATURE.hopHeight);
      drawing.body.setAngle(swing * CREATURE.wobbleDegrees);
      drawing.body.setScale(dir, 1);
      drawHealthBar(
        drawing.healthBar,
        x,
        y - drawing.size.height,
        drawing.health,
        COMBAT.maxHealth,
      );
    }
    this.bumpCreatures();
    this.showPicked();
  }

  /** Keep the ring and the + button on the picked creature, or hide them. */
  private showPicked(): void {
    const picked = this.picked;
    if (picked && !this.living.includes(picked)) this.picked = null;
    if (!this.picked) {
      this.pickRing.setVisible(false);
      this.copyButton.setVisible(false);
      return;
    }
    const { x, y } = this.picked.state;
    const { halfWidth, height } = this.picked.size;
    const pad = COPY_BUTTON.ringPadding;
    this.pickRing.clear().setVisible(true);
    this.pickRing.lineStyle(2, COPY_BUTTON.ringColour);
    this.pickRing.strokeRoundedRect(
      x - halfWidth - pad,
      y - height - pad,
      (halfWidth + pad) * 2,
      height + pad * 2,
      pad,
    );
    const barTop = y - height - HEALTH_BAR.gap - HEALTH_BAR.height;
    this.copyButton.setVisible(true).setPosition(x, barTop - COPY_BUTTON.gap - COPY_BUTTON.radius);
  }

  private addCopyButton(): void {
    this.pickRing = this.add.graphics().setDepth(7).setVisible(false);
    const { radius } = COPY_BUTTON;
    const circle = this.add
      .circle(0, 0, radius, COPY_BUTTON.colour)
      .setStrokeStyle(2, COPY_BUTTON.edgeColour);
    const plus = this.add
      .text(0, -1, '+', {
        fontSize: COPY_BUTTON.fontSize,
        fontStyle: 'bold',
        color: COPY_BUTTON.textColour,
      })
      .setOrigin(0.5);
    this.copyButton = this.add
      .container(0, 0, [circle, plus])
      .setSize(radius * 2, radius * 2)
      .setDepth(11)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.copyPicked());
    this.buttons.add(this.copyButton);
  }

  /** Drop in one more of the picked creature: same look, same kind, so they are friends. */
  private copyPicked(): void {
    const original = this.picked;
    if (!original) return;
    const { halfWidth, height } = original.size;
    const x = Math.min(GAME_WIDTH - halfWidth, Math.max(halfWidth, original.state.x));
    const feet = { x, y: FIGURE_BUTTONS.spawnTop + height };
    const art = this.add.graphics();
    paintStrokes(art, original.strokes, original.colour);
    const body = this.add.container(feet.x, feet.y, [art]);
    this.living.push({
      ...original,
      state: { x: feet.x, y: feet.y, fallSpeed: 0, dir: this.copyCount % 2 === 0 ? -1 : 1 },
      strokes: original.strokes.map((stroke) => [...stroke]),
      art,
      body,
      health: COMBAT.maxHealth,
      healthBar: this.add.graphics().setDepth(8),
      cooldown: 0,
    });
    this.copyCount += 1;
    body.setScale(0);
    this.tweens.add({ targets: body, scale: 1, duration: COPY_BUTTON.popMs, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: this.copyButton,
      scale: { from: 1.3, to: 1 },
      duration: COPY_BUTTON.popMs,
    });
  }

  /** Creatures that touch bump into each other: both lose energy, the bigger hits harder. */
  private bumpCreatures(): void {
    for (let i = 0; i < this.living.length; i++) {
      for (let j = i + 1; j < this.living.length; j++) {
        const a = this.living[i] as LivingDrawing;
        const b = this.living[j] as LivingDrawing;
        if (a.cooldown > 0 || b.cooldown > 0) continue;
        if (!areFoes(a.kind, b.kind)) continue;
        const boxA = bodyBox(a.state.x, a.state.y, a.size);
        const boxB = bodyBox(b.state.x, b.state.y, b.size);
        if (!overlaps(boxA, boxB)) continue;
        this.bump(a, b, pushApart(boxA, boxB, COMBAT.pushMargin));
      }
    }
    const fallen = this.living.filter((drawing) => drawing.health <= 0);
    if (fallen.length > 0) {
      this.living = this.living.filter((drawing) => drawing.health > 0);
      fallen.forEach((drawing) => this.goPoof(drawing));
    }
  }

  private bump(a: LivingDrawing, b: LivingDrawing, push: { a: number; b: number }): void {
    const toA = bumpDamage(mass(b.size), mass(a.size), COMBAT.damage);
    const toB = bumpDamage(mass(a.size), mass(b.size), COMBAT.damage);
    a.health -= toA;
    b.health -= toB;
    const dirs = bounceApart(a.state.x, b.state.x);
    const keepInside = (x: number, size: CreatureSize): number =>
      Math.min(GAME_WIDTH - size.halfWidth, Math.max(size.halfWidth, x));
    a.state = {
      ...a.state,
      x: keepInside(a.state.x + push.a, a.size),
      dir: dirs.a,
      fallSpeed: -COMBAT.hopSpeed,
    };
    b.state = {
      ...b.state,
      x: keepInside(b.state.x + push.b, b.size),
      dir: dirs.b,
      fallSpeed: -COMBAT.hopSpeed,
    };
    a.cooldown = COMBAT.cooldownSeconds;
    b.cooldown = COMBAT.cooldownSeconds;

    const middle = {
      x: (a.state.x + b.state.x) / 2,
      y: Math.min(a.state.y - a.size.height / 2, b.state.y - b.size.height / 2),
    };
    popWord(this, middle.x, middle.y - 20, pickWord(COMBAT.words));
    burstStars(this, middle.x, middle.y);
    squash(this, a.art, COMBAT.squash);
    squash(this, b.art, COMBAT.squash);
    floatNumber(this, a.state.x, a.state.y - a.size.height - 20, toA);
    floatNumber(this, b.state.x, b.state.y - b.size.height - 20, toB);
    if (Math.max(toA, toB) > COMBAT.shakeAboveDamage) {
      this.cameras.main.shake(COMBAT.shake.ms, COMBAT.shake.intensity);
    }
  }

  private goPoof(drawing: LivingDrawing): void {
    drawing.healthBar.destroy();
    poof(this, drawing.body, {
      x: drawing.state.x,
      y: drawing.state.y - drawing.size.height / 2,
    });
  }

  private setUpDrawing(): void {
    this.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        // Clicking a button must not draw.
        if (over.some((object) => this.buttons.has(object))) return;
        // With the pen, clicking a creature picks it instead of drawing.
        if (this.tool === 'pen') {
          const boxes = this.living.map((d) =>
            growBox(bodyBox(d.state.x, d.state.y, d.size), COPY_BUTTON.clickPadding),
          );
          const hit = boxAt(boxes, { x: pointer.x, y: pointer.y });
          this.picked = this.living[hit] ?? null;
          if (this.picked) return;
        }
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
        drawing.healthBar.destroy();
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
    if (!this.bringToLife(picked.map((index) => this.strokes[index] ?? []))) {
      this.showHint();
      return;
    }
    this.strokes = this.strokes.filter((_, index) => !picked.includes(index));
    this.redrawBridges();
  }

  /** Make a living drawing from lines on the screen. Returns false if there were none. */
  private bringToLife(pictureStrokes: Stroke[], kind = `piirros-${this.wokenCount}`): boolean {
    const bounds = boundsOf(pictureStrokes.flat(), PEN_WIDTH / 2);
    if (!bounds) return false;
    // The body turns around its feet: the middle of its bottom edge.
    const feet = { x: (bounds.left + bounds.right) / 2, y: bounds.bottom };
    const strokes = pictureStrokes.map((stroke) => toLocal(stroke, feet));
    const colour = creatureColour(this.wokenCount, CREATURE_COLOURS);
    // Every other one sets off to the left, so they meet and bump.
    const dir = this.wokenCount % 2 === 0 ? 1 : -1;
    this.wokenCount += 1;
    const art = this.add.graphics();
    paintStrokes(art, strokes, colour);
    this.living.push({
      kind,
      state: { x: feet.x, y: feet.y, fallSpeed: 0, dir },
      size: { halfWidth: (bounds.right - bounds.left) / 2, height: bounds.bottom - bounds.top },
      strokes,
      colour,
      art,
      body: this.add.container(feet.x, feet.y, [art]),
      health: COMBAT.maxHealth,
      healthBar: this.add.graphics().setDepth(8),
      cooldown: 0,
    });
    return true;
  }

  /** A row of buttons with funny characters; pressing one drops that character in. */
  private addFigureButtons(): void {
    const figures = makeFigures(PEN_MAX_PIECE);
    const { size, gap, padding, cornerRadius, y } = FIGURE_BUTTONS;
    const rowWidth = figures.length * size + (figures.length - 1) * gap;
    figures.forEach((figure, i) => {
      const x = GAME_WIDTH / 2 - rowWidth / 2 + size / 2 + i * (size + gap);
      const frame = this.add.graphics();
      frame.fillStyle(COLORS.buttonFill);
      frame.fillRoundedRect(x - size / 2, y - size / 2, size, size, cornerRadius);
      frame.lineStyle(2, COLORS.buttonBorder);
      frame.strokeRoundedRect(x - size / 2, y - size / 2, size, size, cornerRadius);

      // A small picture of the character, standing on the bottom of the button.
      const bounds = boundsOf(figure.strokes.flat(), PEN_WIDTH / 2);
      const height = bounds ? bounds.bottom - bounds.top : size;
      const width = bounds ? bounds.right - bounds.left : size;
      const scale = Math.min(1, (size - padding * 2) / Math.max(height, width));
      const preview = this.add.graphics();
      paintStrokes(preview, figure.strokes, COLORS.pen);
      preview.setPosition(x, y + size / 2 - padding).setScale(scale);

      const hitArea = this.add
        .zone(x, y, size, size)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.dropFigure(figure, x));
      this.buttons.add(hitArea);
    });
  }

  /** Put a ready-made character into the world just below its button. */
  private dropFigure(figure: Figure, x: number): void {
    const bounds = boundsOf(figure.strokes.flat(), 0);
    const height = bounds ? -bounds.top : 0;
    const feet = { x, y: FIGURE_BUTTONS.spawnTop + height };
    const placed = figure.strokes.map((stroke) => toLocal(stroke, { x: -feet.x, y: -feet.y }));
    this.bringToLife(placed, figure.name);
  }

  /** Wipe everything: all lines, bridges and living drawings. */
  private clearAll(): void {
    for (const drawing of this.living) {
      drawing.body.destroy();
      drawing.healthBar.destroy();
    }
    this.living = [];
    this.picked = null;
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
