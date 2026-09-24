// Imita la forma de los ítems reales mientras cargan, en vez de un texto
// plano de "Cargando..." — da la sensación de que algo concreto está por
// aparecer ahí, no que la pantalla está rota.
export function SkeletonLista({ filas = 3 }: { filas?: number }) {
  return (
    <ul className="skeleton-lista" aria-hidden="true">
      {Array.from({ length: filas }, (_, i) => (
        <li key={i} className="skeleton-item">
          <div className="skeleton-bar skeleton-bar--monto" />
          <div className="skeleton-bar skeleton-bar--tag" />
        </li>
      ))}
    </ul>
  )
}

export function SkeletonResumen() {
  return (
    <div className="resumen-dia skeleton-resumen" aria-hidden="true">
      <div className="skeleton-bar skeleton-bar--titulo" />
      <div className="skeleton-bar skeleton-bar--linea" />
      <div className="skeleton-bar skeleton-bar--linea" />
      <div className="skeleton-bar skeleton-bar--linea" />
    </div>
  )
}
