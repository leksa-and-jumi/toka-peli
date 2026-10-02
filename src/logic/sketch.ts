import { distance, distanceToSegment, type Point } from './drawing';

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
  return a.some((s) => b.some((t) => segmentsNear(s, t, reach)));
}

/** Do two line pieces come within `reach` of each other? */
export function segmentsNear(s: Segment, t: Segment, reach: number): boolean {
  return (
    distanceToSegment(s.from, t.from, t.to) <= reach ||
    distanceToSegment(s.to, t.from, t.to) <= reach ||
    distanceToSegment(t.from, s.from, s.to) <= reach ||
    distanceToSegment(t.to, s.from, s.to) <= reach
  );
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

/**
 * Wipe away every line piece the eraser touches while moving along `path`.
 * A stroke wiped in the middle splits into two strokes. Returns null when
 * nothing was wiped.
 */
export function eraseAlong(
  strokes: readonly Stroke[],
  path: Segment,
  radius: number,
): Stroke[] | null {
  let wiped = false;
  const result: Stroke[] = [];
  for (const stroke of strokes) {
    let piece: Stroke = [];
    for (const segment of stroke) {
      if (segmentsNear(segment, path, radius)) {
        wiped = true;
        if (piece.length > 0) result.push(piece);
        piece = [];
      } else {
        piece.push(segment);
      }
    }
    if (piece.length > 0) result.push(piece);
  }
  return wiped ? result : null;
}

/**
 * Cut a long line piece into short ones, so the eraser can wipe just a bit
 * of a line that was drawn with one fast mouse move.
 */
export function splitSegment(segment: Segment, maxLength: number): Segment[] {
  if (maxLength <= 0) {
    throw new RangeError(`maxLength must be positive, got ${maxLength}`);
  }
  const { from, to } = segment;
  const pieces = Math.max(1, Math.ceil(distance(from, to) / maxLength));
  const at = (i: number): Point => ({
    x: from.x + ((to.x - from.x) * i) / pieces,
    y: from.y + ((to.y - from.y) * i) / pieces,
  });
  return Array.from({ length: pieces }, (_, i) => ({ from: at(i), to: at(i + 1) }));
}
