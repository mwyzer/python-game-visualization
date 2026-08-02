import {
  COLOR,
  GESTURE_DWELL_MS,
  SIMON_FEEDBACK_MS,
  SIMON_GAP_MS,
  SIMON_SHOW_MS,
  SIMON_WRONG_MS,
} from "./constants";
import { HandShape, PLAYABLE_SHAPES, SHAPE_INFO } from "./gestureUtils";

type Phase = "SHOWING" | "PLAYING" | "WRONG";

export class SimonSaysGame {
  private frameW: number;
  private frameH: number;
  sequence: HandShape[] = [];
  best = 0;
  phase: Phase = "SHOWING";

  private showIndex = 0;
  private showingIcon = true;
  private showTimer = 0;
  private playIndex = 0;
  private currentShape: HandShape = "UNKNOWN";
  private dwellShape: HandShape = "UNKNOWN";
  private dwellMs = 0;
  private requireNeutral = false;
  private wrongMs = 0;
  private feedbackMs = 0;

  constructor(frameW: number, frameH: number) {
    this.frameW = frameW;
    this.frameH = frameH;
    this.startNewSequence();
  }

  private randomShape(): HandShape {
    return PLAYABLE_SHAPES[Math.floor(Math.random() * PLAYABLE_SHAPES.length)];
  }

  private startNewSequence() {
    this.sequence = [this.randomShape()];
    this.beginShowing();
  }

  private beginShowing() {
    this.phase = "SHOWING";
    this.showIndex = 0;
    this.showingIcon = true;
    this.showTimer = SIMON_SHOW_MS;
  }

  update(shape: HandShape, dtMs: number) {
    this.currentShape = shape;

    if (this.phase === "SHOWING") {
      this.showTimer -= dtMs;
      if (this.showTimer <= 0) {
        if (this.showingIcon) {
          this.showingIcon = false;
          this.showTimer = SIMON_GAP_MS;
        } else {
          this.showIndex++;
          if (this.showIndex >= this.sequence.length) {
            this.phase = "PLAYING";
            this.playIndex = 0;
            this.requireNeutral = true;
            this.dwellShape = "UNKNOWN";
            this.dwellMs = 0;
          } else {
            this.showingIcon = true;
            this.showTimer = SIMON_SHOW_MS;
          }
        }
      }
      return;
    }

    if (this.phase === "WRONG") {
      this.wrongMs -= dtMs;
      if (this.wrongMs <= 0) {
        this.best = Math.max(this.best, this.sequence.length - 1);
        this.startNewSequence();
      }
      return;
    }

    // PLAYING
    if (this.feedbackMs > 0) {
      this.feedbackMs -= dtMs;
      return;
    }

    if (this.requireNeutral) {
      if (shape === "UNKNOWN") this.requireNeutral = false;
      return;
    }

    if (!PLAYABLE_SHAPES.includes(shape)) {
      this.dwellShape = "UNKNOWN";
      this.dwellMs = 0;
      return;
    }

    this.dwellMs = shape === this.dwellShape ? this.dwellMs + dtMs : dtMs;
    this.dwellShape = shape;

    if (this.dwellMs >= GESTURE_DWELL_MS) {
      this.submit(shape);
    }
  }

  private submit(shape: HandShape) {
    this.dwellMs = 0;
    this.dwellShape = "UNKNOWN";
    const expected = this.sequence[this.playIndex];

    if (shape !== expected) {
      this.phase = "WRONG";
      this.wrongMs = SIMON_WRONG_MS;
      return;
    }

    this.playIndex++;
    if (this.playIndex >= this.sequence.length) {
      this.sequence.push(this.randomShape());
      this.beginShowing();
    } else {
      this.feedbackMs = SIMON_FEEDBACK_MS;
      this.requireNeutral = true;
    }
  }

  private dwellProgress(): number {
    return Math.min(this.dwellMs / GESTURE_DWELL_MS, 1);
  }

  private drawSequenceDots(ctx: CanvasRenderingContext2D, filledUpTo: number) {
    const w = this.frameW;
    const n = this.sequence.length;
    const spacing = 26;
    const startX = w / 2 - ((n - 1) * spacing) / 2;
    for (let i = 0; i < n; i++) {
      const x = startX + i * spacing;
      ctx.beginPath();
      ctx.arc(x, 70, 7, 0, Math.PI * 2);
      ctx.fillStyle = i < filledUpTo ? COLOR.green : "#444";
      ctx.fill();
      ctx.strokeStyle = COLOR.white;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const w = this.frameW;
    const h = this.frameH;

    ctx.fillStyle = COLOR.cyan;
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SIMON SAYS: GESTUR", w / 2, 40);

    if (this.phase === "SHOWING") {
      this.drawSequenceDots(ctx, this.showIndex + (this.showingIcon ? 0 : 1));

      ctx.fillStyle = COLOR.white;
      ctx.font = "16px sans-serif";
      ctx.fillText("Perhatikan urutannya...", w / 2, 105);

      ctx.font = "90px sans-serif";
      if (this.showingIcon) {
        ctx.fillText(SHAPE_INFO[this.sequence[this.showIndex]].emoji, w / 2, h / 2);
      }
    } else if (this.phase === "PLAYING") {
      this.drawSequenceDots(ctx, this.playIndex);

      ctx.fillStyle = COLOR.white;
      ctx.font = "16px sans-serif";
      ctx.fillText(
        this.requireNeutral ? "Turunkan tangan, lalu lanjutkan" : "Giliranmu — ulangi urutannya",
        w / 2,
        105
      );

      const info = SHAPE_INFO[this.currentShape];
      ctx.font = "90px sans-serif";
      ctx.fillText(info.emoji, w / 2, h / 2);

      if (this.feedbackMs > 0) {
        ctx.fillStyle = COLOR.green;
        ctx.font = "bold 28px sans-serif";
        ctx.fillText("BENAR!", w / 2, h / 2 + 70);
      } else if (!this.requireNeutral && this.dwellShape !== "UNKNOWN") {
        const cx = w / 2;
        const cy = h / 2 + 80;
        const progress = this.dwellProgress();
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = COLOR.green;
        ctx.beginPath();
        ctx.arc(cx, cy, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = COLOR.red;
      ctx.font = "bold 34px sans-serif";
      ctx.fillText("SALAH!", w / 2, h / 2 - 10);
      ctx.fillStyle = COLOR.white;
      ctx.font = "18px sans-serif";
      ctx.fillText(`Skor ronde ini: ${this.sequence.length - 1}`, w / 2, h / 2 + 30);
    }

    ctx.textAlign = "left";
    this.drawStatus(ctx);
  }

  drawStatus(ctx: CanvasRenderingContext2D) {
    const current = this.phase === "WRONG" ? this.sequence.length - 1 : this.sequence.length;
    ctx.fillStyle = COLOR.gold;
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`Level: ${current}  Terbaik: ${Math.max(this.best, current)}`, this.frameW - 20, 35);
    ctx.textAlign = "left";
  }
}
