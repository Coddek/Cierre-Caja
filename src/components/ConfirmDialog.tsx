export function ConfirmDialog({
  mensaje,
  confirmarTexto = 'Confirmar',
  destructivo = false,
  onConfirm,
  onCancel,
}: {
  mensaje: string
  confirmarTexto?: string
  destructivo?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="modal-fondo" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p>{mensaje}</p>
        <div className="confirm-dialog-acciones">
          <button type="button" className="confirm-cancelar" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className={destructivo ? 'confirm-destructivo' : 'confirm-principal'}
            onClick={onConfirm}
          >
            {confirmarTexto}
          </button>
        </div>
      </div>
    </div>
  )
}
