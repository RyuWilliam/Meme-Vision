import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Migración a Workbox (patrón de la Sesión 34): el Service Worker se genera
// con vite-plugin-pwa en cada build, en vez del sw.js manual de las guías 17-21.
export default defineConfig({
  plugins: [
    VitePWA({
      // El manifest ya existe en public/manifest.json — el plugin solo
      // genera el Service Worker, no el manifest.
      manifest: false,
      registerType: 'autoUpdate',
      injectRegister: false, // registramos nosotros mismos en main.ts
      workbox: {
        // La lista de precaché se genera a partir de dist/ DESPUÉS del build,
        // con los nombres de archivo reales (con hash incluido).
        globPatterns: ['**/*.{html,js,css,png,json}'],
        // Como en apps reales: el Service Worker nuevo toma el control de inmediato
        // y reclama las pestañas abiertas. Sin esto queda "en espera" hasta cerrar
        // TODAS las pestañas (o borrar la caché) y no se ven los cambios.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Íconos y screenshots del manifest: casi nunca cambian -> CacheFirst
            // con expiración real (maxEntries/maxAgeSeconds).
            urlPattern: /\/assets\/meme-vision-(icon|screenshot)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'imagenes',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            // Futura API de memes/gestos -> NetworkFirst (fresco si hay red, respaldo si no).
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-memes' },
          },
          {
            // El modelo entrenado puede cambiar al reentrenar: red primero y
            // respaldo en caché si no hay conexión.
            urlPattern: /\/modelos\/gestos_mlp\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'modelo-gestos',
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Tareas de MediaPipe (.task): se cachean la primera vez y quedan
            // disponibles sin conexión.
            urlPattern: /\/modelos\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'modelos-vision',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 12, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /\/wasm\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm-vision',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 12, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
})
