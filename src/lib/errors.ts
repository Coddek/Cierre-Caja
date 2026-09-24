// Traduce errores técnicos (de Postgres, de la red, etc.) a algo que
// alguien sin conocimientos técnicos pueda entender y accionar.
export function mensajeError(error: unknown): string {
  if (!error) return 'Algo salió mal. Intentá de nuevo.'

  const err = error as { code?: string; message?: string }
  const code = err.code ?? ''
  const msg = (err.message ?? String(error)).toLowerCase()

  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed')) {
    return 'No se pudo conectar. Revisá tu conexión a internet e intentá de nuevo.'
  }

  // Nuestro trigger de "el día ya está cerrado"
  if (code === 'P0001' && msg.includes('ya está cerrado')) {
    const fecha = (err.message ?? '').match(/\d{4}-\d{2}-\d{2}/)?.[0]
    const fechaLinda = fecha
      ? new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
      : 'ese día'
    return `Ese día (${fechaLinda}) ya está cerrado. Reabrilo primero para poder editar.`
  }

  if (code === '23514') return 'Revisá los datos cargados: hay un valor que no es válido.'
  if (code === '23502') return 'Falta completar algún campo obligatorio.'
  if (code === '42501' || code === 'pgrst301' || msg.includes('permission denied')) {
    return 'No tenés permiso para hacer esto.'
  }
  if (msg.includes('jwt') || msg.includes('session')) {
    return 'Tu sesión expiró. Volvé a ingresar.'
  }

  return 'Algo salió mal y no se pudo guardar. Intentá de nuevo en un momento.'
}
