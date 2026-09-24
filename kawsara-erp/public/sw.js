// Service worker minimal (PWA) : ameliore l'experience mobile (installable, resilience reseau
// faible) sans se substituer a la logique metier, toujours executee cote serveur.
// N'est enregistre qu'en production (voir src/components/pwa-register.tsx).
const CACHE_NAME = "kawsara-v2"; // v2 : nouveau logo et nouvelles icones
const APP_SHELL = ["/", "/catalogue", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Jamais intercepter les mutations (Server Actions, formulaires, API) : uniquement les
  // lectures GET peuvent etre mises en cache sans risque.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/products/") ||
    /\.(?:png|jpg|jpeg|svg|ico|woff2?)$/.test(url.pathname);

  if (isStaticAsset) {
    // Cache-first : les assets statiques sont versionnes par Next.js, sans risque de peremption.
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }

  if (request.mode === "navigate") {
    // Network-first pour les pages : jamais de contenu perime pour les donnees metier, avec
    // une page de secours hors-ligne uniquement si le reseau est indisponible.
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
  }
});
