import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'

type Tablas = Database['public']['Tables']
type Venta = Tablas['ventas']['Row']
type Gasto = Tablas['gastos']['Row']
type Cierre = Tablas['cierres']['Row']

// Un día cualquiera, leído una vez (sin tiempo real): para mirar días pasados
// en "Números". No usa useVentasHoy & co. porque esos abren un canal de
// Realtime con nombre por fecha, y ver el día de hoy acá duplicaría el canal
// que ya tiene abierto la pantalla principal.
export function useDiaCompleto(fecha: string) {
  const [dia, setDia] = useState<{
    fecha: string
    ventas: Venta[]
    gastos: Gasto[]
    cierre: Cierre | null
  } | null>(null)

  useEffect(() => {
    let cancelado = false
    Promise.all([
      supabase.from('ventas').select('*').eq('fecha', fecha).order('created_at', { ascending: false }),
      supabase.from('gastos').select('*').eq('fecha', fecha).order('created_at', { ascending: false }),
      supabase.from('cierres').select('*').eq('fecha', fecha).maybeSingle(),
    ]).then(([v, g, c]) => {
      if (cancelado) return
      setDia({ fecha, ventas: v.data ?? [], gastos: g.data ?? [], cierre: c.data })
    })
    return () => {
      cancelado = true
    }
  }, [fecha])

  // Mientras llega el día nuevo, no mostrar los datos del anterior.
  const listo = dia?.fecha === fecha
  return {
    ventas: listo ? dia.ventas : [],
    gastos: listo ? dia.gastos : [],
    cierre: listo ? dia.cierre : null,
    loading: !listo,
  }
}
