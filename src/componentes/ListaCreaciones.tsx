// Lista de creaciones guardadas.
// En main.ts, pintarCreaciones() construía cada tarjeta con createElement y
// gestionaba a mano las object URLs (crear y revocar). Aquí la URL se crea y se
// revoca dentro de un efecto por tarjeta, que es lo que evita fugas de memoria
// cuando React desmonta la lista.
import { useEffect, useMemo, useState } from 'react'
import type { Creacion } from '../datos/db'

interface Props {
  creaciones: Creacion[]
  cargando: boolean
  cifradoActivo: boolean
  alVer: (creacion: Creacion) => void
  alEliminar: (creacion: Creacion) => void
  alLeerNota: (creacion: Creacion) => Promise<string>
  alPedirCifrado: () => void
}

/** Tarjeta de una creación: miniatura, metadatos, nota descifrada y acciones. */
function TarjetaCreacion({
  creacion,
  cifradoActivo,
  alVer,
  alEliminar,
  alLeerNota,
  alPedirCifrado,
}: Omit<Props, 'creaciones' | 'cargando'> & { creacion: Creacion }) {
  const [urlMiniatura, setUrlMiniatura] = useState<string | null>(null)
  const [nota, setNota] = useState<{ texto: string; error: boolean } | null>(null)

  // La URL del blob se crea al montar y se revoca al desmontar o si cambia el
  // adjunto. Sin esta limpieza, cada re-render dejaría una URL viva.
  useEffect(() => {
    const blob = creacion.video ?? creacion.foto
    if (!blob) {
      setUrlMiniatura(null)
      return
    }
    const url = URL.createObjectURL(blob)
    setUrlMiniatura(url)
    return () => URL.revokeObjectURL(url)
  }, [creacion.video, creacion.foto])

  const fecha = useMemo(() => {
    const valor = new Date(creacion.fecha)
    return Number.isNaN(valor.getTime()) ? 'Fecha desconocida' : valor.toLocaleDateString('es-CO')
  }, [creacion.fecha])

  const verNota = async () => {
    if (nota) {
      setNota(null)
      return
    }
    if (!cifradoActivo) {
      alPedirCifrado()
      return
    }
    try {
      setNota({ texto: await alLeerNota(creacion), error: false })
    } catch {
      setNota({
        texto: 'No se pudo descifrar: la contraseña no coincide. Corrige la contraseña y vuelve a intentarlo.',
        error: true,
      })
    }
  }

  return (
    <li className="creation">
      {urlMiniatura && creacion.video && (
        <video
          className="creation-thumb"
          src={urlMiniatura}
          muted
          playsInline
          preload="metadata"
          aria-label={`Video de ${creacion.nombre}`}
        />
      )}
      {urlMiniatura && !creacion.video && creacion.foto && (
        <img className="creation-thumb" src={urlMiniatura} alt={`Foto de ${creacion.nombre}`} loading="lazy" />
      )}

      <div className="creation-info">
        <strong>{creacion.nombre}</strong>
        <span>{creacion.desafio} · {fecha}</span>
        {creacion.ubicacion && (
          <span className="chip">
            📍 {creacion.ubicacion.lat.toFixed(4)}, {creacion.ubicacion.lon.toFixed(4)} (±{creacion.ubicacion.precision} m)
          </span>
        )}
      </div>

      <div className="creation-actions">
        {(creacion.video || creacion.foto) && (
          <button
            type="button"
            className="button button-ghost button-small"
            aria-label={`Abrir ${creacion.video ? 'video' : 'foto'} de ${creacion.nombre}`}
            onClick={() => alVer(creacion)}
          >
            {creacion.video ? 'Ver video' : 'Ver foto'}
          </button>
        )}
        {creacion.notaCifrada && (
          <button
            type="button"
            className="button button-ghost button-small"
            aria-label={`Ver nota privada de ${creacion.nombre}`}
            onClick={() => void verNota()}
          >
            {nota ? 'Ocultar nota' : 'Ver nota'}
          </button>
        )}
        <button
          type="button"
          className="button button-ghost button-small button-danger"
          aria-label={`Eliminar ${creacion.nombre}`}
          onClick={() => alEliminar(creacion)}
        >
          Eliminar
        </button>
      </div>

      {nota && <p className={nota.error ? 'creation-note is-error' : 'creation-note'}>{nota.texto}</p>}
    </li>
  )
}

export function ListaCreaciones({ creaciones, cargando, ...acciones }: Props) {
  if (cargando) {
    return <p className="status-line">Leyendo tus creaciones del dispositivo…</p>
  }

  if (creaciones.length === 0) {
    return (
      <ul id="lista-creaciones" className="creation-grid" aria-label="Creaciones guardadas">
        <li className="creation-empty">
          Todavía no has guardado creaciones. Abre la cámara o prepara un gesto para empezar.
        </li>
      </ul>
    )
  }

  return (
    <ul id="lista-creaciones" className="creation-grid" aria-label="Creaciones guardadas">
      {creaciones.map((creacion) => (
        <TarjetaCreacion key={creacion.id} creacion={creacion} {...acciones} />
      ))}
    </ul>
  )
}
