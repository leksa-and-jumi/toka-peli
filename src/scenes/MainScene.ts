import Phaser from 'phaser';
import {
  COLORS,
  ERASER_WIDTH,
  GAME_HEIGHT,
  GAME_WIDTH,
  PEN_MIN_STEP,
  PEN_WIDTH,
  PLAYER_SIZE,
  PLAYER_SPEED,
  POINTS_PER_STAR,
  STAR_SIZE,
  TOOL_BUTTON,
} from '../config';
import { clamp, randomPosition } from '../logic/bounds';
import { type Point, shouldDrawTo } from '../logic/drawing';
import { addPoints, formatScore } from '../logic/score';
import { brushWidth, type Tool, toggleTool, toolLabel } from '../logic/tool';

/**
 * Starter scene: move the square with the arrow keys and collect stars.
 * Hold the mouse button down to draw on the screen. K or the button switches to the eraser.
 * This is a placeholder until Julius designs the real game.
 */
export class MainScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private star!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private scoreText!: Phaser.GameObjects.Text;
  private score = 0;
  /** The picture lives here; the brush is stamped onto it or erased from it. */
  private canvas!: Phaser.GameObjects.RenderTexture;
  private brush!: Phaser.GameObjects.Graphics;
  private eraserRing!: Phaser.GameObjects.Graphics;
  private toolButton!: Phaser.GameObjects.Text;
  private tool: Tool = 'pen';
  private lastPenPoint: Point | null = null;

  constructor() {
    super('MainScene');
  }

  create(): void {
    // Drawn first so the drawing stays behind the player and the star.
    this.canvas = this.add.renderTexture(0, 0, GAME_WIDTH, GAME_HEIGHT).setOrigin(0);
    this.brush = this.make.graphics({}, false);
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
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 24,
        'Liiku nuolilla ja kerää tähtiä. Piirrä hiirellä! K = kumi',
        {
          fontSize: '18px',
          color: COLORS.text,
        },
      )
      .setOrigin(0.5);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is not available');
    }
    this.cursors = keyboard.createCursorKeys();
    keyboard.on('keydown-K', () => this.switchTool());

    this.toolButton = this.add
      .text(TOOL_BUTTON.x, TOOL_BUTTON.y, toolLabel(this.tool), {
        fontSize: TOOL_BUTTON.fontSize,
        color: COLORS.text,
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.switchTool());

    // Shows how big the eraser is, since the mouse arrow is hidden while erasing.
    this.eraserRing = this.add.graphics().setVisible(false);
    this.eraserRing.lineStyle(2, COLORS.eraserRing);
    this.eraserRing.strokeCircle(0, 0, ERASER_WIDTH / 2);
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
    this.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        // Clicking the tool button must not draw.
        if (over.includes(this.toolButton)) return;
        this.lastPenPoint = { x: pointer.x, y: pointer.y };
        // A single click leaves a dot.
        this.paint(this.lastPenPoint, this.lastPenPoint);
      },
    );
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const next = { x: pointer.x, y: pointer.y };
      this.eraserRing.setPosition(next.x, next.y);
      if (!pointer.isDown || !this.lastPenPoint) return;
      if (!shouldDrawTo(this.lastPenPoint, next, PEN_MIN_STEP)) return;
      this.paint(this.lastPenPoint, next);
      this.lastPenPoint = next;
    });
    const stopDrawing = (): void => {
      this.lastPenPoint = null;
    };
    this.input.on('pointerup', stopDrawing);
    this.input.on('pointerupoutside', stopDrawing);
  }

  /** Draw (or erase) one round-ended line piece from `from` to `to`. */
  private paint(from: Point, to: Point): void {
    const width = brushWidth(this.tool, PEN_WIDTH, ERASER_WIDTH);
    this.brush.clear();
    this.brush.lineStyle(width, COLORS.pen);
    this.brush.lineBetween(from.x, from.y, to.x, to.y);
    this.brush.fillStyle(COLORS.pen);
    this.brush.fillCircle(from.x, from.y, width / 2);
    this.brush.fillCircle(to.x, to.y, width / 2);
    if (this.tool === 'pen') {
      this.canvas.draw(this.brush);
    } else {
      this.canvas.erase(this.brush);
    }
  }

  private switchTool(): void {
    this.tool = toggleTool(this.tool);
    this.toolButton.setText(toolLabel(this.tool));
    const erasing = this.tool === 'eraser';
    this.eraserRing.setVisible(erasing);
    this.input.setDefaultCursor(erasing ? 'none' : 'default');
  }

  private moveStar(): void {
    const { x, y } = randomPosition(GAME_WIDTH, GAME_HEIGHT, STAR_SIZE);
    this.star.setPosition(x, y);
  }
}
