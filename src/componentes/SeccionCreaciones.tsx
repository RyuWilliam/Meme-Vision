// Sección «Mis creaciones»: formulario, tarjeta de cifrado y lista.
// La validación vive en useCreaciones; aquí solo se muestra el resultado.
import { useRef, useState, type FormEvent } from 'react'
import { Icono } from './Icono'
import { ListaCreaciones } from './ListaCreaciones'
import type { Creacion, Ubicacion } from '../datos/db'
import type { UseCreaciones } from '../hooks/useCreaciones'

interface Props {
  creaciones: UseCreaciones
  fotoPendiente: Blob | null
  ubicacionPendiente: Ubicacion | null
  alPedirFoto: () => void
  alPedirUbicacion: () => void
  alQuitarFoto: () => void
  alVer: (creacion: Creacion) => void
  alAvisar: (texto: string) => void
}

export function SeccionCreaciones({
  creaciones,
  fotoPendiente,
  ubicacionPendiente,
  alPedirFoto,
  alPedirUbicacion,
  alQuitarFoto,
  alVer,
  alAvisar,
}: Props) {
  const [nombre, setNombre] = useState('')
  const [desafio, setDesafio] = useState('Reto diario')
  const [nota, setNota] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const inputContrasena = useRef<HTMLInputElement>(null)

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    setGuardando(true)
    try {
      const resultado = await creaciones.guardarCreacion({
        nombre,
        desafio,
        notaPrivada: nota,
        foto: fotoPendiente,
        ubicacion: ubicacionPendiente,
      })
      alAvisar(resultado.mensaje)
      if (resultado.ok) {
        setNombre('')
        setNota('')
        alQuitarFoto()
      }
    } finally {
      setGuardando(false)
    }
  }

  const activarCifrado = async () => {
    await creaciones.activarCifrado(contrasena, confirmacion)
    setContrasena('')
    setConfirmacion('')
  }

  const confirmarBorrado = async (creacion: Creacion) => {
    if (!window.confirm(`¿Eliminar «${creacion.nombre}»? Esta acción no se puede deshacer.`)) return
    const resultado = await creaciones.borrarCreacion(creacion.id)
    alAvisar(resultado.mensaje)
  }

  return (
    <section className="creations-section" aria-labelledby="creaciones-title">
      <div className="section-head section-head-split">
        <div>
          <p className="kicker">Tu archivo local</p>
          <h2 id="creaciones-title">Mis creaciones</h2>
          <p className="section-lede">
            Tus fotos, videos y notas viven en este dispositivo. Nada se envía a un servidor.
          </p>
        </div>
        <span className="count-pill"><strong id="contador-creaciones">{creaciones.creaciones.length}</strong> guardadas</span>
      </div>

      <div className="creation-workspace">
        <form id="form-creacion" className="creation-form" onSubmit={(e) => void enviar(e)}>
          <div className="field">
            <label htmlFor="input-nombre">Nombre</label>
            <input
              type="text"
              id="input-nombre"
              placeholder="Ej. Mi cara de lunes"
              maxLength={80}
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="input-desafio">Tipo</label>
            <select id="input-desafio" value={desafio} onChange={(e) => setDesafio(e.target.value)}>
              <option value="Reto diario">Reto diario</option>
              <option value="Gesto">Gesto</option>
              <option value="Espontáneo">Espontáneo</option>
            </select>
          </div>
          <div className="field field-full">
            <label htmlFor="input-nota">Nota privada <span>(opcional, se cifra)</span></label>
            <textarea
              id="input-nota"
              rows={3}
              placeholder="¿Qué pasó cuando hiciste este gesto?"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button type="button" id="btn-foto-creacion" className="button button-secondary" onClick={alPedirFoto}>
              <Icono nombre="camera" /> Añadir foto
            </button>
            <button type="button" id="btn-ubicacion-creacion" className="button button-secondary" onClick={alPedirUbicacion}>
              <Icono nombre="pin" /> Añadir ubicación
            </button>
            <button type="submit" className="button button-primary" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar creación'}
            </button>
          </div>
          <p id="adjuntos-estado" className="status-line" role="status" aria-live="polite">
            {fotoPendiente ? 'Foto lista para adjuntar. ' : ''}
            {ubicacionPendiente ? 'Ubicación lista para adjuntar.' : ''}
          </p>
          <div id="adjuntos-creacion" className="adjuntos-creacion">
            {fotoPendiente && <span className="chip">📷 foto adjunta</span>}
            {ubicacionPendiente && (
              <span className="chip">📍 {ubicacionPendiente.lat.toFixed(4)}, {ubicacionPendiente.lon.toFixed(4)}</span>
            )}
          </div>
        </form>

        <aside className="security-card" aria-labelledby="security-title">
          <div className="security-head">
            <h3 id="security-title">Nota privada</h3>
            <span id="estado-cifrado" className="chip">
              {creaciones.cifradoActivo ? 'Cifrado activo' : 'Cifrado inactivo'}
            </span>
          </div>
          <p>
            La nota se cifra con AES-GCM y una clave derivada de tu contraseña. La contraseña nunca
            se guarda.
          </p>
          <div className="field">
            <label htmlFor="input-contrasena">Contraseña</label>
            <input
              ref={inputContrasena}
              type="password"
              id="input-contrasena"
              autoComplete="new-password"
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="input-contrasena-confirm">Confirmar contraseña</label>
            <input
              type="password"
              id="input-contrasena-confirm"
              autoComplete="new-password"
              minLength={8}
              placeholder="Repite la contraseña"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
            />
          </div>
          <button
            type="button"
            id="btn-activar-cifrado"
            className="button button-secondary"
            onClick={() => void activarCifrado()}
            disabled={creaciones.estadoCifrado === 'verificando'}
          >
            <Icono nombre="lock" /> {creaciones.estadoCifrado === 'verificando' ? 'Comprobando…' : 'Activar cifrado'}
          </button>
          <p id="estado-seguridad" className="status-line" role="status" aria-live="polite">
            {creaciones.mensajeSeguridad}
          </p>
          <p className="security-note"><Icono nombre="shield" /> Si olvidas la contraseña, no se puede recuperar la nota.</p>
        </aside>
      </div>

      <div className="creation-list-head">
        <h3>Tus archivos</h3>
        <p id="nota-creaciones" className="status-line">
          {creaciones.creaciones.length === 0 ? 'Aún no hay datos' : 'Guardadas en tu dispositivo'}
        </p>
      </div>

      <ListaCreaciones
        creaciones={creaciones.creaciones}
        cargando={creaciones.cargando}
        cifradoActivo={creaciones.cifradoActivo}
        alVer={alVer}
        alEliminar={(c) => void confirmarBorrado(c)}
        alLeerNota={creaciones.leerNota}
        alPedirCifrado={() => {
          alAvisar('Ingresa tu contraseña y activa el cifrado para leer la nota privada.')
          inputContrasena.current?.focus()
        }}
      />
    </section>
  )
}
