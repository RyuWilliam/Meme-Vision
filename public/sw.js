// Guias 17-21: SW completo del Gestor/MemeVision.
// 17: ciclo de vida | 18: interceptar fetch | 19: versionado y limpieza
// 20: Cache Only, Network Only, Cache First | 21: Network First, SWR + enrutado.
const CACHE_NAME = 'meme-vision-v2'; // 19: versionar -> v2
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/meme-vision-icon-192.png',
  '/assets/meme-vision-icon-512.png',
  '/assets/meme-vision-icon-maskable.png',
  '/assets/meme-vision-screenshot-wide.png',
  '/assets/meme-vision-screenshot-mobile.png',
];

// 17 - install: guarda el shell. Archivo por archivo para que un 404 no tumbe todo.
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const url of CORE_ASSETS) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn('[SW] no se pudo cachear:', url, err);
        }
      }
    })
  );
});

// 19 - activate: reclama control + borra caches viejos (v1, etc.).
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(nombres =>
        Promise.all(
          nombres.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---------- Guias 20-21: las 5 estrategias ----------
async function cacheOnly(request) {
  // 20: solo cache. Ideal inmutables precacheados (logo SVG, fuentes).
  return caches.match(request);
}

async function networkOnly(request) {
  // 20: solo red. Ideal siempre-fresco (API tiempo real). Falla offline.
  return fetch(request);
}

async function cacheFirst(request) {
  // 20: cache, si falta red + guarda (put + clone porque el body se lee 1 vez).
  const encontrado = await caches.match(request);
  if (encontrado) return encontrado;
  const respuesta = await fetch(request);
  if (respuesta && respuesta.status === 200) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, respuesta.clone());
  }
  return respuesta;
}

async function networkFirst(request) {
  // 21: red primero, cache como respaldo. Ideal HTML/API dinamicos.
  try {
    const respuesta = await fetch(request);
    if (respuesta && respuesta.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, respuesta.clone());
    }
    return respuesta;
  } catch {
    const encontrado = await caches.match(request);
    if (encontrado) return encontrado;
    throw new Error('offline sin respaldo');
  }
}

async function staleWhileRevalidate(request) {
  // 21: responde al instante desde cache y actualiza en 2do plano.
  // Ideal: casi-estatico (CSS/JS versionado, foto de perfil).
  const cache = await caches.open(CACHE_NAME);
  const enCache = await cache.match(request);
  const actualizacion = fetch(request)
    .then(respuesta => {
      if (respuesta && respuesta.status === 200) cache.put(request, respuesta.clone());
      return respuesta;
    })
    .catch(() => enCache);
  return enCache || actualizacion;
}

// 21 - Enrutado por path: cada tipo de recurso usa su estrategia.
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;

  const url = new URL(request.url);
  const esMismoOrigen = url.origin === self.location.origin;

  event.respondWith(
    (async () => {
      try {
        // Solo mismo origen: lo externo (CDN, APIs de terceros) va directo a red.
        if (!esMismoOrigen) return await networkOnly(request);

        // Iconos/screenshots: casi nunca cambian -> Cache First.
        if (url.pathname.startsWith('/assets/meme-vision-icon') || url.pathname.startsWith('/assets/meme-vision-screenshot')) {
          return (await cacheFirst(request)) ?? fallbackOffline(request);
        }

        // Futura API de memes/gestos -> Network First (fresco si hay red).
        if (url.pathname.startsWith('/api/')) {
          return await networkFirst(request);
        }

        // Resto (HTML, CSS, JS con hash): respuesta inmediata + refresco atras.
        const r = await staleWhileRevalidate(request);
        return r ?? fallbackOffline(request);
      } catch {
        return fallbackOffline(request);
      }
    })()
  );
});

async function fallbackOffline(request) {
  if (request.mode === 'navigate') {
    const index = await caches.match('/index.html');
    if (index) return index;
  }
  return new Response('Sin conexion y sin respaldo en cache', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' },
  });
}
