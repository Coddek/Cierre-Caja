import type { Database } from '../lib/database.types'
import { formatMonto } from '../lib/format'
import { VentaItem } from './VentaItem'
import { SkeletonLista } from './SkeletonLista'

type Venta = Database['public']['Tables']['ventas']['Row']

export function VentasList({
  ventas,
  loading,
  titulo = 'Ventas de hoy',
}: {
  ventas: Venta[]
  loading: boolean
  titulo?: string
}) {
  if (loading) {
    return (
      <div className="movimientos-list">
        <h2>{titulo}</h2>
        <SkeletonLista />
      </div>
    )
  }

  const total = ventas.reduce((acc, v) => acc + v.monto + (v.monto_2 ?? 0), 0)

  return (
    <div className="movimientos-list">
      <h2>
        {titulo} ({ventas.length}) — total {formatMonto(total)}
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
