import { formatMonto } from './format'

// Lo que quedó en la caja un día es la caja inicial del siguiente. Si después
// se corrige un día anterior (cambia "queda en caja"), el día siguiente ya
// arrancó con el número viejo: no se toca solo, pero se avisa.
export function avisoCajaInicial(
  cajaInicial: number | null,
  anterior: { fecha: string; caja_final: number | null } | null | undefined,
): string | null {
  if (cajaInicial == null || anterior?.caja_final == null) return null
  if (Math.abs(cajaInicial - anterior.caja_final) < 0.01) return null
  const [, mm, dd] = anterior.fecha.split('-')
  return `⚠ Arrancó con ${formatMonto(cajaInicial)}, pero el ${dd}/${mm} quedaron ${formatMonto(anterior.caja_final)} en la caja`
}
