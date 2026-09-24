import { useVentasHoy } from '../hooks/useVentasHoy'
import { useGastosHoy } from '../hooks/useGastosHoy'
import { useCierreHoy } from '../hooks/useCierreHoy'
import { CierreDelDia } from './CierreDelDia'
import { VentasList } from './VentasList'
import { GastosList } from './GastosList'
import { SkeletonResumen } from './SkeletonLista'

// Un día anterior que quedó abierto. Se muestra en lugar del día de hoy hasta
// que se cierre con su arqueo, para que la caja inicial de hoy salga de lo
// que realmente quedó en la caja ese día.
export function DiaPendiente({ fecha }: { fecha: string }) {
  const { ventas, loading: loadingVentas } = useVentasHoy(fecha, true)
  const { gastos, loading: loadingGastos } = useGastosHoy(fecha, true)
  const { cierre, loading: loadingCierre } = useCierreHoy(fecha, true)

  const [yyyy, mm, dd] = fecha.split('-')

  if (loadingCierre) return <SkeletonResumen />

  return (
    <>
      <div className="aviso-pendiente">
        <strong>
          El día {dd}/{mm}/{yyyy} quedó sin cerrar.
        </strong>
        <span>
          Cerralo con lo que había en la caja esa noche antes de arrancar hoy. Si algo se cargó mal,
          corregilo abajo.
        </span>
      </div>

      <CierreDelDia fecha={fecha} cierre={cierre} ventas={ventas} gastos={gastos} arqueoAbierto />

      <hr />

      <VentasList ventas={ventas} loading={loadingVentas} titulo="Ventas del día" />

      <hr />

      <GastosList gastos={gastos} loading={loadingGastos} titulo="Gastos del día" />
    </>
  )
}
