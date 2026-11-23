// EsqueletoMano — los 21 landmarks de MediaPipe dibujados como SVG.
//
// Es el motivo visual de la app: lo que la cámara ve antes de convertirlo en
// meme. Las coordenadas vienen normalizadas (0..1) igual que en el modelo, así
// que la figura se puede leer como «esto es lo que entra al clasificador».
const CONEXIONES: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
]

// Postura de «pulgar arriba»: las mismas 21 posiciones que devolvería MediaPipe
// con la mano en esa pose, normalizadas respecto al encuadre.
const LANDMARKS: Array<[number, number]> = [
  [0.50, 0.86], // 0  muñeca
  [0.40, 0.80], // 1  pulgar: base
  [0.30, 0.72], // 2
  [0.24, 0.62], // 3
  [0.21, 0.52], // 4  punta del pulgar (arriba)
  [0.52, 0.60], // 5  índice: base
  [0.54, 0.44], // 6
  [0.55, 0.34], // 7
  [0.56, 0.25], // 8  punta del índice
  [0.62, 0.60], // 9  medio: base
  [0.66, 0.44], // 10
  [0.68, 0.34], // 11
  [0.70, 0.25], // 12 punta del medio
  [0.71, 0.63], // 13 anillo: base
  [0.77, 0.49], // 14
  [0.80, 0.40], // 21 -> 15 punta del anular
  [0.79, 0.70], // 16 meñique: base
  [0.84, 0.60], // 17
  [0.86, 0.53], // 18
  [0.87, 0.47], // 19 punta del meñique
  [0.60, 0.90], // 20 palma
]

interface Props {
  /** Escala visual del trazo. */
  className?: string
}

export function EsqueletoMano({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 1 1"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      fill="none"
    >
      {/* Huesos */}
      <g stroke="currentColor" strokeWidth="0.008" strokeLinecap="round" opacity="0.55">
        {CONEXIONES.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={LANDMARKS[a][0]} y1={LANDMARKS[a][1]} x2={LANDMARKS[b][0]} y2={LANDMARKS[b][1]} />
        ))}
      </g>
      {/* Articulaciones. La punta del índice (8) va destacada: es la que decide
          varios gestos y la que se depura en la vista de puntos. */}
      <g fill="currentColor">
        {LANDMARKS.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === 8 || i === 4 ? 0.022 : 0.013}
            opacity={i === 8 || i === 4 ? 1 : 0.75}
          />
        ))}
      </g>
    </svg>
  )
}
