import { describe, expect, it } from 'vitest';
import { eraseFromBody } from './bodyErase';
import type { Stroke } from './sketch';

// A tiny body standing at (100, 200): a head line at the top and a leg below.
const head: Stroke = [{ from: { x: -10, y: -40 }, to: { x: 10, y: -40 } }];
const leg: Stroke = [{ from: { x: 0, y: -20 }, to: { x: 0, y: 0 } }];
const pose = { x: 100, y: 200, dir: 1 as const };
const dot = (x: number, y: number) => ({ from: { x, y }, to: { x, y } });

describe('eraseFromBody', () => {
  it('returns null when the eraser misses', () => {
    expect(eraseFromBody([head, leg], dot(300, 300), 5, 0, pose)).toBeNull();
  });

  it('is gone when everything is wiped', () => {
    expect(eraseFromBody([leg], dot(100, 190), 15, 0, pose)).toBe('gone');
  });

  it('moves the feet up when the legs are wiped', () => {
    const cut = eraseFromBody([head, leg], dot(100, 190), 12, 0, pose);
    expect(cut).not.toBe('gone');
    expect(cut).not.toBeNull();
    if (!cut || cut === 'gone') return;
    expect(cut.strokes).toEqual([[{ from: { x: -10, y: 0 }, to: { x: 10, y: 0 } }]]);
    expect(cut.feetShift).toEqual({ x: 0, y: -40 });
    expect(cut.size).toEqual({ halfWidth: 10, height: 0 });
  });

  it('mirrors the eraser when the body faces left', () => {
    // Only the right half of the head is erased in body terms; facing left
    // that half is on the world's left side.
    const wide: Stroke = [
      { from: { x: -20, y: 0 }, to: { x: -10, y: 0 } },
      { from: { x: 10, y: 0 }, to: { x: 20, y: 0 } },
    ];
    const facingLeft = { x: 100, y: 200, dir: -1 as const };
    const cut = eraseFromBody([wide], dot(85, 200), 2, 0, facingLeft);
    if (!cut || cut === 'gone') throw new Error('expected a cut');
    expect(cut.feetShift.x).toBe(15);
  });
});
