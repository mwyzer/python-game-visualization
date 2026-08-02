"""
FingerQuest On-Screen Controls
================================
Touch/click-friendly control bar so the game can be operated without a
physical keyboard (e.g. on an interactive flat panel), in addition to the
existing keyboard shortcuts. Works with mouse clicks and with touch input
that the OS translates into mouse events (the standard behavior on Windows
touch panels).
"""

import cv2

WHITE = (255, 255, 255)
GREEN = (0, 255, 136)
RED = (255, 51, 102)
DARK = (35, 35, 50)
DISABLED_TEXT = (110, 110, 130)
DISABLED_BORDER = (70, 70, 90)

ACTION_QUIT = "quit"
ACTION_FULLSCREEN = "fullscreen"
ACTION_MIRROR = "mirror"
ACTION_BACK = "back"
ACTION_RESHUFFLE = "reshuffle"


class ControlButton:
    def __init__(self, action: str, label: str, x: int, y: int, w: int, h: int):
        self.action = action
        self.label = label
        self.x, self.y, self.w, self.h = x, y, w, h

    def contains(self, px: int, py: int) -> bool:
        return self.x <= px <= self.x + self.w and self.y <= py <= self.y + self.h

    def draw(self, img, enabled: bool):
        border = DISABLED_BORDER
        text_color = DISABLED_TEXT
        if enabled:
            border = RED if self.action == ACTION_QUIT else GREEN
            text_color = WHITE

        cv2.rectangle(img, (self.x, self.y), (self.x + self.w, self.y + self.h),
                      DARK, -1)
        cv2.rectangle(img, (self.x, self.y), (self.x + self.w, self.y + self.h),
                      border, 2)

        (tw, th), _ = cv2.getTextSize(self.label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
        tx = self.x + (self.w - tw) // 2
        ty = self.y + (self.h + th) // 2
        cv2.putText(img, self.label, (tx, ty), cv2.FONT_HERSHEY_SIMPLEX,
                    0.5, text_color, 2, cv2.LINE_AA)


class ControlBar:
    """Row of touch/click buttons anchored to the top-right corner."""

    def __init__(self, frame_w: int, frame_h: int):
        btn_h, gap = 38, 8
        specs = [
            (ACTION_RESHUFFLE, "Acak", 60),
            (ACTION_BACK, "Menu", 60),
            (ACTION_MIRROR, "Mirror", 70),
            (ACTION_FULLSCREEN, "Full", 60),
            (ACTION_QUIT, "X", 40),
        ]
        self.buttons = []
        x = frame_w - 10
        y = 8
        for action, label, w in specs:
            x -= w
            self.buttons.append(ControlButton(action, label, x, y, w, btn_h))
            x -= gap

    def draw(self, img, back_enabled: bool, reshuffle_enabled: bool):
        for btn in self.buttons:
            enabled = True
            if btn.action == ACTION_BACK:
                enabled = back_enabled
            elif btn.action == ACTION_RESHUFFLE:
                enabled = reshuffle_enabled
            btn.draw(img, enabled)

    def handle_click(self, px: int, py: int, back_enabled: bool,
                      reshuffle_enabled: bool):
        for btn in self.buttons:
            if not btn.contains(px, py):
                continue
            if btn.action == ACTION_BACK and not back_enabled:
                return None
            if btn.action == ACTION_RESHUFFLE and not reshuffle_enabled:
                return None
            return btn.action
        return None
