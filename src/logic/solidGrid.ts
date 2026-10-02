import { distanceToSegment } from './drawing';
import type { Segment } from './sketch';

/**
 * Which parts of the world are solid, stored as small square cells.
 * Drawn bridges are stamped in; everything at or below the floor is solid.
 */
export class SolidGrid {
  private readonly cols: number;
  private readonly rows: number;
  private readonly cells: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
    readonly cellSize: number,
    readonly floorY: number,
  ) {
    if (cellSize <= 0) {
      throw new RangeError(`cellSize must be positive, got ${cellSize}`);
    }
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.cells = new Uint8Array(this.cols * this.rows);
  }

  clear(): void {
    this.cells.fill(0);
  }

  /** Make every cell that a thick line piece covers solid. */
  stamp(segment: Segment, radius: number): void {
    const reach = radius + this.cellSize / 2;
    const { from, to } = segment;
    const c0 = Math.max(0, Math.floor((Math.min(from.x, to.x) - reach) / this.cellSize));
    const c1 = Math.min(
      this.cols - 1,
      Math.floor((Math.max(from.x, to.x) + reach) / this.cellSize),
    );
    const r0 = Math.max(0, Math.floor((Math.min(from.y, to.y) - reach) / this.cellSize));
    const r1 = Math.min(
      this.rows - 1,
      Math.floor((Math.max(from.y, to.y) + reach) / this.cellSize),
    );
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const centre = { x: (c + 0.5) * this.cellSize, y: (r + 0.5) * this.cellSize };
        if (distanceToSegment(centre, from, to) <= reach) {
          this.cells[r * this.cols + c] = 1;
        }
      }
    }
  }

  isSolidAt(x: number, y: number): boolean {
    if (y >= this.floorY) return true;
    if (x < 0 || x >= this.width || y < 0) return false;
    const c = Math.floor(x / this.cellSize);
    const r = Math.floor(y / this.cellSize);
    return this.cells[r * this.cols + c] === 1;
  }

  /** Is the box from (left, top) up to, but not including, (right, bottom) empty? */
  isAreaFree(left: number, top: number, right: number, bottom: number): boolean {
    if (bottom > this.floorY) return false;
    const step = this.cellSize;
    for (let y = Math.max(0, top); y < bottom; y += step) {
      for (let x = Math.max(0, left); x < Math.min(right, this.width); x += step) {
        if (this.isSolidAt(x, y)) return false;
      }
      // The right and bottom edges may fall between steps; check them too.
      if (right - 1 < this.width && this.isSolidAt(right - 1, y)) return false;
    }
    for (let x = Math.max(0, left); x < Math.min(right, this.width); x += step) {
      if (this.isSolidAt(x, bottom - 1)) return false;
    }
    return !this.isSolidAt(Math.min(right, this.width) - 1, bottom - 1);
  }
}
