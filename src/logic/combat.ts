import type { CreatureSize } from './creature';

/** A box around a creature on screen. */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function bodyBox(x: number, y: number, size: CreatureSize): Box {
  return { left: x - size.halfWidth, top: y - size.height, right: x + size.halfWidth, bottom: y };
}

export function overlaps(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** How heavy a creature is: the area of its box. Never zero, even for a flat line. */
export function mass(size: CreatureSize): number {
  return Math.max(1, size.halfWidth * 2) * Math.max(1, size.height);
}

export interface DamageRules {
  base: number;
  minFactor: number;
  maxFactor: number;
}

/**
 * Energy the attacker knocks off the defender in one bump.
 * Bigger attackers hit harder, smaller ones softer, within limits.
 */
export function bumpDamage(attackerMass: number, defenderMass: number, rules: DamageRules): number {
  const factor = Math.sqrt(attackerMass / defenderMass);
  return rules.base * Math.min(rules.maxFactor, Math.max(rules.minFactor, factor));
}

/** After a bump both turn away from each other. */
export function bounceApart(ax: number, bx: number): { a: 1 | -1; b: 1 | -1 } {
  return ax <= bx ? { a: -1, b: 1 } : { a: 1, b: -1 };
}

/** Small creatures scurry, big ones lumber. */
export function walkSpeedFor(
  height: number,
  rules: { base: number; referenceHeight: number; minFactor: number; maxFactor: number },
): number {
  const factor = rules.referenceHeight / Math.max(1, height);
  return rules.base * Math.min(rules.maxFactor, Math.max(rules.minFactor, factor));
}

export type HealthLevel = 'good' | 'ok' | 'low';

export function healthLevel(health: number, maxHealth: number): HealthLevel {
  const fraction = health / maxHealth;
  if (fraction > 0.6) return 'good';
  if (fraction > 0.3) return 'ok';
  return 'low';
}

export function pickWord(words: readonly string[], random: () => number = Math.random): string {
  if (words.length === 0) throw new RangeError('words must not be empty');
  return words[Math.min(words.length - 1, Math.floor(random() * words.length))] as string;
}

/**
 * How far to push two overlapping creatures apart, sideways, so they stop touching.
 * Returns the move for each: `a` goes one way, `b` the other.
 */
export function pushApart(a: Box, b: Box, margin: number): { a: number; b: number } {
  const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  if (overlap <= 0) return { a: 0, b: 0 };
  const half = overlap / 2 + margin;
  const aCentre = (a.left + a.right) / 2;
  const bCentre = (b.left + b.right) / 2;
  return aCentre <= bCentre ? { a: -half, b: half } : { a: half, b: -half };
}
