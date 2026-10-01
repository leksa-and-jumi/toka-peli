import type { Point } from './drawing';
import { type Stroke, splitSegment } from './sketch';

/** A ready-made funny character, drawn with lines like a player's drawing. */
export interface Figure {
  name: string;
  /** Lines measured from the feet: (0, 0) is the middle of the bottom, up is negative y. */
  strokes: Stroke[];
}

/** A line through the points; one point makes a dot. Long pieces are cut up for the eraser. */
export function polyline(points: readonly Point[], maxPiece: number): Stroke {
  const first = points[0];
  if (!first) return [];
  if (points.length === 1) return [{ from: first, to: first }];
  return points
    .slice(1)
    .flatMap((to, i) => splitSegment({ from: points[i] as Point, to }, maxPiece));
}

/** Points around an ellipse, ending where it started. */
export function ellipse(cx: number, cy: number, rx: number, ry: number, steps = 16): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = (i / steps) * Math.PI * 2;
    return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
  });
}

const circle = (cx: number, cy: number, r: number): Point[] => ellipse(cx, cy, r, r);
const dot = (x: number, y: number): Point[] => [{ x, y }];
const p = (x: number, y: number): Point => ({ x, y });

/** The five funny characters, as lists of point lists. */
const SHAPES: { name: string; lines: Point[][] }[] = [
  {
    name: 'Hassu ukko',
    lines: [
      circle(0, -60, 13),
      dot(-5, -63),
      dot(5, -63),
      [p(-6, -55), p(0, -52), p(6, -55)],
      [p(0, -47), p(0, -20)],
      [p(-20, -58), p(0, -38), p(20, -58)],
      [p(-14, 0), p(0, -20), p(14, 0)],
    ],
  },
  {
    name: 'Kissa',
    lines: [
      ellipse(-6, -18, 22, 10),
      circle(22, -32, 10),
      [p(15, -39), p(16, -49), p(22, -42)],
      [p(23, -42), p(29, -49), p(30, -37)],
      dot(19, -33),
      dot(26, -33),
      [p(-28, -20), p(-38, -34), p(-32, -46)],
      [p(-20, -10), p(-20, 0)],
      [p(-10, -8), p(-10, 0)],
      [p(2, -8), p(2, 0)],
      [p(10, -10), p(10, 0)],
    ],
  },
  {
    name: 'Robotti',
    lines: [
      [p(-12, -70), p(12, -70), p(12, -50), p(-12, -50), p(-12, -70)],
      [p(0, -70), p(0, -78)],
      circle(0, -82, 3),
      dot(-5, -63),
      dot(5, -63),
      [p(-6, -55), p(6, -55)],
      [p(-16, -48), p(16, -48), p(16, -18), p(-16, -18), p(-16, -48)],
      [p(-16, -40), p(-28, -28)],
      [p(16, -40), p(28, -28)],
      [p(-8, -18), p(-8, 0)],
      [p(8, -18), p(8, 0)],
    ],
  },
  {
    name: 'Kummitus',
    lines: [
      [
        p(-20, 0),
        p(-20, -40),
        // The round top: the upper half of a circle, from left to right.
        ...ellipse(0, -40, 20, 20, 8).slice(4, 9),
        p(20, 0),
        p(13, -6),
        p(7, 0),
        p(0, -6),
        p(-7, 0),
        p(-13, -6),
        p(-20, 0),
      ],
      circle(-7, -44, 3),
      circle(7, -44, 3),
      circle(0, -30, 4),
    ],
  },
  {
    name: 'Lumiukko',
    lines: [
      circle(0, -14, 14),
      circle(0, -38, 10),
      circle(0, -56, 8),
      [p(-9, -63), p(9, -63)],
      [p(-5, -63), p(-5, -73), p(5, -73), p(5, -63)],
      dot(-3, -58),
      dot(3, -58),
      [p(0, -55), p(7, -54)],
      [p(-10, -40), p(-24, -50)],
      [p(10, -40), p(24, -50)],
    ],
  },
];

export function makeFigures(maxPiece: number): Figure[] {
  return SHAPES.map(({ name, lines }) => ({
    name,
    strokes: lines.map((points) => polyline(points, maxPiece)),
  }));
}
