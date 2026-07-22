// ═══════════════════════════════════════════════════
// KlasWerk — Login Page
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { appConfig, brand } from '@/config'

export function LoginPage() {
  const { signIn, isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  // If already logged in, redirect to dashboard
  if (isLoggedIn) {
    navigate('/dashboard', { replace: true })
    return null
  }

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          {brand.logoUrl
            ? <img src={brand.logoUrl} alt={appConfig.name} style={{ height: '48px', objectFit: 'contain', marginBottom: '1rem' }} />
            : null
          }
          <div style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '1.8rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, var(--kw-primary-lt), var(--kw-primary), var(--kw-primary-dk))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.4rem',
          }}>
            {appConfig.name}
          </div>
          <div style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontStyle: 'italic',
            fontSize: '0.95rem',
            color: 'var(--kw-muted)',
            fontWeight: 300,
          }}>
            Sign in to continue
          </div>
        </div>

        {/* Card */}
        <div className="kw-card kw-panel-accent" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit}>

            <div style={{ marginBottom: '1.2rem' }}>
              <label className="kw-label">Email Address</label>
              <input
                className={`kw-input${error ? ' error' : ''}`}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="kw-label">Password</label>
              <input
                className={`kw-input${error ? ' error' : ''}`}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '0.7rem 0.9rem',
                background: 'rgba(201,76,76,0.1)',
                border: '1px solid var(--kw-danger)',
                borderRadius: '4px',
                color: 'var(--kw-danger)',
                fontSize: '0.8rem',
                fontFamily: 'Raleway, sans-serif',
                marginBottom: '1.2rem',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="kw-btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? <><span className="kw-spinner" style={{ width: 14, height: 14 }} /> Signing in…</> : 'Sign In'}
            </button>

          </form>

          <div className="kw-divider" style={{ margin: '1.5rem 0' }} />

          <p style={{
            textAlign: 'center',
            fontFamily: 'Raleway, sans-serif',
            fontSize: '0.8rem',
            color: 'var(--kw-muted)',
          }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--kw-primary)' }}>
              Register here
            </Link>
          </p>
        </div>

        {/* Footer mark */}
        <div style={{
          textAlign: 'center',
          marginTop: '2rem',
          fontFamily: 'Syne Mono, monospace',
          fontSize: '0.55rem',
          letterSpacing: '0.2em',
          color: 'var(--kw-border-lt)',
          textTransform: 'uppercase',
        }}>
          ✦ &nbsp; Powered by KlasWerk &nbsp; ✦
        </div>

      </div>
    </div>
  )
}
