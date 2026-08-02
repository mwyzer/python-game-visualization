// Colors — CSS equivalents of the desktop version's BGR palette.
export const COLOR = {
  green: "#00ff88",
  red: "#ff3366",
  white: "#ffffff",
  black: "#000000",
  darkBg: "#14141e",
  amber: "#ffc800",
  yellow: "#ffff00",
  cyan: "#00ffff",
  purple: "#b450ff",
  blue: "#3296ff",
  orange: "#ffa500",
  gold: "#ffd700",
  panelBg: "#232332",
  slotBg: "#28283a",
  slotBorder: "#505064",
  btnNormal: "#4b4b32",
  btnHover: "#6e6e46",
  btnCorrect: "#3cb43c",
  btnWrong: "#c8321e",
} as const;

// Landmark indices (same as MediaPipe's 21-point hand model).
export const THUMB_TIP = 4;
export const THUMB_IP = 3;
export const INDEX_TIP = 8;
export const INDEX_PIP = 6;
export const MIDDLE_TIP = 12;
export const MIDDLE_PIP = 10;
export const RING_TIP = 16;
export const RING_PIP = 14;
export const PINKY_TIP = 20;
export const PINKY_PIP = 18;
export const WRIST = 0;

// Timing thresholds, in milliseconds (time-based so behavior is consistent
// regardless of the browser's actual frame rate).
export const MENU_SELECT_MS = 1000;
export const GRAB_DWELL_MS = 300;
export const AREA_DWELL_MS = 600;
export const FLAG_HOVER_MS = 650;
export const FLAG_FEEDBACK_MS = 2000;
export const FLAG_COOLDOWN_MS = 500;

export const GESTURE_DWELL_MS = 800;
export const RPS_REVEAL_MS = 2200;
export const RPS_COOLDOWN_MS = 600;
export const SIMON_SHOW_MS = 800;
export const SIMON_GAP_MS = 300;
export const SIMON_FEEDBACK_MS = 900;
export const SIMON_WRONG_MS = 1800;
