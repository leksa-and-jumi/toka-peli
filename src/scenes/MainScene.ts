import Phaser from 'phaser';
import {
  COLORS,
  GAME_HEIGHT,
  GAME_WIDTH,
  PEN_MIN_STEP,
  PEN_WIDTH,
  PLAYER_SIZE,
  PLAYER_SPEED,
  POINTS_PER_STAR,
  STAR_SIZE,
} from '../config';
import { clamp, randomPosition } from '../logic/bounds';
import { type Point, shouldDrawTo } from '../logic/drawing';
import { addPoints, formatScore } from '../logic/score';

/**
 * Starter scene: move the square with the arrow keys and collect stars.
 * Hold the mouse button down to draw on the screen.
 * This is a placeholder until Julius designs the real game.
 */
export class MainScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private star!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private scoreText!: Phaser.GameObjects.Text;
  private score = 0;
  private pen!: Phaser.GameObjects.Graphics;
  private lastPenPoint: Point | null = null;

  constructor() {
    super('MainScene');
  }

  create(): void {
    // Drawn first so the drawing stays behind the player and the star.
    this.pen = this.add.graphics();
    this.setUpDrawing();

    this.player = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      PLAYER_SIZE,
      PLAYER_SIZE,
      COLORS.player,
    );
    this.star = this.add.rectangle(0, 0, STAR_SIZE, STAR_SIZE, COLORS.star);
    this.moveStar();

    this.scoreText = this.add.text(16, 16, formatScore(this.score), {
      fontSize: '24px',
      color: COLORS.text,
    });
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 24, 'Liiku nuolilla ja kerää tähtiä. Piirrä hiirellä!', {
        fontSize: '18px',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is not available');
    }
    this.cursors = keyboard.createCursorKeys();
  }

  update(_time: number, delta: number): void {
    const step = (PLAYER_SPEED * delta) / 1000;
    const half = PLAYER_SIZE / 2;

    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown) dx -= step;
    if (this.cursors.right.isDown) dx += step;
    if (this.cursors.up.isDown) dy -= step;
    if (this.cursors.down.isDown) dy += step;

    this.player.x = clamp(this.player.x + dx, half, GAME_WIDTH - half);
    this.player.y = clamp(this.player.y + dy, half, GAME_HEIGHT - half);

    const touching = Phaser.Geom.Intersects.RectangleToRectangle(
      this.player.getBounds(),
      this.star.getBounds(),
    );
    if (touching) {
      this.score = addPoints(this.score, POINTS_PER_STAR);
      this.scoreText.setText(formatScore(this.score));
      this.moveStar();
    }
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

  private moveStar(): void {
    const { x, y } = randomPosition(GAME_WIDTH, GAME_HEIGHT, STAR_SIZE);
    this.star.setPosition(x, y);
  }
}
