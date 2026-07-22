// ═══════════════════════════════════════════════════
// KlasWerk — Payment Cancel Page
// ───────────────────────────────────────────────────
// Route: /payment/cancel
// User chose to cancel at PayFast. No charge made.
// Session 7
// ═══════════════════════════════════════════════════

import { useSearchParams, Link } from 'react-router-dom'
import { db } from '@/lib/supabase'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

export function PaymentCancelPage() {
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
  const paymentId = searchParams.get('payment_id')

  // Mark payment as cancelled in DB
  useEffect(() => {
    if (paymentId && user) {
      db.from('payments')
        .update({ status: 'cancelled' })
        .eq('id', paymentId)
        .eq('student_id', user.id)
        .then(() => {})
    }
  }, [paymentId, user])

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
          Payment Cancelled
        </div>
      </div>

      <div className="kw-card" style={{ padding: '2.5rem', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--kw-muted)', opacity: 0.6 }}>○</div>
        <h2 className="kw-heading" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Payment Cancelled</h2>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)', fontSize: '1rem', marginBottom: '2rem' }}>
          No charge was made. You can try again whenever you're ready.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/courses" className="kw-btn-primary" style={{ textDecoration: 'none' }}>
            Browse Courses
          </Link>
          <Link to="/dashboard" className="kw-btn-secondary" style={{ textDecoration: 'none' }}>
            Dashboard
          </Link>
        </div>
      </div>

      <div style={{ marginTop: '2rem', fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--kw-primary-dk)' }}>
        ✦ MD WORKS · KLASWERK ✦
      </div>
    </div>
  )
}
