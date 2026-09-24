import { useEffect, useState } from 'react'
import { getFechaHoy } from '../lib/fecha'

// La app toma la fecha al cargar. Si queda abierta después de medianoche,
// esto avisa que cambió el día. Si el celu vuelve a primer plano con otro
// día (la app quedó abierta de la noche anterior), recarga directamente:
// en ese momento nadie está a mitad de cargar nada.
export function useCambioDeDia(fecha: string) {
  const [cambio, setCambio] = useState(false)

  useEffect(() => {
    const revisar = () => setCambio(getFechaHoy() !== fecha)
    const alVolver = () => {
      if (document.visibilityState === 'visible' && getFechaHoy() !== fecha) {
        window.location.reload()
      }
    }
    const intervalo = setInterval(revisar, 60_000)
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [fecha])

  return cambio
}
