import { COLOR, GESTURE_DWELL_MS, RPS_REVEAL_MS } from "./constants";
import { beats, HandShape, PLAYABLE_SHAPES, SHAPE_INFO } from "./gestureUtils";

type Phase = "WAITING" | "REVEAL";
type Outcome = "WIN" | "LOSE" | "DRAW";

export class RockPaperScissorsGame {
  private frameW: number;
  private frameH: number;
  phase: Phase = "WAITING";
  wins = 0;
  losses = 0;
  draws = 0;
  playerShape: HandShape = "UNKNOWN";
  aiShape: HandShape = "UNKNOWN";
  result: Outcome | null = null;

  private currentShape: HandShape = "UNKNOWN";
  private dwellShape: HandShape = "UNKNOWN";
  private dwellMs = 0;
  private revealMs = 0;
  private requireNeutral = false;

  constructor(frameW: number, frameH: number) {
    this.frameW = frameW;
    this.frameH = frameH;
  }

  update(shape: HandShape, dtMs: number) {
    this.currentShape = shape;

    if (this.phase === "REVEAL") {
      this.revealMs -= dtMs;
      if (this.revealMs <= 0) {
        this.phase = "WAITING";
        this.requireNeutral = true;
        this.dwellShape = "UNKNOWN";
        this.dwellMs = 0;
      }
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
      this.lockIn(shape);
    }
  }

  private dwellProgress(): number {
    return Math.min(this.dwellMs / GESTURE_DWELL_MS, 1);
  }

  private lockIn(playerShape: HandShape) {
    this.playerShape = playerShape;
    this.aiShape = PLAYABLE_SHAPES[Math.floor(Math.random() * PLAYABLE_SHAPES.length)];
    const outcome = beats(this.playerShape, this.aiShape);
    if (outcome === 1) {
      this.result = "WIN";
      this.wins++;
    } else if (outcome === -1) {
      this.result = "LOSE";
      this.losses++;
    } else {
      this.result = "DRAW";
      this.draws++;
    }
    this.phase = "REVEAL";
    this.revealMs = RPS_REVEAL_MS;
    this.dwellMs = 0;
    this.dwellShape = "UNKNOWN";
  }

  draw(ctx: CanvasRenderingContext2D) {
    const w = this.frameW;
    const h = this.frameH;

    ctx.fillStyle = COLOR.cyan;
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BATU GUNTING KERTAS", w / 2, 40);
    ctx.textAlign = "left";

    if (this.phase === "WAITING") {
      const info = SHAPE_INFO[this.currentShape];
      ctx.font = "90px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(info.emoji, w / 2, h / 2 - 10);

      ctx.fillStyle = COLOR.white;
      ctx.font = "16px sans-serif";
      ctx.fillText(
        this.requireNeutral
          ? "Turunkan tangan dulu untuk ronde baru"
          : "Tunjukkan Batu / Gunting / Kertas dan tahan",
        w / 2,
        h / 2 + 60
      );

      if (!this.requireNeutral && this.dwellShape !== "UNKNOWN") {
        const cx = w / 2;
        const cy = h / 2 + 100;
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
      ctx.textAlign = "left";
    } else {
      const playerInfo = SHAPE_INFO[this.playerShape];
      const aiInfo = SHAPE_INFO[this.aiShape];

      ctx.textAlign = "center";
      ctx.font = "80px sans-serif";
      ctx.fillText(playerInfo.emoji, w / 2 - 100, h / 2);
      ctx.fillText(aiInfo.emoji, w / 2 + 100, h / 2);

      ctx.fillStyle = COLOR.white;
      ctx.font = "14px sans-serif";
      ctx.fillText("Kamu: " + playerInfo.label, w / 2 - 100, h / 2 + 55);
      ctx.fillText("AI: " + aiInfo.label, w / 2 + 100, h / 2 + 55);

      ctx.font = "bold 26px sans-serif";
      ctx.fillText("VS", w / 2, h / 2 + 10);

      const resultColor =
        this.result === "WIN" ? COLOR.green : this.result === "LOSE" ? COLOR.red : COLOR.yellow;
      const resultText =
        this.result === "WIN" ? "KAMU MENANG!" : this.result === "LOSE" ? "KAMU KALAH!" : "SERI!";
      ctx.fillStyle = resultColor;
      ctx.font = "bold 32px sans-serif";
      ctx.fillText(resultText, w / 2, h / 2 - 90);
      ctx.textAlign = "left";
    }

    this.drawStatus(ctx);
  }

  drawStatus(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = COLOR.gold;
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`Menang: ${this.wins}  Kalah: ${this.losses}  Seri: ${this.draws}`, this.frameW - 20, 35);
    ctx.textAlign = "left";
  }
}
