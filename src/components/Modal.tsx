import { useEffect, type ReactNode } from 'react'

export function Modal({
  titulo,
  onClose,
  children,
}: {
  titulo: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="modal-fondo" onClick={onClose}>
      <div className="modal-hoja" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hoja-header">
          <span className="modal-hoja-agarre" aria-hidden="true" />
          <div className="modal-hoja-titulo-row">
            <h2>{titulo}</h2>
            <button type="button" className="modal-cerrar" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
