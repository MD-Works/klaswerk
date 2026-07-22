// ═══════════════════════════════════════════════════
// KlasWerk — Register Page
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { appConfig, brand } from '@/config'
import type { UserRole } from '@/types'

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  // Support ?next= from public landing page — store and redirect post-email-confirm
  const _nextParam = new URLSearchParams(location.search).get('next')

  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [role, setRole]         = useState<UserRole>('student')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password, fullName, role)
      // Supabase sends a confirmation email — redirect to a holding page
      navigate('/check-email', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
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
      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          {brand.logoUrl && <img src={brand.logoUrl} alt={appConfig.name} style={{ height: '48px', objectFit: 'contain', marginBottom: '1rem' }} />}
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
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--kw-muted)', fontWeight: 300 }}>
            Create your account
          </div>
        </div>

        <div className="kw-card kw-panel-accent" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit}>

            {/* Role selector */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="kw-label">I am joining as</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {(['student', 'trainer'] as UserRole[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={{
                      padding: '0.8rem',
                      background: role === r ? 'rgba(201,148,60,0.12)' : 'var(--kw-panel)',
                      border: `1px solid ${role === r ? 'var(--kw-primary)' : 'var(--kw-border)'}`,
                      borderRadius: '4px',
                      color: role === r ? 'var(--kw-primary-lt)' : 'var(--kw-muted)',
                      fontFamily: 'Cinzel, serif',
                      fontSize: '0.75rem',
                      letterSpacing: '0.1em',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s',
                    }}
                  >
                    {r === 'student' ? '◈ Student' : '◉ Trainer'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label className="kw-label">Full Name</label>
              <input className="kw-input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" required />
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label className="kw-label">Email Address</label>
              <input className="kw-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label className="kw-label">Password</label>
              <input className="kw-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="kw-label">Confirm Password</label>
              <input
                className={`kw-input${confirm && confirm !== password ? ' error' : ''}`}
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password"
                required
              />
            </div>

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

            <button type="submit" className="kw-btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <><span className="kw-spinner" style={{ width: 14, height: 14 }} /> Creating account…</> : 'Create Account'}
            </button>

          </form>

          <div className="kw-divider" style={{ margin: '1.5rem 0' }} />

          <p style={{ textAlign: 'center', fontFamily: 'Raleway, sans-serif', fontSize: '0.8rem', color: 'var(--kw-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--kw-primary)' }}>Sign in</Link>
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem', fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--kw-border-lt)', textTransform: 'uppercase' }}>
          ✦ &nbsp; Powered by KlasWerk &nbsp; ✦
        </div>
      </div>
    </div>
  )
}
