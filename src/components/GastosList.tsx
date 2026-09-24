import type { Database } from '../lib/database.types'
import { formatMonto } from '../lib/format'
import { GastoItem } from './GastoItem'
import { SkeletonLista } from './SkeletonLista'

type Gasto = Database['public']['Tables']['gastos']['Row']

export function GastosList({ gastos, loading }: { gastos: Gasto[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="movimientos-list">
        <h2>Gastos de hoy</h2>
        <SkeletonLista />
      </div>
    )
  }

  const total = gastos.reduce((acc, g) => acc + g.monto, 0)

  return (
    <div className="movimientos-list">
      <h2>
        Gastos de hoy ({gastos.length}) — total {formatMonto(total)}
      </h2>
      {gastos.length === 0 ? (
        <p>Todavía no hay gastos cargados.</p>
      ) : (
        <ul>
          {gastos.map((g) => (
            <GastoItem key={g.id} gasto={g} />
          ))}
        </ul>
      )}
    </div>
  )
}
