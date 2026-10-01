/** A drawing that has come alive. `x` is its middle, `y` is where its feet are. */
export interface Creature {
  x: number;
  y: number;
  fallSpeed: number;
  dir: 1 | -1;
}

export interface CreatureRules {
  walkSpeed: number; // pixels per second
  gravity: number; // pixels per second squared
  floorY: number;
  worldWidth: number;
}

/**
 * Move a creature forward in time: it falls until it lands on the floor,
 * then walks and turns around at the edges of the world.
 */
export function stepCreature(
  creature: Creature,
  halfWidth: number,
  rules: CreatureRules,
  seconds: number,
): Creature {
  if (creature.y < rules.floorY) {
    const fallSpeed = creature.fallSpeed + rules.gravity * seconds;
    const y = Math.min(creature.y + fallSpeed * seconds, rules.floorY);
    const landed = y >= rules.floorY;
    return { ...creature, y, fallSpeed: landed ? 0 : fallSpeed };
  }

  const minX = halfWidth;
  const maxX = rules.worldWidth - halfWidth;
  // Too wide to walk anywhere: just stand still.
  if (minX >= maxX) return creature;

  const x = creature.x + creature.dir * rules.walkSpeed * seconds;
  if (x <= minX) return { ...creature, x: minX, dir: 1 };
  if (x >= maxX) return { ...creature, x: maxX, dir: -1 };
  return { ...creature, x };
}
