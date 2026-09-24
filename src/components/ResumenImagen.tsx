import type { Ref } from 'react'
import type { Database } from '../lib/database.types'
import type { CierreConEditor } from '../lib/types'
import { formatMonto } from '../lib/format'
import { MEDIO_EFECTIVO, ordenarMedios } from '../lib/totalesPorMedio'

type Gasto = Database['public']['Tables']['gastos']['Row']

// Tarjeta del resumen del día cerrado pensada para convertirse en imagen y
// mandarse por WhatsApp. Se renderiza fuera de la pantalla: nunca se ve en
// la app, solo en la foto que genera html-to-image.
export function ResumenImagen({
  cierre,
  gastos,
  ref,
}: {
  cierre: CierreConEditor
  gastos: Gasto[]
  ref: Ref<HTMLDivElement>
}) {
  const totales = (cierre.totales_por_medio ?? {}) as Record<string, number>
  const medios = ordenarMedios(Object.keys(totales))
  const diferencia = cierre.diferencia_caja ?? 0
  const coincide = Math.abs(diferencia) < 0.01
  const fechaLarga = new Date(`${cierre.fecha}T12:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const fecha = fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1)

  return (
    <div className="ri-fuera-de-pantalla" aria-hidden="true">
      <div className="ri" ref={ref}>
        {/* Marcas de agua como <img> y no como ::before/::after: html-to-image
            no incluye las imágenes de fondo de los pseudo-elementos. */}
        <img src="/isotipo.png" alt="" className="ri-marca-agua ri-marca-agua--fondo" />
        <header className="ri-header">
          <img src="/isotipo.png" alt="" className="ri-isotipo" />
          <div className="ri-marca">
            <span className="ri-marca-nombre">Martin</span>
            <span className="ri-marca-sub">Cierre de caja</span>
          </div>
        </header>

        <div className="ri-tarjeta">
          <img src="/isotipo.png" alt="" className="ri-marca-agua ri-marca-agua--tarjeta" />
          <p className="ri-fecha">{fecha}</p>
          <div className="sello-cerrado">Cerrado</div>

          <span className="ri-hero-label">Total ventas</span>
          <span className="ri-hero">{formatMonto(cierre.total_ventas)}</span>

          <dl className="ri-lista">
            {medios.map((m) => (
              <div key={m}>
                <dt>{m}</dt>
                <dd>{formatMonto(totales[m])}</dd>
              </div>
            ))}
          </dl>

          <h3 className="ri-seccion">Efectivo en caja</h3>
          <dl className="ri-lista">
            <div>
              <dt>Caja inicial</dt>
              <dd>+ {formatMonto(cierre.caja_inicial ?? 0)}</dd>
            </div>
            <div>
              <dt>Ventas en efectivo</dt>
              <dd>+ {formatMonto(totales[MEDIO_EFECTIVO] ?? 0)}</dd>
            </div>
            {gastos.map((g) => (
              <div key={g.id}>
                <dt>Gasto: {g.descripcion}</dt>
                <dd>− {formatMonto(g.monto)}</dd>
              </div>
            ))}
            <div className="ri-subtotal">
              <dt>Tenía que haber</dt>
              <dd>{formatMonto(cierre.efectivo_esperado ?? 0)}</dd>
            </div>
            <div>
              <dt>Se retiró</dt>
              <dd>{formatMonto(cierre.retiro ?? 0)}</dd>
            </div>
            <div>
              <dt>Quedó en caja</dt>
              <dd>{formatMonto(cierre.caja_final ?? 0)}</dd>
            </div>
          </dl>

          <p className={`ri-resultado ${coincide ? 'ri-resultado--ok' : 'ri-resultado--mal'}`}>
            {coincide
              ? '✓ La caja coincide'
              : diferencia < 0
                ? `⚠ Faltan ${formatMonto(-diferencia)} en la caja`
                : `⚠ Sobran ${formatMonto(diferencia)} en la caja`}
          </p>

          {cierre.reabierto_en && cierre.usuarios_caja && (
            <p className="ri-editado">✎ Editado por {cierre.usuarios_caja.nombre}</p>
          )}
        </div>
      </div>
    </div>
  )
}
