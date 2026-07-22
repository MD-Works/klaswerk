// ═══════════════════════════════════════════════════
// KlasWerk — Courses Page
// ───────────────────────────────────────────────────
// Trainer: sees all their own courses (draft + published + archived)
//          with status badges, student counts, quick actions.
// Student: browses published courses, sees enrolled status.
// ═══════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCourse, type CourseWithStats } from '@/hooks/useCourse'
import { useToast } from '@/hooks/useToast'

// ── Status badge colours ─────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  draft:     { bg: 'rgba(201,148,60,.12)',  color: 'var(--kw-primary)',  label: 'Draft'     },
  published: { bg: 'rgba(76,175,122,.12)',  color: 'var(--kw-success)',  label: 'Published' },
  archived:  { bg: 'rgba(122,109,88,.12)',  color: 'var(--kw-muted)',    label: 'Archived'  },
}

// ── Level labels ─────────────────────────────────────────────────────────────
const LEVEL_LABEL: Record<string, string> = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
}

// ═══════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════
export function CoursesPage() {
  const navigate       = useNavigate()
  const { isTrainer }  = useAuth()
  const {
    fetchTrainerCourses,
    fetchStudentCourses,
    fetchPublishedCourses,
    setCourseStatus,
    deleteCourse,
    enrollStudent,
    isLoading,
  } = useCourse()
  const { toast } = useToast()

  const [courses,     setCourses]     = useState<CourseWithStats[]>([])
  const [filter,      setFilter]      = useState<'all' | 'draft' | 'published' | 'archived'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // ── Load courses on mount ────────────────────────────────────────────────
  useEffect(() => {
    loadCourses()
  }, [isTrainer])

  async function loadCourses() {
    if (isTrainer) {
      const data = await fetchTrainerCourses()
      setCourses(data)
    } else {
      // Students see their enrolled courses + all published
      const [enrolled, published] = await Promise.all([
        fetchStudentCourses(),
        fetchPublishedCourses(),
      ])
      // Merge: enrolled courses come first, then unenrolled published ones
      const enrolledIds = new Set(enrolled.map((c) => c.id))
      const unenrolled = published.filter((c) => !enrolledIds.has(c.id))
      setCourses([...enrolled, ...unenrolled])
    }
  }

  // ── Filtered / searched courses ──────────────────────────────────────────
  const filtered = courses.filter((c) => {
    const matchSearch = !searchQuery
      || c.title.toLowerCase().includes(searchQuery.toLowerCase())
      || c.description?.toLowerCase().includes(searchQuery.toLowerCase())
      || c.category?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchFilter = filter === 'all' || c.status === filter

    return matchSearch && matchFilter
  })

  // ── Trainer: publish / archive ───────────────────────────────────────────
  async function handleStatusChange(courseId: string, newStatus: 'published' | 'archived' | 'draft') {
    const ok = await setCourseStatus(courseId, newStatus)
    if (ok) {
      toast.success(`Course ${newStatus === 'published' ? 'published' : newStatus === 'archived' ? 'archived' : 'moved to draft'}`)
      await loadCourses()
    } else {
      toast.error('Failed to update course status')
    }
  }

  // ── Trainer: delete ───────────────────────────────────────────────────────
  async function handleDelete(courseId: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return
    const ok = await deleteCourse(courseId)
    if (ok) {
      toast.success('Course deleted')
      setCourses((prev) => prev.filter((c) => c.id !== courseId))
    } else {
      toast.error('Failed to delete course')
    }
  }

  // ── Student: enroll ───────────────────────────────────────────────────────
  async function handleEnroll(courseId: string) {
    const ok = await enrollStudent(courseId)
    if (ok) {
      toast.success('Enrolled successfully!')
      await loadCourses()
    } else {
      toast.error('Could not enrol — you may already be enrolled.')
    }
  }

  // ═════════════════════════════════════════════════
  // Render
  // ═════════════════════════════════════════════════
  return (
    <div className="kw-animate-fade-in">

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="kw-eyebrow" style={{ marginBottom: '0.4rem' }}>
            {isTrainer ? 'Course Management' : 'Browse Courses'}
          </div>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.5rem', fontWeight: 600, color: 'var(--kw-primary-lt)' }}>
            {isTrainer ? 'Your Courses' : 'Courses'}
          </h1>
        </div>
        {isTrainer && (
          <button
            className="kw-btn-primary"
            onClick={() => navigate('/courses/new')}
          >
            + New Course
          </button>
        )}
      </div>

      {/* ── Search + Filter ────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search courses…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="kw-input"
          style={{ flex: '1 1 240px', minWidth: 0 }}
        />
        {isTrainer && (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {(['all', 'draft', 'published', 'archived'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding:       '0.45rem 0.9rem',
                  borderRadius:  '4px',
                  border:        `1px solid ${filter === f ? 'var(--kw-primary)' : 'var(--kw-border-lt)'}`,
                  background:    filter === f ? 'rgba(201,148,60,.12)' : 'transparent',
                  color:         filter === f ? 'var(--kw-primary-lt)' : 'var(--kw-muted)',
                  fontFamily:    'Syne Mono, monospace',
                  fontSize:      '0.68rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor:        'pointer',
                  transition:    'all 0.2s',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Loading state ──────────────────────────────── */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--kw-muted)' }}>
          <div className="kw-spinner" style={{ margin: '0 auto 0.75rem' }} />
          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>Loading courses…</span>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────── */}
      {!isLoading && filtered.length === 0 && (
        <div style={{
          background:   'var(--kw-surface)',
          border:       '1px dashed var(--kw-border-lt)',
          borderRadius: '8px',
          padding:      '4rem 2rem',
          textAlign:    'center',
        }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--kw-muted)', marginBottom: '1rem' }}>
            {searchQuery
              ? `No courses match "${searchQuery}"`
              : isTrainer
                ? 'No courses yet — create your first one.'
                : 'No courses available right now.'}
          </div>
          {isTrainer && !searchQuery && (
            <button className="kw-btn-primary" onClick={() => navigate('/courses/new')}>
              Create First Course
            </button>
          )}
        </div>
      )}

      {/* ── Course grid ────────────────────────────────── */}
      {!isLoading && filtered.length > 0 && (
        <div style={{
          display:               'grid',
          gridTemplateColumns:   'repeat(auto-fill, minmax(300px, 1fr))',
          gap:                   '1rem',
        }}>
          {filtered.map((course) => (
            isTrainer
              ? <TrainerCourseCard
                  key={course.id}
                  course={course}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              : <StudentCourseCard
                  key={course.id}
                  course={course}
                  onEnroll={handleEnroll}
                />
          ))}
        </div>
      )}

    </div>
  )
}

