export enum GameScreen {
  MENU = "MENU",
  FLAG_GAME = "FLAG_GAME",
  PUZZLE = "PUZZLE",
  PHOTO_PUZZLE = "PHOTO_PUZZLE",
}

export interface FingerState {
  x: number;
  y: number;
  visible: boolean;
}

/** Common shape every mini-game follows, mirroring the desktop version. */
export interface Game {
  update(finger: FingerState, dtMs: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
  drawStatus?(ctx: CanvasRenderingContext2D): void;
}
