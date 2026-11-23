// Catálogo de gestos + preparación sin conexión.
// En main.ts, pintarGestos() creaba 14 botones con createElement y append.
// Aquí es un map sobre GESTOS, que es la misma fuente de verdad.
import { Icono } from './Icono'
import { GESTOS } from '../vision/tipos'
import type { GestoId } from '../vision/tipos'
import { urlMeme } from '../vision/memes'

interface Props {
  alAbrirGestos: () => void
  estadoOffline: string
  offlineListo: boolean
  progreso: { hechos: number; total: number } | null
  preparando: boolean
  alPrepararOffline: () => void
}

export function CatalogoGestos({
  alAbrirGestos,
  estadoOffline,
  offlineListo,
  progreso,
  preparando,
  alPrepararOffline,
}: Props) {
  // «ninguno» no es un gesto que el usuario pueda provocar a propósito.
  const gestos = (Object.entries(GESTOS) as Array<[GestoId, (typeof GESTOS)[GestoId]]>).filter(
    ([id]) => id !== 'ninguno',
  )

  return (
    <section className="gestures-section" aria-labelledby="gestos-title">
      <div className="section-head section-head-split">
        <div>
          <p className="kicker">Catálogo real</p>
          <h2 id="gestos-title">Catorce gestos, catorce memes.</h2>
          <p className="section-lede">
            Este es el catálogo que reconoce el modelo actual. Toca uno para abrir la vista de gestos.
          </p>
        </div>
        <button className="button button-secondary" type="button" onClick={alAbrirGestos}>
          <Icono nombre="hand" /> Probar ahora
        </button>
      </div>

      <div id="lista-gestos" className="gesture-grid">
        {gestos.map(([id, config]) => (
          <button
            key={id}
            type="button"
            className="gesture-card"
            aria-label={`Probar el gesto ${config.etiqueta}`}
            data-gesto={id}
            onClick={alAbrirGestos}
          >
            <img
              src={urlMeme(id, 0)}
              alt={`Meme del gesto ${config.etiqueta}`}
              loading="lazy"
              decoding="async"
            />
            <span className="gesture-emoji" aria-hidden="true">{config.emoji}</span>
            <span className="gesture-card-label">{config.etiqueta}</span>
          </button>
        ))}
      </div>

      <div className="offline-panel">
        <span className="offline-icon"><Icono nombre="download" /></span>
        <div className="offline-copy">
          <h3>Preparar para usar sin conexión</h3>
          <p>
            Descarga las tareas de MediaPipe y el WASM una sola vez (unos 27 MB). Después el
            reconocimiento funciona sin red.
          </p>
          <p id="offline-estado" className="status-line" role="status" aria-live="polite">
            {estadoOffline}
          </p>
          {progreso && (
            <progress
              id="offline-progreso"
              className="progress"
              max={progreso.total}
              value={progreso.hechos}
            />
          )}
        </div>
        <button
          id="btn-preparar-offline"
          className="button button-ghost"
          type="button"
          onClick={alPrepararOffline}
          disabled={preparando || offlineListo}
        >
          {offlineListo ? 'Listo sin conexión' : preparando ? 'Preparando…' : 'Preparar sin conexión'}
        </button>
      </div>
    </section>
  )
}
