# Glosario

> **Parte de la guía:** [Índice](./README.md)

Términos que aparecen en el proyecto, explicados en una línea y con su uso concreto.

## A

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **AES-GCM** | Cifrado simétrico autenticado. | Cifra la nota privada con una clave derivada de la contraseña. |
| **Aumento de datos** | Crear variantes sintéticas de los ejemplos de entrenamiento. | Espejo, rotación, escala, ruido y jitter de blendshapes. |
| **API** | Interfaz para comunicar componentes. | `getUserMedia`, `enumerateDevices`, `crypto.subtle`, IndexedDB. |

## B

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **Blendshape** | Valor de 0 a 1 que mide una expresión facial. | 52 valores del FaceLandmarker; ocupan las posiciones 63–114 del vector. |
| **Blob** | Objeto binario inmutable. | Fotos y videos guardados en IndexedDB. |
| **Breakpoint** | Ancho de pantalla donde cambia el layout. | 850, 760 y 650 px en `style.css`. |

## C

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **Cache Storage** | Almacenamiento de pares petición/respuesta. | Workbox guarda shell, modelos y WASM. |
| **CacheFirst** | Estrategia que responde desde caché y solo va a red si falta. | Íconos, `.task` y WASM. |
| **Clasificador** | Función que asigna una clase a una entrada. | Reglas geométricas o MLP. |
| **Cloudflare Pages** | Hosting estático con CDN y despliegue por Git. | Producción actual. |
| **Confianza** | Certeza de una predicción. | El MLP devuelve probabilidad; las reglas devuelven un valor fijo. |
| **Contexto seguro** | Requisito del navegador para APIs sensibles. | HTTPS o `localhost` para cámara, micrófono, geolocalización y SW. |
| **CSS media query** | Regla condicional por tamaño de pantalla. | Responsive. |
| **Cursor (IndexedDB)** | Recorrido de registros. | `creacionesPorDesafio`. |

## D

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **Dataset** | Conjunto de ejemplos etiquetados. | `nucleo/datos/crudo/*.jsonl`. |
| **`deviceId`** | Identificador de un dispositivo de entrada. | Mejora pendiente para cambiar de cámara en PC. |
| **`dvh`** | Altura dinámica del viewport. | Diálogos a pantalla completa en móvil. |

## E

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **Entrenamiento** | Ajustar parámetros de un modelo con ejemplos. | `entrenar.py` en el PC. |
| **Época** | Una pasada completa por el dataset. | `MLPClassifier` con `max_iter`/`early_stopping`. |
| **Escalador** | Normaliza features con media y desviación. | `StandardScaler`; se exporta en el JSON. |
| **Estabilizador** | Filtro temporal para evitar parpadeos. | Ventana 8, mínimo 5, cooldown 1,2 s, retención 2 s. |

## F

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **`facingMode`** | Pista de cámara frontal/trasera. | `user`/`environment`; funciona en móvil, no siempre en PC. |
| **Feature** | Característica numérica de una entrada. | Vector de 69 (mano) o de 127 (mano + rostro). |
| **F1** | Métrica que combina precisión y recall. | Macro F1 es la métrica principal del MLP. |

## G

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **`getUserMedia`** | API que abre cámara/micrófono. | Vista de cámara y gestos. |
| **GPU delegate** | Ejecución de MediaPipe en GPU. | Primer intento; si falla, CPU. |
| **Gesto** | Clase que reconoce el sistema. | `like`, `llamada`, `silencio`, `mewing`, `ninguno`. |

## I

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **IndexedDB** | Base de datos NoSQL del navegador. | `memevision-db`, stores `creaciones` y `config`. |
| **Inferencia** | Usar un modelo entrenado para predecir. | `motor.ts`, `mlp.ts`, `reglas.ts`. |
| **Índice (IndexedDB)** | Estructura para buscar por campo. | `porDesafio`, `porFecha`. |

