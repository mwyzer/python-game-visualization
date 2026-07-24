# Product Requirements Document (PRD)

## FingerQuest — Interactive Computer Vision Finger Tracking Game

---

## 1. Product Overview

FingerQuest adalah aplikasi web interaktif berbasis **Computer Vision** yang menggunakan kamera perangkat untuk mendeteksi tangan dan jari pengguna secara realtime.

Pengguna berinteraksi dengan game menggunakan **gerakan tangan dan posisi jari**, tanpa mouse atau keyboard sebagai kontrol utama.

Konsep utama:

> **Move your finger. Hit the target. Complete the challenge.**

Sistem akan:

1. Mengakses webcam.
2. Mendeteksi tangan pengguna.
3. Mendeteksi **21 hand landmarks**.
4. Mengidentifikasi posisi jari telunjuk.
5. Menampilkan posisi jari secara realtime.
6. Menghasilkan target di layar.
7. Pengguna menggerakkan jari ke target.
8. Sistem mendeteksi collision.
9. Memberikan skor.
10. Meningkatkan tingkat kesulitan.

---

## 2. Product Vision

Membangun platform interaksi berbasis **hand tracking** yang awalnya berupa game sederhana, tetapi dapat dikembangkan menjadi:

- Computer Vision portfolio project
- Educational game
- Finger tracking exercise
- Interactive presentation
- Touchless UI
- Gesture-controlled application
- AI/CV experiment platform

---

## 3. Target User

### Primary User

- Pelajar
- Mahasiswa
- Developer
- Computer Vision enthusiast
- Pengguna yang ingin mencoba teknologi gesture recognition

### Secondary User

- Guru
- Sekolah
- Trainer
- Developer portfolio reviewer
- Pengembang aplikasi interactive technology

---

## 4. Core User Journey

```
Open Website
     ↓
Landing Page
     ↓
Start Game
     ↓
Camera Permission
     ↓
Camera Calibration
     ↓
Hand Detection
     ↓
Finger Detection
     ↓
Game Starts
     ↓
Target Appears
     ↓
Move Index Finger
     ↓
Finger Touches Target
     ↓
Score +1
     ↓
New Target
     ↓
Difficulty Increases
     ↓
Game Completed
     ↓
Final Score
```

---

## 5. Product Phases

### PHASE 0 — Product Discovery & Technical Validation

#### Tujuan

Memastikan teknologi utama dapat berjalan di browser.

#### Scope

- Test webcam
- Test MediaPipe
- Test hand detection
- Test 21 landmarks
- Test finger tracking
- Test browser compatibility

#### Output

```
Camera
   ↓
MediaPipe
   ↓
Hand
   ↓
21 Landmarks
   ↓
Index Finger Position
```

#### Acceptance Criteria

- Webcam dapat diakses.
- Tangan dapat terdeteksi.
- Landmark muncul realtime.
- Posisi telunjuk dapat diketahui.
- FPS minimal ±20 FPS pada perangkat target.

#### Status

**MVP Technical Validation**

---

### PHASE 1 — Finger Detection MVP

#### Tujuan

Membuat sistem deteksi tangan dan jari secara realtime.

#### Fitur

**1. Camera**
- Start camera
- Stop camera
- Camera permission handling
- Camera error handling

**2. Hand Tracking**
- Detect hand
- Detect multiple hands
- 21 hand landmarks
- Draw hand skeleton

**3. Finger Detection**

Sistem dapat mendeteksi:

```
Thumb
Index
Middle
Ring
Pinky
```

**4. Finger Counter**

Contoh:

```
☝️  1 Finger
✌️  2 Fingers
🤟  3 Fingers
🖐️  5 Fingers
```

#### UI

```
┌─────────────────────────────┐
│ Finger Detection            │
│                             │
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │       Webcam            │ │
│ │          ✋              │ │
│ │                         │ │
│ └─────────────────────────┘ │
│                             │
│ Fingers Detected: 5         │
│ Hand: Right                 │
│ FPS: 30                     │
└─────────────────────────────┘
```

