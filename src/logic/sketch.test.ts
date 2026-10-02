import { describe, expect, it } from 'vitest';
import { boundsOf, lastPicture, type Stroke, strokesTouch, toLocal } from './sketch';

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

const across: Stroke = [{ from: { x: 0, y: 0 }, to: { x: 10, y: 0 } }];
const down: Stroke = [{ from: { x: 5, y: 2 }, to: { x: 5, y: 20 } }];
const farAway: Stroke = [{ from: { x: 100, y: 100 }, to: { x: 110, y: 100 } }];
const belowDown: Stroke = [{ from: { x: 5, y: 22 }, to: { x: 5, y: 30 } }];

describe('strokesTouch', () => {
  it('sees strokes that come close', () => {
    expect(strokesTouch(across, down, 3)).toBe(true);
  });

  it('ignores strokes far apart', () => {
    expect(strokesTouch(across, farAway, 3)).toBe(false);
  });
});

describe('lastPicture', () => {
  it('is empty when nothing is drawn', () => {
    expect(lastPicture([], 3)).toEqual([]);
  });

  it('keeps an earlier separate bridge out of the picture', () => {
    expect(lastPicture([farAway, across, down], 3)).toEqual([1, 2]);
  });

  it('follows strokes connected through other strokes', () => {
    expect(lastPicture([across, farAway, belowDown, down], 3)).toEqual([0, 2, 3]);
  });
});
