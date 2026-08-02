"use client";

interface CameraPickerProps {
  devices: MediaDeviceInfo[];
  onSelect: (deviceId: string) => void;
}

export default function CameraPicker({ devices, onSelect }: CameraPickerProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-sm rounded-lg border border-white/10 bg-zinc-900 p-6 text-white">
        <h2 className="mb-1 text-lg font-semibold">Pilih Kamera</h2>
        <p className="mb-4 text-sm text-white/60">
          Ditemukan {devices.length} kamera. Pilih salah satu untuk mulai.
        </p>
        <div className="flex flex-col gap-2">
          {devices.map((d, i) => (
            <button
              key={d.deviceId}
              onClick={() => onSelect(d.deviceId)}
              className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-left text-sm hover:bg-emerald-500/20 hover:border-emerald-400/60"
            >
              {d.label || `Kamera ${i + 1}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
