import { Component, type ReactNode } from 'react'

// Si algo de la pantalla falla al dibujarse, React deja la página en blanco.
// Esto muestra un aviso con un botón para recargar en lugar de eso.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="pantalla-error">
        <img src="/icon-512.png" alt="Martin" className="login-logo" />
        <p>Algo falló al mostrar la pantalla.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Recargar
        </button>
        <small>{this.state.error.message}</small>
      </div>
    )
  }
}
