import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { mensajeError } from '../lib/errors'
import { formatMonto } from '../lib/format'
import { descripcionPares, sumaPares, type ParVendido } from '../lib/pares'
import { useMediosPago } from '../hooks/useMediosPago'
import { useMarcas } from '../hooks/useMarcas'
import { EscanearPar } from './EscanearPar'
import { MarcaInput } from './MarcaInput'

export function VentaForm({ fecha, onSuccess }: { fecha: string; onSuccess: () => void }) {
  const medios = useMediosPago()
  const marcas = useMarcas()

  const [monto, setMonto] = useState('')
  const [medioPago, setMedioPago] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [dividido, setDividido] = useState(false)
  const [medioPago2, setMedioPago2] = useState('')
  const [monto2, setMonto2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // Pares escaneados: al guardar se descuentan del stock de la tienda.
  const [pares, setPares] = useState<ParVendido[]>([])
  const [escaneando, setEscaneando] = useState(false)

  const medioPagoActual = medioPago || medios[0] || ''

  // El monto se completa con la suma de los pares, salvo que lo hayan cambiado
  // a mano (por un descuento): en ese caso se respeta lo que pusieron.
  function cambiarPares(siguientes: ParVendido[]) {
    const montoAutomatico = monto === '' || Number(monto) === sumaPares(pares)
    setPares(siguientes)
    if (montoAutomatico) setMonto(siguientes.length ? String(sumaPares(siguientes)) : '')
  }

  if (escaneando) {
    return (
      <EscanearPar
        onAgregar={(par) => {
          cambiarPares([...pares, par])
          setEscaneando(false)
        }}
        onCancelar={() => setEscaneando(false)}
      />
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const montoNum = Number(monto)
    if (!montoNum || montoNum <= 0) {
      setError('Ingresá un monto válido.')
      return
    }
    if (!medioPagoActual) {
      setError('Elegí un medio de pago.')
      return
    }

    let montoNum2: number | null = null
    if (dividido) {
      montoNum2 = Number(monto2)
      if (!medioPago2) {
        setError('Elegí el segundo medio de pago.')
        return
      }
      if (!montoNum2 || montoNum2 <= 0) {
        setError('Ingresá el monto del segundo pago.')
        return
      }
    }

    setSaving(true)
    const venta = {
      fecha,
      monto: montoNum,
      medio_pago: medioPagoActual,
      // Sin descripción escrita, se describe con los pares vendidos.
      descripcion: descripcion.trim() || (pares.length ? descripcionPares(pares) : null),
      medio_pago_2: dividido ? medioPago2 : null,
      monto_2: dividido ? montoNum2 : null,
    }
    // Con pares: venta y descuento de stock en un solo paso (si algo falla, no se guarda nada).
    const { error: insertError } = pares.length
      ? await supabase.rpc('tienda_registrar_venta', {
          p_fecha: venta.fecha,
          p_monto: venta.monto,
          p_medio_pago: venta.medio_pago,
          p_descripcion: venta.descripcion,
          p_medio_pago_2: venta.medio_pago_2,
          p_monto_2: venta.monto_2,
          p_talles: pares.map((p) => p.talleId),
        })
      : await supabase.from('ventas').insert(venta)
    setSaving(false)

    if (insertError) {
      setError(mensajeError(insertError))
      return
    }

    // No hace falta refrescar la lista a mano: la suscripción realtime del
    // hook useVentasHoy va a traer esta venta apenas Postgres confirme el insert.
    setMonto('')
    setDescripcion('')
    setPares([])
    setDividido(false)
    setMedioPago2('')
    setMonto2('')
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="form-carga">
      <div className="pares-venta">
        {pares.length > 0 && (
          <ul>
            {pares.map((par, i) => (
              <li key={`${par.talleId}-${i}`}>
                <span>
                  <strong>
                    {par.producto} · T{par.talle}
                  </strong>
                  <small>
                    {par.color} · {formatMonto(par.precio)}
                    {par.sinStock && <em> · figuraba sin stock</em>}
                  </small>
                </span>
                <button
                  type="button"
                  aria-label={`Quitar ${par.producto} talle ${par.talle}`}
                  onClick={() => cambiarPares(pares.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="btn-escanear" onClick={() => setEscaneando(true)}>
          {pares.length ? 'Escanear otro par' : 'Escanear par'}
        </button>
      </div>

      <label className="campo-monto">
        <span>Monto</span>
        <div className="input-monto-wrap">
          <span className="input-monto-simbolo">$</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />
        </div>
      </label>

      <label>
        <span>Medio de pago</span>
        <select value={medioPagoActual} onChange={(e) => setMedioPago(e.target.value)}>
          {medios.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      <label className="campo-checkbox">
        <input type="checkbox" checked={dividido} onChange={(e) => setDividido(e.target.checked)} />
        <span>Pagó con 2 medios distintos</span>
      </label>

      {dividido && (
        <div className="campo-pago-dividido">
          <label>
            <span>Segundo medio de pago</span>
            <select value={medioPago2} onChange={(e) => setMedioPago2(e.target.value)}>
              <option value="">Elegir...</option>
              {medios.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Monto del segundo pago</span>
            <div className="input-monto-wrap">
              <span className="input-monto-simbolo">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0"
                value={monto2}
                onChange={(e) => setMonto2(e.target.value)}
              />
            </div>
          </label>
        </div>
      )}

      <label>
        <span>Descripción (opcional)</span>
        <MarcaInput
          value={descripcion}
          onChange={setDescripcion}
          opciones={marcas}
          placeholder={pares.length ? descripcionPares(pares) : 'Marca, seña, lo que sea...'}
        />
      </label>

      {error && <p className="mensaje-error">{error}</p>}

      <button type="submit" disabled={saving}>
        {saving ? 'Guardando...' : 'Agregar venta'}
      </button>
    </form>
  )
}
