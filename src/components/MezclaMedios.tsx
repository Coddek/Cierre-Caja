import type { PorcionMedio } from '../lib/estadisticas'
import { formatMonto } from '../lib/format'

function Barra({ porciones, titulo }: { porciones: PorcionMedio[]; titulo: string }) {
  return (
    <div className="mezcla-fila">
      <span className="mezcla-titulo">{titulo}</span>
      {porciones.length === 0 ? (
        <span className="numeros-vacio">Sin datos</span>
      ) : (
        <div className="mezcla-barra" role="img" aria-label={`${titulo}: ${porciones.map((p) => `${p.nombre} ${Math.round(p.porcentaje)}%`).join(', ')}`}>
          {porciones.map((p) => (
            <span
              key={p.nombre}
              className="mezcla-segmento"
              style={{ flexGrow: p.porcentaje, background: p.color }}
              title={`${p.nombre}: ${Math.round(p.porcentaje)}% (${formatMonto(p.total)})`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Cómo pagan: una barra partida por medio de pago para este mes y otra para
// los últimos 12 meses, así se ve si cambia la costumbre (ej. menos efectivo).
// La leyenda lleva los porcentajes en texto: el color nunca es lo único.
export function MezclaMedios({ esteMes, anual }: { esteMes: PorcionMedio[]; anual: PorcionMedio[] }) {
  const nombres = [...anual, ...esteMes.filter((p) => !anual.some((a) => a.nombre === p.nombre))]
  const pct = (lista: PorcionMedio[], nombre: string) => {
    const p = lista.find((x) => x.nombre === nombre)
    return p ? `${Math.round(p.porcentaje)}%` : '—'
  }

  return (
    <div className="mezcla">
      <Barra porciones={esteMes} titulo="Este mes" />
      <Barra porciones={anual} titulo="Últimos 12 meses" />

      <table className="mezcla-leyenda">
        <thead>
          <tr>
            <th />
            <th>Este mes</th>
            <th>12 meses</th>
          </tr>
        </thead>
        <tbody>
          {nombres.map((p) => (
            <tr key={p.nombre}>
              <td>
                <span className="mezcla-muestra" style={{ background: p.color }} />
                {p.nombre}
              </td>
              <td>{pct(esteMes, p.nombre)}</td>
              <td>{pct(anual, p.nombre)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
