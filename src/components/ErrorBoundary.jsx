import React from 'react'

/**
 * Ловит ошибки в дочерних компонентах, чтобы приложение не «висло» с белым экраном на слабых устройствах или при сбоях.
 */
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('ErrorBoundary:', error, errorInfo?.componentStack)
    }
  }

  render() {
    if (this.state.hasError) {
      const fallback = this.props.fallback
      if (typeof fallback === 'function') return fallback(this.state.error)
      if (fallback) return fallback
      return (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            color: 'rgba(255,255,255,0.9)',
            minHeight: '40vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16
          }}
        >
          <p style={{ fontSize: 18 }}>Что-то пошло не так.</p>
          <p style={{ fontSize: 14, opacity: 0.8 }}>Обновите страницу или зайдите позже.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              fontSize: 16,
              cursor: 'pointer',
              background: 'rgba(255, 215, 0, 0.2)',
              border: '1px solid rgba(255, 215, 0, 0.5)',
              borderRadius: 8,
              color: '#FFD700'
            }}
          >
            Обновить страницу
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
