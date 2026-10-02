import { describe, expect, it } from 'vitest';
import { type Creature, type CreatureRules, stepCreature } from './creature';
import { SolidGrid } from './solidGrid';

const rules: CreatureRules = { walkSpeed: 100, gravity: 1000, maxStep: 8, worldWidth: 800 };
const size = { halfWidth: 10, height: 30 };
const FLOOR = 500;
const standing: Creature = { x: 400, y: FLOOR, fallSpeed: 0, dir: 1 };

const emptyWorld = (): SolidGrid => new SolidGrid(800, 600, 4, FLOOR);

describe('stepCreature', () => {
  it('falls when nothing holds it up', () => {
    const next = stepCreature({ ...standing, y: 100 }, size, rules, emptyWorld(), 0.1);
    expect(next.y).toBeGreaterThan(100);
    expect(next.fallSpeed).toBe(100);
    expect(next.x).toBe(400);
  });

  it('lands on the floor', () => {
    const next = stepCreature(
      { ...standing, y: 498, fallSpeed: 300 },
      size,
      rules,
      emptyWorld(),
      0.1,
    );
    expect(next.y).toBe(FLOOR);
    expect(next.fallSpeed).toBe(0);
  });

  it('lands on a drawn bridge', () => {
    const world = emptyWorld();
    world.stamp({ from: { x: 300, y: 300 }, to: { x: 500, y: 300 } }, 3);
    let creature: Creature = { ...standing, y: 200 };
    for (let i = 0; i < 60; i++) creature = stepCreature(creature, size, rules, world, 1 / 60);
    expect(creature.y).toBeLessThan(300);
    expect(creature.y).toBeGreaterThan(290);
    expect(creature.fallSpeed).toBe(0);
  });

  it('walks forward on the floor', () => {
    expect(stepCreature(standing, size, rules, emptyWorld(), 0.5).x).toBe(450);
    expect(stepCreature({ ...standing, dir: -1 }, size, rules, emptyWorld(), 0.5).x).toBe(350);
  });

  it('walks up a gentle slope', () => {
    const world = emptyWorld();
    world.stamp({ from: { x: 400, y: 498 }, to: { x: 600, y: 420 } }, 3);
    let creature = standing;
    for (let i = 0; i < 60; i++) creature = stepCreature(creature, size, rules, world, 1 / 60);
    expect(creature.x).toBeGreaterThan(450);
    expect(creature.y).toBeLessThan(FLOOR - 10);
  });

  it('turns around at a wall', () => {
    const world = emptyWorld();
    world.stamp({ from: { x: 420, y: 400 }, to: { x: 420, y: 500 } }, 3);
    let creature = standing;
    for (let i = 0; i < 30; i++) creature = stepCreature(creature, size, rules, world, 1 / 60);
    expect(creature.dir).toBe(-1);
    expect(creature.x).toBeLessThan(420);
  });

  it('turns around at the edges of the world', () => {
    const right = stepCreature({ ...standing, x: 785 }, size, rules, emptyWorld(), 0.1);
    expect(right).toMatchObject({ x: 790, dir: -1 });
    const left = stepCreature({ ...standing, x: 15, dir: -1 }, size, rules, emptyWorld(), 0.1);
    expect(left).toMatchObject({ x: 10, dir: 1 });
  });

  it('climbs out when a line is drawn through it', () => {
    const world = emptyWorld();
    world.stamp({ from: { x: 380, y: 490 }, to: { x: 420, y: 490 } }, 3);
    expect(stepCreature(standing, size, rules, world, 0.1).y).toBe(FLOOR - 1);
  });

  it('stands still when it is wider than the world', () => {
    const wide = { halfWidth: 500, height: 30 };
    expect(stepCreature(standing, wide, rules, emptyWorld(), 1).x).toBe(400);
  });
});
