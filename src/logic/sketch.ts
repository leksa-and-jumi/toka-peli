import { distanceToSegment, type Point } from './drawing';

/** One straight pen line piece. A click is a piece where `from` equals `to`. */
export interface Segment {
  from: Point;
  to: Point;
}

/** Everything drawn in one go, from pressing the mouse button to letting go. */
export type Stroke = Segment[];

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The box around every segment, grown by the pen radius. Null when nothing is drawn. */
export function boundsOf(segments: readonly Segment[], radius: number): Bounds | null {
  if (segments.length === 0) return null;
  const xs = segments.flatMap((s) => [s.from.x, s.to.x]);
  const ys = segments.flatMap((s) => [s.from.y, s.to.y]);
  return {
    left: Math.min(...xs) - radius,
    top: Math.min(...ys) - radius,
    right: Math.max(...xs) + radius,
    bottom: Math.max(...ys) + radius,
  };
}

/** Move segments so that `origin` becomes (0, 0). */
export function toLocal(segments: readonly Segment[], origin: Point): Segment[] {
  const shift = (p: Point): Point => ({ x: p.x - origin.x, y: p.y - origin.y });
  return segments.map((s) => ({ from: shift(s.from), to: shift(s.to) }));
}

/** Do two strokes come within `reach` of each other? */
export function strokesTouch(a: Stroke, b: Stroke, reach: number): boolean {
  const near = (s: Segment, t: Segment): boolean =>
    distanceToSegment(s.from, t.from, t.to) <= reach ||
    distanceToSegment(s.to, t.from, t.to) <= reach ||
    distanceToSegment(t.from, s.from, s.to) <= reach ||
    distanceToSegment(t.to, s.from, s.to) <= reach;
  return a.some((s) => b.some((t) => near(s, t)));
}

/**
 * The newest picture: the last stroke plus every stroke connected to it,
 * directly or through other strokes. Returns their indexes, oldest first.
 */
export function lastPicture(strokes: readonly Stroke[], reach: number): number[] {
  const last = strokes.length - 1;
  if (last < 0) return [];
  const found = new Set([last]);
  const queue = [last];
  while (queue.length > 0) {
    const current = queue.pop() as number;
    strokes.forEach((stroke, index) => {
      if (found.has(index)) return;
      if (strokesTouch(strokes[current] as Stroke, stroke, reach)) {
        found.add(index);
        queue.push(index);
      }
    });
  }
  return [...found].sort((x, y) => x - y);
}
