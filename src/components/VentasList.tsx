import type { Database } from '../lib/database.types'
import { formatMonto } from '../lib/format'
import { VentaItem } from './VentaItem'
import { SkeletonLista } from './SkeletonLista'

type Venta = Database['public']['Tables']['ventas']['Row']

export function VentasList({ ventas, loading }: { ventas: Venta[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="movimientos-list">
        <h2>Ventas de hoy</h2>
        <SkeletonLista />
      </div>
    )
  }

  const total = ventas.reduce((acc, v) => acc + v.monto, 0)

  return (
    <div className="movimientos-list">
      <h2>
        Ventas de hoy ({ventas.length}) — total {formatMonto(total)}
      </h2>
      {ventas.length === 0 ? (
        <p>Todavía no hay ventas cargadas.</p>
      ) : (
        <ul>
          {ventas.map((v) => (
            <VentaItem key={v.id} venta={v} />
          ))}
        </ul>
      )}
    </div>
  )
}
