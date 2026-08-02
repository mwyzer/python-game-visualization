import { AREA_DWELL_MS, COLOR } from "./constants";
import { createPhotoPuzzle, PuzzleBoard } from "./puzzle";
import type { FingerState } from "./types";

const DWELL_RADIUS = 18;
const MIN_SIZE = 160;

type Corner = { x: number; y: number } | null;

class AreaSelector {
  corner1: Corner = null;
  corner2: Corner = null;
  private dwellPos: { x: number; y: number } | null = null;
  private dwellMs = 0;

  get done(): boolean {
    return this.corner1 !== null && this.corner2 !== null;
  }

  dwellProgress(): number {
    return Math.min(this.dwellMs / AREA_DWELL_MS, 1);
  }

  tick(finger: FingerState, dtMs: number) {
    if (this.done || !finger.visible) {
      this.dwellPos = null;
      this.dwellMs = 0;
      return;
    }

    if (!this.dwellPos) {
      this.dwellPos = { x: finger.x, y: finger.y };
      this.dwellMs = dtMs;
    } else {
      const dx = finger.x - this.dwellPos.x;
      const dy = finger.y - this.dwellPos.y;
      if (dx * dx + dy * dy <= DWELL_RADIUS * DWELL_RADIUS) {
        this.dwellMs += dtMs;
      } else {
        this.dwellPos = { x: finger.x, y: finger.y };
        this.dwellMs = dtMs;
      }
    }

    if (this.dwellMs >= AREA_DWELL_MS) {
      this.lock(finger.x, finger.y);
      this.dwellPos = null;
      this.dwellMs = 0;
    }
  }

  private lock(x: number, y: number) {
    if (!this.corner1) {
      this.corner1 = { x, y };
    } else {
      let lx = x;
      let ly = y;
      if (Math.abs(x - this.corner1.x) < MIN_SIZE) {
        lx = x >= this.corner1.x ? this.corner1.x + MIN_SIZE : this.corner1.x - MIN_SIZE;
      }
      if (Math.abs(y - this.corner1.y) < MIN_SIZE) {
        ly = y >= this.corner1.y ? this.corner1.y + MIN_SIZE : this.corner1.y - MIN_SIZE;
      }
      this.corner2 = { x: lx, y: ly };
    }
  }

  getRect(frameW: number, frameH: number) {
    if (!this.done || !this.corner1 || !this.corner2) return null;
    const x1 = Math.max(0, Math.min(this.corner1.x, this.corner2.x));
    const y1 = Math.max(0, Math.min(this.corner1.y, this.corner2.y));
    const x2 = Math.min(frameW, Math.max(this.corner1.x, this.corner2.x));
    const y2 = Math.min(frameH, Math.max(this.corner1.y, this.corner2.y));
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }

  draw(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    finger: FingerState
  ) {
    ctx.fillStyle = "rgba(10, 10, 20, 0.25)";
    ctx.fillRect(0, 0, w, h);

    if (this.corner1) {
      ctx.fillStyle = COLOR.green;
      ctx.beginPath();
      ctx.arc(this.corner1.x, this.corner1.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLOR.white;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (this.corner1 && finger.visible) {
      ctx.strokeStyle = COLOR.cyan;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        this.corner1.x,
        this.corner1.y,
        finger.x - this.corner1.x,
        finger.y - this.corner1.y
      );
    }

    if (finger.visible) {
      ctx.strokeStyle = COLOR.yellow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(finger.x, finger.y, 10, 0, Math.PI * 2);
      ctx.stroke();

      if (this.dwellPos) {
        const progress = this.dwellProgress();
        ctx.strokeStyle = COLOR.green;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(finger.x, finger.y, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.stroke();
      }
    }

    const instruction = this.corner1 === null
      ? "Tahan diam di sudut PERTAMA area"
      : "Tahan diam di sudut KEDUA area";
    ctx.fillStyle = COLOR.white;
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(instruction, w / 2, 40);
    ctx.textAlign = "left";
  }
}

export class PhotoPuzzleGame {
  private frameW: number;
  private frameH: number;
  state: "CORNER1" | "CORNER2" | "PLAYING" = "CORNER1";
  private selector = new AreaSelector();
  board: PuzzleBoard | null = null;
  private solutionThumb: HTMLCanvasElement | null = null;
  private lastFinger: FingerState = { x: -1, y: -1, visible: false };

  constructor(frameW: number, frameH: number) {
    this.frameW = frameW;
    this.frameH = frameH;
  }

  update(finger: FingerState, dtMs: number, cleanCanvas: HTMLCanvasElement) {
    this.lastFinger = finger;
    if (this.state !== "PLAYING") {
      this.selector.tick(finger, dtMs);
      if (this.selector.corner1 !== null && this.state === "CORNER1") {
        this.state = "CORNER2";
      }
      if (this.selector.done) {
        this.capture(cleanCanvas);
      }
    } else {
      this.board?.update(finger, dtMs);
    }
  }

  private capture(cleanCanvas: HTMLCanvasElement) {
    const rect = this.selector.getRect(this.frameW, this.frameH);
    if (!rect) return;
    this.board = createPhotoPuzzle(
      this.frameW,
      this.frameH,
      cleanCanvas,
      rect.x,
      rect.y,
      rect.w,
      rect.h
    );

    const thumb = document.createElement("canvas");
    thumb.width = 90;
    thumb.height = 90;
    thumb
      .getContext("2d")!
      .drawImage(cleanCanvas, rect.x, rect.y, rect.w, rect.h, 0, 0, 90, 90);
    this.solutionThumb = thumb;

    this.state = "PLAYING";
  }

  reshuffle() {
    this.board?.shuffle();
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.state !== "PLAYING") {
      this.selector.draw(ctx, this.frameW, this.frameH, this.lastFinger);
      return;
    }

    this.board?.draw(ctx);

    if (this.solutionThumb) {
      const x = 20;
      const y = 55;
      ctx.strokeStyle = COLOR.white;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 3, y - 3, 96, 96);
      ctx.drawImage(this.solutionThumb, x, y, 90, 90);
      ctx.fillStyle = COLOR.white;
      ctx.font = "12px sans-serif";
      ctx.fillText("Target", x, y - 10);
    }
  }

  drawStatus(ctx: CanvasRenderingContext2D) {
    if (this.state === "PLAYING" && this.board) {
      this.board.drawStatus(ctx, this.frameW, this.frameH);
    }
  }
}
