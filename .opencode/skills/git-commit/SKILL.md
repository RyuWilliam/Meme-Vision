---
name: Git Commit
description: Use when the user says "commitea", "commit", "haz commit", "guarda esto en git", or asks to commit work in progress. Creates small, focused commits continuously while working, runs the relevant checks, never commits to main, and asks whether to keep going or push.
---

# Git Commit

## Cuándo se activa

- "commitea", "commit", "haz commit", "guarda esto".
- "commitea mientras trabajas" / "ve commiteando".
- "commitea y pushea" (haz ambos).

## Reglas duras

- **Nunca** commitear ni pushear directamente a `main`.
- Si la rama actual es `main`, crear una rama `feat/...`, `fix/...`, `docs/...`
  o `chore/...` antes de commitear. Si el nombre no está claro, proponerlo y
  esperar confirmación.
- Nunca `git push --force` ni reescribir historia ya pusheada sin permiso
  explícito.
- Nunca commitear secretos, `.env`, credenciales, `.venv`, `node_modules`,
  `dist`, logs, datasets (`nucleo/datos/crudo/*.jsonl`),
  `nucleo/datos/descartados/`, WASM (`public/wasm/`), modelos sintéticos o
  archivos temporales.
- No crear commits vacíos.
- No mezclar cambios no relacionados en un mismo commit.

## Flujo

1. Revisar el estado: `git status --short`, `git diff --stat`,
   `git branch --show-current`.
2. Revisar el diff real (`git diff`, `git diff --staged`) antes de preparar el
   commit. No usar `git add -A` a ciegas.
3. Agrupar los cambios en unidades lógicas. Para cada una:
   - `git add <rutas concretas>`.
   - Ejecutar los checks que correspondan:
     - Front: `npm test`; si toca build o configuración, también
       `npm run build`.
     - Python: `cd nucleo && pytest -q`.
     - CI/docs: revisar la sintaxis; si toca el build, `npm run build`.
   - Si un check falla: arreglarlo o no commitear. Informar del problema.
   - `git commit -m "tipo(scope): resumen"` (y `-m` adicionales para el cuerpo
     si hace falta).
   - Reportar `git show --stat --oneline HEAD`.
4. Al terminar el lote, preguntar exactamente:
   **"¿Sigo con más cambios o hago push?"**
5. Si el usuario dice push:
   - Verificar que la rama no sea `main`.
   - `git push -u origin <rama>`.
   - Si el remoto está atrás, `git pull --rebase` y resolver sin force.
   - Reportar la rama y, si aplica, la URL del PR.

## Modos

- **Continuo (por defecto cuando dice "commitea" al empezar):** ir haciendo un
  commit por unidad lógica a medida que se completa, sin esperar a que lo
  repita. Al final del pedido, preguntar si hay más cambios o push.
- **Diferido:** si lo dice al final, dividir los cambios pendientes en commits
  pequeños.
- **Commit + push:** hacer los commits y luego el push, pero nunca a `main`.

## Formato del mensaje

`tipo(scope): resumen` en español, imperativo, máximo 72 caracteres.

Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`.

Ejemplos:

- `feat(gestos): mostrar el meme al detectar el gesto`
- `fix(camara): liberar el dispositivo al cerrar la ventana`
- `test(modelo): cubrir la paridad Python/TS`
- `ci(github): ejecutar tests en cada PR`

El cuerpo explica **qué** y **por qué**, no una lista de archivos.

## Reporte final

- Commits creados (hash + mensaje).
- Archivos incluidos.
- Checks ejecutados y resultado.
- Pregunta de seguir o hacer push.
