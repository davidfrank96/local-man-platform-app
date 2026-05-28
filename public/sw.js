const CACHE_VERSION = "2026-05-pwa-runtime-v3";
const STATIC_CACHE_NAME = `localman-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/pwa-192x192.png",
  "/icons/pwa-512x512.png",
  "/icons/maskable-icon-192x192.png",
  "/icons/maskable-icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-32x32.png",
  "/branding/localman-brand-icon.png",
];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isDynamicMarketplacePath(pathname) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/vendors/") ||
    pathname === "/search"
  );
}

function isStaticAssetRequest(request, url) {
  if (!isSameOrigin(url) || isDynamicMarketplacePath(url.pathname)) {
    return false;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    return true;
  }

  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/branding/") ||
    url.pathname.startsWith("/seed-images/")
  ) {
    return request.destination === "image" || request.destination === "";
  }

  if (url.pathname === "/manifest.webmanifest" || url.pathname === OFFLINE_URL) {
    return true;
  }

  return (
    request.destination === "font" ||
    request.destination === "script" ||
    request.destination === "style"
  );
}

function isFreshShellAssetRequest(request, url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    request.destination === "script" ||
    request.destination === "style"
  );
}

function isCacheableResponse(response) {
  return response.ok && response.type === "basic";
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);

  if (isCacheableResponse(networkResponse)) {
    await cache.put(request, networkResponse.clone());
  }

  return networkResponse;
}

async function networkFirstStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);

  try {
    const networkResponse = await fetch(request);

    if (isCacheableResponse(networkResponse)) {
      await cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

async function networkOnlyNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const fallback = await caches.match(OFFLINE_URL);

    if (fallback) {
      return fallback;
    }

    return new Response(
      "You appear to be offline. Some Localman features may be unavailable.",
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
        status: 503,
      },
    );
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) =>
              cacheName.startsWith("localman-static-") &&
              cacheName !== STATIC_CACHE_NAME,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (!isSameOrigin(url)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkOnlyNavigation(request));
    return;
  }

  if (!isStaticAssetRequest(request, url)) {
    return;
  }

  event.respondWith(
    isFreshShellAssetRequest(request, url)
      ? networkFirstStaticAsset(request)
      : cacheFirst(request),
  );
});
