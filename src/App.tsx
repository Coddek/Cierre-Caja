import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { Login } from './components/Login'
import { DefinirPassword } from './components/DefinirPassword'
import { detectarTipoAuthUrl } from './lib/authUrl'
import { VentaForm } from './components/VentaForm'
import { VentasList } from './components/VentasList'
import { GastoForm } from './components/GastoForm'
import { GastosList } from './components/GastosList'
import { ResumenDelDia } from './components/ResumenDelDia'
import { CierreDelDia } from './components/CierreDelDia'
import { AbrirDia } from './components/AbrirDia'
import { Historial } from './components/Historial'
import { DiaPendiente } from './components/DiaPendiente'
import { Numeros } from './components/Numeros'
import { Modal } from './components/Modal'
import { SkeletonResumen } from './components/SkeletonLista'
import { useVentasHoy } from './hooks/useVentasHoy'
import { useGastosHoy } from './hooks/useGastosHoy'
import { useCierreHoy } from './hooks/useCierreHoy'
import { useDiaPendiente } from './hooks/useDiaPendiente'
import { useCambioDeDia } from './hooks/useCambioDeDia'
import { getFechaHoy } from './lib/fecha'
import { supabase } from './lib/supabase'
import './App.css'

const fechaHoy = getFechaHoy()

function App() {
  const { session, nombre, loading } = useAuth()
  const [tipoAuthUrl, setTipoAuthUrl] = useState(detectarTipoAuthUrl)
  const [vista, setVista] = useState<'hoy' | 'historial' | 'numeros'>('hoy')
  const [diaNumeros, setDiaNumeros] = useState(fechaHoy)
  const [modalAbierto, setModalAbierto] = useState<'venta' | 'gasto' | null>(null)
  const { ventas, loading: loadingVentas } = useVentasHoy(fechaHoy, !!session)
  const { gastos, loading: loadingGastos } = useGastosHoy(fechaHoy, !!session)
  const { cierre, loading: loadingCierre } = useCierreHoy(fechaHoy, !!session)
  const { pendiente, loading: loadingPendiente } = useDiaPendiente(fechaHoy, !!session)
  const cambioDeDia = useCambioDeDia(fechaHoy)

  if (loading) {
    return <div className="loading-screen">Cargando...</div>
  }

  if (tipoAuthUrl && session) {
    return <DefinirPassword onListo={() => setTipoAuthUrl(null)} />
  }

  if (!session) {
    return <Login />
  }

  // En el celular, al enfocar un campo del modal se abre el teclado y el
  // navegador scrollea la página de atrás para hacerle lugar; al cerrar el
  // modal queda ahí abajo. Volvemos arriba para tener a mano "Agregar venta".
  function cerrarCargaYVolverArriba() {
    setModalAbierto(null)
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    window.scrollTo({ top: 0 })
  }

  const diaCerrado = cierre?.cerrado ?? false
  const diaSinAbrir = !diaCerrado && (cierre?.caja_inicial ?? null) == null

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <span className="app-brand-nombre">Martin</span>
          <span className="app-brand-sub">Cierre de caja</span>
        </div>
        <div className="app-header-sesion">
          <span>{nombre ?? session.user.email}</span>
          <button type="button" onClick={() => supabase.auth.signOut()}>
            Salir
          </button>
        </div>
      </header>

      <nav className="app-nav">
        <button
          type="button"
          className={vista === 'hoy' ? 'active' : ''}
          onClick={() => setVista('hoy')}
        >
          Hoy
        </button>
        <button
          type="button"
          className={vista === 'historial' ? 'active' : ''}
          onClick={() => setVista('historial')}
        >
          Historial
        </button>
        <button
          type="button"
          className={vista === 'numeros' ? 'active' : ''}
          onClick={() => setVista('numeros')}
        >
          Números
        </button>
      </nav>

      <main>
        {cambioDeDia && (
          <div className="aviso-pendiente">
            <strong>Ya es otro día.</strong>
            <span>Si terminaste con el día anterior, pasá al día nuevo.</span>
            <button type="button" onClick={() => window.location.reload()}>
              Pasar al día nuevo
            </button>
          </div>
        )}

        {vista === 'historial' ? (
          <Historial
            onVerDia={(fecha) => {
              setDiaNumeros(fecha)
              setVista('numeros')
            }}
          />
        ) : vista === 'numeros' ? (
          <Numeros hoy={fechaHoy} fecha={diaNumeros} onCambiarFecha={setDiaNumeros} />
        ) : loadingCierre || loadingPendiente ? (
          <SkeletonResumen />
        ) : pendiente ? (
          <DiaPendiente key={pendiente} fecha={pendiente} />
        ) : diaCerrado ? (
          <CierreDelDia fecha={fechaHoy} cierre={cierre} ventas={ventas} gastos={gastos} />
        ) : diaSinAbrir ? (
          <AbrirDia fecha={fechaHoy} />
        ) : (
          <>
            <ResumenDelDia fecha={fechaHoy} ventas={ventas} gastos={gastos} cajaInicial={cierre?.caja_inicial ?? null} />

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

            <VentasList ventas={ventas} loading={loadingVentas} />

            <hr />

            <GastosList gastos={gastos} loading={loadingGastos} />

            <hr />

            <CierreDelDia fecha={fechaHoy} cierre={cierre} ventas={ventas} gastos={gastos} />
          </>
        )}
      </main>

      {modalAbierto === 'venta' && (
        <Modal titulo="Nueva venta" onClose={() => setModalAbierto(null)}>
          <VentaForm fecha={fechaHoy} onSuccess={cerrarCargaYVolverArriba} />
        </Modal>
      )}

      {modalAbierto === 'gasto' && (
        <Modal titulo="Nuevo gasto" onClose={() => setModalAbierto(null)}>
          <GastoForm fecha={fechaHoy} onSuccess={cerrarCargaYVolverArriba} />
        </Modal>
      )}
    </div>
  )
}

export default App
