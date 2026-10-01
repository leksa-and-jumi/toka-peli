import { describe, expect, it } from 'vitest';
import { creatureColour } from './colours';

const palette = [0xff0000, 0x00ff00, 0x0000ff];

describe('creatureColour', () => {
  it('gives each new creature the next colour', () => {
    expect([0, 1, 2].map((n) => creatureColour(n, palette))).toEqual(palette);
  });

  it('starts again from the first colour after the last one', () => {
    expect(creatureColour(3, palette)).toBe(0xff0000);
  });

  it('rejects an empty palette and odd counts', () => {
    expect(() => creatureColour(0, [])).toThrow(RangeError);
    expect(() => creatureColour(-1, palette)).toThrow(RangeError);
  });
});
