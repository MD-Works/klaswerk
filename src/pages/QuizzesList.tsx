// ═══════════════════════════════════════════════════
// KlasWerk — Quizzes List Page
// ───────────────────────────────────────────────────
// Route: /quizzes
// Student: all quizzes across enrolled courses with
//          last attempt score, status, retake link.
// Trainer: quiz overview for their courses.
// Session 7
// ═══════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useQuiz, type AttemptSummary } from '@/hooks/useQuiz'
import { db } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuizEntry {
  quizId:       string
  quizTitle:    string
  lessonTitle:  string
  courseId:     string
  courseTitle:  string
  lessonId:     string
  passingScore: number
  maxAttempts:  number
  lastAttempt:  AttemptSummary | null
  attemptCount: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusLabel(entry: QuizEntry): { label: string; color: string } {
  if (!entry.lastAttempt) return { label: 'Not Attempted', color: 'var(--kw-muted)' }
  if (entry.lastAttempt.passed) return { label: 'Passed', color: 'var(--kw-success)' }
  if (entry.attemptCount >= entry.maxAttempts) return { label: 'Attempts Exhausted', color: 'var(--kw-danger)' }
  return { label: 'Not Passed', color: 'var(--kw-primary-dk)' }
}

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, passing }: { score: number; passing: number }) {
  const r = 18
  const circumference = 2 * Math.PI * r
  const progress = (score / 100) * circumference
  const passed = score >= passing

  return (
    <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
      <svg width="48" height="48" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--kw-border)" strokeWidth="3" />
        <circle
          cx="24" cy="24" r={r}
          fill="none"
          stroke={passed ? 'var(--kw-success)' : 'var(--kw-primary)'}
          strokeWidth="3"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Syne Mono, monospace',
        fontSize: '0.65rem',
        color: passed ? 'var(--kw-success)' : 'var(--kw-primary)',
      }}>
        {score}%
      </div>
    </div>
  )
}

// ── Quiz row ──────────────────────────────────────────────────────────────────

