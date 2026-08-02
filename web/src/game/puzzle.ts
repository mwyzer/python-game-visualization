import { COLOR, GRAB_DWELL_MS } from "./constants";
import type { FingerState } from "./types";

export class PuzzlePiece {
  id: number;
  label: string;
  x: number;
  y: number;
  size: number;
  targetX: number;
  targetY: number;
  grabbed = false;
  placed = false;
  image: HTMLCanvasElement | null = null;

  constructor(id: number, label: string, x: number, y: number, size: number) {
    this.id = id;
    this.label = label;
    this.x = x;
    this.y = y;
    this.size = size;
    this.targetX = x;
    this.targetY = y;
  }

  contains(px: number, py: number): boolean {
    const half = this.size / 2;
    return (
      px >= this.x - half &&
      px <= this.x + half &&
      py >= this.y - half &&
      py <= this.y + half
    );
  }

  draw(ctx: CanvasRenderingContext2D, hovered = false) {
    const half = this.size / 2;
    const x1 = this.x - half;
    const y1 = this.y - half;

    let border: string = COLOR.purple;
    let borderW = 2;
    if (this.placed) {
      border = "#00b43c";
      borderW = 3;
    } else if (this.grabbed) {
      border = COLOR.yellow;
      borderW = 3;
    } else if (hovered) {
      border = "#00dcff";
      borderW = 3;
    }

    if (this.image) {
      ctx.drawImage(this.image, x1, y1, this.size, this.size);
      ctx.strokeStyle = border;
      ctx.lineWidth = borderW;
      ctx.strokeRect(x1, y1, this.size, this.size);
      return;
    }

    let fill: string = COLOR.blue;
    if (this.placed) fill = COLOR.green;
    else if (this.grabbed) fill = COLOR.cyan;
    else if (hovered) fill = COLOR.orange;

    ctx.fillStyle = fill;
    ctx.fillRect(x1, y1, this.size, this.size);
    ctx.strokeStyle = border;
    ctx.lineWidth = borderW;
    ctx.strokeRect(x1, y1, this.size, this.size);

    ctx.fillStyle = COLOR.white;
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.label, this.x, this.y + 6);
    ctx.textAlign = "left";
  }
}

export class PuzzleBoard {
  cols: number;
  rows: number;
  pieceSize: number;
  gridX: number;
  gridY: number;
  scatterX1: number;
  scatterY1: number;
  scatterX2: number;
  scatterY2: number;

  pieces: PuzzlePiece[] = [];
  grabbedPiece: PuzzlePiece | null = null;
  hoveredPiece: PuzzlePiece | null = null;
  isSolved = false;
  moveCount = 0;
  private grabDwellMs = 0;

  constructor(
    cols: number,
    rows: number,
    pieceSize: number,
    gridX: number,
    gridY: number,
    scatterX1: number,
    scatterY1: number,
    scatterX2: number,
    scatterY2: number
  ) {
    this.cols = cols;
    this.rows = rows;
    this.pieceSize = pieceSize;
    this.gridX = gridX;
    this.gridY = gridY;
    this.scatterX1 = scatterX1;
    this.scatterY1 = scatterY1;
    this.scatterX2 = scatterX2;
    this.scatterY2 = scatterY2;
    this.buildPieces();
  }

