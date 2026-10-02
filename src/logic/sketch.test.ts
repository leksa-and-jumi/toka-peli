import { describe, expect, it } from 'vitest';
import { boundsOf, toLocal } from './sketch';

const line = { from: { x: 10, y: 20 }, to: { x: 30, y: 5 } };

describe('boundsOf', () => {
  it('is null when nothing is drawn', () => {
    expect(boundsOf([], 3)).toBeNull();
  });

  it('wraps every segment and the pen thickness', () => {
    const dot = { from: { x: 50, y: 40 }, to: { x: 50, y: 40 } };
    expect(boundsOf([line, dot], 3)).toEqual({ left: 7, top: 2, right: 53, bottom: 43 });
  });
});

describe('toLocal', () => {
  it('moves segments so the origin becomes zero', () => {
    expect(toLocal([line], { x: 10, y: 20 })).toEqual([
      { from: { x: 0, y: 0 }, to: { x: 20, y: -15 } },
    ]);
  });
});
