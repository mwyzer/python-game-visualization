"""
FingerQuest — Real-time Finger Detection with Python + MediaPipe
================================================================
Game launcher with 3 games selectable by finger pointing:
  1. Tebak Bendera (Flag Quiz)
  2. Puzzle (Drag & Snap)

Controls:
  Q / ESC  — quit
  F        — toggle fullscreen
  M        — toggle mirrored view
  B        — back to main menu (from any game)
  R        — reshuffle puzzle (in puzzle mode)
"""

import cv2
import mediapipe as mp
import numpy as np
import math
import time
import os
from collections import deque
from enum import Enum, auto

from mediapipe import Image, ImageFormat
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.core.base_options import BaseOptions
from mediapipe.tasks.python.vision import (
    HandLandmarker,
    HandLandmarkerOptions,
    HandLandmarksConnections,
    RunningMode,
)

from puzzle import create_default_puzzle
from flag_game import FlagGame

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# MediaPipe model path (downloaded automatically)
_MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
_MODEL_PATH = os.path.join(_MODEL_DIR, "hand_landmarker.task")

# Hand landmark connections (same as old mp_hands.HAND_CONNECTIONS)
HAND_CONNECTIONS = HandLandmarksConnections.HAND_CONNECTIONS

# Landmark indices
THUMB_TIP, THUMB_IP, THUMB_MCP, THUMB_CMC = 4, 3, 2, 1
INDEX_TIP, INDEX_PIP, INDEX_MCP = 8, 6, 5
MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP = 12, 10, 9
RING_TIP, RING_PIP, RING_MCP = 16, 14, 13
PINKY_TIP, PINKY_PIP, PINKY_MCP = 20, 18, 17
WRIST = 0

# Finger tip → PIP mapping for counting raised fingers
FINGER_PAIRS = [
    (THUMB_TIP, THUMB_IP, "thumb"),
    (INDEX_TIP, INDEX_PIP, "index"),
    (MIDDLE_TIP, MIDDLE_PIP, "middle"),
    (RING_TIP, RING_PIP, "ring"),
    (PINKY_TIP, PINKY_PIP, "pinky"),
]

# Colors (BGR)
GREEN = (0, 255, 136)
RED = (255, 51, 102)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
DARK_BG = (20, 20, 30)
SEMI_BLACK = (0, 0, 0, 0.4)
AMBER = (0, 200, 255)
YELLOW = (0, 255, 255)
CYAN = (255, 255, 0)


# ---------------------------------------------------------------------------
# Finger counting logic
# ---------------------------------------------------------------------------

def is_finger_raised(landmarks, tip_idx, pip_idx, handedness="Right"):
    """A finger is raised if its tip is above its PIP joint (smaller y)."""
    tip = landmarks[tip_idx]
    pip = landmarks[pip_idx]
    return tip.y < pip.y


def is_thumb_raised(landmarks, handedness="Right"):
    """Thumb is raised if tip is horizontally extended away from the hand."""
    tip = landmarks[THUMB_TIP]
    ip = landmarks[THUMB_IP]
    mcp = landmarks[THUMB_MCP]
    # Compare horizontal distance: thumb extended means tip is farther laterally
    return abs(tip.x - ip.x) > 0.04


def count_fingers(landmarks, handedness="Right"):
    """Return number of raised fingers and per-finger raised list."""
    raised = [
        is_thumb_raised(landmarks, handedness),
        is_finger_raised(landmarks, INDEX_TIP, INDEX_PIP, handedness),
        is_finger_raised(landmarks, MIDDLE_TIP, MIDDLE_PIP, handedness),
        is_finger_raised(landmarks, RING_TIP, RING_PIP, handedness),
        is_finger_raised(landmarks, PINKY_TIP, PINKY_PIP, handedness),
    ]
    return sum(raised), raised


