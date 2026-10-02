import { describe, expect, it } from 'vitest';
import { SolidGrid } from './solidGrid';

describe('SolidGrid', () => {
  it('is solid at and below the floor', () => {
    const grid = new SolidGrid(100, 100, 4, 80);
    expect(grid.isSolidAt(50, 79)).toBe(false);
    expect(grid.isSolidAt(50, 80)).toBe(true);
    expect(grid.isAreaFree(10, 60, 20, 80)).toBe(true);
    expect(grid.isAreaFree(10, 60, 20, 81)).toBe(false);
  });

  it('makes stamped lines solid', () => {
    const grid = new SolidGrid(100, 100, 4, 100);
    grid.stamp({ from: { x: 10, y: 40 }, to: { x: 60, y: 40 } }, 3);
    expect(grid.isSolidAt(30, 40)).toBe(true);
    expect(grid.isSolidAt(30, 20)).toBe(false);
    expect(grid.isAreaFree(20, 20, 40, 36)).toBe(true);
    expect(grid.isAreaFree(20, 20, 40, 42)).toBe(false);
  });

  it('forgets everything when cleared', () => {
    const grid = new SolidGrid(100, 100, 4, 100);
    grid.stamp({ from: { x: 10, y: 40 }, to: { x: 60, y: 40 } }, 3);
    grid.clear();
    expect(grid.isSolidAt(30, 40)).toBe(false);
  });

  it('rejects a cell size of zero', () => {
    expect(() => new SolidGrid(100, 100, 0, 100)).toThrow(RangeError);
  });
});
