import Phaser from 'phaser';
import {
  COLORS,
  CREATURE,
  FLOOR_THICKNESS,
  FLOOR_Y,
  GAME_HEIGHT,
  GAME_WIDTH,
  HELP_TEXT,
  HINT_TEXT,
  PEN_MIN_STEP,
  PEN_WIDTH,
  PICTURE_REACH,
  SOLID_CELL,
} from '../config';
import {
  type Creature,
  type CreatureRules,
  type CreatureSize,
  stepCreature,
} from '../logic/creature';
import { type Point, shouldDrawTo } from '../logic/drawing';
import { boundsOf, lastPicture, type Segment, type Stroke, toLocal } from '../logic/sketch';
import { SolidGrid } from '../logic/solidGrid';

interface LivingDrawing {
  state: Creature;
  size: CreatureSize;
  body: Phaser.GameObjects.Container;
}

const RULES: CreatureRules = {
  walkSpeed: CREATURE.walkSpeed,
  gravity: CREATURE.gravity,
  maxStep: CREATURE.maxStep,
  worldWidth: GAME_WIDTH,
};

/**
 * Every line drawn is a bridge. Press K and the newest picture comes alive
 * and walks along the bridges.
 */
export class MainScene extends Phaser.Scene {
  private pen!: Phaser.GameObjects.Graphics;
  private strokes: Stroke[] = [];
  private lastPenPoint: Point | null = null;
  private readonly solid = new SolidGrid(GAME_WIDTH, GAME_HEIGHT, SOLID_CELL, FLOOR_Y);
  private living: LivingDrawing[] = [];
  private hint!: Phaser.GameObjects.Text;

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
        'Piirrä siltoja ja ukko. Paina K, niin ukko herää henkiin!',
        { fontSize: HELP_TEXT.fontSize, color: COLORS.text },
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
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.lastPenPoint = { x: pointer.x, y: pointer.y };
      this.strokes.push([]);
      // A single click leaves a dot.
      this.drawSegment({ from: this.lastPenPoint, to: this.lastPenPoint });
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const next = { x: pointer.x, y: pointer.y };
      if (!pointer.isDown || !this.lastPenPoint) return;
      if (!shouldDrawTo(this.lastPenPoint, next, PEN_MIN_STEP)) return;
      this.drawSegment({ from: this.lastPenPoint, to: next });
      this.lastPenPoint = next;
    });
    const stopDrawing = (): void => {
      this.lastPenPoint = null;
    };
    this.input.on('pointerup', stopDrawing);
    this.input.on('pointerupoutside', stopDrawing);
  }

  private drawSegment(segment: Segment): void {
    this.strokes[this.strokes.length - 1]?.push(segment);
    paintSegment(this.pen, segment);
    this.solid.stamp(segment, PEN_WIDTH / 2);
  }

  /** Turn the newest picture into a living drawing; the other lines stay bridges. */
  private wakeUp(): void {
    const picked = lastPicture(this.strokes, PICTURE_REACH);
    const segments = picked.flatMap((index) => this.strokes[index] ?? []);
    const bounds = boundsOf(segments, PEN_WIDTH / 2);
    if (!bounds) {
      this.showHint();
      return;
    }
    // The body turns around its feet: the middle of its bottom edge.
    const feet = { x: (bounds.left + bounds.right) / 2, y: bounds.bottom };
    const art = this.add.graphics();
    for (const segment of toLocal(segments, feet)) {
      paintSegment(art, segment);
    }
    this.living.push({
      state: { x: feet.x, y: feet.y, fallSpeed: 0, dir: 1 },
      size: { halfWidth: (bounds.right - bounds.left) / 2, height: bounds.bottom - bounds.top },
      body: this.add.container(feet.x, feet.y, [art]),
    });

    this.strokes = this.strokes.filter((_, index) => !picked.includes(index));
    this.redrawBridges();
  }

  /** Paint the bridges again and remember where they are. */
  private redrawBridges(): void {
    this.pen.clear();
    this.solid.clear();
    for (const segment of this.strokes.flat()) {
      paintSegment(this.pen, segment);
      this.solid.stamp(segment, PEN_WIDTH / 2);
    }
  }

  private showHint(): void {
    this.hint.setVisible(true);
    this.time.delayedCall(HINT_TEXT.showMs, () => this.hint.setVisible(false));
  }
}

/** Draw one round-ended pen line piece. */
function paintSegment(graphics: Phaser.GameObjects.Graphics, segment: Segment): void {
  const { from, to } = segment;
  graphics.lineStyle(PEN_WIDTH, COLORS.pen);
  graphics.lineBetween(from.x, from.y, to.x, to.y);
  graphics.fillStyle(COLORS.pen);
  graphics.fillCircle(from.x, from.y, PEN_WIDTH / 2);
  graphics.fillCircle(to.x, to.y, PEN_WIDTH / 2);
}