## L

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **Landmark** | Punto anatómico con coordenadas. | 21 de mano, 478 de rostro. |

## M

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **Manifest** | Archivo que describe la PWA. | `public/manifest.json`. |
| **MediaPipe** | Framework de visión de Google. | Detecta mano/rostro con modelos `.task`. |
| **MediaRecorder** | API para grabar audio/video. | Modo Vídeo de la cámara. |
| **MLP** | Perceptrón multicapa; red neuronal feedforward. | 69 → 128 → 64 → 10. |
| **Modelo** | Función entrenada que transforma entrada en salida. | `.task` (percepción) y `gestos_mlp.json` (clasificación). |

## N

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **NetworkFirst** | Estrategia que intenta red y cae a caché. | `/api/` y `gestos_mlp.json`. |
| **Normalización** | Ajustar escala de los datos. | Mano centrada en la muñeca y escalada por la palma. |

## O

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **Object URL** | URL temporal para un Blob. | Miniaturas y visor; se revoca para liberar memoria. |
| **Offline** | Funcionar sin red. | Shell precacheado + modelos runtime cache. |
| **Overfitting** | Memorizar entrenamiento y fallar en datos nuevos. | Se combate con split por sesión y aumento. |

## P

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **PBKDF2** | Derivación de clave por iteraciones. | 100 000 iteraciones con sal de 16 bytes. |
| **Precache** | Archivos guardados durante la instalación del SW. | Shell, JS, CSS, memes. |
| **PWA** | App web instalable y offline. | MemeVision. |

## R

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **Reglas** | Condiciones geométricas escritas a mano. | Motor actual; respaldo del MLP. |
| **ReLU** | Activación que deja pasar lo positivo y anula lo negativo. | Capas ocultas del MLP. |
| **Responsive** | Interfaz que se adapta al tamaño. | Breakpoints y layout flexible. |

## S

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **Service Worker** | Script en segundo plano que intercepta red. | `dist/sw.js`, generado por Workbox. |
| **Softmax** | Convierte valores en probabilidades que suman 1. | Salida del MLP. |
| **Split** | División train/val/test. | Por sesión/persona. |
| **`skipWaiting`** | Hace que el SW nuevo tome el control sin esperar. | Actualización inmediata. |

## T

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **`.task`** | Paquete de modelo de MediaPipe (TFLite + metadatos). | `gesture_recognizer.task`, `face_landmarker.task`. |
| **TFLite** | Formato de modelo de TensorFlow Lite. | Dentro de los `.task`. |
| **Transacción** | Operación atómica de IndexedDB. | CRUD de creaciones. |

## U

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **Umbral** | Confianza mínima para aceptar una predicción. | Se elige en validación y se guarda en el JSON. |

## V

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **Vector de 69** | Representación numérica de la mano que consume el MLP entrenado. | 21 landmarks canónicos + presencia + 5 flags de dedos. |
| **Vector de 127** | Esquema ampliado para un modelo que use el rostro (sin modelo exportado). | Mano + blendshapes + geometría + flags. |
| **Vite** | Bundler y servidor de desarrollo. | `npm run dev`, `npm run build`. |

## W

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **WASM** | WebAssembly; código compilado que corre en el navegador. | Runtime de MediaPipe. |
| **Web Crypto** | API criptográfica del navegador. | PBKDF2 + AES-GCM. |
| **Web Worker** | Hilo aparte para trabajo pesado. | Pendiente para la inferencia (RNF-02). |
| **Workbox** | Librería de Service Workers. | Precache y runtime cache. |

## X

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **`x`/`y`/`z`** | Coordenadas normalizadas de un landmark. | Vector de mano y rostro. |

## Z

| Término | Qué es | En MemeVision |
| --- | --- | --- |
| **Zona segura** | Área visible sin notch/barra del sistema. | `env(safe-area-inset-bottom)` en móvil. |

---

**Volver al índice:** [docs/README.md](./README.md)
