import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { mensajeError } from '../lib/errors'

export function DefinirPassword({ onListo }: { onListo: () => void }) {
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('La contraseña tiene que tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (updateError) {
      setError(mensajeError(updateError))
      return
    }

    // Saca los tokens de la URL (ya cumplieron su función) para no dejarlos
    // pegados en la barra de direcciones ni en el historial.
    window.history.replaceState(null, '', window.location.pathname)
    onListo()
  }

  return (
    <div className="login-screen">
      <img src="/icon-512.png" alt="Martin" className="login-logo" />
      <form onSubmit={handleSubmit} className="login-form">
        <p>Elegí una contraseña para tu cuenta.</p>

        <label>
          Contraseña nueva
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        <label>
          Confirmar contraseña
          <input
            type="password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        {error && <p className="mensaje-error">{error}</p>}

        <button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  )
}
