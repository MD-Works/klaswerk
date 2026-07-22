// ═══════════════════════════════════════════════════
// KlasWerk — Public Course Landing Page
// ───────────────────────────────────────────────────
// Route: /course/:courseId   (PUBLIC — no auth needed)
// Session 10: paid enrolment routed through PayFast.
//   - Free  courses → enrollStudent() directly
//   - Paid courses  → initiatePayment() → PayFast
//   - Unauthed      → /login?next=/course/:id
// ═══════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { db } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCourse } from '@/hooks/useCourse'
import { usePayment } from '@/hooks/usePayment'
import { useToast } from '@/hooks/useToast'
import type { Course } from '@/types'

// ── Public course shape (from public_courses view) ───────────────────────────

interface PublicCourse {
  id:               string
  trainer_id:       string | null   // added in migration 004
  title:            string
  description:      string | null
  category:         string | null
  level:            string | null
  price:            number | null
  currency:         string | null
  cover_image_url:  string | null
  created_at:       string
  trainer_name:     string | null
  trainer_avatar:   string | null
  trainer_bio:      string | null
  enrollment_count: number
  lesson_count:     number
}

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
}
const LEVEL_COLOUR: Record<string, string> = {
  beginner: 'var(--kw-success)',
  intermediate: 'var(--kw-primary)',
  advanced: 'var(--kw-danger)',
}

function formatPrice(price: number | null): string {
  if (!price || price === 0) return 'Free'
  return `R ${price.toFixed(2)}`
}

// ── Small stat pill ───────────────────────────────────────────────────────────

function StatPill({ label, value, colour }: { label: string; value: string; colour?: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.25em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '1.1rem', color: colour ?? 'var(--kw-cream)' }}>
        {value}
      </div>
    </div>
  )
}

// ── Gold divider ──────────────────────────────────────────────────────────────

