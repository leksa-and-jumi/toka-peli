import { describe, expect, it } from 'vitest';
import { distance, distanceToSegment, shouldDrawTo } from './drawing';

describe('distance', () => {
  it('measures the straight line between two points', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe('shouldDrawTo', () => {
  it('does not draw before the pen is down', () => {
    expect(shouldDrawTo(null, { x: 10, y: 10 }, 2)).toBe(false);
  });

  it('skips tiny moves', () => {
    expect(shouldDrawTo({ x: 0, y: 0 }, { x: 1, y: 0 }, 2)).toBe(false);
  });

  it('draws when the pen moved far enough', () => {
    expect(shouldDrawTo({ x: 0, y: 0 }, { x: 2, y: 0 }, 2)).toBe(true);
  });

  it('rejects a negative distance', () => {
    expect(() => shouldDrawTo({ x: 0, y: 0 }, { x: 1, y: 1 }, -1)).toThrow(RangeError);
  });
});

describe('distanceToSegment', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 10, y: 0 };

  it('measures straight down to the middle of the line', () => {
    expect(distanceToSegment({ x: 5, y: 3 }, a, b)).toBe(3);
  });

  it('measures to the nearest end past the line', () => {
    expect(distanceToSegment({ x: 13, y: 4 }, a, b)).toBe(5);
  });

  it('works for a dot', () => {
    expect(distanceToSegment({ x: 3, y: 4 }, a, a)).toBe(5);
  });
});
