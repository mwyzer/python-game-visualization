"""
FingerQuest Puzzle Module
==========================
Simple drag-and-arrange puzzle using finger tracking.

Interaction: Point your INDEX FINGER at a piece to grab it.
Move your finger to drag it. Point at empty space to release.
If released near the target slot, it snaps into place.
"""

import random
import math
import cv2
import numpy as np

# ---------------------------------------------------------------------------
# Colors (BGR)
# ---------------------------------------------------------------------------
WHITE = (255, 255, 255)
GREEN = (0, 255, 136)
RED = (255, 51, 102)
CYAN = (255, 255, 0)
YELLOW = (0, 255, 255)
PURPLE = (180, 80, 255)
BLUE = (255, 150, 50)
ORANGE = (0, 165, 255)
DARK_SLOT = (40, 40, 55)
SLOT_BORDER = (80, 80, 100)


class PuzzlePiece:
    """A single draggable puzzle piece."""

    def __init__(self, piece_id: int, label: str, x: int, y: int, size: int,
                 image=None):
        self.id = piece_id
        self.label = label
        self.x = x
        self.y = y
        self.size = size
        self.target_x = x
        self.target_y = y
        self.grabbed = False
        self.placed = False
        self.image = image  # optional (size, size, 3) BGR crop

    def contains(self, px: int, py: int) -> bool:
        half = self.size // 2
        return (self.x - half <= px <= self.x + half and
                self.y - half <= py <= self.y + half)

    def draw(self, img, hovered=False):
        half = self.size // 2
        x1, y1 = self.x - half, self.y - half
        x2, y2 = self.x + half, self.y + half

        if self.placed:
            border_color = (0, 180, 60)
            border_thick = 3
        elif self.grabbed:
            border_color = YELLOW
            border_thick = 3
        elif hovered:
            border_color = (0, 220, 255)
            border_thick = 3
        else:
            border_color = PURPLE
            border_thick = 2

        if self.image is not None:
            self._blit_image(img, x1, y1)
            cv2.rectangle(img, (x1, y1), (x2, y2), border_color, border_thick)
            return

        if self.placed:
            fill_color = GREEN
        elif self.grabbed:
            fill_color = CYAN
        elif hovered:
            fill_color = ORANGE
        else:
            fill_color = BLUE

        # Draw filled rectangle
        cv2.rectangle(img, (x1, y1), (x2, y2), fill_color, -1)
        cv2.rectangle(img, (x1, y1), (x2, y2), border_color, border_thick)

        # Label
        font_scale = 0.6
        (tw, th), _ = cv2.getTextSize(
            self.label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 2)
        tx = self.x - tw // 2
        ty = self.y + th // 2
        cv2.putText(img, self.label, (tx, ty),
                    cv2.FONT_HERSHEY_SIMPLEX, font_scale, WHITE, 2, cv2.LINE_AA)

    def _blit_image(self, img, x1, y1):
        """Paste self.image onto img at (x1, y1), clipped to img bounds."""
        h, w = img.shape[:2]
        src = self.image
        sh, sw = src.shape[:2]

        dst_x1, dst_y1 = max(x1, 0), max(y1, 0)
        dst_x2, dst_y2 = min(x1 + sw, w), min(y1 + sh, h)
        if dst_x2 <= dst_x1 or dst_y2 <= dst_y1:
            return

        src_x1, src_y1 = dst_x1 - x1, dst_y1 - y1
        src_x2, src_y2 = src_x1 + (dst_x2 - dst_x1), src_y1 + (dst_y2 - dst_y1)
        img[dst_y1:dst_y2, dst_x1:dst_x2] = src[src_y1:src_y2, src_x1:src_x2]