FINGER_EMOJIS = {0: "0", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5"}


# ---------------------------------------------------------------------------
# Game state
# ---------------------------------------------------------------------------
class GameScreen(Enum):
    MENU = auto()
    FLAG_GAME = auto()

    PUZZLE = auto()


# ---------------------------------------------------------------------------
# Menu button
# ---------------------------------------------------------------------------
class MenuButton:
    """A large menu button selectable by finger pointing."""

    def __init__(self, emoji: str, title: str, subtitle: str,
                 x: int, y: int, w: int, h: int, color):
        self.emoji = emoji
        self.title = title
        self.subtitle = subtitle
        self.x = x
        self.y = y
        self.w = w
        self.h = h
        self.color = color
        self.hovered = False
        self._hover_frames = 0

    def contains(self, px: int, py: int) -> bool:
        return self.x <= px <= self.x + self.w and self.y <= py <= self.y + self.h

    def update_hover(self, is_hovered: bool):
        if is_hovered:
            self._hover_frames += 1
        else:
            self._hover_frames = 0
        self.hovered = is_hovered

    @property
    def is_selected(self) -> bool:
        return self._hover_frames >= 30  # ~1 second hover to select

    def draw(self, img):
        # Background
        if self.hovered:
            progress = min(self._hover_frames / 30.0, 1.0)
            bg = tuple(int(c[0] + (c[1] - c[0]) * progress)
                       for c in zip((35, 35, 50), self.color))
            border = self.color
            border_w = 3
        else:
            bg = (35, 35, 50)
            border = (80, 80, 110)
            border_w = 2

        # Draw card
        cv2.rectangle(img, (self.x, self.y),
                      (self.x + self.w, self.y + self.h), bg, -1)
        cv2.rectangle(img, (self.x, self.y),
                      (self.x + self.w, self.y + self.h), border, border_w)

        # Selection progress bar at bottom
        if self.hovered:
            bar_w = int(self.w * (self._hover_frames / 30.0))
            cv2.rectangle(img, (self.x, self.y + self.h - 6),
                          (self.x + bar_w, self.y + self.h), self.color, -1)

        # Emoji
        cv2.putText(img, self.emoji, (self.x + 25, self.y + 55),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.8, WHITE, 2, cv2.LINE_AA)

        # Title
        cv2.putText(img, self.title, (self.x + 95, self.y + 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, WHITE, 2, cv2.LINE_AA)

        # Subtitle
        cv2.putText(img, self.subtitle, (self.x + 95, self.y + 70),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (160, 160, 180), 1, cv2.LINE_AA)


def draw_menu(img, buttons: list[MenuButton]):
    """Draw the main menu screen."""
    h, w = img.shape[:2]

    # Dark overlay
    overlay = img.copy()
    cv2.rectangle(overlay, (0, 0), (w, h), (10, 10, 20), -1)
    cv2.addWeighted(overlay, 0.6, img, 0.4, 0, img)

    # Title
    cv2.putText(img, "FINGER", (w // 2 - 130, 80),
                cv2.FONT_HERSHEY_SIMPLEX, 2.2, GREEN, 4, cv2.LINE_AA)
    cv2.putText(img, "QUEST", (w // 2 - 130, 125),
                cv2.FONT_HERSHEY_SIMPLEX, 2.2, GREEN, 4, cv2.LINE_AA)

    # Tagline
    cv2.putText(img, "Pilih game dengan menunjuk menggunakan jari telunjuk",
                (w // 2 - 230, 160),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 200), 1, cv2.LINE_AA)

    # Divider line
    cv2.line(img, (w // 2 - 100, 175), (w // 2 + 100, 175), GREEN, 1)

    # Buttons
    for btn in buttons:
        btn.draw(img)

    # Footer
    cv2.putText(img, "Q/ESC = Keluar  |  F = Fullscreen  |  M = Mirror",
                (w // 2 - 230, h - 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (120, 120, 140), 1, cv2.LINE_AA)


# ---------------------------------------------------------------------------
# Drawing helpers
# ---------------------------------------------------------------------------

def draw_rounded_rect(img, x, y, w, h, r, color, thickness=-1, alpha=0.7):
    """Draw a rounded rectangle with optional alpha blending."""
    overlay = img.copy()
    cv2.rectangle(overlay, (x + r, y), (x + w - r, y + h), color, thickness)
    cv2.rectangle(overlay, (x, y + r), (x + w, y + h - r), color, thickness)
    cv2.circle(overlay, (x + r, y + r), r, color, thickness)
    cv2.circle(overlay, (x + w - r, y + r), r, color, thickness)
    cv2.circle(overlay, (x + r, y + h - r), r, color, thickness)
    cv2.circle(overlay, (x + w - r, y + h - r), r, color, thickness)
    cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0, img)


def draw_hud(img, total_fingers, handedness_labels, fps, model_ready, fingers_per_hand):
    """HUD removed — clean game view."""
    pass


def draw_landmarks(img, hand_landmarks, h, w):
    """Draw MediaPipe hand skeleton + landmarks with custom styling."""
    # Draw connections
    for connection in HAND_CONNECTIONS:
        start = hand_landmarks[connection.start]
        end = hand_landmarks[connection.end]
        x1, y1 = int(start.x * w), int(start.y * h)
        x2, y2 = int(end.x * w), int(end.y * h)
        cv2.line(img, (x1, y1), (x2, y2), GREEN, 2, cv2.LINE_AA)

    # Draw landmarks
    for i, lm in enumerate(hand_landmarks):
        cx, cy = int(lm.x * w), int(lm.y * h)

        if i == INDEX_TIP:
            # Index tip — glow + highlight
            cv2.circle(img, (cx, cy), 12, RED, -1)
            cv2.circle(img, (cx, cy), 12, RED, 2)
            cv2.circle(img, (cx, cy), 5, WHITE, -1)
        else:
            cv2.circle(img, (cx, cy), 5, GREEN, -1)
            cv2.circle(img, (cx, cy), 5, WHITE, 1)


# ---------------------------------------------------------------------------
# Main application
# ---------------------------------------------------------------------------

def main():
    print("=" * 55)
    print("  FingerQuest — 3-in-1 Finger Tracking Game Launcher")
    print("  Q / ESC = quit  |  F = fullscreen  |  M = mirror")
    print("  B = back to menu  |  R = reshuffle puzzle")
    print("=" * 55)

    # Open webcam
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)

    if not cap.isOpened():
        print("[ERROR] Could not open webcam.")
        return

    # State
    fullscreen = False
    mirrored = True
    model_ready = False
    window_name = "FingerQuest — Game Launcher"

    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, 960, 720)

    # FPS tracking
    fps_deque = deque(maxlen=30)
    prev_time = time.perf_counter()

    # Game state
    current_screen = GameScreen.MENU
    FRAME_W, FRAME_H = 640, 480

    # ---- Game instances (lazy init) ----
    puzzle = None
    flag_game = None
    # ---- Menu buttons ----
    btn_w, btn_h = 450, 90
    btn_x = (FRAME_W - btn_w) // 2
    menu_buttons = [
        MenuButton("🎌", "Tebak Bendera", "Tebak nama negara dari bendera nasional",
                   btn_x, 200, btn_w, btn_h, (0, 165, 255)),       # Orange
        MenuButton("�", "Puzzle", "Susun puzzle dengan gerakan jari",
                   btn_x, 310, btn_w, btn_h, (0, 255, 136)),        # Green
    ]

    # Initialize MediaPipe HandLandmarker
    print("[INFO] Loading MediaPipe HandLandmarker...")
    if not os.path.exists(_MODEL_PATH):
        print("[ERROR] Model file not found: " + _MODEL_PATH)
        print("[INFO] Download it from:")
        print("  https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task")
        cap.release()
        return

    options = HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=_MODEL_PATH),
        num_hands=2,
        running_mode=RunningMode.VIDEO,
        min_hand_detection_confidence=0.7,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    hand_landmarker = HandLandmarker.create_from_options(options)
    print("[INFO] MediaPipe HandLandmarker loaded. Starting detection...")
    print("[INFO] Main Menu ready! Point your index finger at a game to select.")
    model_ready = True

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("[ERROR] Failed to read frame from webcam.")
                break

            # Mirror if needed
            if mirrored:
                frame = cv2.flip(frame, 1)

            # Convert BGR → RGB for MediaPipe
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = Image(image_format=ImageFormat.SRGB, data=rgb)
            timestamp_ms = int(time.perf_counter() * 1000)
            detection_result = hand_landmarker.detect_for_video(mp_image, timestamp_ms)

            h, w = frame.shape[:2]

            total_fingers = 0
            handedness_labels = []
            fingers_per_hand = []

            # Per-frame finger tracking
            finger_x, finger_y = -1, -1
            finger_visible = False

            # Process hand landmarks
            if detection_result.hand_landmarks and detection_result.handedness:
                for hand_landmarks, handedness_list in zip(
                    detection_result.hand_landmarks, detection_result.handedness
                ):
                    label = handedness_list[0].category_name
                    display_label = label
                    if mirrored:
                        display_label = "Left" if label == "Right" else "Right"

                    handedness_labels.append(display_label)

                    count, _ = count_fingers(hand_landmarks, label)
                    total_fingers += count
                    fingers_per_hand.append((display_label, count))

                    draw_landmarks(frame, hand_landmarks, h, w)

                    wrist = hand_landmarks[WRIST]
                    wx, wy = int(wrist.x * w), int(wrist.y * h)
                    cv2.putText(frame, display_label, (wx - 20, wy - 20),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, GREEN, 2, cv2.LINE_AA)

                    # Track first hand's index finger
                    if not finger_visible:
                        itip = hand_landmarks[INDEX_TIP]
                        finger_x = int(itip.x * w)
                        finger_y = int(itip.y * h)
                        finger_visible = True

            # FPS calculation
            now = time.perf_counter()
            if prev_time:
                fps_deque.append(1.0 / (now - prev_time))
            prev_time = now
            fps = sum(fps_deque) / len(fps_deque) if fps_deque else 0

            # ================================================================
            # Screen routing
            # ================================================================

            if current_screen == GameScreen.MENU:
                # ---- MENU ----
                draw_menu(frame, menu_buttons)

                # Update menu button hover
                for btn in menu_buttons:
                    is_hover = finger_visible and btn.contains(finger_x, finger_y)
                    btn.update_hover(is_hover)
                    if btn.is_selected:
                        if btn == menu_buttons[0]:
                            current_screen = GameScreen.FLAG_GAME
                            flag_game = FlagGame(FRAME_W, FRAME_H)
                            print("[INFO] Starting: Tebak Bendera!")
                        elif btn == menu_buttons[1]:
                            current_screen = GameScreen.PUZZLE
                            puzzle = create_default_puzzle(FRAME_W, FRAME_H)
                            print("[INFO] Starting: Puzzle!")
                        # Reset hover after selection
                        for b in menu_buttons:
                            b._hover_frames = 0

            elif current_screen == GameScreen.FLAG_GAME:
                # ---- FLAG QUIZ ----
                flag_game.update(finger_x, finger_y, finger_visible)
                flag_game.draw(frame)

            elif current_screen == GameScreen.PUZZLE:
                # ---- PUZZLE ----
                puzzle.update(finger_x, finger_y, finger_visible)
                puzzle.draw(frame)
                puzzle.draw_status(frame)

            # HUD removed — clean game view

            # Title overlay
            titles = {
                GameScreen.MENU: "",
                GameScreen.FLAG_GAME: "FINGERQUEST | Tebak Bendera",

                GameScreen.PUZZLE: "FINGERQUEST | Puzzle",
            }
            title_text = titles.get(current_screen, "FINGERQUEST")
            if title_text:
                cv2.putText(frame, title_text, (20, 40), cv2.FONT_HERSHEY_SIMPLEX,
                            0.55, GREEN, 2, cv2.LINE_AA)

            # Back hint (when in a game)
            if current_screen != GameScreen.MENU:
                cv2.putText(frame, "Tekan B untuk kembali ke Menu",
                            (20, frame.shape[0] - 15),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (150, 150, 170),
                            1, cv2.LINE_AA)

            # Show frame
            cv2.imshow(window_name, frame)

            # Keyboard handling
            key = cv2.waitKey(1) & 0xFF
            if key == 27 or key == ord("q"):
                break
            elif key == ord("f"):
                fullscreen = not fullscreen
                if fullscreen:
                    cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN,
                                          cv2.WINDOW_FULLSCREEN)
                else:
                    cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN,
                                          cv2.WINDOW_NORMAL)
            elif key == ord("m"):
                mirrored = not mirrored
            elif key == ord("b"):
                # Back to menu
                current_screen = GameScreen.MENU
                # Reset menu button hover states
                for btn in menu_buttons:
                    btn._hover_frames = 0
                print("[INFO] Returned to Main Menu.")
            elif key == ord("r"):
                # Reshuffle puzzle (only in puzzle mode)
                if current_screen == GameScreen.PUZZLE and puzzle:
                    puzzle.shuffle()
                    print("[INFO] Puzzle reshuffled!")

    except KeyboardInterrupt:
        pass
    finally:
        hand_landmarker.close()
        cap.release()
        cv2.destroyAllWindows()
        print("[INFO] FingerQuest closed. Goodbye!")


if __name__ == "__main__":
    main()
