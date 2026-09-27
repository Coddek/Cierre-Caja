import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CierreStats } from '../lib/estadisticas'

export type HoraStats = { hora: number; cantidad: number; total: number }

// Supabase devuelve como máximo 1000 filas por consulta: con un cierre por
// día eso son ~3 años, así que se pide de a páginas para que ande siempre.
async function todosLosCierres(): Promise<CierreStats[]> {
  const pagina = 1000
  const cierres: CierreStats[] = []
  for (let desde = 0; ; desde += pagina) {
    const { data, error } = await supabase
      .from('cierres')
      .select('fecha, total_ventas, totales_por_medio')
      .eq('cerrado', true)
      .order('fecha')
      .range(desde, desde + pagina - 1)
    if (error) throw error
    cierres.push(...((data ?? []) as CierreStats[]))
    if (!data || data.length < pagina) return cierres
  }
}

// Datos de la pestaña "Números". Solo días cerrados: un día abierto todavía
// puede cambiar y ensuciaría promedios y comparaciones.
export function useEstadisticas(horasDesde: string) {
  const [cierres, setCierres] = useState<CierreStats[]>([])
  const [horas, setHoras] = useState<HoraStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelado = false
    Promise.all([todosLosCierres(), supabase.rpc('ventas_por_hora', { p_desde: horasDesde })])
      .then(([cierres, { data: horas, error: errorHoras }]) => {
        if (cancelado) return
        if (errorHoras) throw errorHoras
        setCierres(cierres)
        setHoras((horas ?? []).map((h) => ({ ...h, total: Number(h.total) })))
        setLoading(false)
      })
      .catch(() => {
        if (cancelado) return
        setError(true)
        setLoading(false)
      })
    return () => {
      cancelado = true
    }
  }, [horasDesde])

  return { cierres, horas, loading, error }
}
