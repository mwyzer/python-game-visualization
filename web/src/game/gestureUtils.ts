import {
  INDEX_PIP,
  INDEX_TIP,
  MIDDLE_PIP,
  MIDDLE_TIP,
  PINKY_PIP,
  PINKY_TIP,
  RING_PIP,
  RING_TIP,
  THUMB_IP,
  THUMB_TIP,
} from "./constants";

export type HandShape = "ROCK" | "PAPER" | "SCISSORS" | "UNKNOWN";

export const SHAPE_INFO: Record<HandShape, { emoji: string; label: string }> = {
  ROCK: { emoji: "✊", label: "Batu" },
  PAPER: { emoji: "✋", label: "Kertas" },
  SCISSORS: { emoji: "✌️", label: "Gunting" },
  UNKNOWN: { emoji: "❔", label: "..." },
};

interface Landmark {
  x: number;
  y: number;
}

function isFingerRaised(lm: Landmark[], tipIdx: number, pipIdx: number): boolean {
  return lm[tipIdx].y < lm[pipIdx].y;
}

function isThumbRaised(lm: Landmark[]): boolean {
  return Math.abs(lm[THUMB_TIP].x - lm[THUMB_IP].x) > 0.06;
}

/** Classify a hand's 21 landmarks into Batu/Gunting/Kertas, mirroring the
 * finger-counting heuristic already used for the desktop app's HUD. */
export function classifyHandShape(lm: Landmark[]): HandShape {
  const thumb = isThumbRaised(lm);
  const index = isFingerRaised(lm, INDEX_TIP, INDEX_PIP);
  const middle = isFingerRaised(lm, MIDDLE_TIP, MIDDLE_PIP);
  const ring = isFingerRaised(lm, RING_TIP, RING_PIP);
  const pinky = isFingerRaised(lm, PINKY_TIP, PINKY_PIP);

  const raisedCount = [thumb, index, middle, ring, pinky].filter(Boolean).length;

  if (raisedCount === 0) return "ROCK";
  if (raisedCount >= 4) return "PAPER";
  if (index && middle && !ring && !pinky) return "SCISSORS";
  return "UNKNOWN";
}

/** rock-paper-scissors: 1 = a beats b, -1 = b beats a, 0 = draw. */
export function beats(a: HandShape, b: HandShape): number {
  if (a === b) return 0;
  const winsAgainst: Record<string, HandShape> = {
    ROCK: "SCISSORS",
    SCISSORS: "PAPER",
    PAPER: "ROCK",
  };
  return winsAgainst[a] === b ? 1 : -1;
}

export const PLAYABLE_SHAPES: HandShape[] = ["ROCK", "PAPER", "SCISSORS"];
