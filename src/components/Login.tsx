import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { mensajeError } from '../lib/errors'

export function Login() {
  const { authError } = useAuth()
  const [modo, setModo] = useState<'login' | 'recuperar' | 'recuperar-enviado'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(
        error.message.toLowerCase().includes('invalid login credentials')
          ? 'Email o contraseña incorrectos.'
          : mensajeError(error),
      )
    }
    setLoading(false)
  }

  async function handleRecuperar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })

    setLoading(false)
    if (error) {
      setError(mensajeError(error))
      return
    }
    setModo('recuperar-enviado')
  }

  const shownError = error ?? authError

  if (modo === 'recuperar-enviado') {
    return (
      <div className="login-screen">
        <img src="/icon-512.png" alt="Martin" className="login-logo" />
        <div className="login-form">
          <p>Te mandamos un mail a {email} con un link para elegir una contraseña nueva.</p>
          <button type="button" onClick={() => setModo('login')}>
            Volver
          </button>
        </div>
      </div>
    )
  }

  if (modo === 'recuperar') {
    return (
      <div className="login-screen">
        <img src="/icon-512.png" alt="Martin" className="login-logo" />
        <form onSubmit={handleRecuperar} className="login-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>

          {shownError && <p className="mensaje-error">{shownError}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Mandar link de recuperación'}
          </button>
          <button type="button" className="login-link-secundario" onClick={() => setModo('login')}>
            Volver
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="login-screen">
      <img src="/icon-512.png" alt="Martin" className="login-logo" />

      <form onSubmit={handleSubmit} className="login-form">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {shownError && <p className="mensaje-error">{shownError}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
        <button type="button" className="login-link-secundario" onClick={() => setModo('recuperar')}>
          ¿Olvidaste tu contraseña?
        </button>
      </form>
    </div>
  )
}