  private buildPieces() {
    this.pieces = [];
    let pid = 0;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        pid++;
        const cx = this.gridX + col * this.pieceSize + this.pieceSize / 2;
        const cy = this.gridY + row * this.pieceSize + this.pieceSize / 2;
        const piece = new PuzzlePiece(pid, String(pid), cx, cy, this.pieceSize);
        piece.targetX = cx;
        piece.targetY = cy;
        this.pieces.push(piece);
      }
    }
  }

  setImages(images: HTMLCanvasElement[]) {
    this.pieces.forEach((piece, i) => {
      if (images[i]) piece.image = images[i];
    });
  }

  shuffle() {
    this.isSolved = false;
    this.moveCount = 0;
    this.grabbedPiece = null;
    this.grabDwellMs = 0;

    for (const piece of this.pieces) {
      piece.grabbed = false;
      piece.placed = false;
      let placedOk = false;
      for (let attempt = 0; attempt < 20; attempt++) {
        const px = this.scatterX1 + Math.random() * (this.scatterX2 - this.scatterX1);
        const py = this.scatterY1 + Math.random() * (this.scatterY2 - this.scatterY1);
        let tooClose = false;
        for (const other of this.pieces) {
          if (other === piece) break;
          if (
            Math.abs(px - other.x) < this.pieceSize &&
            Math.abs(py - other.y) < this.pieceSize
          ) {
            tooClose = true;
            break;
          }
        }
        if (!tooClose) {
          piece.x = px;
          piece.y = py;
          placedOk = true;
          break;
        }
      }
      if (!placedOk) {
        piece.x = this.scatterX1 + Math.random() * (this.scatterX2 - this.scatterX1);
        piece.y = this.scatterY1 + Math.random() * (this.scatterY2 - this.scatterY1);
      }
    }
  }

  update(finger: FingerState, dtMs: number) {
    if (!finger.visible) {
      this.hoveredPiece = null;
      if (this.grabbedPiece) this.releaseAt();
      this.grabDwellMs = 0;
      return;
    }

    let found: PuzzlePiece | null = null;
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const piece = this.pieces[i];
      if (piece.placed) continue;
      if (piece.contains(finger.x, finger.y)) {
        found = piece;
        break;
      }
    }
    this.hoveredPiece = found;

    if (this.grabbedPiece) {
      this.grabbedPiece.x = finger.x;
      this.grabbedPiece.y = finger.y;
      this.grabDwellMs = 0;
    } else if (found) {
      this.grabDwellMs += dtMs;
      if (this.grabDwellMs >= GRAB_DWELL_MS) {
        this.grab(found);
        this.grabDwellMs = 0;
      }
    } else {
      this.grabDwellMs = 0;
    }
  }

  private grab(piece: PuzzlePiece) {
    piece.grabbed = true;
    this.grabbedPiece = piece;
    this.moveCount++;
  }

  release() {
    this.releaseAt();
  }

  private releaseAt() {
    if (!this.grabbedPiece) return;
    const piece = this.grabbedPiece;
    piece.grabbed = false;
    this.grabbedPiece = null;

    const snapDist = this.pieceSize * 0.7;
    const dist = Math.hypot(piece.x - piece.targetX, piece.y - piece.targetY);
    if (dist <= snapDist) {
      piece.x = piece.targetX;
      piece.y = piece.targetY;
      piece.placed = true;
    }
    this.isSolved = this.pieces.every((p) => p.placed);
  }

  draw(ctx: CanvasRenderingContext2D) {
    const gridW = this.cols * this.pieceSize;
    const gridH = this.rows * this.pieceSize;
    ctx.strokeStyle = COLOR.slotBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.gridX, this.gridY, gridW, gridH);

    let pid = 0;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        pid++;
        const cx = this.gridX + col * this.pieceSize + this.pieceSize / 2;
        const cy = this.gridY + row * this.pieceSize + this.pieceSize / 2;
        const half = this.pieceSize / 2;
        ctx.fillStyle = COLOR.slotBg;
        ctx.fillRect(cx - half, cy - half, this.pieceSize, this.pieceSize);
        ctx.strokeStyle = COLOR.slotBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - half, cy - half, this.pieceSize, this.pieceSize);
        ctx.fillStyle = "#64647a";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(pid), cx, cy + 4);
        ctx.textAlign = "left";
      }
    }

    const normal = this.pieces.filter((p) => !p.grabbed && p !== this.hoveredPiece);
    const hover = this.pieces.filter((p) => p === this.hoveredPiece && !p.grabbed);
    const grab = this.pieces.filter((p) => p.grabbed);

    for (const p of normal) p.draw(ctx);
    for (const p of hover) p.draw(ctx, true);
    for (const p of grab) p.draw(ctx);
  }

  drawStatus(ctx: CanvasRenderingContext2D, frameW: number, frameH: number) {
    ctx.fillStyle = COLOR.white;
    ctx.font = "13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Moves: ${this.moveCount}`, 20, frameH - 20);

    if (this.isSolved) {
      ctx.fillStyle = COLOR.green;
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PUZZLE SOLVED!", frameW / 2, frameH / 2);
      ctx.textAlign = "left";
    }
  }
}

export function createDefaultPuzzle(frameW: number, frameH: number): PuzzleBoard {
  const cols = 3;
  const rows = 3;
  const ps = 70;
  const gridW = cols * ps;
  const gridH = rows * ps;
  const gx = frameW - gridW - 30;
  const gy = (frameH - gridH) / 2;
  const board = new PuzzleBoard(cols, rows, ps, gx, gy, 30, 30, gx - 40, frameH - 60);
  board.shuffle();
  return board;
}

/** Slice a region of sourceCanvas into cols x rows tiles, each tileSize x tileSize. */
export function sliceImageGrid(
  source: HTMLCanvasElement,
  rectX: number,
  rectY: number,
  rectW: number,
  rectH: number,
  cols: number,
  rows: number,
  tileSize: number
): HTMLCanvasElement[] {
  const cellW = rectW / cols;
  const cellH = rectH / rows;
  const tiles: HTMLCanvasElement[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tile = document.createElement("canvas");
      tile.width = tileSize;
      tile.height = tileSize;
      const ctx = tile.getContext("2d")!;
      ctx.drawImage(
        source,
        rectX + col * cellW,
        rectY + row * cellH,
        cellW,
        cellH,
        0,
        0,
        tileSize,
        tileSize
      );
      tiles.push(tile);
    }
  }
  return tiles;
}

export function createPhotoPuzzle(
  frameW: number,
  frameH: number,
  source: HTMLCanvasElement,
  rectX: number,
  rectY: number,
  rectW: number,
  rectH: number
): PuzzleBoard {
  const cols = 3;
  const rows = 3;
  const ps = 70;
  const gridW = cols * ps;
  const gridH = rows * ps;
  const gx = frameW - gridW - 30;
  const gy = (frameH - gridH) / 2;
  const board = new PuzzleBoard(cols, rows, ps, gx, gy, 30, 30, gx - 40, frameH - 60);
  board.setImages(sliceImageGrid(source, rectX, rectY, rectW, rectH, cols, rows, ps));
  board.shuffle();
  return board;
}
