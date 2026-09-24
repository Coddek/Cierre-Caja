import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type Venta = Database['public']['Tables']['ventas']['Row']

// `habilitado` evita disparar la consulta antes de que la sesión termine de
// confirmarse: si se pide antes de tiempo, Supabase la trata como si no
// hubiera nadie logueado y devuelve vacío — y esa consulta nunca se reintenta
// sola, así que la pantalla se queda pensando que no hay nada.
export function useVentasHoy(fecha: string, habilitado: boolean) {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)

  const fetchVentas = useCallback(async () => {
    const { data } = await supabase
      .from('ventas')
      .select('*')
      .eq('fecha', fecha)
      .order('created_at', { ascending: false })
    setVentas(data ?? [])
    setLoading(false)
  }, [fecha])

  useEffect(() => {
    if (!habilitado) {
      setVentas([])
      setLoading(true)
      return
    }

    fetchVentas()

    // En cualquier cambio (propio o del otro usuario) volvemos a pedir la lista
    // completa: más simple que ir mezclando inserts/updates a mano, y a este
    // volumen (unas pocas ventas por día) el costo extra no importa.
    const channel = supabase
      .channel(`ventas-${fecha}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ventas', filter: `fecha=eq.${fecha}` },
        () => fetchVentas(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fecha, habilitado, fetchVentas])

  return { ventas, loading }
}