#### Acceptance Criteria

- User dapat melihat webcam.
- Tangan terdeteksi.
- Landmark divisualisasikan.
- Jumlah jari ditampilkan.

---

### PHASE 2 — Gesture Recognition

#### Tujuan

Mengubah hand landmarks menjadi gesture.

#### Gesture MVP

| Gesture | Action |
|---|---|
| ☝️ | Select |
| ✌️ | Next |
| 👍 | Confirm |
| 👎 | Cancel |
| ✋ | Pause |
| 🤏 | Grab |
| 👌 | Complete |

#### Architecture

```
Camera
   ↓
Hand Landmarks
   ↓
Feature Extraction
   ↓
Gesture Classifier
   ↓
Gesture Event
   ↓
Application Action
```

#### Contoh

```
👍
   ↓
Gesture = THUMBS_UP
   ↓
Action = CONFIRM
```

#### Acceptance Criteria

- Gesture dapat dikenali realtime.
- Gesture tidak terlalu sensitif terhadap perubahan kecil.
- Terdapat debounce/cooldown untuk mencegah trigger berulang.

---

### PHASE 3 — Finger Puzzle Game MVP

#### Tujuan

Mengubah sistem deteksi jari menjadi game interaktif.

#### Gameplay

User harus mengarahkan **jari telunjuk** ke target yang muncul di layar.

```
       TARGET

         🔴

          ↑
          │
      ☝️  │
       Finger
```

Ketika:

```
Distance(Finger, Target) < Threshold
```

Maka:

```
Target Hit
    ↓
Score +1
    ↓
Target Baru
```

#### Game Mechanics

**Score**

```
Target Hit = +10
```

**Combo**

```
3 Targets = Combo x2
5 Targets = Combo x3
10 Targets = Combo x5
```

**Timer**

Contoh:

```
Time: 60 seconds
Score: 120
Combo: x3
```

#### Target Types

**Easy** — Target besar.

```
⭕
```

**Medium** — Target lebih kecil.

```
○
```

**Hard** — Target bergerak.

```
● → → →
```

#### Acceptance Criteria

- Target muncul.
- Posisi telunjuk terdeteksi.
- Collision dapat dideteksi.
- Score bertambah.
- Target baru muncul.
- Timer berjalan.

---

### PHASE 4 — Advanced Gameplay

#### Tujuan

Meningkatkan game menjadi lebih kompleks dan menarik.

#### Features

**1. Moving Target**

Target bergerak.

```
● ───────→
```

**2. Multiple Targets**

User harus memilih target yang benar.

```
🔴   🔵   🟢
```

Contoh:

```
Target:
🔵

User harus menyentuh:
🔵
```

**3. Color Challenge**

Sistem memberikan instruksi:

> Touch the RED target.

User harus menyentuh target merah.

**4. Number Challenge**

```
Touch Target #3
```

**5. Sequence Challenge**

```
1 → 2 → 3 → 4
```

**6. Gesture Challenge**

Contoh:

```
Show ✌️
```

atau:

```
Make 👍
```

---

### PHASE 5 — Game Modes

#### Mode 1 — Free Play

Tidak ada timer. User bebas mencoba.

---

#### Mode 2 — Time Attack

```
60 Seconds
```

Target sebanyak mungkin.

---

#### Mode 3 — Accuracy

Sistem menghitung:

```
Accuracy: 92%
```

---

#### Mode 4 — Reflex

Target muncul secara random. User harus merespons secepat mungkin.

---

#### Mode 5 — Gesture Master

User harus mengikuti instruksi gesture.

```
Show:

✌️
```

Kemudian:

```
👍
```

Kemudian:

```
🤏
```

---

### PHASE 6 — Gamification

#### Tujuan

Meningkatkan engagement.

#### Features

- Score
- High Score
- Combo
- Level
- Achievement
- Leaderboard lokal
- Personal Best

#### Achievement

