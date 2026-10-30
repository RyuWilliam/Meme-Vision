# Evidencias — Sesión 25: núcleo de gestos

- `sesion-25-gestos-like.png`: vista «Gestos en vivo» de la PWA con el motor de
  reglas, mano y rostro detectados, y el meme de `like` mostrado al reconocer el
  pulgar arriba.
- `sesion-25-gestos-offline.png`: la misma vista con la pestaña sin conexión. El
  shell, los memes, los modelos `.task` y el WASM de MediaPipe se sirven desde el
  caché de Workbox; no hay peticiones de red.

Notas de la prueba:

- La cámara es un video de prueba del navegador (fake device de Chromium) con la
  imagen de `like`, por eso el gesto se mantiene igual.
- En estas capturas todavía no existe `public/modelos/gestos_mlp.json`, así que
  la app usa el motor de reglas. Al entrenar con `nucleo/`, el mismo panel cambia
  a «Motor: MLP …» sin modificar código.
- Las pruebas automatizadas del núcleo están en `nucleo/tests/` y las de la PWA
  en `src/vision/*.test.ts` (`npm test`).