function GoldDivider() {
  return (
    <div style={{ width: '100%', height: '1px', margin: '2.5rem 0', background: 'linear-gradient(90deg, transparent 0%, var(--kw-border-lt) 20%, var(--kw-primary-dk) 50%, var(--kw-border-lt) 80%, transparent 100%)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ position: 'absolute', fontFamily: 'Syne Mono, monospace', fontSize: '0.7rem', color: 'var(--kw-primary-dk)', background: 'var(--kw-dark)', padding: '0 1rem' }}>✦</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════
export function CourseLandingPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate     = useNavigate()
  const { user, isTrainer } = useAuth()
  const { enrollStudent } = useCourse()
  const { initiatePayment, isLoading: payLoading } = usePayment()
  const { toast } = useToast()

  const [course,    setCourse]    = useState<PublicCourse | null>(null)
  const [enrolled,  setEnrolled]  = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [notFound,  setNotFound]  = useState(false)

  useEffect(() => { if (courseId) load(courseId) }, [courseId, user])

  async function load(id: string) {
    setLoading(true)
    const { data, error } = await db
      .from('public_courses')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error || !data) { setNotFound(true); setLoading(false); return }
    setCourse(data as PublicCourse)

    if (user) {
      const { data: enr } = await db
        .from('enrollments')
        .select('id')
        .eq('course_id', id)
        .eq('student_id', user.id)
        .maybeSingle()
      setEnrolled(!!enr)
    }
    setLoading(false)
  }

  async function handleEnrol() {
    if (!user) {
      navigate(`/login?next=/course/${courseId}`)
      return
    }
    if (isTrainer) {
      toast.error('Trainers cannot enrol as students.')
      return
    }

    const isFree = !course?.price || course.price === 0

    setEnrolling(true)
    try {
      if (isFree) {
        // Free course — direct enrolment
        const ok = await enrollStudent(courseId!)
        if (ok) {
          setEnrolled(true)
          toast.success('Enrolled! 🎓')
          setTimeout(() => navigate(`/courses/${courseId}`), 1200)
        } else {
          toast.error('Could not enrol. You may already be enrolled.')
        }
      } else {
        // Paid course — build a minimal Course object and pass to PayFast
        // initiatePayment() creates the payment row and submits the form to PayFast
        const courseObj = {
          id:          courseId!,
          title:       course!.title,
          price:       course!.price ?? 0,
          currency:    course!.currency ?? 'ZAR',
          description: course!.description,
        } as Course

        await initiatePayment(courseObj)
        // initiatePayment() auto-submits a hidden form → browser navigates to PayFast
        // If it returns (error case), show a message
        toast.error('Could not initiate payment. Please try again.')
      }
    } finally {
      setEnrolling(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--kw-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)', fontSize: '1.1rem' }}>Loading course…</div>
      </div>
    )
  }

  // ── 404 ──────────────────────────────────────────────────────────────────
  if (notFound || !course) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--kw-dark)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: '3rem', color: 'var(--kw-primary-dk)', opacity: 0.4 }}>404</div>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.2rem', color: 'var(--kw-primary-lt)' }}>Course not found</div>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)', textAlign: 'center' }}>
          This course may not exist or may not be published yet.
        </p>
        <Link to="/courses" style={{ marginTop: '0.5rem', fontFamily: 'Cinzel, serif', fontSize: '0.75rem', letterSpacing: '0.15em', color: 'var(--kw-primary)', textDecoration: 'none' }}>
          ← Browse all courses
        </Link>
      </div>
    )
  }

  const isFree    = !course.price || course.price === 0
  const levelLbl  = course.level ? (LEVEL_LABEL[course.level] ?? course.level) : null
  const levelCol  = course.level ? (LEVEL_COLOUR[course.level] ?? 'var(--kw-muted)') : 'var(--kw-muted)'
  const ctaLabel  = enrolling || payLoading
    ? (isFree ? 'Enrolling…' : 'Redirecting to payment…')
    : (user ? (isFree ? 'Enrol for Free' : `Pay ${formatPrice(course.price)}`) : 'Sign in to Enrol')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--kw-dark)', position: 'relative', overflow: 'hidden' }}>

      {/* Ambient glow */}
      <div style={{ position: 'fixed', top: '-20vh', left: '50%', transform: 'translateX(-50%)', width: '80vw', height: '60vh', background: 'radial-gradient(ellipse, rgba(201,148,60,0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")" }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Sticky nav ── */}
        <nav style={{ borderBottom: '1px solid var(--kw-border)', padding: '0.9rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(17,14,9,0.85)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 10 }}>
          <Link to="/courses" style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--kw-primary-lt)', textDecoration: 'none' }}>
            KlasWerk
          </Link>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {user ? (
              <Link to="/dashboard" style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.8rem', color: 'var(--kw-muted)', textDecoration: 'none' }}>Dashboard →</Link>
            ) : (
              <>
                <Link to="/login" style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.8rem', color: 'var(--kw-muted)', textDecoration: 'none' }}>Sign in</Link>
                <Link to="/register" className="kw-btn-primary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem', textDecoration: 'none', display: 'inline-block' }}>Register</Link>
              </>
            )}
          </div>
        </nav>

        {/* ── Hero ── */}
        <div style={{ padding: '4rem 1.5rem 3rem', maxWidth: '900px', margin: '0 auto' }}>

          {/* Eyebrow tags */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {course.category && (
              <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.25em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase' }}>{course.category}</span>
            )}
            {course.category && levelLbl && <span style={{ width: '1px', height: '12px', background: 'var(--kw-border)' }} />}
            {levelLbl && (
              <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.2em', color: levelCol, textTransform: 'uppercase' }}>{levelLbl}</span>
            )}
          </div>

          {/* Title */}
          <h1 style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: 'var(--kw-primary-lt)', lineHeight: 1.2, marginBottom: '1.25rem' }}>
            {course.title}
          </h1>

          {/* Description */}
          {course.description && (
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.15rem', lineHeight: 1.75, color: 'rgba(240,230,206,0.8)', marginBottom: '2rem', maxWidth: '680px' }}>
              {course.description}
            </p>
          )}

          {/* Stats */}
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
            <StatPill label="Lessons"  value={String(course.lesson_count)} />
            <StatPill label="Students" value={String(course.enrollment_count)} />
            <StatPill label="Price"    value={formatPrice(course.price)} colour={isFree ? 'var(--kw-success)' : 'var(--kw-primary-lt)'} />
          </div>

          {/* ── CTA panel ── */}
          <div style={{ background: 'var(--kw-surface)', border: '1px solid var(--kw-border)', borderRadius: '8px', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
            <div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.6rem', fontWeight: 600, color: isFree ? 'var(--kw-success)' : 'var(--kw-primary-lt)', marginBottom: '0.25rem' }}>
                {formatPrice(course.price)}
              </div>
              <div style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.8rem', color: 'var(--kw-muted)' }}>
                {isFree ? 'Completely free — start today' : 'One-time payment · Secure checkout via PayFast'}
              </div>
            </div>

            {enrolled ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', color: 'var(--kw-success)', letterSpacing: '0.1em' }}>✓ ENROLLED</span>
                <Link to={`/courses/${courseId}`} className="kw-btn-primary" style={{ textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap' }}>
                  Go to Course →
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <button onClick={handleEnrol} disabled={enrolling || payLoading} className="kw-btn-primary" style={{ whiteSpace: 'nowrap', minWidth: '180px' }}>
                  {ctaLabel}
                </button>
                {!isFree && !user && (
                  <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', color: 'var(--kw-muted)', letterSpacing: '0.1em' }}>
                    Account required to pay
                  </div>
                )}
                {!isFree && user && (
                  <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', color: 'var(--kw-muted)', letterSpacing: '0.1em' }}>
                    🔒 Secured by PayFast
                  </div>
                )}
              </div>
            )}
          </div>

          <GoldDivider />

          {/* ── Trainer bio ── */}
          {course.trainer_name && (
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', marginBottom: '3rem' }}>
              {course.trainer_avatar ? (
                <img src={course.trainer_avatar} alt={course.trainer_name} style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid var(--kw-border-lt)', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid var(--kw-border-lt)', background: 'var(--kw-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cinzel, serif', fontSize: '1.2rem', color: 'var(--kw-primary-dk)', flexShrink: 0 }}>
                  {course.trainer_name.charAt(0)}
                </div>
              )}
              <div>
                <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.25em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Your Trainer</div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', fontWeight: 600, color: 'var(--kw-primary-lt)', marginBottom: '0.5rem' }}>{course.trainer_name}</div>
                {course.trainer_bio && (
                  <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.95rem', lineHeight: 1.7, color: 'rgba(240,230,206,0.7)', maxWidth: '560px', marginBottom: '0.75rem' }}>
                    {course.trainer_bio}
                  </p>
                )}
                {course.trainer_id && (
                  <Link to={`/trainer/${course.trainer_id}`} style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.62rem', letterSpacing: '0.12em', color: 'var(--kw-primary)', textDecoration: 'none' }}>
                    View all courses by this trainer →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ── Bottom CTA (for unauthenticated visitors) ── */}
          {!user && (
            <>
              <GoldDivider />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)', fontSize: '1rem', marginBottom: '1rem' }}>
                  {isFree ? 'Create a free account to get started.' : 'Create an account to complete your purchase.'}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Link to={`/register?next=/course/${courseId}`} className="kw-btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
                    Create Free Account
                  </Link>
                  <Link to={`/login?next=/course/${courseId}`} className="kw-btn-secondary" style={{ textDecoration: 'none', display: 'inline-block' }}>
                    Sign In
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <footer style={{ textAlign: 'center', padding: '2.5rem', borderTop: '1px solid var(--kw-border)' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--kw-primary-dk)', marginBottom: '0.5rem' }}>✦ &nbsp; MD Works &nbsp; ✦</div>
          <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.14em', color: 'var(--kw-faint)' }}>
            Morney Deetlefs · South Africa · Builder of useful things for real people
          </div>
        </footer>
      </div>
    </div>
  )
}
