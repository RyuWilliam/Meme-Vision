# Memes de MemeVision

Cada carpeta corresponde a un gesto. La app rota entre las variantes que
encuentre cuando el gesto se mantiene estable.

```
like/          pulgar arriba          → like_01.png
llamada/       pulgar + meñique       → llamada_01.png
silencio/      índice en los labios   → silencio_01.png
mewing/        índice en la mandíbula → mewing_01.png
saludo/        mano plana en la sien  → saludo_01.jpg
ok/            seña de OK             → ok_01.png
peace/         dos dedos              → peace_01.png
rock/          cuernos                → rock_01.jpg
fist/          puño cerrado           → fist_01.png
palm/          palma abierta          → palm_01.png
stop/          mano de stop           → stop_01.jpg
one/           índice arriba          → one_01.jpg
pistola/       pulgar + índice        → pistola_01.jpg
dislike/       pulgar abajo           → dislike_01.jpg
_sin_gesto/    placeholder            → esperando.png
```

## Cómo cambiar una imagen

Reemplaza el archivo por uno con el mismo nombre. No hay que tocar código:
Vite procesa la imagen, le pone hash y el Service Worker la incluye en el
precaché en el siguiente `npm run build`.

Si prefieres agregar una variante, usa `<gesto>_<variante>.<ext>`
(`like_02.png`, `saludo_02.jpg`): la app rota entre todas las variantes de la
carpeta.

## Reglas para agregar imágenes

- Formatos aceptados: **PNG, JPG/JPEG y WebP**.
- **La extensión debe coincidir con el formato real del archivo.** Un JPEG
  guardado como `.png` no lo decodifica el navegador y la tarjeta queda vacía.
  Si no estás seguro, revisa el formato real o vuelve a exportar la imagen.
- Máximo **512×512 px** y menos de **200 KB** por imagen.
- Nombre sin espacios: `<gesto>_<variante>.<ext>`.
- Puedes poner varias variantes por gesto; se rotan.
- Si agregas una carpeta nueva, actualiza `GESTOS` en `src/vision/tipos.ts`.
  Si el gesto va a salir del MLP de mano, agrégalo también a `GESTOS_MANO` y
  reentrena (`nucleo/README.md`). Si es una regla de cara + mano, impleméntala
  en `src/vision/reglas.ts` sin reentrenar.

Las imágenes viven dentro de `src/assets`, así que Vite las procesa, les pone
hash y las incluye en el precaché automáticamente. No hay que tocar
`vite.config.ts` para los memes.

> El `build` fuerza `assetsInlineLimit: 0` para que las imágenes pequeñas
> (menos de 4 KB) no se incrusten como base64 y sí entren al precaché del
> Service Worker.
