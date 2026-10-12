export const TARGET_GRID_WIDTH = 200;
export const MIN_PIXEL_SIZE = 4;
export const MAX_PIXEL_SIZE = 8;
export const NARROW_BREAKPOINT = 720;
export const RESIZE_DEBOUNCE_MS = 100;

export const HORIZON_RATIO = 0.42;
export const DECK_RATIO = 0.07;
export const DECK_MIN_ROWS = 6;
export const DECK_SEAM_EVERY = 6;
export const WATER_BANDS = [
  { from: 0, to: 0.18 },
  { from: 0.18, to: 0.42 },
  { from: 0.42, to: 0.7 },
  { from: 0.7, to: 1 },
] as const;
export const RIPPLE_RATIO = 0.11;
export const RIPPLE_ALPHA = 0.5;
export const RIPPLE_SWAY_CELLS = 3;
export const RIPPLE_SWAY_MS = 2400;
export const STAR_COUNT = 46;
export const STAR_SKY_SHARE = 0.9;
export const CLOUD_COUNT = 3;
export const MOON_TRAIL_LENGTH = 10;
export const MOON_WIDE = { right: 34, top: 10 };
export const MOON_NARROW = { right: 22, minTop: 4, aboveHorizon: 26 };
export const SPARKLE_THRESHOLD = 0.85;

export const WATER_ROW_OFFSET = 2;
export const WATER_DEPTH_POWER = 1.6;
export const WATER_HALF_WIDTH_RATIO = 0.42;
export const WATER_FAR_SCALE = 0.35;
export const CAST_D_MIN = 0.12;
export const CAST_D_MAX = 1;
export const AIM_MAX = 0.9;
export const AIM_NUDGE_RATE = 0.6;
export const AIM_MARKER_D = 0.5;
export const BAND_MID_FROM = 0.4;
export const BAND_FAR_FROM = 0.75;
export const YARDS_BASE = 5;
export const YARDS_SPAN = 55;

export const GRIP_X_RATIO = 0.74;
export const GRIP_Y_BELOW_DECK_TOP = 2;
export const TIP_X_RATIO = 0.6;
export const TIP_Y_WATER_RATIO = 0.18;
export const ROD_THICK_SHARE = 0.6;
export const ROD_BEND_DX = -6;
export const ROD_BEND_DY = 10;
export const REEL_SIZE = 3;
export const REEL_BELOW_FIST = 2;
export const LINE_SAG_RATIO = 0.12;
export const LINE_SAG_MIN = 1;
export const LINE_SAG_MAX = 10;
export const IDLE_BOB_MS = 1100;
export const IDLE_BOB_AMPLITUDE = 0.5;

export const BOBBER_BIG_UNTIL_D = 0.4;
export const BOBBER_BOB_MS = 700;
export const SPLASH_MS = 1100;
export const SPLASH_RINGS = 3;
export const SPLASH_RING_BASE = 2;
export const SPLASH_RING_GROW = 6;
export const SPLASH_RING_ASPECT = 1 / 3;
export const SPLASH_DROPLETS = 6;
export const SPLASH_DROPLET_RISE = 3;
export const SHADOW_ALPHA = 0.6;
export const SHADOW_ROWS = 2;
export const SHADOW_WIDTH_BASE = 6;
export const SHADOW_WIDTH_GROW = 10;
export const SHADOW_SURFACE_STAMINA = 0.3;
export const SHADOW_SURFACE_SPLASH_MS = 1500;

export const POWER_FILL_MS = 1100;
export const PERFECT_POWER = 0.97;
export const FLIGHT_BASE_MS = 450;
export const FLIGHT_PER_D_MS = 450;
export const FLIGHT_ARC_BASE = 8;
export const FLIGHT_ARC_PER_D = 14;
export const FLIGHT_SCALE_SWITCH_T = 0.5;

export const WAIT_MIN_S = 4;
export const WAIT_MAX_S = 12;
export const WAIT_FAR_MIN_S = 6;
export const WAIT_FAR_MAX_S = 16;
export const WAIT_RETRY_MIN_S = 3;
export const WAIT_RETRY_MAX_S = 8;
export const NIBBLE_MAX = 3;
export const NIBBLE_MARGIN_S = 1;
export const NIBBLE_MS = 220;
export const NIBBLE_DIP_CELLS = 1;
export const BITE_DIP_CELLS = 3;
export const BITE_TIP_DIP_CELLS = 3;
export const BITE_MARK_ROWS_ABOVE = 2;
export const HOOK_WINDOW_MS = 900;
export const HOOK_WINDOW_REDUCED_MS = 1300;
export const RETRIEVE_MS = 700;
export const LOST_TOAST_MS = 1200;
export const SNAP_SILENCE_MS = 400;

export const FIGHT_TENSION_START = 0.35;
export const FIGHT_PULL_FLOOR = 0.35;
export const FIGHT_PULL_SPAN = 0.65;
export const RUN_LENGTH_MIN = 0.6;
export const RUN_LENGTH_MAX = 1.4;
export const REEL_LINE_RATE = 0.14;
export const REEL_TENSION_DRAG = 0.6;
export const REEL_TENSION_RATE = 0.9;
export const REEL_STAMINA_DRAIN = 0.08;
export const REST_TENSION_RATE = 1.2;
export const STAMINA_DRAIN_RUNNING = 0.1;
export const STAMINA_DRAIN_IDLE = 0.02;
export const SNAP_HOLD_S = 0.5;
export const SLACK_TENSION = 0.04;
export const SLACK_HOLD_S = 2.5;
export const TENSION_ZONE_SOFT = 0.4;
export const TENSION_ZONE_HOT = 0.85;

export const HOLD_REEL_SPEED = 0.5;
export const CRANK_FULL_RPS = 2.5;
export const CRANK_DECAY_S = 0.3;
export const WHEEL_PX_PER_REV = 120;
export const WHEEL_LINE_PX = 16;
export const WHEEL_PAGE_PX = 400;
export const WHEEL_MAX_REVS_PER_EVENT = 1;
export const CIRCLE_MIN_STEP_PX = 6;
export const CIRCLE_MAX_STEP_REVS = 0.25;
export const CIRCLE_PRIME_REVS = 0.5;
export const REEL_IDLE_SPEED = 0.05;
export const REEL_HINT_MAX_S = 8;
export const REEL_SPIN_RATE = 120;
export const REEL_TICK_MS_SLOW = 140;
export const REEL_TICK_MS_FAST = 60;
export const HAPTIC_TENSION = 0.85;
export const HAPTIC_PULSE_MS = 30;
export const HAPTIC_INTERVAL_MS = 250;
export const HAPTIC_BITE_MS = 20;

export const MARLIN_MIN_D = 0.9;
export const MARLIN_MIN_LOG = 3;
export const MARLIN_CHANCE_NIGHT = 0.08;
export const MARLIN_CHANCE_DAY = 0.03;
export const WEIGHT_CURVE = 2.2;

export const LANDING_MS = 900;
export const CARD_FADE_MS = 200;
export const CATCH_LOG_CAP = 200;
export const RECENT_CATCHES = 10;
export const CARD_FISH_SCALE = 4;
export const CARD_WIDTH_NARROW = { max: 268, ratio: 0.72 };
export const CARD_WIDTH_WIDE = { max: 380, ratio: 0.4 };

export const POWER_METER_CELLS = { width: 4, height: 24 };
export const TENSION_METER = { widthRatio: 0.4, height: 3 };
export const TITLE_SCALE = 3;
export const TITLE_FONT_PX = 24;
