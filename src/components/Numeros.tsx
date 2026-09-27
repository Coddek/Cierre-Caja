import { useMemo } from 'react'
import { useEstadisticas } from '../hooks/useEstadisticas'
import { useMediosPago } from '../hooks/useMediosPago'
import {
  COLOR_ANIO_ANTERIOR,
  COLOR_SERIE,
  formatCompacto,
  formatEntero,
  mezclaMedios,
  promedioPorDiaSemana,
  sumarDias,
  ventasPorMes,
} from '../lib/estadisticas'
import { DiaDetalle } from './DiaDetalle'
import { GraficoColumnas } from './GraficoColumnas'
import { MezclaMedios } from './MezclaMedios'
import { SkeletonResumen } from './SkeletonLista'

const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function nombreMes(mes: string) {
  const [anio, m] = mes.split('-').map(Number)
  return `${MESES_LARGOS[m - 1]} ${anio}`
}

// Pestaña "Números": estadísticas de solo lectura. Está aparte de "Hoy" para
// no sumar nada al uso de todos los días.
export function Numeros({
  hoy,
  fecha,
  onCambiarFecha,
}: {
  hoy: string
  fecha: string
  onCambiarFecha: (fecha: string) => void
}) {
  const haceUnAnio = sumarDias(hoy, -365)
  const { cierres, horas, loading, error } = useEstadisticas(haceUnAnio)
  const medios = useMediosPago()

  const meses = useMemo(() => ventasPorMes(cierres, hoy), [cierres, hoy])
  const diasSemana = useMemo(() => promedioPorDiaSemana(cierres, haceUnAnio), [cierres, haceUnAnio])
  const mezclaMes = useMemo(() => mezclaMedios(cierres, `${hoy.slice(0, 7)}-01`, medios), [cierres, hoy, medios])
  const mezclaAnual = useMemo(() => mezclaMedios(cierres, haceUnAnio, medios), [cierres, haceUnAnio, medios])

  if (loading) return <SkeletonResumen />
  if (error) return <p className="mensaje-error">No se pudieron cargar los números. Probá recargar.</p>

  const hayAnioAnterior = meses.some((m) => m.anterior != null)
  const horasConDatos = horas.length > 0
  const primeraHora = horasConDatos ? horas[0].hora : 0
  const ultimaHora = horasConDatos ? horas[horas.length - 1].hora : 0
  const columnasHoras = Array.from({ length: ultimaHora - primeraHora + 1 }, (_, i) => {
    const h = horas.find((x) => x.hora === primeraHora + i)
    return { etiqueta: String(primeraHora + i), valor: h?.cantidad ?? 0 }
  })

  return (
    <div className="numeros">
      <section className="numeros-seccion">
        <h2>Ver un día</h2>
        <DiaDetalle fecha={fecha} onCambiarFecha={onCambiarFecha} cierres={cierres} hoy={hoy} />
      </section>

      {cierres.length === 0 ? (
        <p className="numeros-vacio">Los gráficos aparecen cuando haya días cerrados.</p>
      ) : (
        <>
          <section className="numeros-seccion">
            <h2>Ventas por mes</h2>
            <div className="grafico-leyenda">
              <span>
                <i style={{ background: COLOR_SERIE }} /> Últimos 12 meses
              </span>
              <span>
                <i style={{ background: COLOR_ANIO_ANTERIOR }} /> Un año antes
              </span>
            </div>
            <GraficoColumnas
              titulo="Ventas por mes, comparadas con el mismo mes del año anterior"
              columnas={meses.map((m) => ({ etiqueta: m.etiqueta, valor: m.actual, valor2: m.anterior }))}
              colores={[COLOR_SERIE, COLOR_ANIO_ANTERIOR]}
              formatoEje={formatCompacto}
              lectura={(i) => {
                const m = meses[i]
                return (
                  <>
                    <strong>
                      {nombreMes(m.mes)}
                      {m.hastaDia != null && ` (del 1 al ${m.hastaDia})`}:
                    </strong>{' '}
                    {m.actual != null ? formatEntero(m.actual) : 'sin datos'}
                    {m.anterior != null && ` · un año antes ${formatEntero(m.anterior)}`}
                  </>
                )
              }}
              tabla={{
                encabezados: ['Mes', 'Ventas', 'Un año antes'],
                filas: meses.map((m) => [
                  m.hastaDia != null ? `${nombreMes(m.mes)} (1 al ${m.hastaDia})` : nombreMes(m.mes),
                  m.actual != null ? formatEntero(m.actual) : '—',
                  m.anterior != null ? formatEntero(m.anterior) : '—',
                ]),
              }}
            />
            {!hayAnioAnterior && (
              <p className="numeros-nota">La comparación con el año anterior aparece cuando haya un año de datos.</p>
            )}
          </section>

          <section className="numeros-seccion">
            <h2>Qué días se vende más</h2>
            <p className="numeros-nota">Promedio por día de la semana, últimos 12 meses.</p>
            <GraficoColumnas
              titulo="Promedio de ventas por día de la semana"
              columnas={diasSemana.map((d) => ({ etiqueta: d.dia.slice(0, 3), valor: d.promedio }))}
              colores={[COLOR_SERIE]}
              formatoEje={formatCompacto}
              lectura={(i) => {
                const d = diasSemana[i]
                return d.promedio != null ? (
                  <>
                    <strong>{d.dia}:</strong> {formatEntero(Math.round(d.promedio / 100) * 100)} en promedio ({d.dias}{' '}
                    {d.dias === 1 ? 'día' : 'días'})
                  </>
                ) : (
                  <>
                    <strong>{d.dia}:</strong> sin días cerrados
                  </>
                )
              }}
              tabla={{
                encabezados: ['Día', 'Promedio', 'Días'],
                filas: diasSemana.map((d) => [
                  d.dia,
                  d.promedio != null ? formatEntero(Math.round(d.promedio / 100) * 100) : '—',
                  String(d.dias),
                ]),
              }}
            />
          </section>

          <section className="numeros-seccion">
            <h2>Cómo pagan</h2>
            <MezclaMedios esteMes={mezclaMes} anual={mezclaAnual} />
          </section>

          {horasConDatos && (
            <section className="numeros-seccion">
              <h2>Horarios con más ventas</h2>
              <p className="numeros-nota">
                Cantidad de ventas por hora, últimos 12 meses. Es la hora en que se cargó cada venta.
              </p>
              <GraficoColumnas
                titulo="Cantidad de ventas por hora del día"
                columnas={columnasHoras}
                colores={[COLOR_SERIE]}
                formatoEje={(n) => String(Math.round(n))}
                etiquetasCada={columnasHoras.length > 10 ? 2 : 1}
                lectura={(i) => {
                  const c = columnasHoras[i]
                  return (
                    <>
                      <strong>
                        De {c.etiqueta} a {Number(c.etiqueta) + 1} h:
                      </strong>{' '}
                      {c.valor} {c.valor === 1 ? 'venta' : 'ventas'}
                    </>
                  )
                }}
                tabla={{
                  encabezados: ['Hora', 'Ventas'],
                  filas: columnasHoras.map((c) => [`${c.etiqueta} a ${Number(c.etiqueta) + 1} h`, String(c.valor)]),
                }}
              />
            </section>
          )}
        </>
      )}
    </div>
  )
}
