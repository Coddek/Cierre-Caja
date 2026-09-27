// Cálculos de la pestaña "Números". Todo sale de los cierres ya guardados
// (un registro por día cerrado), así que no hace falta traer cada venta.

export type CierreStats = {
  fecha: string // YYYY-MM-DD
  total_ventas: number
  totales_por_medio: Record<string, number>
}

// Colores por medio de pago, en el orden de la tabla medios_pago (validados
// para daltonismo y contraste). El color sigue al medio, no a su ranking.
// Del 5.º medio en adelante se agrupa en "Otros".
export const COLORES_MEDIOS = ['#2e7d4f', '#d08a1f', '#3f7fc4', '#c0588f']
export const COLOR_OTROS = '#a3aaa6'
export const COLOR_SERIE = '#2e7d4f'
export const COLOR_ANIO_ANTERIOR = '#a9c4b1'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// $ 4,2 M · $ 850 mil · $ 900. Para ejes y etiquetas, donde el monto exacto
// no importa (el exacto va en la lectura del gráfico y en la tabla).
export function formatCompacto(n: number) {
  if (n >= 1_000_000) return `$ ${(n / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')} M`
  if (n >= 1_000) return `$ ${Math.round(n / 1_000)} mil`
  return `$ ${Math.round(n)}`
}

// $ 3.307.700: monto sin centavos, para lecturas y tablas de estadísticas.
export function formatEntero(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
}

// Las fechas se manejan como texto YYYY-MM-DD; las cuentas se hacen en UTC
// para que ningún cambio de horario corra el día.
function aDate(fecha: string) {
  return new Date(`${fecha}T00:00:00Z`)
}
function aTexto(d: Date) {
  return d.toISOString().slice(0, 10)
}
export function sumarDias(fecha: string, dias: number) {
  const d = aDate(fecha)
  d.setUTCDate(d.getUTCDate() + dias)
  return aTexto(d)
}
// 0 = lunes … 6 = domingo
export function diaDeSemana(fecha: string) {
  return (aDate(fecha).getUTCDay() + 6) % 7
}
// El mismo día de la semana, 52 semanas antes (ej. el sábado equivalente del
// año pasado). En un local pesa más el día de la semana que la fecha exacta.
export function mismoDiaAnioAnterior(fecha: string) {
  return sumarDias(fecha, -364)
}
export function fechaLarga(fecha: string) {
  const texto = aDate(fecha).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export type PuntoMes = {
  mes: string
  etiqueta: string
  actual: number | null
  anterior: number | null
  hastaDia: number | null // mes en curso: se compara solo hasta este día
}

// Últimos 12 meses hasta `hasta` (YYYY-MM-DD), empezando en el primer mes con
// datos si hay menos de un año. Cada mes trae el mismo mes del año anterior;
// el mes en curso se compara contra el mismo tramo (ej. del 1 al 26), no
// contra el mes entero, que todavía no terminó.
export function ventasPorMes(cierres: CierreStats[], hasta: string): PuntoMes[] {
  const porMes = new Map<string, number>()
  const diaHoy = hasta.slice(8, 10)
  const mesHoy = hasta.slice(0, 7)
  const mesHoyAnterior = `${Number(hasta.slice(0, 4)) - 1}${mesHoy.slice(4)}`
  let tramoAnterior = 0
  let hayTramoAnterior = false
  for (const c of cierres) {
    const mes = c.fecha.slice(0, 7)
    porMes.set(mes, (porMes.get(mes) ?? 0) + c.total_ventas)
    if (mes === mesHoyAnterior && c.fecha.slice(8, 10) <= diaHoy) {
      tramoAnterior += c.total_ventas
      hayTramoAnterior = true
    }
  }
  if (porMes.size === 0) return []

  const primero = [...porMes.keys()].sort()[0]
  const [anio, mes] = hasta.slice(0, 7).split('-').map(Number)
  const puntos: PuntoMes[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(anio, mes - 1 - i, 1))
    const clave = aTexto(d).slice(0, 7)
    if (clave < primero) continue
    const anterior = `${d.getUTCFullYear() - 1}${clave.slice(4)}`
    const enCurso = clave === mesHoy
    puntos.push({
      mes: clave,
      etiqueta: MESES[d.getUTCMonth()],
      actual: porMes.get(clave) ?? null,
      anterior: enCurso ? (hayTramoAnterior ? tramoAnterior : null) : (porMes.get(anterior) ?? null),
      hastaDia: enCurso ? Number(diaHoy) : null,
    })
  }
  return puntos
}

export type PuntoDiaSemana = { dia: string; promedio: number | null; dias: number }

// Promedio de venta de cada día de la semana, con los días cerrados desde `desde`.
export function promedioPorDiaSemana(cierres: CierreStats[], desde: string): PuntoDiaSemana[] {
  const suma = Array(7).fill(0)
  const cant = Array(7).fill(0)
  for (const c of cierres) {
    if (c.fecha < desde) continue
    const d = diaDeSemana(c.fecha)
    suma[d] += c.total_ventas
    cant[d] += 1
  }
  return DIAS_SEMANA.map((dia, i) => ({ dia, promedio: cant[i] ? suma[i] / cant[i] : null, dias: cant[i] }))
}

export type PorcionMedio = { nombre: string; total: number; porcentaje: number; color: string }

// Cuánto se cobró con cada medio desde `desde`. El orden y el color salen de
// medios_pago (mediosOrden); lo que no entra en los 4 colores va a "Otros".
export function mezclaMedios(cierres: CierreStats[], desde: string, mediosOrden: string[]): PorcionMedio[] {
  const totales = new Map<string, number>()
  for (const c of cierres) {
    if (c.fecha < desde) continue
    for (const [medio, total] of Object.entries(c.totales_por_medio ?? {})) {
      totales.set(medio, (totales.get(medio) ?? 0) + Number(total))
    }
  }
  const total = [...totales.values()].reduce((a, b) => a + b, 0)
  if (total === 0) return []

  // Medios que no están en la tabla (ej. uno dado de baja) van al final.
  const orden = [...mediosOrden, ...[...totales.keys()].filter((m) => !mediosOrden.includes(m)).sort()]
  const conColor = orden.slice(0, COLORES_MEDIOS.length)
  const porciones: PorcionMedio[] = conColor
    .filter((m) => totales.get(m))
    .map((m) => ({
      nombre: m,
      total: totales.get(m)!,
      porcentaje: (totales.get(m)! / total) * 100,
      color: COLORES_MEDIOS[conColor.indexOf(m)],
    }))
  const otros = orden.slice(COLORES_MEDIOS.length).reduce((a, m) => a + (totales.get(m) ?? 0), 0)
  if (otros > 0) {
    porciones.push({ nombre: 'Otros', total: otros, porcentaje: (otros / total) * 100, color: COLOR_OTROS })
  }
  return porciones
}
