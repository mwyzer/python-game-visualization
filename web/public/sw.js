// FingerQuest service worker.
//
// Scope is deliberately narrow: cache-first only for the large, stable-named
// static assets (MediaPipe model + wasm runtime, icons). HTML/JS/CSS are left
// untouched and always go to the network, so app updates from a new deploy
// are never masked by a stale cache.
const CACHE_NAME = "fingerquest-assets-v1";
const CACHEABLE_PREFIXES = ["/models/", "/wasm/", "/icons/"];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!CACHEABLE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      const response = await fetch(event.request);
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    })
  );
});
