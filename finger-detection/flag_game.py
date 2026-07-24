"""
FingerQuest — Tebak Bendera (Flag Quiz Game)
==============================================
Show a national flag, pick the correct country from 4 options.
Point your index finger at the answer button to select.
"""

import random
import math
import cv2
import numpy as np

# ---------------------------------------------------------------------------
# Colors (BGR)
# ---------------------------------------------------------------------------
WHITE = (255, 255, 255)
BLACK = (20, 20, 30)
GREEN = (0, 255, 136)
RED = (255, 51, 102)
CYAN = (255, 255, 0)
YELLOW = (0, 255, 255)
PURPLE = (180, 80, 255)
BLUE = (255, 150, 50)
ORANGE = (0, 165, 255)
AMBER = (0, 200, 255)
GOLD = (0, 215, 255)
DARK_BG = (20, 20, 30)
PANEL_BG = (35, 35, 50)
BTN_NORMAL = (50, 50, 75)
BTN_HOVER = (70, 70, 110)
BTN_CORRECT = (0, 180, 60)
BTN_WRONG = (50, 30, 200)
BTN_TEXT = (220, 220, 240)


# ---------------------------------------------------------------------------
# Flag drawing functions — each draws inside a given (x, y, w, h) region
# ---------------------------------------------------------------------------

def _fill_rect(img, x, y, w, h, color):
    cv2.rectangle(img, (x, y), (x + w - 1, y + h - 1), color, -1)


