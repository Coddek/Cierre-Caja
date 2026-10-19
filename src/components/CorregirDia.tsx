import { useEffect, useState } from 'react'
import { useVentasHoy } from '../hooks/useVentasHoy'
import { useGastosHoy } from '../hooks/useGastosHoy'
import { useCierreHoy } from '../hooks/useCierreHoy'
import { CajaInicialEditable } from './CajaInicialEditable'
import { CierreDelDia } from './CierreDelDia'
import { VentasList } from './VentasList'
import { GastosList } from './GastosList'
import { VentaForm } from './VentaForm'
import { GastoForm } from './GastoForm'
import { Modal } from './Modal'
import { SkeletonResumen } from './SkeletonLista'

// Un día anterior reabierto desde "Ver un día" para corregirlo (una venta que
// no se cargó, un gasto mal anotado...). Se edita acá mismo, sin pasar por la
// pestaña Hoy, y al volver a cerrarlo se avisa con onCerrado.
export function CorregirDia({ fecha, onCerrado }: { fecha: string; onCerrado: () => void }) {
  const { ventas, loading: loadingVentas } = useVentasHoy(fecha, true)
  const { gastos, loading: loadingGastos } = useGastosHoy(fecha, true)
  const { cierre, loading: loadingCierre } = useCierreHoy(fecha, true)
  const [modalAbierto, setModalAbierto] = useState<'venta' | 'gasto' | null>(null)

  const cerrado = cierre?.cerrado ?? false
  useEffect(() => {
    if (cerrado) onCerrado()
  }, [cerrado, onCerrado])

  if (loadingCierre || cerrado) return <SkeletonResumen />

  const [yyyy, mm, dd] = fecha.split('-')

  return (
    <div className="corregir-dia">
      <div className="aviso-pendiente">
        <strong>
          Corrigiendo el día {dd}/{mm}/{yyyy}
        </strong>
        <span>
          Cargá o corregí lo que haga falta y volvé a confirmar el cierre. Hasta que lo cierres, el día queda
          abierto.
        </span>
      </div>

      <CajaInicialEditable fecha={fecha} cajaInicial={cierre?.caja_inicial ?? 0} />

      <div className="acciones-carga">
        <button
          type="button"
          className="btn-abrir-modal btn-abrir-modal--principal"
          onClick={() => setModalAbierto('venta')}
        >
          + Agregar venta
        </button>
        <button type="button" className="btn-abrir-modal" onClick={() => setModalAbierto('gasto')}>
          + Agregar gasto
        </button>
      </div>

      <VentasList ventas={ventas} loading={loadingVentas} titulo="Ventas del día" />

      <hr />

      <GastosList gastos={gastos} loading={loadingGastos} titulo="Gastos del día" />

      <hr />

      <CierreDelDia fecha={fecha} cierre={cierre} ventas={ventas} gastos={gastos} arqueoAbierto />

      {modalAbierto === 'venta' && (
        <Modal titulo="Nueva venta" onClose={() => setModalAbierto(null)}>
          <VentaForm fecha={fecha} onSuccess={() => setModalAbierto(null)} />
        </Modal>
      )}

      {modalAbierto === 'gasto' && (
        <Modal titulo="Nuevo gasto" onClose={() => setModalAbierto(null)}>
          <GastoForm fecha={fecha} onSuccess={() => setModalAbierto(null)} />
        </Modal>
      )}
    </div>
  )
}
