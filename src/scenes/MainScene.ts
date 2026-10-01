import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, HELP_TEXT, PEN_MIN_STEP, PEN_WIDTH } from '../config';
import { type Point, shouldDrawTo } from '../logic/drawing';

/**
 * A white sheet of paper: hold the mouse button down to draw.
 * Julius is building this step by step towards a drawing that comes alive.
 */
export class MainScene extends Phaser.Scene {
  private pen!: Phaser.GameObjects.Graphics;
  private lastPenPoint: Point | null = null;

  constructor() {
    super('MainScene');
  }

  create(): void {
    this.pen = this.add.graphics();
    this.setUpDrawing();

    this.add
      .text(GAME_WIDTH / 2, HELP_TEXT.y, 'Piirrä hiirellä!', {
        fontSize: HELP_TEXT.fontSize,
        color: COLORS.text,
      })
      .setOrigin(0.5);
  }

  private setUpDrawing(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.lastPenPoint = { x: pointer.x, y: pointer.y };
      // A single click leaves a dot.
      this.pen.fillStyle(COLORS.pen);
      this.pen.fillCircle(pointer.x, pointer.y, PEN_WIDTH / 2);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const next = { x: pointer.x, y: pointer.y };
      if (!pointer.isDown || !this.lastPenPoint) return;
      if (!shouldDrawTo(this.lastPenPoint, next, PEN_MIN_STEP)) return;
      this.pen.lineStyle(PEN_WIDTH, COLORS.pen);
      this.pen.lineBetween(this.lastPenPoint.x, this.lastPenPoint.y, next.x, next.y);
      // Round joints so the line has no gaps.
      this.pen.fillStyle(COLORS.pen);
      this.pen.fillCircle(next.x, next.y, PEN_WIDTH / 2);
      this.lastPenPoint = next;
    });
    const stopDrawing = (): void => {
      this.lastPenPoint = null;
    };
    this.input.on('pointerup', stopDrawing);
    this.input.on('pointerupoutside', stopDrawing);
  }
}
