/** Shared game constants. Tweak values here instead of inside scenes. */
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const COLORS = {
  background: 0x1d1f2b,
  player: 0x4fc3f7,
  star: 0xffd54f,
  text: '#ffffff',
} as const;

export const PLAYER_SIZE = 40;
export const PLAYER_SPEED = 300; // pixels per second

export const STAR_SIZE = 20;
export const POINTS_PER_STAR = 1;
