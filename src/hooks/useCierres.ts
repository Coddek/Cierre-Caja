import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CierreConEditor } from '../lib/types'

// Solo días efectivamente cerrados (cerrado=true) cuentan como historial.
// Uno que se reabrió para corregir algo no debería aparecer acá hasta
// que se vuelva a cerrar.
export function useCierres() {
  const [cierres, setCierres] = useState<CierreConEditor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('cierres')
      .select('*, usuarios_caja(nombre)')
      .eq('cerrado', true)
      .order('fecha', { ascending: false })
      .then(({ data }) => {
        setCierres(data ?? [])
        setLoading(false)
      })
  }, [])

  return { cierres, loading }
}
