import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CierreConEditor } from '../lib/types'

// Ver el comentario de useVentasHoy: `habilitado` evita pedir datos antes de
// que la sesión esté confirmada.
export function useCierreHoy(fecha: string, habilitado: boolean) {
  const [cierre, setCierre] = useState<CierreConEditor | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCierre = useCallback(async () => {
    const { data } = await supabase
      .from('cierres')
      .select('*, usuarios_caja(nombre)')
      .eq('fecha', fecha)
      .maybeSingle()
    setCierre(data)
    setLoading(false)
  }, [fecha])

  useEffect(() => {
    if (!habilitado) {
      setCierre(null)
      setLoading(true)
      return
    }

    fetchCierre()

    // Si el otro usuario cierra o reabre el día desde su celu, esta pantalla
    // se entera sola sin que haga falta recargar.
    const channel = supabase
      .channel(`cierres-${fecha}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cierres', filter: `fecha=eq.${fecha}` },
        () => fetchCierre(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fecha, habilitado, fetchCierre])

  return { cierre, loading }
}
