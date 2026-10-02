import { describe, expect, it } from 'vitest';
import {
  areFoes,
  bodyBox,
  boxAt,
  growBox,
  bounceApart,
  bumpDamage,
  healthLevel,
  mass,
  overlaps,
  pickWord,
  pushApart,
  walkSpeedFor,
} from './combat';

const rules = { base: 10, minFactor: 0.5, maxFactor: 3 };

describe('bodyBox and overlaps', () => {
  it('finds creatures that touch', () => {
    const a = bodyBox(100, 500, { halfWidth: 10, height: 40 });
    const b = bodyBox(115, 500, { halfWidth: 10, height: 40 });
    const far = bodyBox(200, 500, { halfWidth: 10, height: 40 });
    expect(overlaps(a, b)).toBe(true);
    expect(overlaps(a, far)).toBe(false);
  });

  it('ignores creatures on different floors', () => {
    const low = bodyBox(100, 500, { halfWidth: 10, height: 40 });
    const high = bodyBox(100, 300, { halfWidth: 10, height: 40 });
    expect(overlaps(low, high)).toBe(false);
  });
});

describe('mass', () => {
  it('is the area of the box but never zero', () => {
    expect(mass({ halfWidth: 10, height: 30 })).toBe(600);
    expect(mass({ halfWidth: 0, height: 0 })).toBe(1);
  });
});

describe('bumpDamage', () => {
  it('is the base damage between equals', () => {
    expect(bumpDamage(100, 100, rules)).toBe(10);
  });

  it('lets big creatures take more from small ones', () => {
    expect(bumpDamage(400, 100, rules)).toBe(20);
    expect(bumpDamage(100, 400, rules)).toBe(5);
  });

  it('stays within the limits', () => {
    expect(bumpDamage(10000, 1, rules)).toBe(30);
    expect(bumpDamage(1, 10000, rules)).toBe(5);
  });
});

describe('bounceApart', () => {
  it('sends both away from each other', () => {
    expect(bounceApart(100, 200)).toEqual({ a: -1, b: 1 });
    expect(bounceApart(200, 100)).toEqual({ a: 1, b: -1 });
  });
});

describe('walkSpeedFor', () => {
  const speed = { base: 80, referenceHeight: 70, minFactor: 0.6, maxFactor: 1.6 };

  it('walks at the base speed at the reference height', () => {
    expect(walkSpeedFor(70, speed)).toBe(80);
  });

  it('is faster when small and slower when big, within limits', () => {
    expect(walkSpeedFor(35, speed)).toBe(128);
    expect(walkSpeedFor(10, speed)).toBe(128);
    expect(walkSpeedFor(1000, speed)).toBe(48);
  });
});

describe('healthLevel', () => {
  it('goes from good to ok to low', () => {
    expect(healthLevel(100, 100)).toBe('good');
    expect(healthLevel(50, 100)).toBe('ok');
    expect(healthLevel(10, 100)).toBe('low');
  });
});

describe('pickWord', () => {
  it('picks a word with the given dice', () => {
    expect(pickWord(['PUM!', 'BONK!'], () => 0)).toBe('PUM!');
    expect(pickWord(['PUM!', 'BONK!'], () => 0.99)).toBe('BONK!');
  });

  it('rejects an empty list', () => {
    expect(() => pickWord([])).toThrow(RangeError);
  });
});

describe('pushApart', () => {
  it('pushes both sideways until they no longer overlap', () => {
    const a = bodyBox(100, 500, { halfWidth: 10, height: 40 });
    const b = bodyBox(110, 500, { halfWidth: 10, height: 40 });
    expect(pushApart(a, b, 1)).toEqual({ a: -6, b: 6 });
    expect(pushApart(b, a, 1)).toEqual({ a: 6, b: -6 });
  });

  it('does nothing when they do not overlap', () => {
    const a = bodyBox(100, 500, { halfWidth: 10, height: 40 });
    const far = bodyBox(200, 500, { halfWidth: 10, height: 40 });
    expect(pushApart(a, far, 1)).toEqual({ a: 0, b: 0 });
  });
});

describe('areFoes', () => {
  it('lets the same kind walk past each other', () => {
    expect(areFoes('Kissa', 'Kissa')).toBe(false);
  });

  it('makes different kinds bump', () => {
    expect(areFoes('Kissa', 'Robotti')).toBe(true);
  });
});

describe('boxAt', () => {
  const left = bodyBox(100, 500, { halfWidth: 20, height: 40 });
  const right = bodyBox(115, 500, { halfWidth: 20, height: 40 });

  it('finds the creature under the mouse, the top one first', () => {
    expect(boxAt([left, right], { x: 90, y: 480 })).toBe(0);
    expect(boxAt([left, right], { x: 110, y: 480 })).toBe(1);
  });

  it('is -1 on empty paper', () => {
    expect(boxAt([left, right], { x: 400, y: 100 })).toBe(-1);
  });
});

describe('growBox', () => {
  it('grows the box on every side', () => {
    const box = { left: 10, top: 20, right: 30, bottom: 40 };
    expect(growBox(box, 5)).toEqual({ left: 5, top: 15, right: 35, bottom: 45 });
  });
});
