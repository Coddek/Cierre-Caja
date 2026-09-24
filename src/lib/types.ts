import type { Database } from './database.types'

type CierreRow = Database['public']['Tables']['cierres']['Row']

// Un cierre con el nombre de quien lo reabrió embebido (join automático de
// PostgREST vía la FK reabierto_por -> usuarios_caja).
export type CierreConEditor = CierreRow & {
  usuarios_caja: { nombre: string } | null
}
