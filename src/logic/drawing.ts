/** Pure helpers for mouse drawing, kept free of Phaser so they are easy to test. */
export interface Point {
  x: number;
  y: number;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Decide whether the pen has moved far enough to draw a new line piece.
 * Skipping tiny moves keeps the drawing smooth and cheap.
 */
export function shouldDrawTo(last: Point | null, next: Point, minDistance: number): boolean {
  if (minDistance < 0) {
    throw new RangeError(`minDistance must not be negative, got ${minDistance}`);
  }
  if (last === null) {
    return false;
  }
  return distance(last, next) >= minDistance;
}

/** Shortest distance from a point to a line piece from `a` to `b`. */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}
