import { COLOR, FLAG_COOLDOWN_MS, FLAG_FEEDBACK_MS, FLAG_HOVER_MS } from "./constants";
import type { FingerState, Game } from "./types";

interface FlagEntry {
  name: string;
  emoji: string;
}

const FLAGS: FlagEntry[] = [
  { name: "Indonesia", emoji: "🇮🇩" },
  { name: "Jepang", emoji: "🇯🇵" },
  { name: "Malaysia", emoji: "🇲🇾" },
  { name: "Singapura", emoji: "🇸🇬" },
  { name: "Amerika Serikat", emoji: "🇺🇸" },
  { name: "Inggris", emoji: "🇬🇧" },
  { name: "China", emoji: "🇨🇳" },
  { name: "Jerman", emoji: "🇩🇪" },
  { name: "Prancis", emoji: "🇫🇷" },
  { name: "Brazil", emoji: "🇧🇷" },
  { name: "Korea Selatan", emoji: "🇰🇷" },
  { name: "India", emoji: "🇮🇳" },
  { name: "Australia", emoji: "🇦🇺" },
  { name: "Turki", emoji: "🇹🇷" },
  { name: "Arab Saudi", emoji: "🇸🇦" },
];

function sample4(): FlagEntry[] {
  const pool = [...FLAGS];
  const picked: FlagEntry[] = [];
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class AnswerButton {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  hovered = false;
  state: "normal" | "correct" | "wrong" = "normal";

  constructor(label: string, x: number, y: number, w: number, h: number) {
    this.label = label;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  contains(px: number, py: number) {
    return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
  }

  draw(ctx: CanvasRenderingContext2D) {
    let bg: string = COLOR.btnNormal;
    if (this.state === "correct") bg = COLOR.btnCorrect;
    else if (this.state === "wrong") bg = COLOR.btnWrong;
    else if (this.hovered) bg = COLOR.btnHover;

    ctx.fillStyle = bg;
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.strokeStyle = "#8c8c96";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.w, this.h);

    ctx.fillStyle = "#dcdcf0";
    ctx.font = "17px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.label, this.x + this.w / 2, this.y + this.h / 2 + 6);
    ctx.textAlign = "left";
  }
}

export class FlagGame implements Game {
  private frameW: number;
  private frameH: number;
  score = 0;
  totalRounds = 0;
  currentFlag: FlagEntry | null = null;
  buttons: AnswerButton[] = [];
  correctIdx = 0;
  feedbackMs = 0;
  cooldownMs = 0;
  private hoverMs = 0;
  private flagW = 260;
  private flagH = 160;
  private flagX: number;
  private flagY = 55;

  constructor(frameW: number, frameH: number) {
    this.frameW = frameW;
    this.frameH = frameH;
    this.flagX = (frameW - this.flagW) / 2;
    this.newRound();
  }

  private newRound() {
    this.feedbackMs = 0;
    this.cooldownMs = FLAG_COOLDOWN_MS;
    this.hoverMs = 0;

    const options = sample4();
    this.currentFlag = options[0];
    const shuffled = shuffle(options);
    this.correctIdx = shuffled.indexOf(this.currentFlag);

    const btnW = 260;
    const btnH = 64;
    const marginX = (this.frameW - btnW * 2 - 40) / 2;
    const startY = this.flagY + this.flagH + 55;

    this.buttons = shuffled.map((opt, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx = marginX + col * (btnW + 40);
      const by = startY + row * (btnH + 18);
      return new AnswerButton(opt.name, bx, by, btnW, btnH);
    });
  }

  update(finger: FingerState, dtMs: number) {
    if (this.cooldownMs > 0) this.cooldownMs -= dtMs;

    for (const btn of this.buttons) btn.hovered = false;

    if (!finger.visible) {
      this.hoverMs = 0;
      return;
    }

    if (this.feedbackMs > 0) {
      this.feedbackMs -= dtMs;
      if (this.feedbackMs <= 0) this.newRound();
      return;
    }

    if (this.cooldownMs > 0) return;

    const idx = this.buttons.findIndex((b) => b.contains(finger.x, finger.y));
    if (idx === -1) {
      this.hoverMs = 0;
      return;
    }
    this.buttons[idx].hovered = true;
    this.hoverMs += dtMs;
    if (this.hoverMs >= FLAG_HOVER_MS) {
      this.select(idx);
    }
  }

  private select(idx: number) {
    this.hoverMs = 0;
    this.totalRounds += 1;

    if (idx === this.correctIdx) {
      this.score += 10;
      this.buttons[idx].state = "correct";
    } else {
      this.buttons[idx].state = "wrong";
      this.buttons[this.correctIdx].state = "correct";
    }
    this.feedbackMs = FLAG_FEEDBACK_MS;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const panelX = this.flagX - 20;
    const panelY = this.flagY - 15;
    const panelW = this.flagW + 40;
    const panelH = this.flagH + 30;

    ctx.fillStyle = "rgba(25, 25, 40, 0.85)";
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = "#3c3c5a";
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    ctx.fillStyle = COLOR.cyan;
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TEBAK BENDERA", this.frameW / 2, 35);

    if (this.currentFlag) {
      ctx.font = `${Math.min(this.flagW, this.flagH) * 0.75}px sans-serif`;
      ctx.textBaseline = "middle";
      ctx.fillText(
        this.currentFlag.emoji,
        this.flagX + this.flagW / 2,
        this.flagY + this.flagH / 2
      );
      ctx.textBaseline = "alphabetic";
    }
    ctx.textAlign = "left";

    for (const btn of this.buttons) btn.draw(ctx);

    this.drawStatus(ctx);
  }

  drawStatus(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = COLOR.gold;
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`Score: ${this.score}`, this.frameW - 20, 35);
    ctx.fillStyle = COLOR.white;
    ctx.font = "13px sans-serif";
    ctx.fillText(`Round: ${this.totalRounds + 1}`, this.frameW - 20, 55);
    ctx.textAlign = "left";

    ctx.fillStyle = "#96a0aa";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "Tunjuk jawaban dengan jari telunjuk",
      this.frameW / 2,
      this.frameH - 15
    );
    ctx.textAlign = "left";
  }
}
