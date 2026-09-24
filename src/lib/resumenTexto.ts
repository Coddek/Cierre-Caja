import type { Database } from './database.types'
import type { CierreConEditor } from './types'
import { formatMonto } from './format'
import { MEDIO_EFECTIVO, ordenarMedios } from './totalesPorMedio'

type Gasto = Database['public']['Tables']['gastos']['Row']

// El mismo resumen que se ve en pantalla con el día cerrado, en texto para
// mandarlo por WhatsApp u otra app. Los *asteriscos* son negrita en WhatsApp.
export function resumenCierreTexto(cierre: CierreConEditor, gastos: Gasto[]): string {
  const [yyyy, mm, dd] = cierre.fecha.split('-')
  const totales = (cierre.totales_por_medio ?? {}) as Record<string, number>
  const diferencia = cierre.diferencia_caja ?? 0

  const lineas = [
    `*Cierre de caja ${dd}/${mm}/${yyyy}*`,
    '',
    `*Total ventas: ${formatMonto(cierre.total_ventas)}*`,
    ...ordenarMedios(Object.keys(totales)).map((m) => `${m}: ${formatMonto(totales[m])}`),
    '',
    '*Efectivo en caja*',
    `Caja inicial: + ${formatMonto(cierre.caja_inicial ?? 0)}`,
    `Ventas en efectivo: + ${formatMonto(totales[MEDIO_EFECTIVO] ?? 0)}`,
    ...gastos.map((g) => `Gasto ${g.descripcion}: − ${formatMonto(g.monto)}`),
    `Tenía que haber: ${formatMonto(cierre.efectivo_esperado ?? 0)}`,
    `Se retiró: ${formatMonto(cierre.retiro ?? 0)}`,
    `Quedó en caja: ${formatMonto(cierre.caja_final ?? 0)}`,
    '',
    Math.abs(diferencia) < 0.01
      ? '✓ La caja coincide'
      : diferencia < 0
        ? `⚠ Faltan ${formatMonto(-diferencia)} en la caja`
        : `⚠ Sobran ${formatMonto(diferencia)} en la caja`,
  ]

  if (cierre.reabierto_en && cierre.usuarios_caja) {
    lineas.push(`(Editado por ${cierre.usuarios_caja.nombre})`)
  }

  return lineas.join('\n')
}
