import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type Gasto = Database['public']['Tables']['gastos']['Row']

// Ver el comentario de useVentasHoy: `habilitado` evita pedir datos antes de
// que la sesión esté confirmada.
export function useGastosHoy(fecha: string, habilitado: boolean) {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)

  const fetchGastos = useCallback(async () => {
    const { data } = await supabase
      .from('gastos')
      .select('*')
      .eq('fecha', fecha)
      .order('created_at', { ascending: false })
    setGastos(data ?? [])
    setLoading(false)
  }, [fecha])

  useEffect(() => {
    if (!habilitado) {
      setGastos([])
      setLoading(true)
      return
    }

    fetchGastos()

    const channel = supabase
      .channel(`gastos-${fecha}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gastos', filter: `fecha=eq.${fecha}` },
        () => fetchGastos(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fecha, habilitado, fetchGastos])

  return { gastos, loading }
}