// ═══════════════════════════════════════════════════
// Trainer Course Card
// ═══════════════════════════════════════════════════
function TrainerCourseCard({
  course,
  onStatusChange,
  onDelete,
}: {
  course: CourseWithStats
  onStatusChange: (id: string, status: 'published' | 'archived' | 'draft') => void
  onDelete:       (id: string, title: string) => void
}) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const statusStyle = STATUS_STYLE[course.status] ?? STATUS_STYLE.draft

  return (
    <div className="kw-card" style={{ padding: '1.25rem', position: 'relative', cursor: 'pointer' }} onClick={() => navigate(`/courses/${course.id}`)}>

      {/* Status badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <span style={{
          background:    statusStyle.bg,
          color:         statusStyle.color,
          border:        `1px solid ${statusStyle.color}33`,
          borderRadius:  '3px',
          padding:       '0.2rem 0.55rem',
          fontFamily:    'Syne Mono, monospace',
          fontSize:      '0.6rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          {statusStyle.label}
        </span>

        {/* Kebab menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              background:  'transparent',
              border:      'none',
              color:       'var(--kw-muted)',
              cursor:      'pointer',
              padding:     '0.2rem 0.4rem',
              fontSize:    '1.1rem',
              lineHeight:  1,
            }}
            aria-label="Course options"
          >
            ···
          </button>
          {menuOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                onClick={() => setMenuOpen(false)}
              />
              <div style={{
                position:   'absolute',
                right:      0,
                top:        '100%',
                zIndex:     20,
                background: 'var(--kw-panel)',
                border:     '1px solid var(--kw-border-lt)',
                borderRadius: '6px',
                minWidth:   '160px',
                overflow:   'hidden',
                boxShadow:  '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                <MenuAction label="Edit course" onClick={() => {
                  setMenuOpen(false)
                  window.location.href = `/courses/${course.id}`
                }} />
                {course.status !== 'published' && (
                  <MenuAction label="Publish" onClick={() => { setMenuOpen(false); onStatusChange(course.id, 'published') }} />
                )}
                {course.status === 'published' && (
                  <MenuAction label="Unpublish" onClick={() => { setMenuOpen(false); onStatusChange(course.id, 'draft') }} />
                )}
                {course.status !== 'archived' && (
                  <MenuAction label="Archive" onClick={() => { setMenuOpen(false); onStatusChange(course.id, 'archived') }} />
                )}
                <MenuAction label="Delete" danger onClick={() => { setMenuOpen(false); onDelete(course.id, course.title) }} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Title */}
      <Link
        to={`/courses/${course.id}`}
        style={{ textDecoration: 'none' }}
      >
        <h3 style={{
          fontFamily:   'Cinzel, serif',
          fontSize:     '0.95rem',
          fontWeight:   600,
          color:        'var(--kw-primary-lt)',
          marginBottom: '0.4rem',
          lineHeight:   1.35,
        }}>
          {course.title}
        </h3>
      </Link>

      {/* Description */}
      {course.description && (
        <p style={{
          fontFamily:   'Raleway, sans-serif',
          fontSize:     '0.8rem',
          color:        'var(--kw-muted)',
          lineHeight:   1.5,
          marginBottom: '1rem',
          display:      '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow:     'hidden',
        }}>
          {course.description}
        </p>
      )}

      {/* Meta row */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <MetaPill label="Lessons"  value={String(course.lesson_count ?? 0)} />
        <MetaPill label="Students" value={String(course.enrollment_count ?? 0)} />
        {course.price > 0 && (
          <MetaPill label="Price" value={`R ${course.price.toFixed(2)}`} />
        )}
        {course.level && (
          <MetaPill label="Level" value={LEVEL_LABEL[course.level] ?? course.level} />
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// Student Course Card
// ═══════════════════════════════════════════════════
function StudentCourseCard({
  course,
  onEnroll,
}: {
  course:   CourseWithStats
  onEnroll: (id: string) => void
}) {
  const isEnrolled = !!course.enrollment
  const progress   = course.enrollment?.progress ?? 0

  return (
    <div className="kw-card" style={{ padding: '1.25rem' }}>

      {/* Enrolled badge */}
      {isEnrolled && (
        <div style={{ marginBottom: '0.75rem' }}>
          <span style={{
            background:    'rgba(76,175,122,.12)',
            color:         'var(--kw-success)',
            border:        '1px solid rgba(76,175,122,.25)',
            borderRadius:  '3px',
            padding:       '0.2rem 0.55rem',
            fontFamily:    'Syne Mono, monospace',
            fontSize:      '0.6rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}>
            Enrolled
          </span>
        </div>
      )}

      {/* Title */}
      {isEnrolled ? (
        <Link to={`/courses/${course.id}`} style={{ textDecoration: 'none' }}>
          <h3 style={{
            fontFamily:   'Cinzel, serif',
            fontSize:     '0.95rem',
            fontWeight:   600,
            color:        'var(--kw-primary-lt)',
            marginBottom: '0.4rem',
            lineHeight:   1.35,
          }}>
            {course.title}
          </h3>
        </Link>
      ) : (
        <h3 style={{
          fontFamily:   'Cinzel, serif',
          fontSize:     '0.95rem',
          fontWeight:   600,
          color:        'var(--kw-primary-lt)',
          marginBottom: '0.4rem',
          lineHeight:   1.35,
        }}>
          {course.title}
        </h3>
      )}

      {/* Trainer */}
      {course.trainer?.full_name && (
        <div style={{
          fontFamily:    'Syne Mono, monospace',
          fontSize:      '0.62rem',
          color:         'var(--kw-primary-dk)',
          letterSpacing: '0.1em',
          marginBottom:  '0.5rem',
        }}>
          by {course.trainer.full_name}
        </div>
      )}

      {/* Description */}
      {course.description && (
        <p style={{
          fontFamily:      'Raleway, sans-serif',
          fontSize:        '0.8rem',
          color:           'var(--kw-muted)',
          lineHeight:      1.5,
          marginBottom:    '1rem',
          display:         '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow:        'hidden',
        }}>
          {course.description}
        </p>
      )}

      {/* Progress bar (enrolled students) */}
      {isEnrolled && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', color: 'var(--kw-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Progress</span>
            <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', color: 'var(--kw-primary)' }}>{progress}%</span>
          </div>
          <div style={{ height: '2px', background: 'var(--kw-border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height:     '100%',
              width:      `${progress}%`,
              background: 'linear-gradient(90deg, var(--kw-primary-dk), var(--kw-primary))',
              borderRadius: '2px',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {/* Meta + Action row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {course.lesson_count != null && (
            <MetaPill label="Lessons" value={String(course.lesson_count)} />
          )}
          {course.level && (
            <MetaPill label="Level" value={LEVEL_LABEL[course.level] ?? course.level} />
          )}
        </div>

        {!isEnrolled && (
          <button
            className="kw-btn-primary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
            onClick={() => onEnroll(course.id)}
          >
            {course.price > 0 ? `Enrol · R ${course.price.toFixed(0)}` : 'Enrol Free'}
          </button>
        )}

        {isEnrolled && (
          <Link
            to={`/courses/${course.id}`}
            style={{
              padding:       '0.5rem 1rem',
              background:    'transparent',
              border:        '1px solid var(--kw-border-lt)',
              borderRadius:  '4px',
              color:         'var(--kw-muted)',
              fontFamily:    'Raleway, sans-serif',
              fontSize:      '0.75rem',
              letterSpacing: '0.05em',
              cursor:        'pointer',
              transition:    'all 0.2s',
              textDecoration: 'none',
            }}
          >
            Continue →
          </Link>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// Small reusable sub-components
// ═══════════════════════════════════════════════════
function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
      <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--kw-primary-dk)' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.78rem', color: 'var(--kw-cream)' }}>
        {value}
      </span>
    </div>
  )
}

function MenuAction({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display:       'block',
        width:         '100%',
        textAlign:     'left',
        padding:       '0.6rem 1rem',
        background:    'transparent',
        border:        'none',
        borderBottom:  '1px solid var(--kw-border)',
        color:         danger ? 'var(--kw-danger)' : 'var(--kw-cream)',
        fontFamily:    'Raleway, sans-serif',
        fontSize:      '0.82rem',
        cursor:        'pointer',
        transition:    'background 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--kw-surface)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {label}
    </button>
  )
}
