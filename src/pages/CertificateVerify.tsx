// ═══════════════════════════════════════════════════
// KlasWerk — Certificate Verify Page
// ───────────────────────────────────────────────────
// Route: /verify/:certificateNumber — PUBLIC (no auth)
// Used by employers/third parties to verify credentials.
// No AppShell — standalone branded page.
// Session 7
// ═══════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCertificate, type CertificateWithCourse } from '@/hooks/useCertificate'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function CertificateVerifyPage() {
  const { certificateNumber } = useParams<{ certificateNumber: string }>()
  const { verifyCertificate, isLoading } = useCertificate()
  const [cert,    setCert]    = useState<CertificateWithCourse | null | 'not_found'>(null)

  useEffect(() => {
    if (certificateNumber) {
      verifyCertificate(certificateNumber).then(result => {
        setCert(result ?? 'not_found')
      })
    }
  }, [certificateNumber])

  // ── Loading ───────────────────────────────────────
  if (isLoading || cert === null) {
    return (
      <VerifyShell>
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--kw-muted)', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: '1.1rem' }}>
          Verifying certificate…
        </div>
      </VerifyShell>
    )
  }

  // ── Not found ─────────────────────────────────────
  if (cert === 'not_found') {
    return (
      <VerifyShell>
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.5rem', color: 'var(--kw-danger)', opacity: 0.7 }}>✕</div>
          <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.3rem', color: 'var(--kw-danger)', marginBottom: '0.75rem' }}>
            Certificate Not Found
          </h2>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)', fontSize: '1rem', marginBottom: '1.5rem' }}>
            No valid certificate found for <span style={{ fontFamily: 'Syne Mono, monospace', color: 'var(--kw-cream)', fontSize: '0.82rem' }}>{certificateNumber}</span>.
            <br />This certificate may not exist or has been revoked.
          </p>
          <Link to="/login" style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.72rem', letterSpacing: '0.1em', color: 'var(--kw-muted)' }}>
            ← KlasWerk Login
          </Link>
        </div>
      </VerifyShell>
    )
  }

  // ── Valid ─────────────────────────────────────────
  const data = cert.certificate_data
  const studentName = data?.student_name ?? cert.student?.full_name ?? cert.student?.email ?? 'Student'

  return (
    <VerifyShell>
      {/* Valid badge */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        marginBottom: '2rem',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(76,175,122,0.1)',
          border: '1px solid var(--kw-success)',
          borderRadius: '50px',
          padding: '0.4rem 1rem',
        }}>
          <span style={{ color: 'var(--kw-success)', fontSize: '0.8rem' }}>✓</span>
          <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--kw-success)', textTransform: 'uppercase' }}>
            Verified Certificate
          </span>
        </div>
      </div>

      {/* Certificate card */}
      <div style={{
        background: 'var(--kw-surface)',
        border: '1px solid var(--kw-primary-dk)',
        borderRadius: '8px',
        overflow: 'hidden',
        maxWidth: '600px',
        margin: '0 auto',
        position: 'relative',
      }}>
        {/* Gold top bar */}
        <div style={{
          height: '4px',
          background: 'linear-gradient(90deg, var(--kw-primary-dk), var(--kw-primary), var(--kw-primary-dk))',
        }} />

        {/* Header */}
        <div style={{
          padding: '2rem 2.5rem 1.5rem',
          textAlign: 'center',
          borderBottom: '1px solid var(--kw-border)',
        }}>
          <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.3em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Certificate of Completion
          </div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', letterSpacing: '0.2em', color: 'var(--kw-muted)', marginBottom: '0.5rem' }}>
            This certifies that
          </div>
          <div style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '2rem',
            fontStyle: 'italic',
            color: 'var(--kw-primary-lt)',
            margin: '0.5rem 0',
          }}>
            {studentName}
          </div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', letterSpacing: '0.2em', color: 'var(--kw-muted)', marginBottom: '0.5rem' }}>
            has successfully completed
          </div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.2rem', fontWeight: 600, color: 'var(--kw-cream)', lineHeight: 1.3 }}>
            {cert.course?.title ?? data?.course_title ?? 'Course'}
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: '1.5rem 2.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          <Detail label="Issue Date" value={formatDate(cert.issued_at)} />
          <Detail label="Category" value={cert.course?.category ?? 'General'} />
          {data?.score !== undefined && (
            <Detail label="Score Achieved" value={`${data.score}%`} highlight />
          )}
        </div>

        {/* Cert number */}
        <div style={{
          margin: '0 2.5rem 2rem',
          background: 'var(--kw-panel)',
          border: '1px solid var(--kw-border)',
          borderRadius: '4px',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Certificate Number</div>
            <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.78rem', color: 'var(--kw-cream)', letterSpacing: '0.05em' }}>{cert.certificate_number}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Issued by</div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', color: 'var(--kw-primary-lt)', letterSpacing: '0.1em' }}>KlasWerk</div>
          </div>
        </div>
      </div>

      {/* Back link */}
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link to="/login" style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--kw-muted)', textDecoration: 'none' }}>
          ← KlasWerk Platform
        </Link>
      </div>
    </VerifyShell>
  )
}

// ── Detail cell ───────────────────────────────────────────────────────────────

function Detail({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{label}</div>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: highlight ? '1.1rem' : '0.85rem', color: highlight ? 'var(--kw-primary)' : 'var(--kw-cream)' }}>{value}</div>
    </div>
  )
}

// ── Shell layout (no AppShell — public) ──────────────────────────────────────

function VerifyShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--kw-dark)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '1.4rem',
          fontWeight: 900,
          background: 'linear-gradient(135deg, var(--kw-primary-lt), var(--kw-primary))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '0.25rem',
        }}>
          KlasWerk
        </div>
        <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.25em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase' }}>
          Certificate Verification
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '680px' }}>
        {children}
      </div>

      {/* Footer */}
      <div style={{ marginTop: '3rem', fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--kw-primary-dk)', textAlign: 'center' }}>
        ✦ MD WORKS · MORNEY DEETLEFS · SOUTH AFRICA ✦
      </div>
    </div>
  )
}
