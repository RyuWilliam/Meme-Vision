// useTema — claro, oscuro o «lo que diga el sistema».
//
// El CSS ya resuelve los dos temas con prefers-color-scheme; este hook solo
// permite forzar uno y guarda la elección. El atributo se pone en <html> y el
// CSS hace el resto, así que no hay parpadeo de estilos en línea.
import { useCallback, useEffect, useState } from 'react'

export type Tema = 'sistema' | 'claro' | 'oscuro'

const CLAVE = 'gestia-tema'

function temaGuardado(): Tema {
  try {
    const valor = localStorage.getItem(CLAVE)
    if (valor === 'claro' || valor === 'oscuro') return valor
  } catch {
    // En modo privado localStorage puede lanzar. Se sigue con «sistema».
  }
  return 'sistema'
}

export function useTema(): { tema: Tema; siguiente: () => void; etiqueta: string } {
  const [tema, setTema] = useState<Tema>(temaGuardado)

  useEffect(() => {
    const raiz = document.documentElement
    if (tema === 'sistema') {
      delete raiz.dataset.tema
    } else {
      raiz.dataset.tema = tema
    }
    try {
      if (tema === 'sistema') localStorage.removeItem(CLAVE)
      else localStorage.setItem(CLAVE, tema)
    } catch {
      // Sin persistencia el tema funciona igual, solo no se recuerda.
    }
  }, [tema])

  // Ciclo de tres estados: sistema → claro → oscuro → sistema.
  const siguiente = useCallback(() => {
    setTema((actual) => (actual === 'sistema' ? 'claro' : actual === 'claro' ? 'oscuro' : 'sistema'))
  }, [])

  const etiqueta =
    tema === 'sistema' ? 'Tema: el del sistema' : tema === 'claro' ? 'Tema: claro' : 'Tema: oscuro'

  return { tema, siguiente, etiqueta }
}
