// ═══════════════════════════════════════════════════
// KlasWerk — Trainer Invite Acceptance Page
// ───────────────────────────────────────────────────
// Route: /invite?token=<uuid>
// Flow:
//   1. On mount — validate token (must be pending + not expired)
//   2. Valid   — show set-password form (email pre-filled, read-only)
//   3. Submit  — acceptInvite() → creates trainer account → /check-email
//   4. Invalid — clear error state with helpful message
// ═══════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { appConfig, brand } from '@/config'
import type { TrainerInvite } from '@/types'

type PageState = 'loading' | 'valid' | 'invalid' | 'submitting' | 'done'

export function InvitePage() {
  const [searchParams]    = useSearchParams()
  const { validateInvite, acceptInvite } = useAuth()
  const navigate          = useNavigate()

  const token = searchParams.get('token') ?? ''

  const [pageState, setPageState] = useState<PageState>('loading')
  const [invite, setInvite]       = useState<TrainerInvite | null>(null)
  const [fullName, setFullName]   = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')

  // ── Validate token on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setPageState('invalid')
      return
    }

    validateInvite(token).then(result => {
      if (result) {
        setInvite(result)
        setPageState('valid')
      } else {
        setPageState('invalid')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // ── Submit ───────────────────────────────────────────────────────────────
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
    if (!fullName.trim()) {
      setError('Please enter your full name.')
      return
    }

    setPageState('submitting')
    try {
      await acceptInvite(token, password, fullName)
      setPageState('done')
      // Short pause so user sees success, then redirect to check email
      setTimeout(() => navigate('/check-email', { replace: true }), 1800)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setPageState('valid')
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
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
          {brand.logoUrl && (
            <img src={brand.logoUrl} alt={appConfig.name}
              style={{ height: '48px', objectFit: 'contain', marginBottom: '1rem' }} />
          )}
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
            Trainer Invitation
          </div>
        </div>

        {/* ── Loading ── */}
        {pageState === 'loading' && (
          <div className="kw-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <span className="kw-spinner" style={{ margin: '0 auto 1rem', display: 'block', width: 24, height: 24 }} />
            <p style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.85rem', color: 'var(--kw-muted)' }}>
              Validating your invite…
            </p>
          </div>
        )}

        {/* ── Invalid / expired ── */}
        {pageState === 'invalid' && (
          <div className="kw-card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>◎</div>
            <h2 style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '1rem',
              color: 'var(--kw-primary-lt)',
              marginBottom: '0.75rem',
            }}>
              Invite Not Found
            </h2>
            <p style={{
              fontFamily: 'Raleway, sans-serif',
              fontSize: '0.85rem',
              color: 'var(--kw-muted)',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}>
              This invite link is invalid, has already been used, or has expired.
              Please contact your platform owner for a new invite.
            </p>
            <Link to="/login" className="kw-btn-secondary" style={{ display: 'inline-flex' }}>
              Back to Sign In
            </Link>
          </div>
        )}

        {/* ── Valid — show registration form ── */}
        {(pageState === 'valid' || pageState === 'submitting') && invite && (
          <div className="kw-card kw-panel-accent" style={{ padding: '2rem' }}>

            {/* Invite context */}
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(201,148,60,0.08)',
              border: '1px solid var(--kw-primary-dk)',
              borderRadius: '4px',
              marginBottom: '1.5rem',
            }}>
              <div style={{
                fontFamily: 'Syne Mono, monospace',
                fontSize: '0.58rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--kw-primary-dk)',
                marginBottom: '0.3rem',
              }}>
                Trainer Invite
              </div>
              <div style={{
                fontFamily: 'Raleway, sans-serif',
                fontSize: '0.85rem',
                color: 'var(--kw-cream)',
              }}>
                {invite.email}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.2rem' }}>
                <label className="kw-label">Full Name</label>
                <input
                  className="kw-input"
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                  disabled={pageState === 'submitting'}
                />
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label className="kw-label">Email Address</label>
                <input
                  className="kw-input"
                  type="email"
                  value={invite.email}
                  readOnly
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label className="kw-label">Create Password</label>
                <input
                  className="kw-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  disabled={pageState === 'submitting'}
                />
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
                  disabled={pageState === 'submitting'}
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

              <button
                type="submit"
                className="kw-btn-primary"
                disabled={pageState === 'submitting'}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {pageState === 'submitting'
                  ? <><span className="kw-spinner" style={{ width: 14, height: 14 }} /> Creating trainer account…</>
                  : 'Activate Trainer Account'
                }
              </button>
            </form>
          </div>
        )}

        {/* ── Done ── */}
        {pageState === 'done' && (
          <div className="kw-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div style={{
              fontSize: '1.5rem',
              color: 'var(--kw-success)',
              marginBottom: '1rem',
            }}>
              ◉
            </div>
            <h2 style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '1rem',
              color: 'var(--kw-primary-lt)',
              marginBottom: '0.6rem',
            }}>
              Trainer Account Created
            </h2>
            <p style={{
              fontFamily: 'Raleway, sans-serif',
              fontSize: '0.85rem',
              color: 'var(--kw-muted)',
              lineHeight: 1.6,
            }}>
              Check your email to confirm your address, then sign in.
            </p>
          </div>
        )}

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
