"""
FingerQuest Photo Puzzle Module
================================
Game 3: user draws a rectangular area on the live camera feed with their
index finger, that area is captured as an image, auto-shuffled into a 3x3
grid, and the user rearranges the tiles back into place.

Interaction:
  1. Hold your index finger still over the first corner (~0.6s) to lock it.
  2. Move to the opposite corner and hold still again to lock it and capture.
  3. Drag tiles (same grab/drag/snap mechanic as the numbered puzzle) back
     into the 3x3 target grid.
"""

import cv2
from enum import Enum, auto

from puzzle import create_photo_puzzle, PuzzleBoard

WHITE = (255, 255, 255)
GREEN = (0, 255, 136)
YELLOW = (0, 255, 255)
CYAN = (255, 255, 0)
DARK_BG = (20, 20, 30)


class PhotoPuzzleState(Enum):
    CORNER1 = auto()
    CORNER2 = auto()
    PLAYING = auto()


class AreaSelector:
    """Locks two corners of a rectangle via finger dwell (hold-still)."""

    DWELL_FRAMES = 18       # ~0.6s at 30fps
    DWELL_RADIUS = 18       # px jitter tolerance
    MIN_SIZE = 160           # minimum captured region (px) for decent tiles

    def __init__(self):
        self.corner1 = None
        self.corner2 = None
        self._dwell_pos = None
        self._dwell_frames = 0

    @property
    def done(self) -> bool:
        return self.corner1 is not None and self.corner2 is not None

    def dwell_progress(self) -> float:
        return min(self._dwell_frames / self.DWELL_FRAMES, 1.0)

    def update(self, finger_x: int, finger_y: int, finger_visible: bool):
        if self.done or not finger_visible:
            self._dwell_pos = None
            self._dwell_frames = 0
            return

        if self._dwell_pos is None:
            self._dwell_pos = (finger_x, finger_y)
            self._dwell_frames = 1
        else:
            dx = finger_x - self._dwell_pos[0]
            dy = finger_y - self._dwell_pos[1]
            if dx * dx + dy * dy <= self.DWELL_RADIUS ** 2:
                self._dwell_frames += 1
            else:
                self._dwell_pos = (finger_x, finger_y)
                self._dwell_frames = 1

        if self._dwell_frames >= self.DWELL_FRAMES:
            self._lock(finger_x, finger_y)
            self._dwell_pos = None
            self._dwell_frames = 0

    def _lock(self, x: int, y: int):
        if self.corner1 is None:
            self.corner1 = (x, y)
        else:
            x1, y1 = self.corner1
            if abs(x - x1) < self.MIN_SIZE:
                x = x1 + self.MIN_SIZE if x >= x1 else x1 - self.MIN_SIZE
            if abs(y - y1) < self.MIN_SIZE:
                y = y1 + self.MIN_SIZE if y >= y1 else y1 - self.MIN_SIZE
            self.corner2 = (x, y)

    def get_rect(self, frame_w: int, frame_h: int):
        """Return (x1, y1, x2, y2) clamped to frame bounds, or None."""
        if not self.done:
            return None
        x1, y1 = self.corner1
        x2, y2 = self.corner2
        x1, x2 = sorted((x1, x2))
        y1, y2 = sorted((y1, y2))
        x1, y1 = max(x1, 0), max(y1, 0)
        x2, y2 = min(x2, frame_w), min(y2, frame_h)
        return (x1, y1, x2, y2)

    def draw(self, img, finger_x: int, finger_y: int, finger_visible: bool):
        h, w = img.shape[:2]

        overlay = img.copy()
        cv2.rectangle(overlay, (0, 0), (w, h), (10, 10, 20), -1)
        cv2.addWeighted(overlay, 0.25, img, 0.75, 0, img)

        if self.corner1 is not None:
            cv2.circle(img, self.corner1, 8, GREEN, -1)
            cv2.circle(img, self.corner1, 8, WHITE, 2)

        if self.corner1 is not None and finger_visible:
            cv2.rectangle(img, self.corner1, (finger_x, finger_y), CYAN, 2)

        if finger_visible:
            cv2.circle(img, (finger_x, finger_y), 10, YELLOW, 2)
            if self._dwell_pos is not None:
                progress = self.dwell_progress()
                cv2.ellipse(img, (finger_x, finger_y), (18, 18), -90, 0,
                            360 * progress, GREEN, 3)

        instruction = ("Tahan diam di sudut PERTAMA area"
                        if self.corner1 is None else
                        "Tahan diam di sudut KEDUA area")
        (tw, _), _ = cv2.getTextSize(instruction, cv2.FONT_HERSHEY_SIMPLEX,
                                      0.6, 2)
        cv2.putText(img, instruction, (w // 2 - tw // 2, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, WHITE, 2, cv2.LINE_AA)


class PhotoPuzzleGame:
    """Draw an area with your finger, then solve a 3x3 puzzle of it."""

    def __init__(self, frame_w: int, frame_h: int):
        self.frame_w = frame_w
        self.frame_h = frame_h
        self.state = PhotoPuzzleState.CORNER1
        self.selector = AreaSelector()
        self.board: PuzzleBoard | None = None
        self.solution_thumb = None
        self._last_finger = (-1, -1, False)

    def update(self, finger_x: int, finger_y: int, finger_visible: bool, frame):
        self._last_finger = (finger_x, finger_y, finger_visible)
        if self.state != PhotoPuzzleState.PLAYING:
            self.selector.update(finger_x, finger_y, finger_visible)
            if self.selector.corner1 is not None and self.state == PhotoPuzzleState.CORNER1:
                self.state = PhotoPuzzleState.CORNER2
            if self.selector.done:
                self._capture(frame)
        else:
            self.board.update(finger_x, finger_y, finger_visible)

    def _capture(self, frame):
        x1, y1, x2, y2 = self.selector.get_rect(self.frame_w, self.frame_h)
        crop = frame[y1:y2, x1:x2].copy()
        self.board = create_photo_puzzle(self.frame_w, self.frame_h, crop)
        self.solution_thumb = cv2.resize(crop, (90, 90))
        self.state = PhotoPuzzleState.PLAYING

    def reshuffle(self):
        if self.board:
            self.board.shuffle()

    def draw(self, img):
        if self.state != PhotoPuzzleState.PLAYING:
            fx, fy, finger_visible = self._last_finger
            self.selector.draw(img, fx, fy, finger_visible)
            return

        self.board.draw(img)

        # Solution thumbnail preview (top-left)
        if self.solution_thumb is not None:
            h, w = self.solution_thumb.shape[:2]
            x, y = 20, 55
            cv2.rectangle(img, (x - 3, y - 3), (x + w + 3, y + h + 3),
                          WHITE, 2)
            img[y:y + h, x:x + w] = self.solution_thumb
            cv2.putText(img, "Target", (x, y - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, WHITE, 1, cv2.LINE_AA)

    def draw_status(self, img):
        if self.state == PhotoPuzzleState.PLAYING and self.board:
            self.board.draw_status(img)
