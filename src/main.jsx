import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Critical System Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#7f1d1d', fontFamily: 'system-ui, sans-serif', backgroundColor: '#fef2f2', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: '900' }}>¡Error Crítico del Sistema! 😵</h1>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', maxWidth: '800px', width: '100%', overflow: 'auto', border: '1px solid #fecaca' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#dc2626' }}>{this.state.error?.toString()}</h2>
            <p style={{ fontSize: '0.875rem', color: '#ef4444' }}>El error ocurrió al nivel más alto de la aplicación.</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '2rem', padding: '0.75rem 2rem', backgroundColor: '#dc2626', color: 'white', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.4)' }}
          >
            Recargar Página
          </button>
        </div>
      )
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>,
)