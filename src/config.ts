/** Shared game constants. Tweak values here instead of inside scenes. */
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const COLORS = {
  background: 0xffffff,
  pen: 0x222222,
  floor: 0xbbbbbb,
  eraserRing: 0x888888,
  // Dark text so it shows up on the white background.
  text: '#222222',
} as const;

/** Mouse drawing. */
export const PEN_WIDTH = 6;
export const ERASER_WIDTH = 30;
export const PEN_MIN_STEP = 2; // pixels the mouse must move before a new line piece
export const PEN_MAX_PIECE = 10; // longer pieces are cut up so the eraser can wipe parts of them

export const HELP_TEXT = { y: 24, fontSize: '18px' } as const;
/** Pen/eraser switch, in the bottom right corner below the floor. */
export const TOOL_BUTTON = { x: GAME_WIDTH - 12, y: GAME_HEIGHT - 8, fontSize: '22px' } as const;
export const HINT_TEXT = { y: 60, fontSize: '24px', showMs: 1500 } as const;

/** The line the living drawings walk on. */
export const FLOOR_Y = GAME_HEIGHT - 40;
export const FLOOR_THICKNESS = 2;

/** Size of one cell in the grid that remembers where bridges are. */
export const SOLID_CELL = 4;
/** Lines closer than this belong to the same picture when K wakes it up. */
export const PICTURE_REACH = PEN_WIDTH * 2;

/** How a drawing behaves after it wakes up. */
export const CREATURE = {
  walkSpeed: 80, // pixels per second
  gravity: 1200, // pixels per second squared
  maxStep: 12, // highest bump it can walk up, in pixels
  wobbleDegrees: 6,
  wobblePerMs: 0.01,
  hopHeight: 4,
} as const;