class PuzzleBoard:
    """Manages puzzle pieces, grid, grab/drag/snap logic."""

    def __init__(self, cols: int, rows: int, piece_size: int,
                 grid_x: int, grid_y: int,
                 scatter_x1: int, scatter_y1: int,
                 scatter_x2: int, scatter_y2: int):
        self.cols = cols
        self.rows = rows
        self.piece_size = piece_size
        self.grid_x = grid_x
        self.grid_y = grid_y
        self.scatter_x1 = scatter_x1
        self.scatter_y1 = scatter_y1
        self.scatter_x2 = scatter_x2
        self.scatter_y2 = scatter_y2

        self.pieces: list[PuzzlePiece] = []
        self.grabbed_piece: PuzzlePiece | None = None
        self.hovered_piece: PuzzlePiece | None = None
        self.is_solved = False
        self.move_count = 0
        self.grab_cooldown = 0  # frames before auto-grab

        self._build_pieces()

    def _build_pieces(self):
        self.pieces.clear()
        pid = 0
        for row in range(self.rows):
            for col in range(self.cols):
                pid += 1
                cx = self.grid_x + col * self.piece_size + self.piece_size // 2
                cy = self.grid_y + row * self.piece_size + self.piece_size // 2
                piece = PuzzlePiece(pid, str(pid), cx, cy, self.piece_size)
                piece.target_x = cx
                piece.target_y = cy
                self.pieces.append(piece)

    def set_images(self, images: list):
        """Assign an image crop to each piece, matching build (row-major) order."""
        for piece, image in zip(self.pieces, images):
            piece.image = image

    def shuffle(self):
        self.is_solved = False
        self.move_count = 0
        self.grabbed_piece = None
        self.grab_cooldown = 0
        for piece in self.pieces:
            piece.grabbed = False
            piece.placed = False
            # Scatter with spacing to reduce overlap
            for _ in range(20):
                px = random.randint(self.scatter_x1, self.scatter_x2)
                py = random.randint(self.scatter_y1, self.scatter_y2)
                too_close = False
                for other in self.pieces:
                    if other is piece:
                        break
                    if abs(px - other.x) < self.piece_size and abs(py - other.y) < self.piece_size:
                        too_close = True
                        break
                if not too_close:
                    piece.x = px
                    piece.y = py
                    break
            else:
                piece.x = random.randint(self.scatter_x1, self.scatter_x2)
                piece.y = random.randint(self.scatter_y1, self.scatter_y2)

    def update(self, finger_x: int, finger_y: int, finger_visible: bool):
        """Call every frame with index finger position."""
        if not finger_visible or finger_x < 0 or finger_y < 0:
            self.hovered_piece = None
            if self.grabbed_piece:
                self._release_at(self.grabbed_piece.x, self.grabbed_piece.y)
            self.grab_cooldown = 0
            return

        # Find piece under finger
        found = None
        for piece in reversed(self.pieces):
            if piece.placed:
                continue
            if piece.contains(finger_x, finger_y):
                found = piece
                break

        self.hovered_piece = found

        if self.grabbed_piece:
            self.grabbed_piece.x = finger_x
            self.grabbed_piece.y = finger_y
            self.grab_cooldown = 0
        elif found:
            self.grab_cooldown += 1
            if self.grab_cooldown >= 10:  # ~0.3s
                self._grab(found)
                self.grab_cooldown = 0
        else:
            self.grab_cooldown = 0

    def _grab(self, piece: PuzzlePiece):
        piece.grabbed = True
        self.grabbed_piece = piece
        self.move_count += 1

    def release(self):
        if self.grabbed_piece is None:
            return
        self._release_at(self.grabbed_piece.x, self.grabbed_piece.y)

    def _release_at(self, px: int, py: int):
        if self.grabbed_piece is None:
            return
        piece = self.grabbed_piece
        piece.grabbed = False
        self.grabbed_piece = None

        snap_dist = self.piece_size * 0.7
        dist = math.sqrt((piece.x - piece.target_x) ** 2 +
                         (piece.y - piece.target_y) ** 2)
        if dist <= snap_dist:
            piece.x = piece.target_x
            piece.y = piece.target_y
            piece.placed = True

        self.is_solved = all(p.placed for p in self.pieces)

    def draw(self, img):
        h, w = img.shape[:2]

        # Target grid
        grid_w = self.cols * self.piece_size
        grid_h = self.rows * self.piece_size
        cv2.rectangle(img,
                      (self.grid_x, self.grid_y),
                      (self.grid_x + grid_w, self.grid_y + grid_h),
                      SLOT_BORDER, 2)

        # Slot numbers
        pid = 0
        for row in range(self.rows):
            for col in range(self.cols):
                pid += 1
                cx = self.grid_x + col * self.piece_size + self.piece_size // 2
                cy = self.grid_y + row * self.piece_size + self.piece_size // 2
                half = self.piece_size // 2
                cv2.rectangle(img,
                              (cx - half, cy - half),
                              (cx + half, cy + half),
                              DARK_SLOT, -1)
                cv2.rectangle(img,
                              (cx - half, cy - half),
                              (cx + half, cy + half),
                              SLOT_BORDER, 1)
                cv2.putText(img, str(pid), (cx - 10, cy + 8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (100, 100, 120),
                            1, cv2.LINE_AA)

        # Draw pieces: normal → hovered → grabbed (z-order)
        normal = [p for p in self.pieces
                  if not p.grabbed and p is not self.hovered_piece]
        hover = [p for p in self.pieces
                 if p is self.hovered_piece and not p.grabbed]
        grab = [p for p in self.pieces if p.grabbed]

        for piece in normal:
            piece.draw(img)
        for piece in hover:
            piece.draw(img, hovered=True)
        for piece in grab:
            piece.draw(img)

    def draw_status(self, img):
        h, w = img.shape[:2]
        y = h - 30
        cv2.putText(img, f"Moves: {self.move_count}", (20, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, WHITE, 1, cv2.LINE_AA)

        if self.is_solved:
            tw, _ = cv2.getTextSize("PUZZLE SOLVED!", cv2.FONT_HERSHEY_SIMPLEX,
                                    1.5, 3)[0]
            cv2.putText(img, "PUZZLE SOLVED!", (w // 2 - tw // 2, h // 2),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.5, GREEN, 3, cv2.LINE_AA)


def create_default_puzzle(frame_w: int, frame_h: int) -> PuzzleBoard:
    """Create a 3x3 puzzle positioned for the frame size."""
    cols, rows = 3, 3
    ps = 70
    grid_w = cols * ps
    grid_h = rows * ps
    gx = frame_w - grid_w - 30
    gy = (frame_h - grid_h) // 2
    board = PuzzleBoard(cols, rows, ps, gx, gy, 30, 30, gx - 40, frame_h - 60)
    board.shuffle()
    return board


def slice_image_grid(img, cols: int, rows: int, tile_size: int) -> list:
    """Slice img into cols x rows tiles (row-major), each resized to
    tile_size x tile_size."""
    h, w = img.shape[:2]
    cell_w, cell_h = w // cols, h // rows
    tiles = []
    for row in range(rows):
        for col in range(cols):
            tile = img[row * cell_h:(row + 1) * cell_h,
                       col * cell_w:(col + 1) * cell_w]
            tiles.append(cv2.resize(tile, (tile_size, tile_size)))
    return tiles


def create_photo_puzzle(frame_w: int, frame_h: int, cropped_img) -> PuzzleBoard:
    """Create a 3x3 puzzle whose pieces are tiles cut from cropped_img."""
    cols, rows = 3, 3
    ps = 70
    grid_w = cols * ps
    grid_h = rows * ps
    gx = frame_w - grid_w - 30
    gy = (frame_h - grid_h) // 2
    board = PuzzleBoard(cols, rows, ps, gx, gy, 30, 30, gx - 40, frame_h - 60)
    board.set_images(slice_image_grid(cropped_img, cols, rows, ps))
    board.shuffle()
    return board
