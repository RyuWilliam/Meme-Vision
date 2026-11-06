# Memes de MemeVision

Cada carpeta corresponde a un gesto. La app elige una imagen al azar (rotando)
cuando el gesto se mantiene estable.

```
like/          pulgar arriba          → like_01.png
llamada/       pulgar + meñique       → llamada_01.png
silencio/      índice en los labios   → silencio_01.png
mewing/        índice en la mandíbula → mewing_01.png
ok/            seña de OK             → ok_01.png
peace/         dos dedos              → peace_01.png
rock/          cuernos                → rock_01.png
fist/          puño cerrado           → fist_01.png
palm/          palma abierta          → palm_01.png
stop/          mano de stop           → stop_01.png
one/           índice arriba          → one_01.png
dislike/       pulgar abajo           → dislike_01.png
_sin_gesto/    placeholder            → esperando.png
```

> Los PNG de `ok`, `peace`, `rock`, `fist`, `palm`, `stop`, `one` y `dislike`
> son **placeholders** de [OpenMoji](https://openmoji.org/) (CC BY-SA 4.0),
> redimensionados a 512×512. Reemplázalos por memes propios cuando los tengas.

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
