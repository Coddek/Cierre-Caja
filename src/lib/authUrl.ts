// Cuando alguien llega desde un link de invitación o de recuperación de
// contraseña, Supabase redirige acá con los datos de sesión en la URL —
// como parámetros después de "#" (flujo "implicit") o después de "?code="
// (flujo "PKCE"), según cómo esté configurado el proyecto. supabase-js los
// toma solos y arma la sesión en cualquiera de los dos casos, pero no
// distingue "esto es una invitación" — hay que leer el parámetro `type`
// nosotros mismos, revisando los dos lugares posibles.
export function detectarTipoAuthUrl(): 'invite' | 'recovery' | null {
  const deHash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const deQuery = new URLSearchParams(window.location.search)
  const type = deHash.get('type') ?? deQuery.get('type')
  return type === 'invite' || type === 'recovery' ? type : null
}
