/** A drawing that has come alive. `x` is its middle, `y` is where its feet are. */
export interface Creature {
  x: number;
  y: number;
  fallSpeed: number;
  dir: 1 | -1;
}

export interface CreatureSize {
  halfWidth: number;
  height: number;
}

export interface CreatureRules {
  walkSpeed: number; // pixels per second
  gravity: number; // pixels per second squared
  maxStep: number; // highest bump it can walk up, in pixels
  /** Only this much of the body, from the feet up, bumps into lines. */
  collisionHeight: number;
  worldWidth: number;
}

/** Anything that can tell whether a box is empty, like the solid grid. */
export interface Ground {
  isAreaFree(left: number, top: number, right: number, bottom: number): boolean;
}

/** The part of the body that bumps into lines: its lower part, so big drawings don't get stuck. */
const bumpSize = (size: CreatureSize, rules: CreatureRules): CreatureSize => ({
  halfWidth: size.halfWidth,
  height: Math.min(size.height, rules.collisionHeight),
});

const bodyFree = (ground: Ground, x: number, y: number, size: CreatureSize): boolean =>
  ground.isAreaFree(x - size.halfWidth, y - size.height, x + size.halfWidth, y);

const standing = (ground: Ground, x: number, y: number, size: CreatureSize): boolean =>
  !ground.isAreaFree(x - size.halfWidth, y, x + size.halfWidth, y + 1);

/**
 * Move a creature forward in time. It falls when nothing holds it up,
 * walks up small bumps and slopes, and turns around at walls and world edges.
 */
export function stepCreature(
  creature: Creature,
  size: CreatureSize,
  rules: CreatureRules,
  ground: Ground,
  seconds: number,
): Creature {
  const { dir } = creature;
  let { x, y, fallSpeed } = creature;
  const bump = bumpSize(size, rules);

  // Something was drawn right through it.
  if (!bodyFree(ground, x, y, bump)) {
    // A low line: hop up onto it.
    for (let lift = 1; lift <= bump.height + rules.maxStep; lift++) {
      if (bodyFree(ground, x, y - lift, bump)) {
        return { ...creature, y: y - lift, fallSpeed: 0 };
      }
    }
    // A tall line: walk on through it like a ghost until it is free again.
    return walkForward(creature, size, rules, seconds);
  }

  if (!standing(ground, x, y, size)) {
    fallSpeed += rules.gravity * seconds;
    let drop = fallSpeed * seconds;
    while (drop > 0 && !standing(ground, x, y, size)) {
      const move = Math.min(1, drop);
      y += move;
      drop -= move;
    }
    if (standing(ground, x, y, size)) fallSpeed = 0;
    return { x, y, fallSpeed, dir };
  }

  const walked = walkForward(creature, size, rules, seconds);
  // Stopped or turned at the edge of the world.
  if (walked.x === x || walked.dir !== dir) return walked;
  const nextX = walked.x;

  for (let lift = 0; lift <= rules.maxStep; lift++) {
    if (bodyFree(ground, nextX, y - lift, bump)) {
      x = nextX;
      y -= lift;
      // Follow the ground down small slopes instead of hopping off them.
      for (let down = 0; down < rules.maxStep && !standing(ground, x, y, size); down++) {
        y += 1;
      }
      return { x, y, fallSpeed: 0, dir };
    }
  }
  // A wall too high to climb: turn around.
  return { x, y, fallSpeed: 0, dir: dir === 1 ? -1 : 1 };
}

/** Take one step forward, turning around at the edges of the world. Ignores lines. */
function walkForward(
  creature: Creature,
  size: CreatureSize,
  rules: CreatureRules,
  seconds: number,
): Creature {
  const minX = size.halfWidth;
  const maxX = rules.worldWidth - size.halfWidth;
  // Too wide to walk anywhere: just stand still.
  if (minX >= maxX) return { ...creature, fallSpeed: 0 };

  const x = creature.x + creature.dir * rules.walkSpeed * seconds;
  if (x <= minX) return { ...creature, x: minX, fallSpeed: 0, dir: 1 };
  if (x >= maxX) return { ...creature, x: maxX, fallSpeed: 0, dir: -1 };
  return { ...creature, x, fallSpeed: 0 };
}
