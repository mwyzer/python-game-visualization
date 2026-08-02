"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";

import ControlBar from "./ControlBar";
import CameraPicker from "./CameraPicker";
import { COLOR, INDEX_TIP, WRIST } from "@/game/constants";
import { GameScreen, type FingerState } from "@/game/types";
import { MenuButton, drawMenu, updateMenuHover } from "@/game/menu";
import { FlagGame } from "@/game/flagGame";
import { PuzzleBoard, createDefaultPuzzle } from "@/game/puzzle";
import { PhotoPuzzleGame } from "@/game/photoPuzzle";

type Status =
  | "requesting-permission"
  | "picking-camera"
  | "loading-model"
  | "running"
  | "error";

interface GameState {
  screen: GameScreen;
  menuButtons: MenuButton[];
  flagGame: FlagGame | null;
  puzzle: PuzzleBoard | null;
  photoPuzzle: PhotoPuzzleGame | null;
}

function buildMenuButtons(w: number, h: number): MenuButton[] {
  const btnW = Math.min(450, w - 40);
  const btnH = 70;
  const gap = 15;
  const x = (w - btnW) / 2;
  const y0 = Math.max(120, h * 0.35);
  return [
    new MenuButton(
      "🎌",
      "Tebak Bendera",
      "Tebak nama negara dari bendera nasional",
      x,
      y0,
      btnW,
      btnH,
      "#ffa500"
    ),
    new MenuButton(
      "🧩",
      "Puzzle",
      "Susun puzzle dengan gerakan jari",
      x,
      y0 + (btnH + gap),
      btnW,
      btnH,
      "#00ff88"
    ),
    new MenuButton(
      "🖼️",
      "Puzzle Foto",
      "Gambar area dengan jari, lalu susun fotomu",
      x,
      y0 + 2 * (btnH + gap),
      btnW,
      btnH,
      "#b450ff"
    ),
  ];
}

function mapGetUserMediaError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Izin kamera ditolak. Aktifkan izin kamera di browser lalu muat ulang halaman.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Tidak ada kamera yang terdeteksi di perangkat ini.";
  }
  if (name === "NotReadableError") {
    return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.";
  }
  return "Gagal mengakses kamera. Coba muat ulang halaman.";
}

