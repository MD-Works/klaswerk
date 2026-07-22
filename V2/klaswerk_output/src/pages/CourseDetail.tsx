// ═══════════════════════════════════════════════════
// KlasWerk — Course Detail Page
// ───────────────────────────────────────────────────
// Session 10 changes:
//   - Paid courses now route through PayFast (initiatePayment)
//   - Trainer: "Copy Public Link" button (copies /course/:id)
//   - Student: lesson progress bar showing completion %
// ═══════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCourse, type CourseWithStats } from '@/hooks/useCourse'
import { usePayment } from '@/hooks/usePayment'
import { useToast } from '@/hooks/useToast'
import type { Lesson } from '@/types'
import { supabase } from '@/lib/supabase'

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
}

export function CourseDetailPage() {
  const { courseId }  = useParams<{ courseId: string }>()
  const navigate      = useNavigate()
  const { isTrainer, user } = useAuth()
  const { fetchCourse, setCourseStatus, deleteCourse, enrollStudent, isLoading } = useCourse()
  const { initiatePayment } = usePayment()
  const { toast }     = useToast()

  const [course,    setCourse]    = useState<CourseWithStats | null>(null)
  const [lessons,   setLessons]   = useState<Lesson[]>([])
  const [enrolled,  setEnrolled]  = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [progress,  setProgress]  = useState(0)         // student's lesson completion %
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (courseId) load(courseId)
  }, [courseId])

  async function load(id: string) {
    const data = await fetchCourse(id)
    if (!data) { navigate('/courses'); return }
    setCourse(data)

    const { data: lessonData } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', id)
      .order('order_index', { ascending: true })

    setLessons(lessonData ?? [])

    if (user && !isTrainer) {
      const { data: enrolData } = await supabase
        .from('enrollments')
        .select('id, progress')
        .eq('course_id', id)
        .eq('student_id', user.id)
        .maybeSingle()
      if (enrolData) {
        setEnrolled(true)
        setProgress((enrolData as any).progress ?? 0)
      }
    }
  }

  async function handleEnrol() {
    if (!courseId || !course) return
    setEnrolling(true)
    try {
      if (course.price > 0) {
        // Paid course — redirect to PayFast
        await initiatePayment(course as any)
        // initiatePayment auto-submits a hidden form; browser navigates away
        // If it returns without throwing, something went wrong
        toast.error('Could not initiate payment. Try again.')
      } else {
        // Free course — direct enrolment
        const ok = await enrollStudent(courseId)
        if (ok) { toast.success('Enrolled successfully! 🎓'); setEnrolled(true) }
        else     toast.error('Could not enrol — you may already be enrolled.')
      }
    } finally {
      setEnrolling(false)
    }
  }

  async function handlePublish() {
    if (!courseId) return
    const ok = await setCourseStatus(courseId, 'published')
    if (ok) { toast.success('Course published'); setCourse(c => c ? { ...c, status: 'published' } : c) }
    else     toast.error('Failed to publish')
  }

  async function handleArchive() {
    if (!courseId) return
    const ok = await setCourseStatus(courseId, 'archived')
    if (ok) { toast.success('Course archived'); setCourse(c => c ? { ...c, status: 'archived' } : c) }
    else     toast.error('Failed to archive')
  }

  async function handleDelete() {
    if (!courseId || !course) return
    if (!window.confirm(`Delete "${course.title}"? This cannot be undone.`)) return
    const ok = await deleteCourse(courseId)
    if (ok) { toast.success('Course deleted'); navigate('/courses') }
    else     toast.error('Failed to delete')
  }

  function handleCopyPublicLink() {
    const url = `${window.location.origin}/course/${courseId}`
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    }).catch(() => toast.error('Could not copy link'))
  }

  if (isLoading && !course) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--kw-muted)' }}>
        <div className="kw-spinner" style={{ margin: '0 auto 0.75rem' }} />
        <span style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>Loading course…</span>
      </div>
    )
  }

  if (!course) return null

  const isOwnCourse      = isTrainer && course.trainer_id === user?.id
  const canAccessLessons = isOwnCourse || enrolled
  const publishedLessons = lessons.filter(l => l.is_published)

  return (
    <div className="kw-animate-fade-in">

      {/* Breadcrumb */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link to="/courses" style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--kw-muted)', textDecoration: 'none' }}>
          ← Courses
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <StatusBadge status={course.status} />
          </div>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.5rem', fontWeight: 600, color: 'var(--kw-primary-lt)', lineHeight: 1.25, marginBottom: '0.5rem' }}>
            {course.title}
          </h1>
          {course.trainer?.full_name && (
            <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', color: 'var(--kw-primary-dk)', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
              by {course.trainer.full_name}
            </div>
          )}
          {course.description && (
            <p style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.87rem', color: 'var(--kw-muted)', lineHeight: 1.6, maxWidth: '600px' }}>
              {course.description}
            </p>
          )}
        </div>

        {/* Trainer controls */}
        {isOwnCourse && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flexShrink: 0 }}>
            {/* Copy public link — S10 */}
            {course.status === 'published' && (
              <button
                className="kw-btn-secondary"
                onClick={handleCopyPublicLink}
                style={{ fontSize: '0.75rem' }}
                title="Copy shareable public link"
              >
                {linkCopied ? '✓ Copied' : '⎘ Share Link'}
              </button>
            )}
            {course.status !== 'published' && (
              <button className="kw-btn-primary" onClick={handlePublish}>Publish</button>
            )}
            {course.status === 'published' && (
              <button className="kw-btn-secondary" onClick={handleArchive}>Archive</button>
            )}
            <button className="kw-btn-secondary" onClick={handleDelete} style={{ color: 'var(--kw-danger)', borderColor: 'var(--kw-danger)33' }}>
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Meta pills */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem', padding: '1rem 1.25rem', background: 'var(--kw-surface)', border: '1px solid var(--kw-border)', borderRadius: '6px' }}>
        {course.lesson_count != null && <Stat label="Lessons"  value={String(course.lesson_count)} />}
        {isOwnCourse && course.enrollment_count != null && <Stat label="Students" value={String(course.enrollment_count)} />}
        {course.level && <Stat label="Level" value={LEVEL_LABEL[course.level] ?? course.level} />}
        {course.estimated_duration && <Stat label="Duration" value={formatDuration(course.estimated_duration)} />}
        {course.category && <Stat label="Category" value={course.category} />}
        <Stat label="Price" value={course.price > 0 ? `R ${course.price.toFixed(2)}` : 'Free'} />
      </div>

      {/* ── Student: progress bar (if enrolled) — S10 ── */}
      {!isTrainer && enrolled && publishedLessons.length > 0 && (
        <div style={{ background: 'var(--kw-surface)', border: '1px solid var(--kw-border)', borderRadius: '8px', padding: '1.1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase' }}>
              Your Progress
            </div>
            <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.7rem', color: progress >= 100 ? 'var(--kw-success)' : 'var(--kw-primary)' }}>
              {progress >= 100 ? '✓ Complete' : `${progress}%`}
            </div>
          </div>
          {/* Track */}
          <div style={{ height: '4px', background: 'var(--kw-border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(progress, 100)}%`,
              background: progress >= 100
                ? 'var(--kw-success)'
                : 'linear-gradient(90deg, var(--kw-primary-dk), var(--kw-primary))',
              borderRadius: '2px',
              transition: 'width 0.6s ease',
            }} />
          </div>
          {progress >= 100 && (
            <div style={{ marginTop: '0.5rem', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: '0.82rem', color: 'var(--kw-success)' }}>
              🎓 Course complete — check your Certificates page.
            </div>
          )}
        </div>
      )}

      {/* Student: enrol CTA */}
      {!isTrainer && !enrolled && (
        <div style={{ background: 'var(--kw-surface)', border: '1px solid var(--kw-border-lt)', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'var(--kw-primary-lt)', marginBottom: '0.25rem' }}>
              {course.price > 0 ? `R ${course.price.toFixed(2)}` : 'Free'}
            </div>
            <div style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.8rem', color: 'var(--kw-muted)' }}>
              {course.price > 0
                ? 'One-time payment via PayFast — secure checkout'
                : `Get access to all ${course.lesson_count ?? 0} lessons and quizzes.`}
            </div>
          </div>
          <button className="kw-btn-primary" onClick={handleEnrol} disabled={enrolling}>
            {enrolling
              ? (course.price > 0 ? 'Redirecting…' : 'Enrolling…')
              : (course.price > 0 ? `Pay R ${course.price.toFixed(2)}` : 'Enrol Now')}
          </button>
        </div>
      )}

      {/* ── Lessons list ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="kw-eyebrow">Lessons</div>
          {isOwnCourse && (
            <button
              className="kw-btn-secondary"
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.75rem' }}
              onClick={() => navigate(`/courses/${courseId}/lessons/new`)}
            >
              + Add Lesson
            </button>
          )}
        </div>

        {lessons.length === 0 ? (
          <div style={{ background: 'var(--kw-surface)', border: '1px dashed var(--kw-border-lt)', borderRadius: '6px', padding: '2.5rem', textAlign: 'center', color: 'var(--kw-muted)', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>
            {isOwnCourse ? '✦  No lessons yet — add the first one above' : '✦  No lessons published yet'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {lessons.map((lesson, idx) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                index={idx + 1}
                courseId={courseId!}
                isLocked={!canAccessLessons}
                isTrainer={isOwnCourse}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

// ── Lesson Row ────────────────────────────────────────────────────────────────

function LessonRow({ lesson, index, courseId, isLocked, isTrainer }: {
  lesson: Lesson; index: number; courseId: string; isLocked: boolean; isTrainer: boolean
}) {
  const navigate = useNavigate()

  function handleClick() {
    if (isLocked) return
    navigate(`/courses/${courseId}/lessons/${lesson.id}`)
  }

  function handleEdit(e: React.MouseEvent) {
    e.stopPropagation()
    navigate(`/courses/${courseId}/lessons/${lesson.id}/edit`)
  }

  return (
    <div
      className="kw-card"
      onClick={handleClick}
      style={{ padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '1rem', opacity: isLocked ? 0.55 : 1, cursor: isLocked ? 'default' : 'pointer' }}
    >
      <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', color: 'var(--kw-primary-dk)', minWidth: '1.5rem', textAlign: 'center' }}>
        {String(index).padStart(2, '0')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.88rem', color: 'var(--kw-cream)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {lesson.title}
        </div>
        {isTrainer && (
          <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.58rem', color: lesson.is_published ? 'var(--kw-success)' : 'var(--kw-muted)', letterSpacing: '0.12em', marginTop: '0.15rem' }}>
            {lesson.is_published ? 'Published' : 'Draft'}
          </div>
        )}
      </div>
      {lesson.video_url && <div style={{ fontSize: '0.7rem', color: 'var(--kw-border-lt)' }} title="Has video">◉</div>}
      {lesson.attachments && lesson.attachments.length > 0 && (
        <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.58rem', color: 'var(--kw-border-lt)' }}>
          {lesson.attachments.length} file{lesson.attachments.length > 1 ? 's' : ''}
        </div>
      )}
      {isTrainer && (
        <button
          onClick={handleEdit}
          style={{ padding: '0.25rem 0.6rem', background: 'transparent', border: '1px solid var(--kw-border-lt)', borderRadius: '3px', color: 'var(--kw-muted)', fontFamily: 'Syne, sans-serif', fontSize: '0.65rem', letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}
          onMouseOver={e => { e.currentTarget.style.color = 'var(--kw-primary-lt)'; e.currentTarget.style.borderColor = 'var(--kw-primary-dk)' }}
          onMouseOut={e => { e.currentTarget.style.color = 'var(--kw-muted)'; e.currentTarget.style.borderColor = 'var(--kw-border-lt)' }}
        >
          Edit
        </button>
      )}
      {isLocked && <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.7rem', color: 'var(--kw-muted)' }}>⊘</div>}
      {!isLocked && <div style={{ color: 'var(--kw-border-lt)', fontSize: '0.75rem' }}>›</div>}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--kw-primary-dk)', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.85rem', color: 'var(--kw-cream)' }}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    draft:     { bg: 'rgba(201,148,60,.12)', color: 'var(--kw-primary)',  label: 'Draft'     },
    published: { bg: 'rgba(76,175,122,.12)', color: 'var(--kw-success)',  label: 'Published' },
    archived:  { bg: 'rgba(122,109,88,.12)', color: 'var(--kw-muted)',    label: 'Archived'  },
  }
  const s = map[status] ?? map.draft
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}33`, borderRadius: '3px', padding: '0.2rem 0.55rem', fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
      {s.label}
    </span>
  )
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}
