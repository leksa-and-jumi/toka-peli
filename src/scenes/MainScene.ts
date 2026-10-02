import Phaser from 'phaser';
import {
  COLORS,
  CREATURE,
  FLOOR_THICKNESS,
  FLOOR_Y,
  GAME_WIDTH,
  HELP_TEXT,
  HINT_TEXT,
  PEN_MIN_STEP,
  PEN_WIDTH,
} from '../config';
import { type Creature, type CreatureRules, stepCreature } from '../logic/creature';
import { type Point, shouldDrawTo } from '../logic/drawing';
import { boundsOf, type Segment, toLocal } from '../logic/sketch';

interface LivingDrawing {
  state: Creature;
  halfWidth: number;
  body: Phaser.GameObjects.Container;
}

const RULES: CreatureRules = {
  walkSpeed: CREATURE.walkSpeed,
  gravity: CREATURE.gravity,
  floorY: FLOOR_Y,
  worldWidth: GAME_WIDTH,
};

/**
 * Draw with the mouse, then press K: the drawing comes alive and walks.
 * Each K press wakes up everything drawn since the last one.
 */
export class MainScene extends Phaser.Scene {
  private pen!: Phaser.GameObjects.Graphics;
  private sketch: Segment[] = [];
  private lastPenPoint: Point | null = null;
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
      .text(GAME_WIDTH / 2, HELP_TEXT.y, 'Piirrä ukko hiirellä. Paina K, niin se herää henkiin!', {
        fontSize: HELP_TEXT.fontSize,
        color: COLORS.text,
      })
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
      drawing.state = stepCreature(drawing.state, drawing.halfWidth, RULES, seconds);
      const { x, y, dir, fallSpeed } = drawing.state;
      const walking = fallSpeed === 0 && y >= FLOOR_Y;
      const swing = walking ? Math.sin(time * CREATURE.wobblePerMs) : 0;
      drawing.body.setPosition(x, y - Math.abs(swing) * CREATURE.hopHeight);
      drawing.body.setAngle(swing * CREATURE.wobbleDegrees);
      drawing.body.setScale(dir, 1);
    }
  }

  private setUpDrawing(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.lastPenPoint = { x: pointer.x, y: pointer.y };
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
    this.sketch.push(segment);
    paintSegment(this.pen, segment);
  }

  /** Turn the current sketch into a living drawing that walks. */
  private wakeUp(): void {
    const bounds = boundsOf(this.sketch, PEN_WIDTH / 2);
    if (!bounds) {
      this.showHint();
      return;
    }
    // The body turns around its feet: the middle of its bottom edge.
    const feet = { x: (bounds.left + bounds.right) / 2, y: bounds.bottom };
    const art = this.add.graphics();
    for (const segment of toLocal(this.sketch, feet)) {
      paintSegment(art, segment);
    }
    const body = this.add.container(feet.x, feet.y, [art]);
    this.living.push({
      state: { x: feet.x, y: feet.y, fallSpeed: 0, dir: 1 },
      halfWidth: (bounds.right - bounds.left) / 2,
      body,
    });

    this.sketch = [];
    this.pen.clear();
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
