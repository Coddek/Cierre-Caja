import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthContextValue = {
  session: Session | null
  nombre: string | null
  loading: boolean
  authError: string | null
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function buscarUsuarioCaja(userId: string) {
  const { data } = await supabase.from('usuarios_caja').select('nombre').eq('id', userId).maybeSingle()
  return data?.nombre ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [nombre, setNombre] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    // Una sesión válida en Supabase Auth no alcanza: el mismo proyecto lo usa
    // "Asiento Contable", así que cualquier cuenta de ahí también podría loguearse
    // acá. usuarios_caja es la lista explícita de quién puede operar esta app.
    async function handleSession(newSession: Session | null) {
      if (!newSession) {
        setSession(null)
        setNombre(null)
        return
      }

      const nombreEncontrado = await buscarUsuarioCaja(newSession.user.id)
      if (nombreEncontrado) {
        setAuthError(null)
        setSession(newSession)
        setNombre(nombreEncontrado)
      } else {
        setAuthError('Esta cuenta no tiene acceso a Cierre de Caja.')
        setSession(null)
        setNombre(null)
        await supabase.auth.signOut()
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      handleSession(data.session).finally(() => setLoading(false))
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      handleSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, nombre, loading, authError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
