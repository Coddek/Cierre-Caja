import type { Database } from '../lib/database.types'
import { formatMonto } from '../lib/format'
import { GastoItem } from './GastoItem'
import { SkeletonLista } from './SkeletonLista'

type Gasto = Database['public']['Tables']['gastos']['Row']

export function GastosList({
  gastos,
  loading,
  titulo = 'Gastos de hoy',
}: {
  gastos: Gasto[]
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

  const total = gastos.reduce((acc, g) => acc + g.monto, 0)

  return (
    <div className="movimientos-list">
      <h2>
        {titulo} ({gastos.length}) — total {formatMonto(total)}
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
