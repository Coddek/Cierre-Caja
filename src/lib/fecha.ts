// Fecha local del dispositivo en formato YYYY-MM-DD.
// El celu vive en el local, así que su hora local ya es la hora Argentina real.
export function getFechaHoy() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
