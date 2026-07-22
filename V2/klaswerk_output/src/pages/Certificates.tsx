// ═══════════════════════════════════════════════════
// KlasWerk — Certificates Page
// ───────────────────────────────────────────────────
// Session 9: PDF upload to Supabase Storage.
//   - "↓ Download PDF" generates + downloads locally
//   - "☁ Save to Cloud" generates + uploads to Storage,
//     stores pdf_url on cert row, shows persistent link
//   - If pdf_url already exists, shows "↗ Open PDF" link
// ═══════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCertificate, type CertificateWithCourse } from '@/hooks/useCertificate'
import { useCourse } from '@/hooks/useCourse'
import { generateCertPdf } from '@/lib/generateCertPdf'
import { useToast } from '@/hooks/useToast'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function copyToClipboard(text: string, cb: () => void) {
  navigator.clipboard.writeText(text).then(cb).catch(() => {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    cb()
  })
}

// ── Certificate card ──────────────────────────────────────────────────────────

function CertCard({ cert, onPdfUploaded }: {
  cert: CertificateWithCourse
  onPdfUploaded: (certId: string, url: string) => void
}) {
  const [copied,      setCopied]      = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [pdfUrl,      setPdfUrl]      = useState<string | null>(cert.pdf_url ?? null)
  const { uploadCertificatePdf, isUploading } = useCertificate()
  const { toast } = useToast()
  const verifyUrl = `${window.location.origin}/verify/${cert.certificate_number}`
  const score = cert.certificate_data?.score

  function handleCopy() {
    copyToClipboard(verifyUrl, () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  async function handleDownloadPdf() {
    setDownloading(true)
    try {
      await generateCertPdf({
        studentName: cert.certificate_data?.student_name ?? cert.student?.full_name ?? 'Student',
        courseTitle: cert.certificate_data?.course_title ?? cert.course?.title ?? 'Course',
        certNumber:  cert.certificate_number,
        issuedAt:    cert.issued_at,
        download:    true,
      })
      toast.success('Certificate PDF downloaded ✓')
    } catch (err) {
      console.error(err)
      toast.error('PDF generation failed. Try again.')
    } finally {
      setDownloading(false)
    }
  }

  async function handleSaveToCloud() {
    const url = await uploadCertificatePdf(cert)
    if (url) {
      setPdfUrl(url)
      onPdfUploaded(cert.id, url)
      toast.success('Certificate saved to cloud ✓')
    } else {
      toast.error('Upload failed. Try again.')
    }
  }

  return (
    <div className="kw-card" style={{ padding: '0', overflow: 'hidden' }}>

      {/* Gold header strip */}
      <div style={{
        background: 'linear-gradient(135deg, var(--kw-primary-dk) 0%, var(--kw-primary) 60%, var(--kw-primary-dk) 100%)',
        padding: '1.2rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <div style={{
          width: '42px', height: '42px',
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem',
          background: 'rgba(0,0,0,0.2)',
          flexShrink: 0,
        }}>◎</div>
        <div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.2rem' }}>
            CERTIFICATE OF COMPLETION
          </div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', fontWeight: 600, color: '#0a0906', lineHeight: 1.2 }}>
            {cert.course?.title ?? 'Course'}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '1.25rem 1.5rem' }}>

        <div style={{ marginBottom: '1rem' }}>
          <div className="kw-eyebrow" style={{ marginBottom: '0.3rem', fontSize: '0.55rem' }}>Issued to</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', fontStyle: 'italic', color: 'var(--kw-cream)' }}>
            {cert.certificate_data?.student_name ?? cert.student?.full_name ?? cert.student?.email ?? '—'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
          <div>
            <div className="kw-eyebrow" style={{ marginBottom: '0.2rem', fontSize: '0.52rem' }}>Issued</div>
            <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.72rem', color: 'var(--kw-muted)' }}>
              {formatDate(cert.issued_at)}
            </div>
          </div>
          {score !== undefined && (
            <div>
              <div className="kw-eyebrow" style={{ marginBottom: '0.2rem', fontSize: '0.52rem' }}>Score</div>
              <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.72rem', color: 'var(--kw-primary)' }}>
                {score}%
              </div>
            </div>
          )}
          <div>
            <div className="kw-eyebrow" style={{ marginBottom: '0.2rem', fontSize: '0.52rem' }}>Category</div>
            <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.72rem', color: 'var(--kw-muted)' }}>
              {cert.course?.category ?? 'General'}
            </div>
          </div>
        </div>

        {/* Cert number */}
        <div style={{
          background: 'var(--kw-panel)',
          border: '1px solid var(--kw-border)',
          borderRadius: '4px',
          padding: '0.6rem 0.8rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}>
          <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.7rem', color: 'var(--kw-muted)', letterSpacing: '0.05em' }}>
            {cert.certificate_number}
          </span>
          <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', color: cert.is_verified ? 'var(--kw-success)' : 'var(--kw-muted)' }}>
            {cert.is_verified ? '✓ verified' : 'unverified'}
          </span>
        </div>

        {/* Cloud PDF link — if already uploaded */}
        {pdfUrl && (
          <div style={{
            background: 'rgba(76,175,122,0.08)',
            border: '1px solid rgba(76,175,122,0.2)',
            borderRadius: '4px',
            padding: '0.5rem 0.8rem',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', color: 'var(--kw-success)' }}>
              ☁ PDF saved to cloud
            </span>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', color: 'var(--kw-primary)', textDecoration: 'none' }}>
              ↗ Open PDF
            </a>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="kw-btn-primary"
            style={{ fontSize: '0.72rem', padding: '0.5rem 0.9rem', flex: '1 1 auto' }}
          >
            {downloading ? 'Generating…' : '↓ Download PDF'}
          </button>

          {!pdfUrl && (
            <button
              onClick={handleSaveToCloud}
              disabled={isUploading}
              className="kw-btn-secondary"
              style={{ fontSize: '0.72rem', padding: '0.5rem 0.9rem', flex: '1 1 auto' }}
            >
              {isUploading ? 'Uploading…' : '☁ Save to Cloud'}
            </button>
          )}

          <button
            onClick={handleCopy}
            className="kw-btn-secondary"
            style={{ fontSize: '0.72rem', padding: '0.5rem 0.9rem', flex: '1 1 auto' }}
          >
            {copied ? '✓ Copied' : 'Copy Link'}
          </button>
          <Link
            to={`/verify/${cert.certificate_number}`}
            className="kw-btn-secondary"
            style={{ fontSize: '0.72rem', padding: '0.5rem 0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
          >
            View
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Earn cert prompt ──────────────────────────────────────────────────────────

function EarnCertRow({ courseTitle, enrollmentId, onClaimed }: {
  courseTitle: string
  enrollmentId: string
  onClaimed: () => void
}) {
  const { generateCertificate, isLoading } = useCertificate()
  const [claimed, setClaimed] = useState(false)

  async function handleClaim() {
    const cert = await generateCertificate(enrollmentId)
    if (cert) { setClaimed(true); onClaimed() }
  }

  if (claimed) return null

  return (
    <div className="kw-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
      <div>
        <div style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.85rem', color: 'var(--kw-cream)', marginBottom: '0.2rem' }}>{courseTitle}</div>
        <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', color: 'var(--kw-success)', letterSpacing: '0.1em' }}>✓ COMPLETED — Certificate ready</div>
      </div>
      <button className="kw-btn-primary" onClick={handleClaim} disabled={isLoading} style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
        {isLoading ? 'Issuing…' : 'Claim Certificate'}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════
export function CertificatesPage() {
  const { isTrainer } = useAuth()
  const { fetchMyCertificates, fetchTrainerCertificates, isLoading } = useCertificate()
  const { fetchStudentCourses } = useCourse()

  const [certs,     setCerts]     = useState<CertificateWithCourse[]>([])
  const [claimable, setClaimable] = useState<{ courseId: string; courseTitle: string; enrollmentId: string }[]>([])

  useEffect(() => { loadData() }, [isTrainer])

  async function loadData() {
    if (isTrainer) {
      setCerts(await fetchTrainerCertificates())
    } else {
      const [myCerts, courses] = await Promise.all([
        fetchMyCertificates(),
        fetchStudentCourses(),
      ])
      setCerts(myCerts)
      const certCourseIds = new Set(myCerts.map(c => c.course_id))
      setClaimable(
        courses
          .filter(c => c.enrollment && (c.enrollment.status === 'completed' || c.enrollment.progress >= 100))
          .filter(c => !certCourseIds.has(c.id))
          .map(c => ({ courseId: c.id, courseTitle: c.title, enrollmentId: c.enrollment!.id }))
      )
    }
  }

  function handlePdfUploaded(certId: string, url: string) {
    setCerts(prev => prev.map(c => c.id === certId ? { ...c, pdf_url: url } : c))
  }

  return (
    <div className="kw-animate-fade-in">

      <div style={{ marginBottom: '2rem' }}>
        <div className="kw-eyebrow" style={{ marginBottom: '0.5rem' }}>KlasWerk · Credentials</div>
        <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.6rem', fontWeight: 600, color: 'var(--kw-primary-lt)', marginBottom: '0.5rem' }}>
          Certificates
        </h1>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)', fontSize: '1rem' }}>
          {isTrainer
            ? 'Credentials issued to students across your courses.'
            : 'Your earned credentials — verifiable by anyone, downloadable as PDF or saved to cloud.'}
        </p>
      </div>

      <div className="kw-divider" style={{ marginBottom: '2rem' }} />

      {!isTrainer && claimable.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 className="kw-heading" style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Ready to Claim</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {claimable.map(item => (
              <EarnCertRow key={item.enrollmentId} {...item} onClaimed={loadData} />
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--kw-muted)', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>
          Loading certificates…
        </div>
      )}

      {!isLoading && certs.length === 0 && claimable.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.3 }}>◎</div>
          <div className="kw-heading" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            {isTrainer ? 'No certificates issued yet' : 'No certificates yet'}
          </div>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)', fontSize: '0.95rem' }}>
            {isTrainer ? 'Certificates appear here as students complete your courses.' : 'Complete a course to earn your first credential.'}
          </p>
          {!isTrainer && (
            <Link to="/courses" className="kw-btn-primary" style={{ display: 'inline-flex', marginTop: '1.5rem', textDecoration: 'none' }}>
              Browse Courses
            </Link>
          )}
        </div>
      )}

      {!isLoading && certs.length > 0 && (
        <>
          {isTrainer && (
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 className="kw-heading" style={{ fontSize: '0.9rem' }}>
                {certs.length} Certificate{certs.length !== 1 ? 's' : ''} Issued
              </h2>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {certs.map(cert => (
              <CertCard key={cert.id} cert={cert} onPdfUploaded={handlePdfUploaded} />
            ))}
          </div>
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--kw-border)' }}>
        <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--kw-primary-dk)' }}>
          ✦ MD WORKS · KLASWERK ✦
        </span>
      </div>
    </div>
  )
}