```
🏆 First Touch
🏆 10 Targets
🏆 100 Points
🏆 Perfect Accuracy
🏆 Speed Master
🏆 Gesture Master
```

#### Level

```
Level 1
   ↓
Level 2
   ↓
Level 3
   ↓
Level 4
   ↓
Level 5
```

Difficulty meningkat berdasarkan:

- Target size
- Target speed
- Spawn interval
- Number of targets
- Gesture complexity

---

### PHASE 7 — Analytics & Data

#### Tujuan

Menganalisis performa pengguna.

#### Metrics

```
Total Games
Best Score
Average Score
Average Accuracy
Average Reaction Time
Best Combo
```

#### Game Result

```json
{
  "score": 1250,
  "accuracy": 94.2,
  "reactionTime": 820,
  "combo": 8,
  "level": 5
}
```

#### Storage

MVP:

```
localStorage
```

Future:

```
Next.js
    ↓
API
    ↓
PostgreSQL
```

---

### PHASE 8 — Production & Deployment

#### Frontend

```
Next.js
TypeScript
Tailwind CSS
```

#### Computer Vision

```
MediaPipe
Hand Landmarker
```

#### Backend — Optional

```
Next.js API
atau
FastAPI
```

#### Database — Optional

```
PostgreSQL
```

#### Deployment

```
GitHub
    ↓
CI/CD
    ↓
Vercel
```

#### Production Requirements

- HTTPS
- Webcam permission
- Responsive UI
- Error handling
- Browser compatibility
- Performance optimization
- Mobile compatibility testing

---

## 6. Technical Architecture

```
                  ┌──────────────┐
                  │    Webcam    │
                  └──────┬───────┘
                         │
                         ▼
                ┌─────────────────┐
                │  Video Stream   │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │    MediaPipe    │
                │  Hand Landmarker│
                └────────┬────────┘
                         │
                         ▼
                 21 Hand Landmarks
                         │
                         ▼
              ┌─────────────────────┐
              │ Finger Position     │
              │ Gesture Recognition │
              └──────────┬──────────┘
                         │
                         ▼
                 Game Engine
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
         Target        Score        Level
            │            │            │
            └────────────┼────────────┘
                         ▼
                       UI
```

---

## 7. Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **UI** | React 19 + Tailwind CSS 4 |
| **State** | Zustand |
| **ML Model** | `@mediapipe/hands` + `@mediapipe/camera_utils` |
| **Rendering** | HTML5 Canvas for skeleton overlay |
| **Animation** | CSS transitions + Framer Motion |
| **Testing** | Vitest + React Testing Library |
| **Linting** | ESLint 9 (flat config) |
| **Deployment** | Vercel |

---

## 8. Dependencies (npm)

```json
{
  "@mediapipe/hands": "^0.4",
  "@mediapipe/camera_utils": "^0.3",
  "zustand": "^5",
  "framer-motion": "^12",
  "clsx": "^2"
}
```

---

## 9. Non-Functional Requirements

| NFR | Target |
|---|---|
| **Performance** | ≥20 FPS at 640×480 on mid-range laptop |
| **First Contentful Paint** | <1.5 s |
| **Model Load Time** | <3 s (WASM + model weights cached via CDN) |
| **Bundle Size** | <300 KB gzipped (excluding MediaPipe WASM) |
| **Browser Support** | Chrome 90+, Edge 90+, Firefox 90+, Safari 15+ |
| **Privacy** | Zero server calls; all processing on-device |
| **Accessibility** | WCAG 2.1 AA, keyboard navigable |
| **HTTPS** | Required for getUserMedia |

---

## 10. Success Metrics

- **Finger-count accuracy** ≥ 95% under good lighting
- **Detection latency** < 50 ms per frame (20 FPS)
- **User can start detecting within 5 seconds** of page load
- **Zero 500 errors** (nothing hits a server)

---

*Document version: 2.0 | Date: 2026-07-24 | Product: FingerQuest | Status: Approved*
