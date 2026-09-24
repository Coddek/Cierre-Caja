import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { formatMonto } from '../lib/format'
import { mensajeError } from '../lib/errors'

// abrir_dia() pisa la caja inicial si el día ya estaba abierto, así que
// sirve también para corregirla. Solo se muestra con el día abierto: una vez
// cerrado, hay que reabrirlo para que el arqueo se recalcule.
export function CajaInicialEditable({ fecha, cajaInicial }: { fecha: string; cajaInicial: number }) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function empezar() {
    setValor(String(cajaInicial))
    setError(null)
    setEditando(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const monto = Number(valor)
    if (valor.trim() === '' || monto < 0) {
      setError('Ingresá un monto válido (puede ser 0).')
      return
    }
    setSaving(true)
    const { error: rpcError } = await supabase.rpc('abrir_dia', { p_fecha: fecha, p_caja_inicial: monto })
    setSaving(false)
    if (rpcError) {
      setError(mensajeError(rpcError))
      return
    }
    setEditando(false)
  }

  if (!editando) {
    return (
      <p className="caja-inicial-badge">
        Caja inicial: {formatMonto(cajaInicial)}{' '}
        <button type="button" className="caja-inicial-editar" onClick={empezar}>
          Editar
        </button>
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="caja-inicial-form">
      <label className="campo-monto">
        <span>Caja inicial</span>
        <div className="input-monto-wrap">
          <span className="input-monto-simbolo">$</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            autoFocus
          />
        </div>
      </label>
      {error && <p className="mensaje-error">{error}</p>}
      <div className="item-acciones">
        <button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" onClick={() => setEditando(false)}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
