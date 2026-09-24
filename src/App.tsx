import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { Login } from './components/Login'
import { VentaForm } from './components/VentaForm'
import { VentasList } from './components/VentasList'
import { GastoForm } from './components/GastoForm'
import { GastosList } from './components/GastosList'
import { ResumenDelDia } from './components/ResumenDelDia'
import { CierreDelDia } from './components/CierreDelDia'
import { Historial } from './components/Historial'
import { Modal } from './components/Modal'
import { SkeletonResumen } from './components/SkeletonLista'
import { useVentasHoy } from './hooks/useVentasHoy'
import { useGastosHoy } from './hooks/useGastosHoy'
import { useCierreHoy } from './hooks/useCierreHoy'
import { getFechaHoy } from './lib/fecha'
import { supabase } from './lib/supabase'
import './App.css'

const fechaHoy = getFechaHoy()

function App() {
  const { session, nombre, loading } = useAuth()
  const [vista, setVista] = useState<'hoy' | 'historial'>('hoy')
  const [modalAbierto, setModalAbierto] = useState<'venta' | 'gasto' | null>(null)
  const { ventas, loading: loadingVentas } = useVentasHoy(fechaHoy, !!session)
  const { gastos, loading: loadingGastos } = useGastosHoy(fechaHoy, !!session)
  const { cierre, loading: loadingCierre } = useCierreHoy(fechaHoy, !!session)

  if (loading) {
    return <div className="loading-screen">Cargando...</div>
  }

  if (!session) {
    return <Login />
  }

  const diaCerrado = cierre?.cerrado ?? false

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
      </nav>

      <main>
        {vista === 'historial' ? (
          <Historial />
        ) : loadingCierre ? (
          <SkeletonResumen />
        ) : diaCerrado ? (
          <CierreDelDia fecha={fechaHoy} cierre={cierre} />
        ) : (
          <>
            <ResumenDelDia ventas={ventas} gastos={gastos} />

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

            <CierreDelDia fecha={fechaHoy} cierre={cierre} />
          </>
        )}
      </main>

      {modalAbierto === 'venta' && (
        <Modal titulo="Nueva venta" onClose={() => setModalAbierto(null)}>
          <VentaForm fecha={fechaHoy} onSuccess={() => setModalAbierto(null)} />
        </Modal>
      )}

      {modalAbierto === 'gasto' && (
        <Modal titulo="Nuevo gasto" onClose={() => setModalAbierto(null)}>
          <GastoForm fecha={fechaHoy} onSuccess={() => setModalAbierto(null)} />
        </Modal>
      )}
    </div>
  )
}

export default App
