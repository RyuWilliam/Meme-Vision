// useInstalacion — el flujo de instalación de la PWA.
// Sustituye al manejo manual de beforeinstallprompt que en main.ts vivía en una
// variable global, con funciones que mostraban y ocultaban botones a mano.
import { useCallback, useEffect, useState } from 'react'

type EventoInstalacion = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function estaInstalada(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function esIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export interface EstadoInstalacion {
  /** Hay un beforeinstallprompt disponible: se puede mostrar el botón. */
  sePuedeInstalar: boolean
  /** Ya corre como app instalada (standalone). */
  instalada: boolean
  /** iOS sin evento: hay que explicar el paso manual de Compartir. */
  mostrarAyudaIOS: boolean
  instalar: () => Promise<'aceptada' | 'cancelada' | 'no-disponible'>
}

export function useInstalacion(): EstadoInstalacion {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null)
  const [instalada, setInstalada] = useState(estaInstalada)

  useEffect(() => {
    const alPoderInstalar = (e: Event) => {
      // El navegador solo permite llamar a prompt() una vez: se guarda el evento.
      e.preventDefault()
      setEvento(e as EventoInstalacion)
    }
    const alInstalar = () => {
      setInstalada(true)
      setEvento(null)
    }
    window.addEventListener('beforeinstallprompt', alPoderInstalar)
    window.addEventListener('appinstalled', alInstalar)
    return () => {
      window.removeEventListener('beforeinstallprompt', alPoderInstalar)
      window.removeEventListener('appinstalled', alInstalar)
    }
  }, [])

  const instalar = useCallback(async () => {
    if (!evento) return 'no-disponible' as const
    // Se limpia antes de esperar: el evento no se puede reutilizar.
    setEvento(null)
    await evento.prompt()
    const eleccion = await evento.userChoice
    if (eleccion.outcome === 'accepted') {
      setInstalada(true)
      return 'aceptada' as const
    }
    return 'cancelada' as const
  }, [evento])

  return {
    sePuedeInstalar: evento !== null && !instalada,
    instalada,
    mostrarAyudaIOS: esIOS() && evento === null && !instalada,
    instalar,
  }
}
