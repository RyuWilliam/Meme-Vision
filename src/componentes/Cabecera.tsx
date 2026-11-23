// Cabecera: marca, estado de conexión, instalación y actualización.
// En main.ts esto era un <header> en una cadena de HTML más tres listeners
// que mostraban u ocultaban botones con .hidden.
import { Icono } from './Icono'
import { useConexion } from '../hooks/useConexion'
import type { EstadoInstalacion } from '../hooks/useInstalacion'

interface Props {
  instalacion: EstadoInstalacion
  hayActualizacion: boolean
  alInstalar: () => void
  alActualizar: () => void
}

export function Cabecera({ instalacion, hayActualizacion, alInstalar, alActualizar }: Props) {
  const { enLinea, texto } = useConexion()

  return (
    <header className="site-header">
      <a className="brand" href="#inicio" aria-label="gestIA, ir al inicio">
        <span className="brand-mark"><Icono nombre="spark" /></span>
        <span className="brand-name">gest<span>IA</span></span>
      </a>
      <div className="header-actions">
        <span
          id="conexion-estado"
          className={`conexion${enLinea ? '' : ' is-offline'}`}
          role="status"
          aria-live="polite"
          aria-label={enLinea ? 'Conexión a internet disponible' : 'Sin conexión a internet'}
        >
          {texto}
        </span>
        {instalacion.sePuedeInstalar && (
          <button className="button button-ghost button-small" type="button" onClick={alInstalar}>
            <Icono nombre="install" /> Instalar app
          </button>
        )}
        {hayActualizacion && (
          <button className="button button-ghost button-small" type="button" onClick={alActualizar}>
            Actualizar
          </button>
        )}
      </div>
    </header>
  )
}
