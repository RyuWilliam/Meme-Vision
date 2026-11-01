---
name: Grill Me
description: Use when the user says "grill me", "grillme", "hazme preguntas del proyecto", or asks to verify alignment before implementing. Runs a structured interview in short rounds covering scope, UX, model/data, offline behavior, quality, and delivery, and ends with a decision log.
---

# Grill Me

## Objetivo

Verificar que el agente y el usuario entienden lo mismo antes de implementar.
**No modificar archivos durante la entrevista.**

## Antes de empezar

- Resumir el estado actual en 3–5 bullets: rama, última sesión, qué funciona y
  qué falta.
- Decir cuántas rondas se harán y el foco de cada una.

## Formato

- 4 rondas, 3–5 preguntas por ronda. Una idea por pregunta.
- Usar la herramienta `question` con 2–4 opciones concretas, poniendo primero la
  recomendada.
- Permitir respuesta libre. Si el usuario no sabe, proponer un default y
  marcarlo como supuesto a validar.
- Después de cada ronda, repetir en 2–3 bullets lo decidido y señalar
  contradicciones o dependencias.
- No avanzar a la siguiente ronda sin cerrar la anterior.

## Rondas

1. **Producto:** problema, usuario, MVP, no-objetivos, criterio de éxito.
2. **UX:** pantallas y flujo, móvil/escritorio, permisos, estados (cargando, sin
   cámara, sin modelo, error), accesibilidad.
3. **Modelo y datos:** gestos, reglas vs MLP, umbral, dataset/sesiones,
   privacidad, offline, tamaño de caché.
4. **Entrega:** tests, CI, ramas/PR, deploy, evidencias, fecha.

## Cierre

Entregar una tabla:

| Tema | Decisión | Motivo | Pendiente |
| ---- | -------- | ------ | --------- |

Y terminar con **"Próximos 3 pasos"**.

## Reglas

- No implementar hasta que el usuario lo pida o se cierre la ronda 4.
- No hacer preguntas de trivia: cada pregunta debe cambiar una decisión.
- Si una respuesta cambia el alcance, volver a la ronda afectada.
- Hablar en español.
