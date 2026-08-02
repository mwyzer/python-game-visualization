import { COLOR, MENU_SELECT_MS } from "./constants";
import type { FingerState } from "./types";

export class MenuButton {
  x: number;
  y: number;
  w: number;
  h: number;
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  hovered = false;
  hoverMs = 0;

  constructor(
    emoji: string,
    title: string,
    subtitle: string,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ) {
    this.emoji = emoji;
    this.title = title;
    this.subtitle = subtitle;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.color = color;
  }

  contains(px: number, py: number): boolean {
    return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
  }

  updateHover(isHovered: boolean, dtMs: number) {
    this.hoverMs = isHovered ? this.hoverMs + dtMs : 0;
    this.hovered = isHovered;
  }

  get isSelected(): boolean {
    return this.hoverMs >= MENU_SELECT_MS;
  }

  reset() {
    this.hoverMs = 0;
    this.hovered = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const progress = Math.min(this.hoverMs / MENU_SELECT_MS, 1);
    let bg = "#232332";
    let border = "#50506e";
    let borderW = 2;

    if (this.hovered) {
      bg = lerpColor("#232332", this.color, progress);
      border = this.color;
      borderW = 3;
    }

    ctx.fillStyle = bg;
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.strokeStyle = border;
    ctx.lineWidth = borderW;
    ctx.strokeRect(this.x, this.y, this.w, this.h);

    if (this.hovered) {
      const barW = this.w * progress;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y + this.h - 6, barW, 6);
    }

    ctx.textBaseline = "alphabetic";
    ctx.font = "32px sans-serif";
    ctx.fillText(this.emoji, this.x + 20, this.y + this.h / 2 + 12);

    ctx.fillStyle = COLOR.white;
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(this.title, this.x + 80, this.y + this.h / 2 - 4);

    ctx.fillStyle = "#a0a0b4";
    ctx.font = "13px sans-serif";
    ctx.fillText(this.subtitle, this.x + 80, this.y + this.h / 2 + 18);
  }
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const r = Math.round(pa.r + (pb.r - pa.r) * t);
  const g = Math.round(pa.g + (pb.g - pa.g) * t);
  const bch = Math.round(pa.b + (pb.b - pa.b) * t);
  return `rgb(${r}, ${g}, ${bch})`;
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function drawMenu(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  buttons: MenuButton[]
) {
  ctx.fillStyle = "rgba(10, 10, 20, 0.6)";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = COLOR.green;
  ctx.font = "bold 44px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("FINGER", w / 2, 80);
  ctx.fillText("QUEST", w / 2, 128);

  ctx.fillStyle = "#b4b4c8";
  ctx.font = "14px sans-serif";
  ctx.fillText("Pilih game dengan menunjuk menggunakan jari telunjuk", w / 2, 158);

  ctx.strokeStyle = COLOR.green;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 100, 172);
  ctx.lineTo(w / 2 + 100, 172);
  ctx.stroke();

  ctx.textAlign = "left";
  for (const btn of buttons) btn.draw(ctx);
}

export function updateMenuHover(buttons: MenuButton[], finger: FingerState, dtMs: number) {
  for (const btn of buttons) {
    const isHovered = finger.visible && btn.contains(finger.x, finger.y);
    btn.updateHover(isHovered, dtMs);
  }
}
