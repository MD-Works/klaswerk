// ═══════════════════════════════════════════════════
// KlasWerk — Check Email Page
// Shown after registration — Supabase sends a
// confirmation email before the account activates.
// ═══════════════════════════════════════════════════

import { Link } from 'react-router-dom'
import { appConfig } from '@/config'

export function CheckEmailPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--kw-primary)' }}>✉</div>
        <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.4rem', fontWeight: 600, color: 'var(--kw-primary-lt)', marginBottom: '0.75rem' }}>
          Check your email
        </h1>
        <p style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.88rem', color: 'var(--kw-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          We've sent a confirmation link to your email address. Click the link to activate your {appConfig.name} account.
        </p>
        <Link to="/login" className="kw-btn-secondary" style={{ display: 'inline-flex' }}>
          Back to Sign In
        </Link>
      </div>
    </div>
  )
}
