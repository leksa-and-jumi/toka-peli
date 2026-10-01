import { describe, expect, it } from 'vitest';
import { type Creature, type CreatureRules, stepCreature } from './creature';

const rules: CreatureRules = { walkSpeed: 100, gravity: 1000, floorY: 500, worldWidth: 800 };
const standing: Creature = { x: 400, y: 500, fallSpeed: 0, dir: 1 };

describe('stepCreature', () => {
  it('falls when it is above the floor', () => {
    const next = stepCreature({ ...standing, y: 100 }, 20, rules, 0.1);
    expect(next.y).toBeGreaterThan(100);
    expect(next.fallSpeed).toBe(100);
    expect(next.x).toBe(400);
  });

  it('lands on the floor and stops falling', () => {
    const next = stepCreature({ ...standing, y: 499, fallSpeed: 300 }, 20, rules, 0.1);
    expect(next.y).toBe(500);
    expect(next.fallSpeed).toBe(0);
  });

  it('walks forward on the floor', () => {
    expect(stepCreature(standing, 20, rules, 0.5).x).toBe(450);
    expect(stepCreature({ ...standing, dir: -1 }, 20, rules, 0.5).x).toBe(350);
  });

  it('turns around at the edges', () => {
    const right = stepCreature({ ...standing, x: 775 }, 20, rules, 0.1);
    expect(right).toMatchObject({ x: 780, dir: -1 });
    const left = stepCreature({ ...standing, x: 25, dir: -1 }, 20, rules, 0.1);
    expect(left).toMatchObject({ x: 20, dir: 1 });
  });

  it('stands still when it is wider than the world', () => {
    expect(stepCreature(standing, 500, rules, 1)).toEqual(standing);
  });
});
