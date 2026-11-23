// useConexion — adapta los eventos online/offline del navegador a estado de React.
// Sustituye al bloque actualizarConexion() de main.ts, que manipulaba clases del DOM.
import { useEffect, useState } from 'react'

export function useConexion(): { enLinea: boolean; texto: string } {
  const [enLinea, setEnLinea] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  useEffect(() => {
    const alConectar = () => setEnLinea(true)
    const alDesconectar = () => setEnLinea(false)
    window.addEventListener('online', alConectar)
    window.addEventListener('offline', alDesconectar)
    return () => {
      window.removeEventListener('online', alConectar)
      window.removeEventListener('offline', alDesconectar)
    }
  }, [])

  return { enLinea, texto: enLinea ? 'En línea' : 'Sin conexión' }
}