function QuizRow({ entry }: { entry: QuizEntry }) {
  const { label, color } = statusLabel(entry)
  const canRetake = !entry.lastAttempt?.passed && entry.attemptCount < entry.maxAttempts

  return (
    <div className="kw-card" style={{ padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>

        {/* Score ring or placeholder */}
        {entry.lastAttempt ? (
          <ScoreRing score={entry.lastAttempt.percentage} passing={entry.passingScore} />
        ) : (
          <div style={{
            width: '48px', height: '48px', flexShrink: 0,
            borderRadius: '50%',
            border: '3px solid var(--kw-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', color: 'var(--kw-border-lt)',
          }}>
            —
          </div>
        )}

        {/* Info */}
        <div style={{ flex: 1, minWidth: '180px' }}>
          <div style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.88rem', color: 'var(--kw-cream)', fontWeight: 500, marginBottom: '0.2rem' }}>
            {entry.quizTitle}
          </div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: '0.82rem', color: 'var(--kw-muted)' }}>
            {entry.lessonTitle} · <Link to={`/courses/${entry.courseId}`} style={{ color: 'var(--kw-muted)' }}>{entry.courseTitle}</Link>
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.52rem', letterSpacing: '0.15em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Pass Mark</div>
            <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.7rem', color: 'var(--kw-muted)' }}>{entry.passingScore}%</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.52rem', letterSpacing: '0.15em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Attempts</div>
            <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.7rem', color: 'var(--kw-muted)' }}>{entry.attemptCount} / {entry.maxAttempts}</div>
          </div>
          {entry.lastAttempt && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.52rem', letterSpacing: '0.15em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Last Attempt</div>
              <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.7rem', color: 'var(--kw-muted)' }}>{formatDate(entry.lastAttempt.completed_at)}</div>
            </div>
          )}
          <div style={{
            fontFamily: 'Syne Mono, monospace',
            fontSize: '0.6rem',
            letterSpacing: '0.08em',
            color,
            textTransform: 'uppercase',
            background: `${color}18`,
            border: `1px solid ${color}40`,
            borderRadius: '4px',
            padding: '0.2rem 0.5rem',
            whiteSpace: 'nowrap',
          }}>
            {label}
          </div>
        </div>

        {/* Action */}
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          {canRetake && (
            <Link
              to={`/quizzes/${entry.quizId}`}
              className="kw-btn-primary"
              style={{ fontSize: '0.7rem', padding: '0.5rem 0.9rem', textDecoration: 'none' }}
            >
              {entry.lastAttempt ? 'Retry' : 'Start'}
            </Link>
          )}
          <Link
            to={`/courses/${entry.courseId}/lessons/${entry.lessonId}`}
            className="kw-btn-secondary"
            style={{ fontSize: '0.7rem', padding: '0.5rem 0.9rem', textDecoration: 'none' }}
          >
            Lesson
          </Link>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════
export function QuizzesListPage() {
  const { isTrainer } = useAuth()
  const { user } = useAuthStore()
  const { fetchAttempts } = useQuiz()

  const [entries,   setEntries]   = useState<QuizEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter,    setFilter]    = useState<'all' | 'passed' | 'pending'>('all')

  useEffect(() => {
    if (user) loadQuizzes()
  }, [user, isTrainer])

  async function loadQuizzes() {
    setIsLoading(true)

    if (isTrainer) {
      await loadTrainerQuizzes()
    } else {
      await loadStudentQuizzes()
    }

    setIsLoading(false)
  }

  // ── Student: fetch quizzes across enrolled courses ───────────────────────
  async function loadStudentQuizzes() {
    if (!user) return

    // 1. Enrolled course IDs
    const { data: enrollments } = await db
      .from('enrollments')
      .select('course_id')
      .eq('student_id', user.id)
      .not('status', 'eq', 'dropped')

    if (!enrollments || enrollments.length === 0) return

    const courseIds = enrollments.map((e: { course_id: string }) => e.course_id)

    // 2. Fetch lessons for those courses
    const { data: lessons } = await db
      .from('lessons')
      .select('id, title, course_id, course:course_id(id, title)')
      .in('course_id', courseIds)

    if (!lessons || lessons.length === 0) return

    type LessonRow = { id: string; title: string; course_id: string; course: { id: string; title: string } | null }
    const lessonIds = (lessons as LessonRow[]).map(l => l.id)

    // 3. Fetch quizzes for those lessons
    const { data: quizzes } = await db
      .from('quizzes')
      .select('id, title, lesson_id, passing_score, max_attempts')
      .in('lesson_id', lessonIds)

    if (!quizzes || quizzes.length === 0) return

    // 4. Build quiz entry list with attempt history
    const lessonMap = new Map((lessons as LessonRow[]).map(l => [l.id, l]))

    const quizEntries: QuizEntry[] = await Promise.all(
      quizzes.map(async (q: { id: string; title: string; lesson_id: string; passing_score: number; max_attempts: number }) => {
        const lesson = lessonMap.get(q.lesson_id)
        const attempts = await fetchAttempts(q.id)
        const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null

        return {
          quizId:       q.id,
          quizTitle:    q.title,
          lessonTitle:  lesson?.title ?? 'Lesson',
          courseId:     lesson?.course_id ?? '',
          courseTitle:  (lesson?.course as { title: string } | null)?.title ?? 'Course',
          lessonId:     q.lesson_id,
          passingScore: q.passing_score,
          maxAttempts:  q.max_attempts,
          lastAttempt,
          attemptCount: attempts.length,
        }
      })
    )

    setEntries(quizEntries)
  }

  // ── Trainer: overview of quizzes for their courses ───────────────────────
  async function loadTrainerQuizzes() {
    if (!user) return

    const { data: courses } = await db
      .from('courses')
      .select('id, title')
      .eq('trainer_id', user.id)

    if (!courses || courses.length === 0) return
    const courseIds = courses.map((c: { id: string }) => c.id)
    const courseMap = new Map(courses.map((c: { id: string; title: string }) => [c.id, c.title]))

    const { data: lessonsRaw } = await db
      .from('lessons')
      .select('id, title, course_id')
      .in('course_id', courseIds)

    if (!lessonsRaw || lessonsRaw.length === 0) return
    type TrainerLesson = { id: string; title: string; course_id: string }
    const lessons = lessonsRaw as TrainerLesson[]
    const lessonMap = new Map(lessons.map(l => [l.id, l]))
    const lessonIds = lessons.map(l => l.id)

    const { data: quizzes } = await db
      .from('quizzes')
      .select('id, title, lesson_id, passing_score, max_attempts')
      .in('lesson_id', lessonIds)

    if (!quizzes) return

    const entries: QuizEntry[] = quizzes.map((q: { id: string; title: string; lesson_id: string; passing_score: number; max_attempts: number }) => {
      const lesson = lessonMap.get(q.lesson_id)
      return {
        quizId:       q.id,
        quizTitle:    q.title,
        lessonTitle:  lesson?.title ?? 'Lesson',
        courseId:     lesson?.course_id ?? '',
        courseTitle:  courseMap.get(lesson?.course_id ?? '') ?? 'Course',
        lessonId:     q.lesson_id,
        passingScore: q.passing_score,
        maxAttempts:  q.max_attempts,
        lastAttempt:  null,
        attemptCount: 0,
      }
    })

    setEntries(entries)
  }

  // ── Filter ────────────────────────────────────────

  const filtered = entries.filter(e => {
    if (filter === 'passed')  return e.lastAttempt?.passed === true
    if (filter === 'pending') return !e.lastAttempt || !e.lastAttempt.passed
    return true
  })

  const tabStyle = (active: boolean) => ({
    fontFamily: 'Syne Mono, monospace',
    fontSize: '0.62rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    padding: '0.35rem 0.9rem',
    borderRadius: '4px',
    border: active ? '1px solid var(--kw-primary-dk)' : '1px solid var(--kw-border)',
    background: active ? 'rgba(201,148,60,0.1)' : 'transparent',
    color: active ? 'var(--kw-primary-lt)' : 'var(--kw-muted)',
    cursor: 'pointer' as const,
    transition: 'all 0.2s',
  })

  const passed  = entries.filter(e => e.lastAttempt?.passed).length
  const pending = entries.filter(e => !e.lastAttempt || !e.lastAttempt.passed).length

  return (
    <div className="kw-animate-fade-in">

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="kw-eyebrow" style={{ marginBottom: '0.5rem' }}>KlasWerk · {isTrainer ? 'Trainer' : 'Student'}</div>
        <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.6rem', fontWeight: 600, color: 'var(--kw-primary-lt)', marginBottom: '0.35rem' }}>
          Quizzes
        </h1>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)', fontSize: '1rem' }}>
          {isTrainer
            ? 'All quizzes across your courses.'
            : 'Your quiz progress across enrolled courses.'}
        </p>
      </div>

      {/* Student summary strip */}
      {!isTrainer && entries.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <SummaryPill label="Total" value={entries.length} color="var(--kw-muted)" />
          <SummaryPill label="Passed" value={passed} color="var(--kw-success)" />
          <SummaryPill label="Pending" value={pending} color="var(--kw-primary)" />
        </div>
      )}

      {/* Filter tabs (student only) */}
      {!isTrainer && entries.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button style={tabStyle(filter === 'all')}     onClick={() => setFilter('all')}>All</button>
          <button style={tabStyle(filter === 'passed')}  onClick={() => setFilter('passed')}>Passed</button>
          <button style={tabStyle(filter === 'pending')} onClick={() => setFilter('pending')}>Pending</button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--kw-muted)', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>
          Loading quizzes…
        </div>
      )}

      {/* Empty */}
      {!isLoading && entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '1rem' }}>◇</div>
          <div className="kw-heading" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No quizzes yet</div>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            {isTrainer
              ? 'Add quizzes to your lessons to test student knowledge.'
              : 'Enrol in a course with quizzes to get started.'}
          </p>
          <Link to={isTrainer ? '/courses' : '/courses'} className="kw-btn-primary" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            {isTrainer ? 'Manage Courses' : 'Browse Courses'}
          </Link>
        </div>
      )}

      {/* List */}
      {!isLoading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(entry => (
            <QuizRow key={entry.quizId} entry={entry} />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && entries.length > 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--kw-muted)', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>
          No quizzes match this filter.
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--kw-border)' }}>
        <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--kw-primary-dk)' }}>✦ MD WORKS · KLASWERK ✦</span>
      </div>
    </div>
  )
}

// ── Summary pill ──────────────────────────────────────────────────────────────

function SummaryPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      background: 'var(--kw-surface)', border: '1px solid var(--kw-border)',
      borderRadius: '50px', padding: '0.3rem 0.8rem',
    }}>
      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color, fontWeight: 600 }}>{value}</span>
      <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.1em', color: 'var(--kw-muted)', textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
}
