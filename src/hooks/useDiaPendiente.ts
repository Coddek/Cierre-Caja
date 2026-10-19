import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// El día anterior más viejo que quedó abierto (se abrió y nunca se cerró).
// Hay que cerrarlo antes de arrancar hoy: su "queda en caja" es la caja
// inicial del día siguiente, así que si se saltea se corta la cadena.
//
// Un día que ya se había cerrado y se reabrió para corregirlo (tiene retiro)
// no bloquea: ya tiene arqueo y el día siguiente ya arrancó. Se devuelve
// aparte como `reabierto`, para avisar que falta volver a cerrarlo.
export function useDiaPendiente(fechaHoy: string, habilitado: boolean) {
  const [pendiente, setPendiente] = useState<string | null>(null)
  const [reabierto, setReabierto] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPendiente = useCallback(async () => {
    const { data } = await supabase
      .from('cierres')
      .select('fecha, retiro')
      .lt('fecha', fechaHoy)
      .eq('cerrado', false)
      .order('fecha', { ascending: true })
    const abiertos = data ?? []
    setPendiente(abiertos.find((c) => c.retiro == null)?.fecha ?? null)
    setReabierto(abiertos.find((c) => c.retiro != null)?.fecha ?? null)
    setLoading(false)
  }, [fechaHoy])

  useEffect(() => {
    if (!habilitado) {
      setPendiente(null)
      setReabierto(null)
      setLoading(true)
      return
    }

    fetchPendiente()

    // Al cerrarlo (desde este celu o el otro) la pantalla pasa sola al
    // siguiente pendiente o al día de hoy.
    const channel = supabase
      .channel('cierres-pendientes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cierres' }, () => fetchPendiente())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [habilitado, fetchPendiente])

  return { pendiente, reabierto, loading }
}
