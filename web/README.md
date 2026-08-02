# FingerQuest — Web

Versi web dari [FingerQuest](../finger-detection) (yang aslinya aplikasi desktop Python). Semua deteksi tangan berjalan 100% di browser (client-side, via MediaPipe Tasks Vision WASM) — tidak ada server/backend, jadi bisa langsung dibuka dari HP, tablet, laptop, atau interactive flat panel (IFP) cukup lewat link, tanpa install apa pun.

Tiga game yang sama seperti versi desktop, dikendalikan dengan jari telunjuk:

1. **Tebak Bendera** — tebak nama negara dari benderanya.
2. **Puzzle** — susun ulang puzzle nomor 3x3 dengan drag pakai jari.
3. **Puzzle Foto** — gambar area dengan jari untuk mengambil foto dari kamera, lalu susun jadi puzzle 3x3.

Juga tersedia tombol on-screen (Menu, Mirror, Full, Acak) untuk perangkat tanpa keyboard/mouse — sentuh langsung berfungsi karena ini web biasa.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Browser akan meminta izin kamera saat halaman dibuka.

> Kamera hanya bisa diakses lewat `https://` atau `localhost` (batasan keamanan browser) — ini otomatis terpenuhi di `next dev` dan di Vercel.

## Struktur

- `src/components/GameApp.tsx` — orkestrasi utama: akses kamera, load model MediaPipe, render loop (canvas).
- `src/components/ControlBar.tsx`, `CameraPicker.tsx` — UI pendukung (tombol sentuh, pemilih kamera bila lebih dari satu).
- `src/game/*.ts` — logika tiap game (menu, flag quiz, puzzle, puzzle foto), porting langsung dari versi Python di `../finger-detection`.
- `public/models/hand_landmarker.task` — model MediaPipe Hand Landmarker (di-bundle lokal, ~7.8 MB).
- `public/wasm/` — runtime WASM MediaPipe Tasks Vision (di-bundle lokal, ~35 MB total untuk 3 varian SIMD/non-SIMD; browser cuma mengunduh salah satu sesuai dukungannya).

Aset-aset di atas sengaja di-bundle lokal (bukan CDN) supaya deploy tidak bergantung pihak ketiga saat runtime.

## Deploy ke Vercel

```bash
npx vercel
```

atau hubungkan repo ini ke Vercel dari dashboard, dengan **Root Directory** diarahkan ke folder `web/`. Tidak ada environment variable yang dibutuhkan — semua proses ada di browser pengguna.

## Build production lokal

```bash
npm run build
npm run start
```
