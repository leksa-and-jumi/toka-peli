/** Shared game constants. Tweak values here instead of inside scenes. */
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const COLORS = {
  background: 0xffffff,
  pen: 0x222222,
  // Dark text so it shows up on the white background.
  text: '#222222',
} as const;

/** Mouse drawing. */
export const PEN_WIDTH = 6;
export const PEN_MIN_STEP = 2; // pixels the mouse must move before a new line piece

export const HELP_TEXT = { y: GAME_HEIGHT - 24, fontSize: '18px' } as const;
