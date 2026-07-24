# FingerQuest — Python MediaPipe Finger Detection

Real-time hand & finger detection using your webcam, built with **Python**, **OpenCV**, and **MediaPipe**.

## Quick Start

```bash
# 1. Create & activate virtual environment
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS / Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run
python main.py
```

## Controls

| Key | Action |
|-----|--------|
| `Q` / `ESC` | Quit |
| `F` | Toggle fullscreen |
| `M` | Toggle mirrored view |

## Features

- **Hand landmark detection** — 21 landmarks per hand via MediaPipe
- **Finger counting** — recognizes 0–5 raised fingers per hand
- **Multi-hand support** — detects up to 2 hands simultaneously
- **Real-time HUD** — shows finger count, handedness, FPS, model status
- **Index finger highlight** — glowing red dot on index fingertip
- **Hand skeleton overlay** — green lines connecting landmarks

## Requirements

- Python 3.9+
- Webcam
- See `requirements.txt` for package dependencies
