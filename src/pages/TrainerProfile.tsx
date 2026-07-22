// ═══════════════════════════════════════════════════
// KlasWerk — Public Trainer Profile Page
// ───────────────────────────────────────────────────
// Route: /trainer/:trainerId   (PUBLIC — no auth)
// Shows: trainer bio, avatar, all published courses
//        with enrol CTA on each card.
// Session 10
// ═══════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { db } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface TrainerProfile {
  id:         string
  full_name:  string | null
  bio:        string | null
  avatar_url: string | null
  email:      string
}

interface PublicCourseCard {
  id:               string
  title:            string
  description:      string | null
  category:         string | null
  level:            string | null
  price:            number | null
  currency:         string | null
  enrollment_count: number
  lesson_count:     number
}

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
}

function formatPrice(price: number | null): string {
  if (!price || price === 0) return 'Free'
  return `R ${price.toFixed(2)}`
}

// ── Course card ───────────────────────────────────────────────────────────────

function CourseCard({ course }: { course: PublicCourseCard }) {
  const isFree   = !course.price || course.price === 0
  const levelLbl = course.level ? (LEVEL_LABEL[course.level] ?? course.level) : null

  return (
    <Link
      to={`/course/${course.id}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        className="kw-card"
        style={{
          padding: '1.25rem 1.4rem',
          cursor: 'pointer',
          transition: 'border-color 0.18s, transform 0.18s',
        }}
        onMouseOver={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'var(--kw-primary-dk)'
          el.style.transform   = 'translateY(-2px)'
        }}
        onMouseOut={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = ''
          el.style.transform   = ''
        }}
      >
        {/* Tags */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {course.category && (
            <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase' }}>
              {course.category}
            </span>
          )}
          {levelLbl && (
            <>
              <span style={{ color: 'var(--kw-border)', fontSize: '0.55rem' }}>·</span>
              <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--kw-muted)', textTransform: 'uppercase' }}>
                {levelLbl}
              </span>
            </>
          )}
        </div>

        {/* Title */}
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.95rem', fontWeight: 600, color: 'var(--kw-primary-lt)', lineHeight: 1.3, marginBottom: '0.5rem' }}>
          {course.title}
        </div>

        {/* Description */}
        {course.description && (
          <p style={{
            fontFamily: 'Raleway, sans-serif', fontSize: '0.82rem', color: 'var(--kw-muted)', lineHeight: 1.55, marginBottom: '1rem',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {course.description}
          </p>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', color: 'var(--kw-muted)' }}>
              {course.lesson_count} lesson{course.lesson_count !== 1 ? 's' : ''}
            </span>
            <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', color: 'var(--kw-muted)' }}>
              {course.enrollment_count} student{course.enrollment_count !== 1 ? 's' : ''}
            </span>
          </div>
          <span style={{
            fontFamily: 'Syne Mono, monospace', fontSize: '0.72rem', fontWeight: 600,
            color: isFree ? 'var(--kw-success)' : 'var(--kw-primary)',
          }}>
            {formatPrice(course.price)}
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── Gold divider ──────────────────────────────────────────────────────────────

function GoldDivider() {
  return (
    <div style={{ width: '100%', height: '1px', margin: '2.5rem 0', background: 'linear-gradient(90deg, transparent, var(--kw-border-lt) 20%, var(--kw-primary-dk) 50%, var(--kw-border-lt) 80%, transparent)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ position: 'absolute', fontFamily: 'Syne Mono, monospace', fontSize: '0.7rem', color: 'var(--kw-primary-dk)', background: 'var(--kw-dark)', padding: '0 1rem' }}>✦</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════

export function TrainerProfilePage() {
  const { trainerId } = useParams<{ trainerId: string }>()
  const { user }      = useAuth()

  const [trainer,  setTrainer]  = useState<TrainerProfile | null>(null)
  const [courses,  setCourses]  = useState<PublicCourseCard[]>([])
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copied,   setCopied]   = useState(false)

  useEffect(() => { if (trainerId) load(trainerId) }, [trainerId])

  async function load(id: string) {
    setLoading(true)

    // Load trainer profile
    const { data: profile, error: profileErr } = await db
      .from('profiles')
      .select('id, full_name, bio, avatar_url, email')
      .eq('id', id)
      .eq('role', 'trainer')
      .maybeSingle()

    if (profileErr || !profile) { setNotFound(true); setLoading(false); return }
    setTrainer(profile as TrainerProfile)

    // Load their published courses from public_courses view
    // Migration 004 adds trainer_id to the view — single clean query
    const { data: courseData } = await db
      .from('public_courses')
      .select('id, title, description, category, level, price, currency, enrollment_count, lesson_count')
      .eq('trainer_id', id)

    setCourses((courseData ?? []) as PublicCourseCard[])

    setLoading(false)
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/trainer/${trainerId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--kw-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)', fontSize: '1.1rem' }}>Loading profile…</div>
      </div>
    )
  }

  // ── 404 ──────────────────────────────────────────────────────────────────
  if (notFound || !trainer) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--kw-dark)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: '3rem', color: 'var(--kw-primary-dk)', opacity: 0.4 }}>404</div>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.2rem', color: 'var(--kw-primary-lt)' }}>Trainer not found</div>
        <Link to="/courses" style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', letterSpacing: '0.15em', color: 'var(--kw-primary)', textDecoration: 'none' }}>
          ← Browse courses
        </Link>
      </div>
    )
  }

  const initials = (trainer.full_name ?? trainer.email)
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--kw-dark)', position: 'relative', overflow: 'hidden' }}>

      {/* Ambient */}
      <div style={{ position: 'fixed', top: '-20vh', left: '50%', transform: 'translateX(-50%)', width: '70vw', height: '50vh', background: 'radial-gradient(ellipse, rgba(201,148,60,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")" }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Nav ── */}
        <nav style={{ borderBottom: '1px solid var(--kw-border)', padding: '0.9rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(17,14,9,0.85)', backdropFilter: 'blur(8px)', position: 'sticky', top: 0, zIndex: 10 }}>
          <Link to="/courses" style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--kw-primary-lt)', textDecoration: 'none' }}>KlasWerk</Link>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {user ? (
              <Link to="/dashboard" style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.8rem', color: 'var(--kw-muted)', textDecoration: 'none' }}>Dashboard →</Link>
            ) : (
              <>
                <Link to="/login"    style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.8rem', color: 'var(--kw-muted)', textDecoration: 'none' }}>Sign in</Link>
                <Link to="/register" className="kw-btn-primary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem', textDecoration: 'none', display: 'inline-block' }}>Register</Link>
              </>
            )}
          </div>
        </nav>

        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 1.5rem 3rem' }}>

          {/* ── Trainer hero ── */}
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap' }}>

            {/* Avatar */}
            {trainer.avatar_url ? (
              <img src={trainer.avatar_url} alt={trainer.full_name ?? ''} style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--kw-border-lt)', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--kw-border-lt)', background: 'linear-gradient(135deg, var(--kw-primary-dk), var(--kw-surface))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cinzel, serif', fontSize: '1.6rem', color: 'var(--kw-primary)', flexShrink: 0 }}>
                {initials}
              </div>
            )}

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.3em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                ✦ &nbsp; KlasWerk Trainer
              </div>
              <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(1.4rem, 3vw, 2.2rem)', fontWeight: 700, color: 'var(--kw-primary-lt)', lineHeight: 1.2, marginBottom: '0.75rem' }}>
                {trainer.full_name ?? 'Trainer'}
              </h1>
              {trainer.bio && (
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.05rem', lineHeight: 1.75, color: 'rgba(240,230,206,0.75)', maxWidth: '580px', marginBottom: '1rem' }}>
                  {trainer.bio}
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button onClick={handleCopyLink} className="kw-btn-secondary" style={{ fontSize: '0.72rem', padding: '0.4rem 0.9rem' }}>
                  {copied ? '✓ Copied' : '⎘ Copy Profile Link'}
                </button>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', padding: '1rem 1.25rem', background: 'var(--kw-surface)', border: '1px solid var(--kw-border)', borderRadius: '6px', marginBottom: '2.5rem' }}>
            <div>
              <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.52rem', letterSpacing: '0.25em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Courses</div>
              <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '1rem', color: 'var(--kw-cream)' }}>{courses.length}</div>
            </div>
            <div>
              <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.52rem', letterSpacing: '0.25em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Students</div>
              <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '1rem', color: 'var(--kw-cream)' }}>
                {courses.reduce((sum, c) => sum + c.enrollment_count, 0)}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.52rem', letterSpacing: '0.25em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Lessons</div>
              <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '1rem', color: 'var(--kw-cream)' }}>
                {courses.reduce((sum, c) => sum + c.lesson_count, 0)}
              </div>
            </div>
          </div>

          <GoldDivider />

          {/* ── Course grid ── */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', fontWeight: 600, color: 'var(--kw-primary-lt)', letterSpacing: '0.08em' }}>
              Courses by {trainer.full_name?.split(' ')[0] ?? 'this trainer'}
            </h2>
          </div>

          {courses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '1px dashed var(--kw-border)', borderRadius: '8px' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)', fontSize: '1rem' }}>
                No published courses yet.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {courses.map(c => <CourseCard key={c.id} course={c} />)}
            </div>
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
