"use client";

import { useEffect } from "react";

/** Registers the service worker that caches the large MediaPipe model/wasm
 * assets, so repeat visits (e.g. a kiosk/IFP reopening the app) skip the
 * ~43MB re-download. Renders nothing. */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal: the app works fine without the asset cache, just slower
      // on repeat loads.
    });
  }, []);

  return null;
}
