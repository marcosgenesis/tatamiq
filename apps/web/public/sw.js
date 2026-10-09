const CACHE_NAME = "appdosensei-shell-v3";
const ASSET_FETCH_TIMEOUT_MS = 10000;
const SHELL_ASSETS = [
  "/offline.html",
  "/manifest.json",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  // Nunca cacheia API/autenticação. Dados do aluno são sensíveis e devem vir da rede.
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth") || url.port === "3100") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }

  event.respondWith(fetchAndCache(request));
});

async function fetchAndCache(request) {
  const cached = await caches.match(request);
  try {
    const response = await fetchWithTimeout(request, ASSET_FETCH_TIMEOUT_MS);
    if (response && response.status === 200 && response.type !== "opaque") {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

// A hung network response must not stall the app forever: a lazily imported route chunk
// that never resolves leaves the Suspense fallback ("Carregando...") spinning with no
// recovery. Time out and fail so the page's `vite:preloadError` handler reloads onto
// fresh chunks instead.
function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}