def flag_indonesia(img, x, y, w, h):
    _fill_rect(img, x, y, w, h // 2, (0, 0, 255))       # red top
    _fill_rect(img, x, y + h // 2, w, h - h // 2, WHITE)  # white bottom


def flag_japan(img, x, y, w, h):
    _fill_rect(img, x, y, w, h, WHITE)
    r = int(min(w, h) * 0.3)
    cv2.circle(img, (x + w // 2, y + h // 2), r, (0, 0, 255), -1)  # red circle


def flag_malaysia(img, x, y, w, h):
    # 14 stripes (7 red, 7 white)
    stripe_h = h / 14.0
    for i in range(14):
        sy = int(y + i * stripe_h)
        eh = int(stripe_h) + 1
        color = (0, 0, 255) if i % 2 == 0 else WHITE
        cv2.rectangle(img, (x, sy), (x + w - 1, sy + eh), color, -1)
    # Blue canton
    cw = w // 2
    ch = int(h * 8 / 14)
    _fill_rect(img, x, y, cw, ch, (139, 0, 0))  # dark blue
    # Crescent
    cx, cy = x + cw // 2, y + ch // 2
    r = int(min(cw, ch) * 0.3)
    cv2.ellipse(img, (cx, cy), (r, r), 0, 120, 420, YELLOW, 2)
    cv2.ellipse(img, (cx + r // 3, cy), (r * 2 // 3, r), 0, 120, 420, (139, 0, 0), 2)
    # Star
    _draw_star(img, cx + r, cy, r // 2, YELLOW, 2)


def flag_singapore(img, x, y, w, h):
    _fill_rect(img, x, y, w, h // 2, (0, 0, 255))       # red top
    _fill_rect(img, x, y + h // 2, w, h - h // 2, WHITE)  # white bottom
    # Crescent + 5 stars in top-left of red portion
    cx, cy = x + w // 3, y + h // 4
    r = int(h * 0.15)
    cv2.ellipse(img, (cx, cy), (r, r), 0, 130, 410, WHITE, 2)
    cv2.ellipse(img, (cx + r // 4, cy), (r * 3 // 4, r), 0, 130, 410, (0, 0, 255), 2)
    # 5 small stars
    positions = [(cx + r * 3 // 2, cy - r // 3), (cx + r * 2, cy),
                 (cx + r * 2, cy + r // 2), (cx + r * 3 // 2, cy + r),
                 (cx + r * 3 // 2, cy - r)]
    for px, py in positions:
        _draw_star(img, px, py, r // 4, WHITE, -1)


def flag_usa(img, x, y, w, h):
    # 13 stripes
    stripe_h = h / 13.0
    for i in range(13):
        sy = int(y + i * stripe_h)
        color = (0, 0, 255) if i % 2 == 0 else WHITE
        cv2.rectangle(img, (x, sy), (x + w - 1, sy + int(stripe_h) + 1), color, -1)
    # Blue canton
    cw, ch = int(w * 0.4), int(h * 7 / 13)
    _fill_rect(img, x, y, cw, ch, (128, 0, 0))
    # Stars (simplified: dots in grid)
    for sr in range(9):
        for sc in range(6):
            sx = x + 8 + sc * (cw // 6)
            sy = y + 6 + sr * (ch // 9)
            if (sr + sc) % 2 == 0:
                cv2.circle(img, (sx, sy), 2, WHITE, -1)


def flag_uk(img, x, y, w, h):
    _fill_rect(img, x, y, w, h, (0, 0, 128))  # blue
    # Red cross (St George)
    cv2.rectangle(img, (x + w * 2 // 5, y), (x + w * 3 // 5, y + h), (0, 0, 255), -1)
    cv2.rectangle(img, (x, y + h * 2 // 5), (x + w, y + h * 3 // 5), (0, 0, 255), -1)
    # White diagonals (St Andrew)
    _draw_diagonal(img, x, y, w, h, WHITE, w // 6)
    # Red thin diagonals (St Patrick)
    _draw_diagonal(img, x, y, w, h, (0, 0, 255), w // 12)


def _draw_diagonal(img, x, y, w, h, color, thick):
    pts1 = np.array([[x, y], [x + thick, y], [x + w, y + h - thick], [x + w, y + h]], np.int32)
    pts2 = np.array([[x + w - thick, y], [x + w, y], [x + w, y + thick], [x, y + h]], np.int32)
    cv2.fillPoly(img, [pts1], color)
    cv2.fillPoly(img, [pts2], color)


def flag_china(img, x, y, w, h):
    _fill_rect(img, x, y, w, h, (0, 0, 255))  # red
    # Large star
    cx, cy = x + w // 5, y + h // 4
    size = int(min(w, h) * 0.18)
    _draw_star(img, cx, cy, size, YELLOW, -1)
    # 4 small stars
    for angle in [30, 60, 90, 120]:
        rad = math.radians(angle)
        sx = cx + int(size * 2.5 * math.cos(rad))
        sy = cy - int(size * 2.5 * math.sin(rad))
        _draw_star(img, sx, sy, size // 3, YELLOW, -1)


def flag_germany(img, x, y, w, h):
    bh = h // 3
    _fill_rect(img, x, y, w, bh, (0, 0, 0))          # black
    _fill_rect(img, x, y + bh, w, bh, (0, 0, 255))    # red
    _fill_rect(img, x, y + 2 * bh, w, h - 2 * bh, (0, 200, 255))  # gold


def flag_france(img, x, y, w, h):
    bw = w // 3
    _fill_rect(img, x, y, bw, h, (255, 0, 0))          # blue
    _fill_rect(img, x + bw, y, bw, h, WHITE)             # white
    _fill_rect(img, x + 2 * bw, y, w - 2 * bw, h, (0, 0, 255))  # red


def flag_brazil(img, x, y, w, h):
    _fill_rect(img, x, y, w, h, (0, 156, 0))  # green
    # Yellow diamond
    diamond = np.array([
        [x + w // 2, y + int(h * 0.05)],
        [x + int(w * 0.95), y + h // 2],
        [x + w // 2, y + int(h * 0.95)],
        [x + int(w * 0.05), y + h // 2],
    ], np.int32)
    cv2.fillPoly(img, [diamond], (0, 235, 255))  # yellow
    # Blue globe
    r = int(min(w, h) * 0.22)
    cv2.circle(img, (x + w // 2, y + h // 2), r, (255, 0, 0), -1)  # blue
    # White band
    cv2.ellipse(img, (x + w // 2, y + h // 2), (r, r // 3), 0, 0, 360, WHITE, 2)


def flag_south_korea(img, x, y, w, h):
    _fill_rect(img, x, y, w, h, WHITE)
    cx, cy = x + w // 2, y + h // 2
    r = int(min(w, h) * 0.2)
    # Yin-yang
    cv2.ellipse(img, (cx, cy), (r, r), 0, 0, 180, (0, 0, 255), -1)  # red top
    cv2.ellipse(img, (cx, cy), (r, r), 0, 180, 360, (255, 0, 0), -1)  # blue bot
    cv2.circle(img, (cx, cy - r // 2), r // 4, (0, 0, 255), -1)
    cv2.circle(img, (cx, cy + r // 2), r // 4, (255, 0, 0), -1)
    # Trigrams (simplified as line groups)
    for i, (gx, gy) in enumerate([
        (cx - r * 3 // 2, cy - r * 3 // 2),
        (cx - r * 3 // 2, cy + r * 3 // 2),
        (cx + r * 3 // 2, cy - r * 3 // 2),
        (cx + r * 3 // 2, cy + r * 3 // 2),
    ]):
        for j in range(3):
            ly = gy - 5 + j * 7
            cv2.line(img, (gx - 8, ly), (gx + 8, ly), BLACK, 2)


def flag_india(img, x, y, w, h):
    bh = h // 3
    _fill_rect(img, x, y, w, bh, (0, 128, 255))          # saffron
    _fill_rect(img, x, y + bh, w, bh, WHITE)               # white
    _fill_rect(img, x, y + 2 * bh, w, h - 2 * bh, (0, 128, 0))  # green
    # Ashoka Chakra (simplified)
    cx, cy = x + w // 2, y + h // 2
    r = int(min(w, h) * 0.1)
    cv2.circle(img, (cx, cy), r, (0, 0, 128), 2)
    for a in range(0, 360, 15):
        rad = math.radians(a)
        ex = cx + int(r * math.cos(rad))
        ey = cy + int(r * math.sin(rad))
        cv2.line(img, (cx, cy), (ex, ey), (0, 0, 128), 1)


def flag_australia(img, x, y, w, h):
    _fill_rect(img, x, y, w, h, (0, 0, 200))  # blue
    # Union Jack in canton
    cw, ch = w // 3, h // 2
    flag_uk(img, x, y, cw, ch)
    # Southern cross stars
    positions = [(x + int(w * 0.7), y + int(h * 0.25)),
                 (x + int(w * 0.8), y + int(h * 0.45)),
                 (x + int(w * 0.65), y + int(h * 0.55)),
                 (x + int(w * 0.75), y + int(h * 0.7))]
    for px, py in positions:
        _draw_star(img, px, py, 8, WHITE, -1)
    # Commonwealth star
    _draw_star(img, x + int(w * 0.6), y + int(h * 0.5), 12, WHITE, -1)


def _draw_star(img, cx, cy, size, color, thickness):
    """Draw a 5-pointed star centered at (cx, cy)."""
    pts = []
    for i in range(10):
        r = size if i % 2 == 0 else size // 2
        angle = math.radians(-90 + i * 36)
        pts.append((int(cx + r * math.cos(angle)),
                     int(cy + r * math.sin(angle))))
    pts_arr = np.array(pts, np.int32).reshape((-1, 1, 2))
    cv2.polylines(img, [pts_arr], True, color, thickness)
    if thickness == -1:
        cv2.fillPoly(img, [pts_arr], color)


def flag_turkey(img, x, y, w, h):
    _fill_rect(img, x, y, w, h, (0, 0, 230))  # red
    cx, cy = x + w // 3, y + h // 2
    r = int(min(w, h) * 0.22)
    # Crescent
    cv2.ellipse(img, (cx, cy), (r, r), 0, 120, 420, WHITE, 2)
    cv2.ellipse(img, (cx + r // 3, cy), (r * 3 // 4, r), 0, 120, 420, (0, 0, 230), 2)
    # Star
    _draw_star(img, cx + r * 3 // 2, cy, r // 2, WHITE, -1)


def flag_saudi_arabia(img, x, y, w, h):
    _fill_rect(img, x, y, w, h, (0, 96, 0))  # green
    # Shahada text (simplified as decorative lines)
    cx, cy = x + w // 2, y + h // 2
    for i in range(-8, 9):
        ly = cy + i * 5
        cv2.line(img, (cx - 50, ly), (cx + 50, ly), WHITE, 1)
    # Sword
    sword_y = y + h - int(h * 0.1)
    cv2.line(img, (cx, cy + 30), (cx, sword_y), WHITE, 3)
    cv2.line(img, (cx - 8, sword_y - 10), (cx + 8, sword_y + 5), WHITE, 3)


# ---------------------------------------------------------------------------
# Flag data
# ---------------------------------------------------------------------------
FLAGS = [
    {"name": "Indonesia", "draw": flag_indonesia},
    {"name": "Jepang", "draw": flag_japan},
    {"name": "Malaysia", "draw": flag_malaysia},
    {"name": "Singapura", "draw": flag_singapore},
    {"name": "Amerika Serikat", "draw": flag_usa},
    {"name": "Inggris", "draw": flag_uk},
    {"name": "China", "draw": flag_china},
    {"name": "Jerman", "draw": flag_germany},
    {"name": "Prancis", "draw": flag_france},
    {"name": "Brazil", "draw": flag_brazil},
    {"name": "Korea Selatan", "draw": flag_south_korea},
    {"name": "India", "draw": flag_india},
    {"name": "Australia", "draw": flag_australia},
    {"name": "Turki", "draw": flag_turkey},
    {"name": "Arab Saudi", "draw": flag_saudi_arabia},
]


# ---------------------------------------------------------------------------
# Answer Button
# ---------------------------------------------------------------------------
class AnswerButton:
    def __init__(self, label: str, x: int, y: int, w: int, h: int):
        self.label = label
        self.x = x
        self.y = y
        self.w = w
        self.h = h
        self.hovered = False
        self.state = "normal"  # normal | correct | wrong

    def contains(self, px: int, py: int) -> bool:
        return self.x <= px <= self.x + self.w and self.y <= py <= self.y + self.h

    def draw(self, img):
        if self.state == "correct":
            bg = BTN_CORRECT
        elif self.state == "wrong":
            bg = BTN_WRONG
        elif self.hovered:
            bg = BTN_HOVER
        else:
            bg = BTN_NORMAL

        cv2.rectangle(img, (self.x, self.y),
                      (self.x + self.w, self.y + self.h), bg, -1)
        cv2.rectangle(img, (self.x, self.y),
                      (self.x + self.w, self.y + self.h), (100, 100, 140), 2)

        # Center text
        font = cv2.FONT_HERSHEY_SIMPLEX
        scale = 0.7
        (tw, th), _ = cv2.getTextSize(self.label, font, scale, 2)
        tx = self.x + (self.w - tw) // 2
        ty = self.y + (self.h + th) // 2
        cv2.putText(img, self.label, (tx, ty), font, scale, BTN_TEXT, 2, cv2.LINE_AA)


# ---------------------------------------------------------------------------
# Flag Quiz Game
# ---------------------------------------------------------------------------
class FlagGame:
    def __init__(self, frame_w: int, frame_h: int):
        self.frame_w = frame_w
        self.frame_h = frame_h
        self.score = 0
        self.total_rounds = 0
        self.round_active = True
        self.current_flag = None
        self.buttons: list[AnswerButton] = []
        self.correct_idx = 0
        self.feedback_timer = 0
        self.FEEDBACK_DURATION = 60  # frames (~2 sec)
        self.cooldown = 0

        # Flag display area
        self.flag_x = frame_w // 2 - 120
        self.flag_y = 50
        self.flag_w = 240
        self.flag_h = 150

        self._new_round()

    def _new_round(self):
        self.round_active = True
        self.feedback_timer = 0
        self.cooldown = 15  # small cooldown to prevent instant re-select

        # Pick correct answer + 3 distractors
        options = random.sample(FLAGS, 4)
        self.current_flag = options[0]
        random.shuffle(options)
        self.correct_idx = options.index(self.current_flag)

        # Button layout: 2×2 grid
        btn_w = 280
        btn_h = 70
        margin_x = (self.frame_w - btn_w * 2 - 40) // 2
        start_y = self.flag_y + self.flag_h + 60

        self.buttons.clear()
        for i, opt in enumerate(options):
            col = i % 2
            row = i // 2
            bx = margin_x + col * (btn_w + 40)
            by = start_y + row * (btn_h + 20)
            self.buttons.append(AnswerButton(opt["name"], bx, by, btn_w, btn_h))

    def update(self, finger_x: int, finger_y: int, finger_visible: bool):
        if self.cooldown > 0:
            self.cooldown -= 1

        # Reset hover
        for btn in self.buttons:
            btn.hovered = False

        if not finger_visible or finger_x < 0 or finger_y < 0:
            return

        # Feedback countdown
        if self.feedback_timer > 0:
            self.feedback_timer -= 1
            if self.feedback_timer == 0:
                self._new_round()
            return

        if self.cooldown > 0:
            return

        # Hover detection
        for i, btn in enumerate(self.buttons):
            if btn.contains(finger_x, finger_y):
                btn.hovered = True
                # On hover for ~20 frames, select
                if self._get_hover_frames() >= 20:
                    self._select(i)
                break
        else:
            self._hover_frames_cnt = 0

    def _get_hover_frames(self):
        if not hasattr(self, '_hover_frames_cnt'):
            self._hover_frames_cnt = 0
        self._hover_frames_cnt += 1
        return self._hover_frames_cnt

    def _select(self, idx: int):
        self._hover_frames_cnt = 0
        self.round_active = False
        self.total_rounds += 1

        if idx == self.correct_idx:
            self.score += 10
            self.buttons[idx].state = "correct"
            self.buttons[self.correct_idx].state = "correct"
        else:
            self.buttons[idx].state = "wrong"
            self.buttons[self.correct_idx].state = "correct"

        self.feedback_timer = self.FEEDBACK_DURATION

    def draw(self, img):
        # Title
        cv2.putText(img, "TEBAK BENDERA", (self.frame_w // 2 - 130, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, CYAN, 2, cv2.LINE_AA)

        # Draw flag
        if self.current_flag:
            # Flag border
            cv2.rectangle(img,
                          (self.flag_x - 3, self.flag_y - 3),
                          (self.flag_x + self.flag_w + 3, self.flag_y + self.flag_h + 3),
                          WHITE, 3)
            self.current_flag["draw"](img, self.flag_x, self.flag_y,
                                       self.flag_w, self.flag_h)

        # Draw buttons
        for btn in self.buttons:
            btn.draw(img)

        # Score
        self.draw_status(img)

    def draw_status(self, img):
        # Score top-right
        score_text = f"Score: {self.score}"
        cv2.putText(img, score_text, (self.frame_w - 200, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, GOLD, 2, cv2.LINE_AA)

        # Round
        round_text = f"Round: {self.total_rounds + 1}"
        cv2.putText(img, round_text, (self.frame_w - 200, 65),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, WHITE, 1, cv2.LINE_AA)

        # Feedback text
        if self.feedback_timer > 0:
            if self.buttons[self.correct_idx].state == "correct" and \
               all(b.state != "wrong" for b in self.buttons):
                pass  # handled below

        # Bottom hint
        cv2.putText(img, "Tunjuk jawaban dengan jari telunjuk",
                    (self.frame_w // 2 - 160, self.frame_h - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (150, 150, 170), 1, cv2.LINE_AA)

    def is_game_over(self) -> bool:
        return False  # Endless mode
