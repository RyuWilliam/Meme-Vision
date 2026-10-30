# Memes de MemeVision

Cada carpeta corresponde a un gesto. La app elige una imagen al azar (rotando)
cuando el gesto se mantiene estable.

```
like/          pulgar arriba        → like_01.png
llamada/       pulgar + meñique     → llamada_01.png
silencio/      índice en los labios → silencio_01.png
mewing/        índice en la mandíbula → mewing_01.png
_sin_gesto/    placeholder          → esperando.png
```

## Reglas para agregar imágenes

- Formato **PNG** (el precaché del Service Worker ya incluye `png`).
- Máximo **512×512 px** y menos de **200 KB** por imagen.
- Nombre libre, sin espacios: `<gesto>_<variante>.png`.
- Puedes poner varias variantes por gesto; se rotan.
- Si agregas una carpeta nueva, actualiza `GESTOS` en `src/vision/tipos.ts` y
  vuelve a entrenar/etiquetar ese gesto.

Las imágenes viven dentro de `src/assets`, así que Vite las procesa, les pone
hash y las incluye en el precaché automáticamente. No hay que tocar
`vite.config.ts` para los memes.
