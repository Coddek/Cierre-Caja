import { Fragment, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatMonto } from '../lib/format'
import { mensajeError } from '../lib/errors'
import { MEDIO_EFECTIVO, calcularEfectivoEsperado, ordenarMedios } from '../lib/totalesPorMedio'
import { CompartirResumen } from './CompartirResumen'
import { ConfirmDialog } from './ConfirmDialog'
import { DesgloseCuentas } from './DesgloseCuentas'
import type { CierreConEditor } from '../lib/types'
import type { Database } from '../lib/database.types'

type Venta = Database['public']['Tables']['ventas']['Row']
type Gasto = Database['public']['Tables']['gastos']['Row']

// Diferencia entre lo contado y lo esperado, en palabras.
function textoDiferencia(diferencia: number) {
  if (Math.abs(diferencia) < 0.01) return '✓ La caja coincide con lo esperado'
  return diferencia < 0
    ? `⚠ Faltan ${formatMonto(-diferencia)} en la caja`
    : `⚠ Sobran ${formatMonto(diferencia)} en la caja`
}

export function CierreDelDia({
  fecha,
  cierre,
  ventas,
  gastos,
}: {
  fecha: string
  cierre: CierreConEditor | null
  ventas: Venta[]
  gastos: Gasto[]
}) {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pidiendoArqueo, setPidiendoArqueo] = useState(false)
  const [retiro, setRetiro] = useState('')
  const [quedaEnCaja, setQuedaEnCaja] = useState('')
  const [confirmandoReabrir, setConfirmandoReabrir] = useState(false)

  async function handleCerrar() {
    const montoRetiro = Number(retiro)
    const montoQueda = Number(quedaEnCaja)
    if (retiro.trim() === '' || montoRetiro < 0 || quedaEnCaja.trim() === '' || montoQueda < 0) {
      setError('Completá cuánto se retira y cuánto queda en la caja (pueden ser 0).')
      return
    }
    setWorking(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('cerrar_dia', {
      p_fecha: fecha,
      p_retiro: montoRetiro,
      p_caja_final: montoQueda,
    })
    setWorking(false)
    if (rpcError) {
      setError(mensajeError(rpcError))
      return
    }
    setPidiendoArqueo(false)
    setRetiro('')
    setQuedaEnCaja('')
  }

  async function handleReabrir() {
    setConfirmandoReabrir(false)
    setWorking(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('reabrir_dia', { p_fecha: fecha })
    setWorking(false)
    if (rpcError) setError(mensajeError(rpcError))
  }

  const cajaInicial = cierre?.caja_inicial ?? 0

  if (!cierre || !cierre.cerrado) {
    const esperado = calcularEfectivoEsperado(ventas, gastos, cajaInicial)
    const completo = retiro.trim() !== '' && quedaEnCaja.trim() !== ''
    const contado = Number(retiro) + Number(quedaEnCaja)

    return (
      <div className="cierre-dia">
        {!pidiendoArqueo ? (
          <button type="button" onClick={() => setPidiendoArqueo(true)}>
            Cerrar el día
          </button>
        ) : (
          <div className="pedir-caja-final">
            <h2>Cierre de caja</h2>
            <p className="caja-esperada-nota">
              Revisá cada cuenta contra el cuaderno. Tocá un medio de pago para ver qué ventas está
              sumando.
            </p>

            <DesgloseCuentas ventas={ventas} gastos={gastos} cajaInicial={cajaInicial} />

            <p className="caja-esperada-nota">
              Contá la plata de la caja y separá lo que se retira de lo que queda para dar vuelto
              mañana.
            </p>
            <label className="campo-monto">
              <span>Plata que se retira</span>
              <div className="input-monto-wrap">
                <span className="input-monto-simbolo">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={retiro}
                  onChange={(e) => setRetiro(e.target.value)}
                  autoFocus
                />
              </div>
            </label>
            <label className="campo-monto">
              <span>Queda en la caja (para mañana)</span>
              <div className="input-monto-wrap">
                <span className="input-monto-simbolo">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={quedaEnCaja}
                  onChange={(e) => setQuedaEnCaja(e.target.value)}
                />
              </div>
            </label>

            {completo && (
              <div className="desglose-cuenta desglose-cuenta--abierta">
                <ul>
                  <li>
                    <span>Se retira + queda en caja</span>
                    <span>{formatMonto(contado)}</span>
                  </li>
                  <li>
                    <span>Tiene que haber</span>
                    <span>{formatMonto(esperado)}</span>
                  </li>
                </ul>
                <p
                  className={
                    Math.abs(contado - esperado) < 0.01 ? 'caja-coincide' : 'caja-no-coincide'
                  }
                >
                  {textoDiferencia(contado - esperado)}
                </p>
              </div>
            )}

            {error && <p className="mensaje-error">{error}</p>}
            <div className="item-acciones">
              <button type="button" onClick={handleCerrar} disabled={working}>
                {working ? 'Cerrando...' : 'Confirmar cierre'}
              </button>
              <button type="button" className="btn-secundario" onClick={() => setPidiendoArqueo(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const totalesPorMedio = (cierre.totales_por_medio ?? {}) as Record<string, number>
  const medios = ordenarMedios(Object.keys(totalesPorMedio))
  const diferencia = cierre.diferencia_caja ?? 0

  return (
    <div className="cierre-dia cierre-dia--cerrado">
      <div className="sello-cerrado">Cerrado</div>
      <span className="ganancia-hero-label">Total ventas</span>
      <span className="ganancia-hero">{formatMonto(cierre.total_ventas)}</span>

      {cierre.reabierto_en && (
        <p className="editado-badge">
          ✎ Editado el{' '}
          {new Date(cierre.reabierto_en).toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
          {cierre.usuarios_caja && ` por ${cierre.usuarios_caja.nombre}`}
        </p>
      )}

      <dl>
        {medios.map((m) => (
          <Fragment key={m}>
            <dt>{m}</dt>
            <dd>{formatMonto(totalesPorMedio[m])}</dd>
          </Fragment>
        ))}
      </dl>

      <dl className="arqueo-caja">
        <dt>Caja inicial</dt>
        <dd>+ {formatMonto(cajaInicial)}</dd>

        <dt>Ventas en efectivo</dt>
        <dd>+ {formatMonto(totalesPorMedio[MEDIO_EFECTIVO] ?? 0)}</dd>

        <dt>Gastos</dt>
        <dd>− {formatMonto(cierre.total_gastos)}</dd>

        <dt>Tenía que haber</dt>
        <dd>{formatMonto(cierre.efectivo_esperado ?? 0)}</dd>

        <dt>Se retiró</dt>
        <dd>{formatMonto(cierre.retiro ?? 0)}</dd>

        <dt>Quedó en caja</dt>
        <dd>{formatMonto(cierre.caja_final ?? 0)}</dd>
      </dl>

      <p className={Math.abs(diferencia) < 0.01 ? 'caja-coincide' : 'caja-no-coincide'}>
        {textoDiferencia(diferencia)}
      </p>

      <details className="desglose-detalle">
        <summary>Ver desglose de cada cuenta</summary>
        <DesgloseCuentas ventas={ventas} gastos={gastos} cajaInicial={cajaInicial} />
      </details>

      <CompartirResumen cierre={cierre} gastos={gastos} />

      {error && <p className="mensaje-error">{error}</p>}
      <button type="button" onClick={() => setConfirmandoReabrir(true)} disabled={working}>
        {working ? 'Reabriendo...' : 'Reabrir día'}
      </button>
      {confirmandoReabrir && (
        <ConfirmDialog
          mensaje="¿Reabrir el día para corregir algo?"
          confirmarTexto="Reabrir"
          onConfirm={handleReabrir}
          onCancel={() => setConfirmandoReabrir(false)}
        />
      )}
    </div>
  )
}
