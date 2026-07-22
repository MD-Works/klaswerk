// ═══════════════════════════════════════════════════
// KlasWerk — Quiz Taker (Students + Trainer preview)
// ───────────────────────────────────────────────────
// Route: /quizzes/:quizId
//
// Phases:
//   intro    → quiz info + attempt history + Start button
//   taking   → all questions on one page + timer
//   results  → score, pass/fail, per-question feedback
// ═══════════════════════════════════════════════════

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuiz, type QuizWithQuestions, type AttemptResult, type AttemptSummary } from '@/hooks/useQuiz'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import type { Question } from '@/types'
import { db } from '@/lib/supabase'

type Phase = 'loading' | 'intro' | 'taking' | 'results'

// ─────────────────────────────────────────────────
// Timer component
// ─────────────────────────────────────────────────
function CountdownTimer({ totalSeconds, onExpire }: { totalSeconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const expiredRef = useRef(false)

  useEffect(() => {
    if (remaining <= 0) {
      if (!expiredRef.current) { expiredRef.current = true; onExpire() }
      return
    }
    const id = setInterval(() => setRemaining(r => r - 1), 1000)
    return () => clearInterval(id)
  }, [remaining])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const isUrgent = remaining <= 60

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontFamily: 'Syne Mono, monospace',
      fontSize: '1rem',
      color: isUrgent ? 'var(--kw-danger)' : 'var(--kw-primary)',
      padding: '0.4rem 0.9rem',
      background: isUrgent ? 'rgba(201,76,76,.08)' : 'rgba(201,148,60,.08)',
      border: `1px solid ${isUrgent ? 'var(--kw-danger)' : 'var(--kw-primary-dk)'}`,
      borderRadius: '4px',
      transition: 'all 0.5s',
    }}>
      ◎ &nbsp;{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  )
}

