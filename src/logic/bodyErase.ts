import type { CreatureSize } from './creature';
import type { Point } from './drawing';
import { boundsOf, eraseAlong, type Segment, type Stroke, toLocal } from './sketch';

/** Where a living drawing stands and which way it faces. */
export interface Pose {
  x: number;
  y: number;
  dir: 1 | -1;
}

/** What is left of a living drawing after the eraser touched it. */
export interface BodyCut {
  /** The remaining lines, measured from the new feet. */
  strokes: Stroke[];
  /** How far the feet moved in the world, e.g. up when the legs were wiped. */
  feetShift: Point;
  size: CreatureSize;
}

/**
 * Wipe the parts of a living drawing that the eraser touches.
 * Returns null when it was not touched, and 'gone' when nothing is left.
 */
export function eraseFromBody(
  strokes: readonly Stroke[],
  path: Segment,
  eraserRadius: number,
  penRadius: number,
  pose: Pose,
): BodyCut | 'gone' | null {
  // The body's lines are stored around its feet, mirrored when it faces left.
  const toBody = (p: Point): Point => ({ x: (p.x - pose.x) * pose.dir, y: p.y - pose.y });
  const left = eraseAlong(strokes, { from: toBody(path.from), to: toBody(path.to) }, eraserRadius);
  if (!left) return null;

  const bounds = boundsOf(left.flat(), penRadius);
  if (!bounds) return 'gone';

  const feet = { x: (bounds.left + bounds.right) / 2, y: bounds.bottom };
  return {
    strokes: left.map((stroke) => toLocal(stroke, feet)),
    feetShift: { x: feet.x * pose.dir, y: feet.y },
    size: { halfWidth: (bounds.right - bounds.left) / 2, height: bounds.bottom - bounds.top },
  };
}
