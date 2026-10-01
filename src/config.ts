/** Shared game constants. Tweak values here instead of inside scenes. */
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const COLORS = {
  background: 0xffffff,
  pen: 0x222222,
  floor: 0xbbbbbb,
  // Dark text so it shows up on the white background.
  text: '#222222',
} as const;

/** Mouse drawing. */
export const PEN_WIDTH = 6;
export const PEN_MIN_STEP = 2; // pixels the mouse must move before a new line piece

export const HELP_TEXT = { y: 24, fontSize: '18px' } as const;
export const HINT_TEXT = { y: 60, fontSize: '24px', showMs: 1500 } as const;

/** The line the living drawings walk on. */
export const FLOOR_Y = GAME_HEIGHT - 40;
export const FLOOR_THICKNESS = 2;

/** How a drawing behaves after it wakes up. */
export const CREATURE = {
  walkSpeed: 80, // pixels per second
  gravity: 1200, // pixels per second squared
  wobbleDegrees: 6,
  wobblePerMs: 0.01,
  hopHeight: 4,
} as const;
