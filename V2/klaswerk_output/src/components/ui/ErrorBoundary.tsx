// ═══════════════════════════════════════════════════
// KlasWerk — Error Boundary
// ───────────────────────────────────────────────────
// Catches runtime errors anywhere in the React tree
// and renders a recovery UI instead of a white screen.
//
// Usage (in main.tsx):
//   <ErrorBoundary>
//     <App />
//   </ErrorBoundary>
//
// Session 9
// ═══════════════════════════════════════════════════

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError:    boolean
  error:       Error | null
  errorInfo:   ErrorInfo | null
  errorCount:  number
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null, errorCount: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[KlasWerk ErrorBoundary]', error, errorInfo)
    this.setState(prev => ({
      errorInfo,
      errorCount: prev.errorCount + 1,
    }))
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.href = '/dashboard'
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    const { error } = this.state

    return (
      <div style={{
        minHeight: '100vh',
        background: '#110e09',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: 'Raleway, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Grain */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', width: '100%', textAlign: 'center' }}>

          {/* Brand ornament */}
          <div style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '0.7rem', letterSpacing: '0.3em',
            color: '#7a5815',
            marginBottom: '2rem',
          }}>
            ✦ &nbsp; KLASWERK &nbsp; ✦
          </div>

          {/* Error icon */}
          <div style={{
            width: '72px', height: '72px',
            borderRadius: '50%',
            border: '1px solid #2c2619',
            background: '#1a1610',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
            fontSize: '1.8rem',
          }}>
            ⚠
          </div>

          {/* Heading */}
          <h1 style={{
            fontFamily: 'Cinzel, serif',
            fontWeight: 600,
            fontSize: '1.4rem',
            color: '#e8c87a',
            marginBottom: '0.75rem',
          }}>
            Something went wrong
          </h1>

          {/* Description */}
          <p style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontStyle: 'italic',
            fontSize: '1rem',
            lineHeight: 1.7,
            color: '#7a6d58',
            marginBottom: '1.5rem',
          }}>
            An unexpected error occurred. You can try again or return to the dashboard.
          </p>

          {/* Error detail (collapsed by default) */}
          {error && (
            <details style={{
              background: '#1a1610',
              border: '1px solid #2c2619',
              borderRadius: '4px',
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              textAlign: 'left',
            }}>
              <summary style={{
                fontFamily: 'Syne Mono, monospace',
                fontSize: '0.68rem',
                letterSpacing: '0.1em',
                color: '#7a5815',
                cursor: 'pointer',
                userSelect: 'none',
              }}>
                Error details
              </summary>
              <pre style={{
                fontFamily: 'Syne Mono, monospace',
                fontSize: '0.65rem',
                color: '#c94c4c',
                marginTop: '0.5rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {error.message}
              </pre>
            </details>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '0.7rem 1.4rem',
                background: 'linear-gradient(135deg, #7a5815, #c9943c)',
                color: '#0a0906',
                border: 'none',
                borderRadius: '4px',
                fontFamily: 'Cinzel, serif',
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.12em',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.7rem 1.4rem',
                background: 'transparent',
                color: '#7a6d58',
                border: '1px solid #3d3526',
                borderRadius: '4px',
                fontFamily: 'Raleway, sans-serif',
                fontSize: '0.8rem',
                letterSpacing: '0.08em',
                cursor: 'pointer',
              }}
            >
              ← Dashboard
            </button>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: '3rem',
            fontFamily: 'Syne Mono, monospace',
            fontSize: '0.55rem',
            letterSpacing: '0.2em',
            color: '#3d3526',
          }}>
            ✦ MD WORKS · KLASWERK ✦
          </div>
        </div>
      </div>
    )
  }
}