// ─────────────────────────────────────────────────
// Single question block (used in taking phase)
// ─────────────────────────────────────────────────
function QuestionBlock({
  question,
  index,
  answer,
  onChange,
}: {
  question: Question
  index: number
  answer: string
  onChange: (val: string) => void
}) {
  return (
    <div style={{
      background: 'var(--kw-surface)',
      border: '1px solid var(--kw-border)',
      borderRadius: '6px',
      padding: '1.25rem 1.5rem',
      marginBottom: '1rem',
    }}>
      {/* Question header */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
        <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', color: 'var(--kw-primary-dk)', paddingTop: '3px', flexShrink: 0 }}>
          {String(index).padStart(2, '0')}
        </span>
        <p style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.92rem', color: 'var(--kw-cream)', lineHeight: 1.6, margin: 0, flex: 1 }}>
          {question.question_text}
        </p>
        <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', color: 'var(--kw-muted)', flexShrink: 0, paddingTop: '3px' }}>
          {question.points} pt{question.points !== 1 ? 's' : ''}
        </span>
      </div>

      {/* MCQ */}
      {question.type === 'mcq' && question.options && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {question.options.map(opt => (
            <label key={opt.label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 0.9rem',
              background: answer === opt.label ? 'rgba(201,148,60,.1)' : 'var(--kw-panel)',
              border: `1px solid ${answer === opt.label ? 'var(--kw-primary-dk)' : 'var(--kw-border)'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s',
              userSelect: 'none',
            }}>
              <input
                type="radio"
                name={`q_${question.id}`}
                value={opt.label}
                checked={answer === opt.label}
                onChange={() => onChange(opt.label)}
                style={{ accentColor: 'var(--kw-primary)', flexShrink: 0 }}
              />
              <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', color: 'var(--kw-primary-dk)', minWidth: '16px' }}>
                {opt.label}
              </span>
              <span style={{ fontSize: '0.87rem', color: answer === opt.label ? 'var(--kw-primary-lt)' : 'var(--kw-cream)' }}>
                {opt.value}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* True / False */}
      {question.type === 'truefalse' && (
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {['true', 'false'].map(val => (
            <label key={val} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.5rem',
              background: answer === val ? 'rgba(201,148,60,.1)' : 'var(--kw-panel)',
              border: `1px solid ${answer === val ? 'var(--kw-primary-dk)' : 'var(--kw-border)'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s',
              userSelect: 'none',
              fontSize: '0.88rem',
              color: answer === val ? 'var(--kw-primary-lt)' : 'var(--kw-muted)',
            }}>
              <input
                type="radio"
                name={`q_${question.id}`}
                value={val}
                checked={answer === val}
                onChange={() => onChange(val)}
                style={{ accentColor: 'var(--kw-primary)' }}
              />
              {val === 'true' ? 'True' : 'False'}
            </label>
          ))}
        </div>
      )}

      {/* Fill in the blank */}
      {question.type === 'fill_blank' && (
        <input
          className="kw-input"
          placeholder="Type your answer…"
          value={answer}
          onChange={e => onChange(e.target.value)}
          style={{ maxWidth: '400px' }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────
// Results view
// ─────────────────────────────────────────────────
function ResultsView({
  result,
  quiz,
  courseId,
  lessonId,
  onRetry,
  attemptsLeft,
}: {
  result: AttemptResult
  quiz: QuizWithQuestions
  courseId: string
  lessonId: string
  onRetry: () => void
  attemptsLeft: number
}) {
  const mins = Math.floor(result.time_spent / 60)
  const secs = result.time_spent % 60

  return (
    <div className="kw-animate-fade-in">
      {/* Score card */}
      <div style={{
        background: result.passed ? 'rgba(76,175,122,.06)' : 'rgba(201,76,76,.06)',
        border: `1px solid ${result.passed ? 'rgba(76,175,122,.3)' : 'rgba(201,76,76,.3)'}`,
        borderRadius: '8px',
        padding: '2.5rem',
        textAlign: 'center',
        marginBottom: '2.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: result.passed
            ? 'radial-gradient(ellipse at 50% 0%, rgba(76,175,122,.08) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(201,76,76,.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '4rem',
          fontWeight: 900,
          color: result.passed ? 'var(--kw-success)' : 'var(--kw-danger)',
          lineHeight: 1,
          marginBottom: '0.5rem',
          position: 'relative',
        }}>
          {result.percentage}%
        </div>

        <div style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '1.2rem',
          color: result.passed ? 'var(--kw-success)' : 'var(--kw-danger)',
          marginBottom: '1rem',
          position: 'relative',
        }}>
          {result.passed ? '✦ Passed' : '○ Not Passed'}
        </div>

        <div style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontStyle: 'italic',
          fontSize: '1rem',
          color: 'var(--kw-muted)',
          position: 'relative',
        }}>
          {result.passed
            ? 'Well done — you met the passing score.'
            : `Passing score is ${quiz.passing_score}%. Keep practising and try again.`}
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '2.5rem',
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--kw-border)',
          position: 'relative',
        }}>
          {[
            { label: 'Correct', value: `${result.correct_answers} / ${result.total_questions}` },
            { label: 'Attempt', value: `#${result.attempt_number}` },
            { label: 'Time', value: mins > 0 ? `${mins}m ${secs}s` : `${secs}s` },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--kw-primary-dk)', marginBottom: '0.25rem' }}>
                {label}
              </div>
              <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '1rem', color: 'var(--kw-cream)' }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '3rem', flexWrap: 'wrap' }}>
        <Link to={`/courses/${courseId}/lessons/${lessonId}`} className="kw-btn-secondary">
          ← Back to Lesson
        </Link>
        {attemptsLeft > 0 && !result.passed && (
          <button className="kw-btn-primary" onClick={onRetry}>
            Try Again ({attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} left)
          </button>
        )}
      </div>

      {/* Per-question feedback */}
      <div>
        <div className="kw-eyebrow" style={{ marginBottom: '1rem' }}>Question Review</div>

        {result.feedback.map((fb, i) => (
          <div key={fb.question_id} style={{
            background: 'var(--kw-surface)',
            border: `1px solid ${fb.is_correct ? 'rgba(76,175,122,.25)' : 'rgba(201,76,76,.25)'}`,
            borderRadius: '6px',
            padding: '1.1rem 1.25rem',
            marginBottom: '0.75rem',
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <span style={{
                width: '22px', height: '22px',
                borderRadius: '50%',
                background: fb.is_correct ? 'rgba(76,175,122,.15)' : 'rgba(201,76,76,.15)',
                color: fb.is_correct ? 'var(--kw-success)' : 'var(--kw-danger)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem',
                flexShrink: 0,
              }}>
                {fb.is_correct ? '✓' : '✕'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.87rem', color: 'var(--kw-cream)', lineHeight: 1.5 }}>
                  <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', color: 'var(--kw-primary-dk)', marginRight: '0.5rem' }}>
                    Q{String(i + 1).padStart(2, '0')}
                  </span>
                  {fb.question_text}
                </div>
              </div>
              <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.68rem', color: fb.is_correct ? 'var(--kw-success)' : 'var(--kw-danger)', flexShrink: 0 }}>
                {fb.points_earned}/{fb.points}pt
              </span>
            </div>

            <div style={{ paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ fontSize: '0.8rem' }}>
                <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', color: 'var(--kw-muted)', letterSpacing: '0.08em', marginRight: '0.5rem' }}>YOUR ANSWER</span>
                <span style={{ color: fb.is_correct ? 'var(--kw-success)' : 'var(--kw-danger)' }}>
                  {fb.student_answer || '(no answer)'}
                </span>
              </div>
              {!fb.is_correct && (
                <div style={{ fontSize: '0.8rem' }}>
                  <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', color: 'var(--kw-muted)', letterSpacing: '0.08em', marginRight: '0.5rem' }}>CORRECT</span>
                  <span style={{ color: 'var(--kw-success)' }}>{fb.correct_answer}</span>
                </div>
              )}
              {fb.explanation && (
                <div style={{
                  marginTop: '0.4rem',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--kw-panel)',
                  borderLeft: '2px solid var(--kw-primary-dk)',
                  borderRadius: '0 3px 3px 0',
                  fontFamily: 'Cormorant Garamond, serif',
                  fontStyle: 'italic',
                  fontSize: '0.87rem',
                  color: 'var(--kw-muted)',
                }}>
                  {fb.explanation}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// Main QuizTaker
// ─────────────────────────────────────────────────
export function QuizTaker() {
  const { quizId }   = useParams<{ quizId: string }>()
  const navigate     = useNavigate()
  const { user, isTrainer } = useAuth()
  const { toast }    = useToast()
  const { fetchQuiz, fetchAttempts, submitAttempt } = useQuiz()

  const [phase,     setPhase]     = useState<Phase>('loading')
  const [quiz,      setQuiz]      = useState<QuizWithQuestions | null>(null)
  const [attempts,  setAttempts]  = useState<AttemptSummary[]>([])
  const [answers,   setAnswers]   = useState<Record<string, string>>({})
  const [result,    setResult]    = useState<AttemptResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // For timing
  const startedAtRef = useRef<number>(0)

  // For lesson/course back-navigation
  const [lessonId,  setLessonId]  = useState('')
  const [courseId,  setCourseId]  = useState('')

  const load = useCallback(async () => {
    if (!quizId) return
    const [quizData, attemptsData] = await Promise.all([
      fetchQuiz(quizId),
      user ? fetchAttempts(quizId) : Promise.resolve([]),
    ])
    if (!quizData) { navigate('/courses'); return }
    setQuiz(quizData)
    setAttempts(attemptsData)

    // Resolve lesson → course for back-navigation
    const { data: lesson } = await db
      .from('lessons')
      .select('id, course_id')
      .eq('id', quizData.lesson_id)
      .single()
    if (lesson) { setLessonId(lesson.id); setCourseId(lesson.course_id) }

    setPhase('intro')
  }, [quizId, user])

  useEffect(() => { load() }, [load])

  const attemptsUsed = attempts.length
  const attemptsLeft = quiz ? Math.max(0, quiz.max_attempts - attemptsUsed) : 0
  const bestScore    = attempts.length > 0 ? Math.max(...attempts.map(a => a.percentage)) : null
  const hasPassed    = attempts.some(a => a.passed)

  function startQuiz() {
    if (!quiz) return
    setAnswers({})
    setResult(null)
    startedAtRef.current = Date.now()
    setPhase('taking')
  }

  function setAnswer(questionId: string, value: string) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const answeredCount = Object.keys(answers).filter(k => answers[k]).length
  const totalQuestions = quiz?.questions.length ?? 0

  async function handleSubmit(autoSubmit = false) {
    if (!quiz) return

    // Warn if unanswered (unless auto-submit from timer)
    if (!autoSubmit) {
      const unanswered = totalQuestions - answeredCount
      if (unanswered > 0) {
        if (!window.confirm(`You have ${unanswered} unanswered question${unanswered !== 1 ? 's' : ''}. Submit anyway?`)) return
      }
    }

    const timeSpent = Math.round((Date.now() - startedAtRef.current) / 1000)
    setSubmitting(true)
    const res = await submitAttempt(quiz, answers, timeSpent)
    setSubmitting(false)

    if (!res) { toast.error('Failed to submit. Please try again.'); return }

    setResult(res)
    setAttempts(prev => [...prev, {
      id: res.id,
      percentage: res.percentage,
      passed: res.passed,
      attempt_number: res.attempt_number,
      completed_at: res.completed_at,
      time_spent: res.time_spent,
    }])
    setPhase('results')
  }

  function handleRetry() {
    setPhase('intro')
    setResult(null)
  }

  // ─────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--kw-muted)' }}>
        <div className="kw-spinner" style={{ margin: '0 auto 1rem' }} />
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>Loading quiz…</p>
      </div>
    )
  }

  if (!quiz) return null

  // ─────────────────────────────────────────────────
  // INTRO PHASE
  // ─────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }} className="kw-animate-fade-in">

        {/* Back link */}
        {lessonId && courseId && (
          <div style={{ marginBottom: '1.5rem' }}>
            <Link to={`/courses/${courseId}/lessons/${lessonId}`}
              style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--kw-muted)' }}>
              ← Back to lesson
            </Link>
          </div>
        )}

        <div className="kw-eyebrow" style={{ marginBottom: '0.5rem' }}>Quiz</div>
        <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.6rem', fontWeight: 600, color: 'var(--kw-primary-lt)', marginBottom: '0.5rem' }}>
          {quiz.title}
        </h1>
        {quiz.description && (
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: '1rem', color: 'var(--kw-muted)', marginBottom: '1.5rem', lineHeight: 1.65 }}>
            {quiz.description}
          </p>
        )}

        {/* Quiz info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--kw-border)', border: '1px solid var(--kw-border)', borderRadius: '6px', overflow: 'hidden', marginBottom: '2rem' }}>
          {[
            { label: 'Questions',      value: String(quiz.questions.length) },
            { label: 'Passing Score',  value: `${quiz.passing_score}%` },
            { label: 'Time Limit',     value: quiz.time_limit ? `${quiz.time_limit} min` : 'Unlimited' },
            { label: 'Max Attempts',   value: String(quiz.max_attempts) },
            { label: 'Attempts Used',  value: String(attemptsUsed) },
            { label: 'Best Score',     value: bestScore !== null ? `${bestScore}%` : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '1rem', background: 'var(--kw-surface)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--kw-primary-dk)', marginBottom: '0.4rem' }}>
                {label}
              </div>
              <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '1rem', color: 'var(--kw-cream)' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Status message */}
        {hasPassed && (
          <div style={{ padding: '1rem 1.25rem', background: 'rgba(76,175,122,.08)', border: '1px solid rgba(76,175,122,.25)', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--kw-success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ✓ &nbsp; You have already passed this quiz.
          </div>
        )}

        {/* Attempt history */}
        {attempts.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div className="kw-eyebrow" style={{ marginBottom: '0.75rem' }}>Attempt History</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {attempts.map(a => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.6rem 0.9rem',
                  background: 'var(--kw-surface)',
                  border: '1px solid var(--kw-border)',
                  borderRadius: '4px',
                  fontSize: '0.82rem',
                }}>
                  <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', color: 'var(--kw-primary-dk)' }}>
                    #{a.attempt_number}
                  </span>
                  <span style={{ flex: 1, fontFamily: 'Syne Mono, monospace', fontSize: '0.9rem', color: a.passed ? 'var(--kw-success)' : 'var(--kw-cream)' }}>
                    {a.percentage}%
                  </span>
                  <span style={{ color: a.passed ? 'var(--kw-success)' : 'var(--kw-danger)', fontSize: '0.75rem' }}>
                    {a.passed ? '✓ Passed' : '✕ Failed'}
                  </span>
                  <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', color: 'var(--kw-border-lt)' }}>
                    {new Date(a.completed_at).toLocaleDateString('en-ZA')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        {attemptsLeft > 0 ? (
          <button className="kw-btn-primary" onClick={startQuiz} style={{ padding: '0.9rem 2rem', fontSize: '0.9rem' }}>
            {attemptsUsed === 0 ? '◉ Start Quiz' : `◉ Retry (${attemptsLeft} left)`}
          </button>
        ) : (
          <div style={{ padding: '1rem 1.25rem', background: 'rgba(201,76,76,.06)', border: '1px solid rgba(201,76,76,.2)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--kw-danger)' }}>
            ○ &nbsp; No attempts remaining. Contact your trainer if you need another try.
          </div>
        )}

        {/* Trainer note */}
        {isTrainer && (
          <div style={{ marginTop: '1.5rem', padding: '0.75rem 1rem', background: 'var(--kw-panel)', border: '1px solid var(--kw-border)', borderRadius: '4px', fontSize: '0.78rem', color: 'var(--kw-muted)' }}>
            ◈ &nbsp; Trainer view — student attempts are not affected by your preview.
            &nbsp;
            {lessonId && courseId && (
              <Link to={`/courses/${courseId}/lessons/${lessonId}/quiz`} style={{ color: 'var(--kw-primary)' }}>
                Edit quiz →
              </Link>
            )}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────
  // TAKING PHASE
  // ─────────────────────────────────────────────────
  if (phase === 'taking') {
    return (
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>

        {/* Sticky quiz header */}
        <div style={{
          position: 'sticky', top: '56px', zIndex: 30,
          background: 'var(--kw-dark)',
          borderBottom: '1px solid var(--kw-border)',
          padding: '0.75rem 0 0.75rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          <div>
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: 'var(--kw-primary-lt)', margin: 0 }}>
              {quiz.title}
            </h2>
            <p style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', color: 'var(--kw-muted)', margin: '0.2rem 0 0' }}>
              {answeredCount} / {totalQuestions} answered
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {quiz.time_limit && (
              <CountdownTimer
                totalSeconds={quiz.time_limit * 60}
                onExpire={() => { toast.info('Time is up — submitting your answers.'); handleSubmit(true) }}
              />
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: '3px', background: 'var(--kw-border)', borderRadius: '2px', marginBottom: '1.5rem' }}>
          <div style={{
            height: '100%',
            width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
            background: 'linear-gradient(90deg, var(--kw-primary-dk), var(--kw-primary))',
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Questions */}
        {quiz.questions.map((q, i) => (
          <QuestionBlock
            key={q.id}
            question={q}
            index={i + 1}
            answer={answers[q.id] ?? ''}
            onChange={val => setAnswer(q.id, val)}
          />
        ))}

        {/* Submit */}
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            className="kw-btn-secondary"
            onClick={() => { if (window.confirm('Abandon this attempt? Your answers will not be saved.')) setPhase('intro') }}
          >
            Abandon
          </button>
          <button
            className="kw-btn-primary"
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            style={{ padding: '0.85rem 2rem' }}
          >
            {submitting ? 'Submitting…' : `◉ Submit Quiz (${answeredCount}/${totalQuestions})`}
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────
  // RESULTS PHASE
  // ─────────────────────────────────────────────────
  if (phase === 'results' && result) {
    return (
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>
        <div className="kw-eyebrow" style={{ marginBottom: '1rem' }}>Quiz Results</div>
        <ResultsView
          result={result}
          quiz={quiz}
          courseId={courseId}
          lessonId={lessonId}
          onRetry={handleRetry}
          attemptsLeft={attemptsLeft - 1}
        />
      </div>
    )
  }

  return null
}
