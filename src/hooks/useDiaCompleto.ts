import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type Tablas = Database['public']['Tables']
type Venta = Tablas['ventas']['Row']
type Gasto = Tablas['gastos']['Row']
type Cierre = Tablas['cierres']['Row']
export type CierreAnterior = Pick<Cierre, 'fecha' | 'caja_final'>

// Un día cualquiera, leído una vez (sin tiempo real): para mirar días pasados
// en "Números". No usa useVentasHoy & co. porque esos abren un canal de
// Realtime con nombre por fecha, y ver el día de hoy acá duplicaría el canal
// que ya tiene abierto la pantalla principal. `recarga` vuelve a pedirlo
// (después de reabrir o corregir el día).
//
// Trae también el último cierre anterior, para avisar si la caja inicial no
// coincide con lo que quedó en la caja ese día.
export function useDiaCompleto(fecha: string, recarga = 0) {
  const [dia, setDia] = useState<{
    fecha: string
    ventas: Venta[]
    gastos: Gasto[]
    cierre: Cierre | null
    anterior: CierreAnterior | null
  } | null>(null)

  useEffect(() => {
    let cancelado = false
    Promise.all([
      supabase.from('ventas').select('*').eq('fecha', fecha).order('created_at', { ascending: false }),
      supabase.from('gastos').select('*').eq('fecha', fecha).order('created_at', { ascending: false }),
      supabase.from('cierres').select('*').eq('fecha', fecha).maybeSingle(),
      supabase
        .from('cierres')
        .select('fecha, caja_final')
        .lt('fecha', fecha)
        .not('caja_final', 'is', null)
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([v, g, c, a]) => {
      if (cancelado) return
      setDia({ fecha, ventas: v.data ?? [], gastos: g.data ?? [], cierre: c.data, anterior: a.data })
    })
    return () => {
      cancelado = true
    }
  }, [fecha, recarga])

  // Mientras llega el día nuevo, no mostrar los datos del anterior.
  const listo = dia?.fecha === fecha
  return {
    ventas: listo ? dia.ventas : [],
    gastos: listo ? dia.gastos : [],
    cierre: listo ? dia.cierre : null,
    anterior: listo ? dia.anterior : null,
    loading: !listo,
  }
}
