"use client";

interface ControlBarProps {
  mirrored: boolean;
  fullscreen: boolean;
  backEnabled: boolean;
  reshuffleEnabled: boolean;
  onMirrorToggle: () => void;
  onFullscreenToggle: () => void;
  onBack: () => void;
  onReshuffle: () => void;
}

function btnClass(active: boolean, enabled: boolean, tone: "default" | "danger" = "default") {
  const base =
    "px-3 py-2 rounded-md text-xs font-semibold border transition-colors select-none";
  if (!enabled) {
    return `${base} border-white/10 text-white/30 bg-black/30 cursor-not-allowed`;
  }
  if (tone === "danger") {
    return `${base} border-red-400/60 text-white bg-red-500/20 hover:bg-red-500/40 active:bg-red-500/60 cursor-pointer`;
  }
  return active
    ? `${base} border-emerald-400 text-white bg-emerald-500/40 hover:bg-emerald-500/50 cursor-pointer`
    : `${base} border-emerald-400/40 text-white bg-black/40 hover:bg-emerald-500/20 cursor-pointer`;
}

/** Touch/click-friendly control bar — the web equivalent of keyboard shortcuts,
 * so this also works on displays without a physical keyboard. */
export default function ControlBar({
  mirrored,
  fullscreen,
  backEnabled,
  reshuffleEnabled,
  onMirrorToggle,
  onFullscreenToggle,
  onBack,
  onReshuffle,
}: ControlBarProps) {
  return (
    <div className="absolute top-2 right-2 z-20 flex gap-2">
      <button
        className={btnClass(false, reshuffleEnabled)}
        disabled={!reshuffleEnabled}
        onClick={onReshuffle}
      >
        Acak
      </button>
      <button className={btnClass(false, backEnabled)} disabled={!backEnabled} onClick={onBack}>
        Menu
      </button>
      <button className={btnClass(mirrored, true)} onClick={onMirrorToggle}>
        Mirror
      </button>
      <button className={btnClass(fullscreen, true)} onClick={onFullscreenToggle}>
        Full
      </button>
    </div>
  );
}
