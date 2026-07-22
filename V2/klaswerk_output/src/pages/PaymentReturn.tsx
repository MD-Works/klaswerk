// ═══════════════════════════════════════════════════
// KlasWerk — Payment Return Page
// ───────────────────────────────────────────────────
// Route: /payment/return?payment_id=xxx
// Called by PayFast after payment attempt.
// Polls DB for updated status (set by webhook worker).
// Session 7
// ═══════════════════════════════════════════════════

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { usePayment } from '@/hooks/usePayment'

type State = 'checking' | 'complete' | 'pending' | 'failed' | 'not_found'

export function PaymentReturnPage() {
  const [searchParams]    = useSearchParams()
  const { verifyPayment } = usePayment()
  const paymentId              = searchParams.get('payment_id') ?? ''

  const [state,    setState]    = useState<State>('checking')
  const [courseId, setCourseId] = useState<string | null>(null)
  const pollRef                 = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCount               = useRef(0)

  useEffect(() => {
    if (!paymentId) { setState('not_found'); return }
    checkStatus()
    // Poll up to 12×5s = 60s waiting for PayFast ITN webhook to fire
    pollRef.current = setInterval(() => {
      pollCount.current++
      if (pollCount.current >= 12) {
        clearInterval(pollRef.current!)
        setState(prev => prev === 'checking' ? 'pending' : prev)
        return
      }
      checkStatus()
    }, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [paymentId])

  async function checkStatus() {
    const result = await verifyPayment(paymentId)
    setCourseId(result.courseId ?? null)
    if (result.status === 'complete') {
      clearInterval(pollRef.current!)
      setState('complete')
    } else if (result.status === 'failed') {
      clearInterval(pollRef.current!)
      setState('failed')
    } else if (result.status === 'not_found') {
      clearInterval(pollRef.current!)
      setState('not_found')
    }
    // 'pending' → keep polling
  }

  // ── Render ────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--kw-dark)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      {/* Brand */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.4rem', fontWeight: 900, background: 'linear-gradient(135deg, var(--kw-primary-lt), var(--kw-primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.25rem' }}>
          KlasWerk
        </div>
        <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.25em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase' }}>
          Payment Processing
        </div>
      </div>

      {/* Card */}
      <div className="kw-card" style={{ padding: '2.5rem', maxWidth: '480px', width: '100%', textAlign: 'center' }}>

        {state === 'checking' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', animation: 'spin 2s linear infinite', display: 'inline-block' }}>◉</div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <h2 className="kw-heading" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Confirming your payment…</h2>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)' }}>
              Waiting for PayFast confirmation. This can take up to 60 seconds.
            </p>
          </>
        )}

        {state === 'complete' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--kw-success)' }}>✓</div>
            <h2 className="kw-heading" style={{ fontSize: '1.2rem', marginBottom: '0.75rem', color: 'var(--kw-success)' }}>Payment Successful</h2>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)', marginBottom: '1.75rem' }}>
              You're now enrolled. Let's get learning.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {courseId && (
                <Link to={`/courses/${courseId}`} className="kw-btn-primary" style={{ textDecoration: 'none' }}>
                  Go to Course
                </Link>
              )}
              <Link to="/dashboard" className="kw-btn-secondary" style={{ textDecoration: 'none' }}>
                Dashboard
              </Link>
            </div>
          </>
        )}

        {state === 'pending' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--kw-primary)' }}>◷</div>
            <h2 className="kw-heading" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Payment Pending</h2>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)', marginBottom: '1.5rem' }}>
              PayFast hasn't confirmed yet. This sometimes takes a few minutes.
              Your enrollment will activate automatically once confirmed.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button className="kw-btn-secondary" onClick={() => { pollCount.current = 0; setState('checking'); checkStatus() }}>
                Check Again
              </button>
              <Link to="/dashboard" className="kw-btn-secondary" style={{ textDecoration: 'none' }}>
                Dashboard
              </Link>
            </div>
          </>
        )}

        {state === 'failed' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--kw-danger)' }}>✕</div>
            <h2 className="kw-heading" style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--kw-danger)' }}>Payment Failed</h2>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)', marginBottom: '1.5rem' }}>
              Your payment was not processed. You have not been charged.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              {courseId && (
                <Link to={`/courses/${courseId}`} className="kw-btn-primary" style={{ textDecoration: 'none' }}>
                  Try Again
                </Link>
              )}
              <Link to="/courses" className="kw-btn-secondary" style={{ textDecoration: 'none' }}>
                Browse Courses
              </Link>
            </div>
          </>
        )}

        {state === 'not_found' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4 }}>?</div>
            <h2 className="kw-heading" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Payment Not Found</h2>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)', marginBottom: '1.5rem' }}>
              We couldn't locate this payment record.
            </p>
            <Link to="/dashboard" className="kw-btn-secondary" style={{ textDecoration: 'none' }}>
              Return to Dashboard
            </Link>
          </>
        )}
      </div>

      <div style={{ marginTop: '2rem', fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--kw-primary-dk)' }}>
        ✦ MD WORKS · KLASWERK ✦
      </div>
    </div>
  )
}
