import { describe, expect, it } from 'vitest';
import { ellipse, makeFigures, polyline } from './figures';
import { boundsOf } from './sketch';

describe('polyline', () => {
  it('joins the points with short pieces', () => {
    const line = polyline(
      [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
      ],
      10,
    );
    expect(line).toHaveLength(2);
    expect(line[1]?.to).toEqual({ x: 20, y: 0 });
  });

  it('makes a dot from one point and nothing from none', () => {
    expect(polyline([{ x: 3, y: 4 }], 10)).toEqual([{ from: { x: 3, y: 4 }, to: { x: 3, y: 4 } }]);
    expect(polyline([], 10)).toEqual([]);
  });
});

describe('ellipse', () => {
  it('goes all the way round', () => {
    const points = ellipse(0, 0, 10, 5, 4);
    expect(points).toHaveLength(5);
    expect(points[0]?.x).toBeCloseTo(10);
    expect(points[4]?.x).toBeCloseTo(10);
    expect(points[1]?.y).toBeCloseTo(5);
  });
});

describe('makeFigures', () => {
  const figures = makeFigures(10);

  it('has five funny characters', () => {
    expect(figures).toHaveLength(5);
  });

  it('stands every character on its feet at the origin', () => {
    for (const figure of figures) {
      const bounds = boundsOf(figure.strokes.flat(), 0);
      expect(bounds, figure.name).not.toBeNull();
      expect(bounds?.bottom, figure.name).toBeCloseTo(0);
      expect(bounds?.top, figure.name).toBeLessThan(-40);
      expect(bounds?.top, figure.name).toBeGreaterThan(-100);
    }
  });
});
