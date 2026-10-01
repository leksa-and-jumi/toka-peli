/**
 * The colour for the creature that wakes up as number `count` (0 = first).
 * Goes round the palette, so neighbours in waking order never share a colour.
 */
export function creatureColour(count: number, palette: readonly number[]): number {
  if (palette.length === 0) {
    throw new RangeError('palette must not be empty');
  }
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`count must be a whole number of at least 0, got ${count}`);
  }
  return palette[count % palette.length] as number;
}
