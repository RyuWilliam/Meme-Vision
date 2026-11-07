# Memes de MemeVision

Cada carpeta corresponde a un gesto. La app rota entre las variantes que
encuentre cuando el gesto se mantiene estable.

```
like/          pulgar arriba          → like_01.png
llamada/       pulgar + meñique       → llamada_01.png
silencio/      índice en los labios   → silencio_01.png
mewing/        índice en la mandíbula → mewing_01.png
saludo/        mano plana en la sien  → saludo_01.png
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

> Los PNG de `ok`, `peace`, `rock`, `fist`, `palm`, `stop`, `one`, `dislike` y
> `saludo` son **placeholders** de [OpenMoji](https://openmoji.org/)
> (CC BY-SA 4.0). Reemplázalos por memes propios cuando los tengas.

## Cómo cambiar una imagen

Reemplaza el archivo manteniendo el mismo nombre (por ejemplo
`like/like_01.png`). No hay que tocar código: Vite procesa la imagen, le pone
hash y el Service Worker la incluye en el precaché en el siguiente
`npm run build`.

Si prefieres agregar una variante, usa `<gesto>_<variante>.png`
(`like_02.png`, `saludo_02.png`): la app rota entre todas las variantes de la
carpeta.

## Reglas para agregar imágenes

- Formato **PNG** (el precaché del Service Worker ya incluye `png`).
- Máximo **512×512 px** y menos de **200 KB** por imagen.
- Nombre libre, sin espacios: `<gesto>_<variante>.png`.
- Puedes poner varias variantes por gesto; se rotan.
- Si agregas una carpeta nueva, actualiza `GESTOS` en `src/vision/tipos.ts`.
  Si el gesto va a salir del MLP de mano, agrégalo también a `GESTOS_MANO` y
  reentrena (`nucleo/README.md`). Si es una regla de cara + mano, impleméntala
  en `src/vision/reglas.ts` sin reentrenar.

Las imágenes viven dentro de `src/assets`, así que Vite las procesa, les pone
hash y las incluye en el precaché automáticamente. No hay que tocar
`vite.config.ts` para los memes.
