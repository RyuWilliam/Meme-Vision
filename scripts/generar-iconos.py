"""Genera los iconos de gestIA a partir de una sola composicion.

Uso (opcional, no hace falta para `npm run build`):
    python scripts/generar-iconos.py

Requiere Pillow. Los iconos finales se guardan en `public/assets/`.
La composicion mantiene el simbolo dentro del 80 % central para que el
icono maskable se recorte sin perder contenido.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "public" / "assets"

INK = "#16221f"
LIME = "#d8ff5c"
CORAL = "#ff6b4a"
CREAM = "#fff8e8"


def rounded(draw: ImageDraw.ImageDraw, caja: tuple[int, int, int, int], radio: int, color: str) -> None:
    draw.rounded_rectangle(caja, radius=radio, fill=color)


def composicion() -> Image.Image:
    lienzo = Image.new("RGBA", (1024, 1024), INK)
    dibujo = ImageDraw.Draw(lienzo)

    # Tarjeta lime con una segunda capa coral desplazada: una pequena
    # "desregistro" de imprenta, coherente con el tono de meme/zine.
    rounded(dibujo, (174, 174, 874, 874), 196, CORAL)
    rounded(dibujo, (150, 150, 850, 850), 196, LIME)

    # Mano haciendo "peace": palma, indice, medio y pulgar.
    rounded(dibujo, (376, 508, 664, 704), 62, INK)      # palma
    rounded(dibujo, (430, 292, 512, 590), 41, INK)      # indice
    rounded(dibujo, (532, 268, 614, 590), 41, INK)      # medio
    rounded(dibujo, (306, 516, 404, 660), 48, INK)      # pulgar

    # Chispa de marca y punto de grabacion.
    dibujo.ellipse((708, 258, 804, 354), fill=CORAL)
    dibujo.ellipse((734, 284, 778, 328), fill=CREAM)
    dibujo.polygon(
        [(760, 168), (778, 214), (826, 232), (778, 250), (760, 296), (742, 250), (694, 232), (742, 214)],
        fill=CREAM,
    )

    return lienzo


def main() -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    base = composicion()

    for nombre, tamano in {
        "gestia-icon-192.png": 192,
        "gestia-icon-512.png": 512,
        "gestia-icon-maskable.png": 512,
        "gestia-icon-180.png": 180,
    }.items():
        base.resize((tamano, tamano), Image.Resampling.LANCZOS).save(SALIDA / nombre, optimize=True)
        print(f"escrito {SALIDA / nombre}")


if __name__ == "__main__":
    main()