export default function GameApp() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);
  const lastTsRef = useRef(0);
  const frameSizeRef = useRef({ w: 640, h: 480 });
  const mirroredRef = useRef(true);
  const gameRef = useRef<GameState>({
    screen: GameScreen.MENU,
    menuButtons: [],
    flagGame: null,
    puzzle: null,
    photoPuzzle: null,
  });

  const [status, setStatus] = useState<Status>("requesting-permission");
  const [errorMessage, setErrorMessage] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [mirrored, setMirrored] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [uiScreen, setUiScreen] = useState<GameScreen>(GameScreen.MENU);

  const goToMenu = useCallback(() => {
    const g = gameRef.current;
    g.screen = GameScreen.MENU;
    for (const btn of g.menuButtons) btn.reset();
    setUiScreen(GameScreen.MENU);
  }, []);

  const selectGame = useCallback((screen: GameScreen) => {
    const g = gameRef.current;
    const { w, h } = frameSizeRef.current;
    g.screen = screen;
    if (screen === GameScreen.FLAG_GAME) g.flagGame = new FlagGame(w, h);
    if (screen === GameScreen.PUZZLE) g.puzzle = createDefaultPuzzle(w, h);
    if (screen === GameScreen.PHOTO_PUZZLE) g.photoPuzzle = new PhotoPuzzleGame(w, h);
    for (const btn of g.menuButtons) btn.reset();
    setUiScreen(screen);
  }, []);

  const drawHandSkeleton = (
    ctx: CanvasRenderingContext2D,
    landmarks: { x: number; y: number }[],
    w: number,
    h: number
  ) => {
    ctx.strokeStyle = COLOR.green;
    ctx.lineWidth = 2;
    for (const conn of HandLandmarker.HAND_CONNECTIONS) {
      const a = landmarks[conn.start];
      const b = landmarks[conn.end];
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    }
    landmarks.forEach((lm, i) => {
      const cx = lm.x * w;
      const cy = lm.y * h;
      if (i === INDEX_TIP) {
        ctx.fillStyle = COLOR.red;
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = COLOR.red;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = COLOR.white;
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = COLOR.green;
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = COLOR.white;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  };

  const loopRef = useRef<() => void>(() => {});

  const loop = useCallback(() => {
    const now = performance.now();
    const dtMs = lastFrameTimeRef.current ? now - lastFrameTimeRef.current : 16;
    lastFrameTimeRef.current = now;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const cleanCanvas = cleanCanvasRef.current;
    const landmarker = handLandmarkerRef.current;

    if (video && canvas && cleanCanvas && landmarker && video.readyState >= 2) {
      const { w, h } = frameSizeRef.current;

      const cctx = cleanCanvas.getContext("2d")!;
      cctx.save();
      if (mirroredRef.current) {
        cctx.translate(w, 0);
        cctx.scale(-1, 1);
      }
      cctx.drawImage(video, 0, 0, w, h);
      cctx.restore();

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(cleanCanvas, 0, 0);

      const ts = Math.max(Math.round(now), lastTsRef.current + 1);
      lastTsRef.current = ts;
      let result: HandLandmarkerResult | null = null;
      try {
        result = landmarker.detectForVideo(cleanCanvas, ts);
      } catch {
        // transient decode errors can happen on the very first frames
      }

      let fingerX = -1;
      let fingerY = -1;
      let fingerVisible = false;

      if (result && result.landmarks.length > 0) {
        result.landmarks.forEach((lm, i) => {
          drawHandSkeleton(ctx, lm, w, h);

          const label = result!.handedness[i]?.[0]?.categoryName ?? "Right";
          const displayLabel = mirroredRef.current
            ? label === "Right"
              ? "Left"
              : "Right"
            : label;
          const wrist = lm[WRIST];
          ctx.fillStyle = COLOR.green;
          ctx.font = "16px sans-serif";
          ctx.fillText(displayLabel, wrist.x * w - 20, wrist.y * h - 20);

          if (!fingerVisible) {
            const tip = lm[INDEX_TIP];
            fingerX = tip.x * w;
            fingerY = tip.y * h;
            fingerVisible = true;
          }
        });
      }

      const finger: FingerState = { x: fingerX, y: fingerY, visible: fingerVisible };
      const g = gameRef.current;

      if (g.screen === GameScreen.MENU) {
        updateMenuHover(g.menuButtons, finger, dtMs);
        drawMenu(ctx, w, h, g.menuButtons);
        const idx = g.menuButtons.findIndex((b) => b.isSelected);
        if (idx !== -1) {
          const targets = [GameScreen.FLAG_GAME, GameScreen.PUZZLE, GameScreen.PHOTO_PUZZLE];
          selectGame(targets[idx]);
        }
      } else if (g.screen === GameScreen.FLAG_GAME && g.flagGame) {
        g.flagGame.update(finger, dtMs);
        g.flagGame.draw(ctx);
      } else if (g.screen === GameScreen.PUZZLE && g.puzzle) {
        g.puzzle.update(finger, dtMs);
        g.puzzle.draw(ctx);
        g.puzzle.drawStatus(ctx, w, h);
      } else if (g.screen === GameScreen.PHOTO_PUZZLE && g.photoPuzzle) {
        g.photoPuzzle.update(finger, dtMs, cleanCanvas);
        g.photoPuzzle.draw(ctx);
        g.photoPuzzle.drawStatus(ctx);
      }

      if (g.screen !== GameScreen.MENU) {
        ctx.fillStyle = "#96a0aa";
        ctx.font = "12px sans-serif";
        ctx.fillText("Klik Menu untuk kembali", 20, h - 15);
      }
    }

    rafIdRef.current = requestAnimationFrame(() => loopRef.current());
  }, [selectGame]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  // Generation token guarding against React StrictMode's dev-mode double
  // effect invocation: without it, two overlapping getUserMedia/HandLandmarker
  // initializations can end up running concurrently against the same refs.
  const initGenerationRef = useRef(0);

  const startWithStream = useCallback(async (stream: MediaStream, isStale: () => boolean) => {
    streamRef.current = stream;
    const video = videoRef.current!;
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    await new Promise<void>((resolve) => {
      if (video.readyState >= 2 && video.videoWidth > 0) resolve();
      else video.onloadedmetadata = () => resolve();
    });
    if (isStale()) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    frameSizeRef.current = { w, h };

    const canvas = canvasRef.current!;
    canvas.width = w;
    canvas.height = h;
    canvas.style.aspectRatio = `${w} / ${h}`;

    const clean = document.createElement("canvas");
    clean.width = w;
    clean.height = h;
    cleanCanvasRef.current = clean;

    setStatus("loading-model");

    const fileset = await FilesetResolver.forVisionTasks("/wasm");
    const landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: "/models/hand_landmarker.task" },
      numHands: 2,
      runningMode: "VIDEO",
      minHandDetectionConfidence: 0.7,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    if (isStale()) {
      landmarker.close();
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    handLandmarkerRef.current = landmarker;

    gameRef.current.menuButtons = buildMenuButtons(w, h);
    gameRef.current.screen = GameScreen.MENU;
    setUiScreen(GameScreen.MENU);

    setStatus("running");
    lastFrameTimeRef.current = performance.now();
    rafIdRef.current = requestAnimationFrame(() => loopRef.current());
  }, []);

  useEffect(() => {
    initGenerationRef.current += 1;
    const myGeneration = initGenerationRef.current;
    const isStale = () => myGeneration !== initGenerationRef.current;

    async function init() {
      try {
        setStatus("requesting-permission");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (isStale()) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const all = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = all.filter((d) => d.kind === "videoinput");
        setDevices(videoInputs);
        if (isStale()) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoInputs.length > 1) {
          stream.getTracks().forEach((t) => t.stop());
          setStatus("picking-camera");
        } else {
          await startWithStream(stream, isStale);
        }
      } catch (err) {
        if (!isStale()) {
          setStatus("error");
          setErrorMessage(mapGetUserMediaError(err));
        }
      }
    }
    init();

    return () => {
      initGenerationRef.current += 1;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      handLandmarkerRef.current?.close();
      handLandmarkerRef.current = null;
    };
  }, [startWithStream]);

  useEffect(() => {
    const onFsChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const handleSelectCamera = async (deviceId: string) => {
    const myGeneration = initGenerationRef.current;
    const isStale = () => myGeneration !== initGenerationRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      await startWithStream(stream, isStale);
    } catch (err) {
      if (!isStale()) {
        setStatus("error");
        setErrorMessage(mapGetUserMediaError(err));
      }
    }
  };

  const toggleMirror = () => {
    mirroredRef.current = !mirroredRef.current;
    setMirrored(mirroredRef.current);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleReshuffle = () => {
    const g = gameRef.current;
    if (g.screen === GameScreen.PUZZLE) g.puzzle?.shuffle();
    if (g.screen === GameScreen.PHOTO_PUZZLE) g.photoPuzzle?.reshuffle();
  };

  const backEnabled = uiScreen !== GameScreen.MENU;
  const reshuffleEnabled = uiScreen === GameScreen.PUZZLE || uiScreen === GameScreen.PHOTO_PUZZLE;

  return (
    <div
      ref={containerRef}
      className="relative flex w-full flex-1 items-center justify-center bg-black"
    >
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas
        ref={canvasRef}
        className="max-h-full max-w-full rounded-lg bg-zinc-900"
        style={{ width: "100%", height: "auto" }}
      />

      {status === "running" && (
        <ControlBar
          mirrored={mirrored}
          fullscreen={fullscreen}
          backEnabled={backEnabled}
          reshuffleEnabled={reshuffleEnabled}
          onMirrorToggle={toggleMirror}
          onFullscreenToggle={toggleFullscreen}
          onBack={goToMenu}
          onReshuffle={handleReshuffle}
        />
      )}

      {status === "picking-camera" && (
        <CameraPicker devices={devices} onSelect={handleSelectCamera} />
      )}

      {(status === "requesting-permission" || status === "loading-model") && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/80 text-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
          <p className="text-sm text-white/80">
            {status === "requesting-permission"
              ? "Meminta izin kamera..."
              : "Memuat model deteksi tangan..."}
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/90 px-6 text-center text-white">
          <p className="text-lg font-semibold text-red-400">Gagal memulai kamera</p>
          <p className="max-w-sm text-sm text-white/70">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
          >
            Muat Ulang
          </button>
        </div>
      )}
    </div>
  );
}
