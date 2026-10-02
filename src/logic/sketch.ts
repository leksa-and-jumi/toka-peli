import type { Point } from './drawing';

/** One straight pen stroke piece. A click is a piece where `from` equals `to`. */
export interface Segment {
  from: Point;
  to: Point;
}

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
