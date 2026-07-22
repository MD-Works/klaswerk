// ═══════════════════════════════════════════════════
// KlasWerk — Lesson Viewer
// ───────────────────────────────────────────────────
// Route: /courses/:courseId/lessons/:lessonId
//
// Two-column on desktop, stacked on mobile:
//   Left  — content: title, video, HTML, attachments
//   Right — navigation: lesson list, prev/next, progress
//
// Trainer: preview banner + Edit button
// Student (enrolled): Mark Complete button
// ═══════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLesson } from '@/hooks/useLesson'
import { useQuiz, type QuizWithQuestions } from '@/hooks/useQuiz'
import { useCertificate } from '@/hooks/useCertificate'
import { useToast } from '@/hooks/useToast'
import { getVideoEmbed, sanitiseHtml, getFileIcon } from '@/lib/utils'
import type { Lesson } from '@/types'
import { db } from '@/lib/supabase'

// ─────────────────────────────────────────────────
// Video embed component
// ─────────────────────────────────────────────────
function VideoEmbed({ url }: { url: string }) {
  const embed = getVideoEmbed(url)

  if (!embed) {
    return (
      <div style={{
        padding: '1rem 1.25rem',
        background: 'var(--kw-panel)',
        border: '1px solid var(--kw-border)',
        borderRadius: '4px',
        marginBottom: '1.5rem',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <span style={{ color: 'var(--kw-primary-dk)', fontSize: '1.1rem' }}>◉</span>
        <span style={{ color: 'var(--kw-muted)' }}>Video link:&nbsp;</span>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--kw-primary)', wordBreak: 'break-all' }}>
          {url}
        </a>
      </div>
    )
  }

  return (
    <div style={{
      position: 'relative',
      paddingBottom: '56.25%',
      height: 0,
      marginBottom: '1.5rem',
      borderRadius: '6px',
      overflow: 'hidden',
      border: '1px solid var(--kw-border)',
      background: 'var(--kw-black)',
    }}>
      <iframe
        src={embed.embedUrl}
        title="Lesson video"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

// ─────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────
export function LessonViewer() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>()
  const navigate  = useNavigate()
  const { user, isTrainer } = useAuth()
  const { fetchLesson, fetchLessons, markLessonComplete, isLoading } = useLesson()
  const { fetchQuizByLesson, fetchAttempts } = useQuiz()
  const { autoIssueCertificate } = useCertificate()
  const { toast } = useToast()

  const [lesson,      setLesson]      = useState<Lesson | null>(null)
  const [allLessons,  setAllLessons]  = useState<Lesson[]>([])
  const [courseTitle, setCourseTitle] = useState('')
  const [isEnrolled,  setIsEnrolled]  = useState(false)
  const [isOwnCourse, setIsOwnCourse] = useState(false)
  const [completed,   setCompleted]   = useState(false)
  const [completing,  setCompleting]  = useState(false)
  const [lessonQuiz,  setLessonQuiz]  = useState<QuizWithQuestions | null>(null)
  const [bestScore,   setBestScore]   = useState<number | null>(null)
  const [certIssued,  setCertIssued]  = useState(false)

  // ── Load everything in parallel ────────────────────────────────────────
  const load = useCallback(async () => {
    if (!courseId || !lessonId || !user) return

    const [lessonData, lessonsData, courseData] = await Promise.all([
      fetchLesson(lessonId),
      fetchLessons(courseId),
      db.from('courses').select('title, trainer_id').eq('id', courseId).single(),
    ])

    // Also fetch quiz for this lesson (non-blocking — don't await in parallel above to keep error handling clean)
    fetchQuizByLesson(lessonId).then(quiz => {
      setLessonQuiz(quiz)
      // If student, also fetch their best score
      if (quiz && user && !isTrainer) {
        fetchAttempts(quiz.id).then(attempts => {
          if (attempts.length > 0) {
            setBestScore(Math.max(...attempts.map(a => a.percentage)))
          }
        })
      }
    })

    if (!lessonData) { navigate(`/courses/${courseId}`); return }
    setLesson(lessonData)
    setAllLessons(lessonsData.filter(l => l.is_published || isTrainer))

    if (courseData.data) {
      const cd = courseData.data as any
      setCourseTitle(cd.title)
      setIsOwnCourse(cd.trainer_id === user.id)
    }

    // Check enrollment (students only)
    if (!isTrainer) {
      const { data: enrolData } = await db
        .from('enrollments')
        .select('id, lessons_completed, status')
        .eq('course_id', courseId)
        .eq('student_id', user.id)
        .single()

      if (enrolData) {
        setIsEnrolled(true)
        setCompleted((enrolData as any).status === 'completed')
      }
    }
  }, [courseId, lessonId, user, isTrainer])

  useEffect(() => { load() }, [load])

  // ── Navigation ─────────────────────────────────────────────────────────
  const currentIndex = allLessons.findIndex(l => l.id === lessonId)
  const prevLesson   = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson   = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null

  // ── Mark complete ──────────────────────────────────────────────────────
  async function handleMarkComplete() {
    if (!lessonId || !courseId) return
    setCompleting(true)
    const ok = await markLessonComplete(lessonId, courseId)
    setCompleting(false)

    if (!ok) {
      toast.error('Could not update progress.')
      return
    }

    setCompleted(true)

    // ── Auto-issue certificate when this is the last lesson ─────────────────
    const isLastLesson = !nextLesson
    if (isLastLesson && !certIssued) {
      // Small delay so enrollment progress update is persisted first
      setTimeout(async () => {
        try {
          const cert = await autoIssueCertificate(courseId)
          if (cert) {
            setCertIssued(true)
            toast.success('🎓 Certificate issued! Check your Certificates page.')
          } else {
            // Not yet at 100% progress — normal, don't toast an error
            toast.success('Lesson marked as complete ✓')
          }
        } catch {
          toast.success('Lesson marked as complete ✓')
        }
      }, 600)
    } else {
      toast.success('Lesson marked as complete ✓')
      // Auto-advance to next lesson after a moment
      if (nextLesson) {
        setTimeout(() => navigate(`/courses/${courseId}/lessons/${nextLesson.id}`), 800)
      }
    }
  }

  // ─────────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────────
  if (isLoading && !lesson) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--kw-muted)' }}>
        <div className="kw-spinner" style={{ margin: '0 auto 1rem' }} />
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>Loading lesson…</p>
      </div>
    )
  }

  if (!lesson) return null

  // ─────────────────────────────────────────────────
  // Progress bar width
  // ─────────────────────────────────────────────────
  const progressPct = allLessons.length > 0
    ? Math.round(((currentIndex + 1) / allLessons.length) * 100)
    : 0

  // ─────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0' }}>

      {/* ── Trainer preview banner ── */}
      {isTrainer && isOwnCourse && (
        <div style={{
          padding: '0.7rem 1.5rem',
          background: 'var(--kw-panel)',
          borderBottom: '1px solid var(--kw-primary-dk)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--kw-primary-dk)' }}>◈</span>
            <span style={{ color: 'var(--kw-muted)' }}>
              Trainer Preview — students see this page when enrolled
            </span>
          </div>
          <Link
            to={`/courses/${courseId}/lessons/${lessonId}/edit`}
            className="kw-btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.4rem 1rem' }}
          >
            Edit Lesson
          </Link>
        </div>
      )}

      {/* ── Main two-column layout ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 300px',
        gap: '0',
        minHeight: 'calc(100vh - 60px)',
      }}>

        {/* ══ LEFT — Content ══ */}
        <div style={{
          padding: '2rem 2.5rem 4rem',
          borderRight: '1px solid var(--kw-border)',
          overflowY: 'auto',
        }}>

          {/* Breadcrumb */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.75rem' }}>
            <Link to="/courses" style={{ color: 'var(--kw-muted)' }}>Courses</Link>
            <span style={{ color: 'var(--kw-border-lt)' }}>›</span>
            <Link to={`/courses/${courseId}`} style={{ color: 'var(--kw-muted)' }}>{courseTitle}</Link>
            <span style={{ color: 'var(--kw-border-lt)' }}>›</span>
            <span style={{ color: 'var(--kw-cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
              {lesson.title}
            </span>
          </nav>

          {/* Lesson title */}
          <h1 style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '1.6rem',
            fontWeight: 600,
            color: 'var(--kw-primary-lt)',
            marginBottom: '1.5rem',
            lineHeight: 1.3,
          }}>
            {lesson.title}
          </h1>

          {/* Video */}
          {lesson.video_url && <VideoEmbed url={lesson.video_url} />}

          {/* HTML content */}
          {lesson.content && (
            <div
              className="kw-lesson-content"
              dangerouslySetInnerHTML={{ __html: sanitiseHtml(lesson.content) }}
            />
          )}

          {/* Empty state */}
          {!lesson.content && !lesson.video_url && (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              border: '1px dashed var(--kw-border)',
              borderRadius: '4px',
              color: 'var(--kw-border-lt)',
            }}>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: '1.1rem' }}>
                This lesson has no content yet.
              </p>
              {isTrainer && isOwnCourse && (
                <Link
                  to={`/courses/${courseId}/lessons/${lessonId}/edit`}
                  className="kw-btn-secondary"
                  style={{ marginTop: '1rem', display: 'inline-flex' }}
                >
                  Add Content
                </Link>
              )}
            </div>
          )}

          {/* Attachments */}
          {lesson.attachments && lesson.attachments.length > 0 && (
            <div style={{ marginTop: '2.5rem' }}>
              <div className="kw-eyebrow" style={{ marginBottom: '1rem' }}>Attachments</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {lesson.attachments.map((a, i) => (
                  <a
                    key={i}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.7rem 1rem',
                      background: 'var(--kw-surface)',
                      border: '1px solid var(--kw-border)',
                      borderRadius: '4px',
                      color: 'var(--kw-cream)',
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--kw-primary-dk)')}
                    onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--kw-border)')}
                  >
                    <span style={{ color: 'var(--kw-primary-dk)', fontSize: '1rem' }}>{getFileIcon(a.type)}</span>
                    <span style={{ flex: 1 }}>{a.name}</span>
                    <span style={{ color: 'var(--kw-border-lt)', fontSize: '0.72rem' }}>↗ Download</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Mark Complete button (enrolled students only) */}
          {isEnrolled && !isTrainer && (
            <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--kw-border)' }}>
              {completed ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  color: 'var(--kw-success)',
                  fontFamily: 'Syne, sans-serif',
                  fontSize: '0.88rem',
                }}>
                  <span style={{ fontSize: '1.2rem' }}>✓</span>
                  Lesson completed
                  {nextLesson && (
                    <button
                      onClick={() => navigate(`/courses/${courseId}/lessons/${nextLesson.id}`)}
                      className="kw-btn-primary"
                      style={{ marginLeft: '1rem' }}
                    >
                      Next Lesson →
                    </button>
                  )}
                </div>
              ) : (
                <button
                  className="kw-btn-primary"
                  onClick={handleMarkComplete}
                  disabled={completing}
                  style={{ padding: '0.85rem 2rem' }}
                >
                  {completing ? '…' : '✓ Mark as Complete'}
                </button>
              )}
            </div>
          )}

          {/* Quiz CTA — shown when lesson has a quiz */}
          {lessonQuiz && (
            <div style={{
              marginTop: '2.5rem',
              padding: '1.25rem 1.5rem',
              background: 'rgba(201,148,60,.06)',
              border: '1px solid var(--kw-primary-dk)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: 'var(--kw-primary-lt)', marginBottom: '0.2rem' }}>
                  ✦ &nbsp;{lessonQuiz.title}
                </div>
                <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', color: 'var(--kw-muted)', letterSpacing: '0.08em' }}>
                  {lessonQuiz.questions.length} question{lessonQuiz.questions.length !== 1 ? 's' : ''}
                  &nbsp;·&nbsp; {lessonQuiz.passing_score}% to pass
                  {bestScore !== null && ` · Best: ${bestScore}%`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0 }}>
                {isTrainer && isOwnCourse && (
                  <Link
                    to={`/courses/${courseId}/lessons/${lessonId}/quiz`}
                    className="kw-btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem' }}
                  >
                    Edit Quiz
                  </Link>
                )}
                <Link
                  to={`/quizzes/${lessonQuiz.id}`}
                  className="kw-btn-primary"
                  style={{ fontSize: '0.82rem' }}
                >
                  {bestScore !== null && bestScore >= lessonQuiz.passing_score
                    ? '◉ Retake Quiz'
                    : '◉ Take Quiz'}
                </Link>
              </div>
            </div>
          )}

          {/* Trainer: add quiz link when no quiz exists yet */}
          {isTrainer && isOwnCourse && !lessonQuiz && (
            <div style={{ marginTop: '2rem' }}>
              <Link
                to={`/courses/${courseId}/lessons/${lessonId}/quiz`}
                className="kw-btn-secondary"
                style={{ fontSize: '0.78rem' }}
              >
                + Add Quiz to this Lesson
              </Link>
            </div>
          )}

          {/* Prev/next navigation at bottom */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '3rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--kw-border)',
          }}>
            {prevLesson ? (
              <button
                onClick={() => navigate(`/courses/${courseId}/lessons/${prevLesson.id}`)}
                className="kw-btn-secondary"
              >
                ← {prevLesson.title}
              </button>
            ) : <span />}

            {nextLesson && (
              <button
                onClick={() => navigate(`/courses/${courseId}/lessons/${nextLesson.id}`)}
                className="kw-btn-secondary"
              >
                {nextLesson.title} →
              </button>
            )}
          </div>

        </div>

        {/* ══ RIGHT — Sidebar navigation ══ */}
        <aside style={{
          padding: '2rem 1.25rem',
          background: 'var(--kw-black)',
          borderLeft: '1px solid var(--kw-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          position: 'sticky',
          top: 0,
          maxHeight: '100vh',
          overflowY: 'auto',
        }}>

          {/* Course title */}
          <div>
            <div className="kw-eyebrow" style={{ marginBottom: '0.4rem' }}>Course</div>
            <Link to={`/courses/${courseId}`} style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '0.82rem',
              color: 'var(--kw-cream)',
              textDecoration: 'none',
              lineHeight: 1.4,
              display: 'block',
            }}>
              {courseTitle}
            </Link>
          </div>

          {/* Progress indicator */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
              fontSize: '0.72rem',
            }}>
              <span style={{ color: 'var(--kw-muted)', fontFamily: 'Syne Mono, monospace', letterSpacing: '0.05em' }}>
                Lesson {currentIndex + 1} of {allLessons.length}
              </span>
              <span style={{ color: 'var(--kw-primary)', fontFamily: 'Syne Mono, monospace' }}>
                {progressPct}%
              </span>
            </div>
            <div style={{
              height: '3px',
              background: 'var(--kw-border)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg, var(--kw-primary-dk), var(--kw-primary))',
                borderRadius: '2px',
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>

          <div className="kw-divider" style={{ margin: '0' }} />

          {/* Lesson list */}
          <div>
            <div className="kw-eyebrow" style={{ marginBottom: '0.75rem' }}>Lessons</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {allLessons.map((l, i) => {
                const isCurrent = l.id === lessonId
                return (
                  <button
                    key={l.id}
                    onClick={() => navigate(`/courses/${courseId}/lessons/${l.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.6rem',
                      padding: '0.5rem 0.6rem',
                      background: isCurrent ? 'var(--kw-surface)' : 'transparent',
                      border: isCurrent ? '1px solid var(--kw-primary-dk)' : '1px solid transparent',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                      width: '100%',
                    }}
                    onMouseOver={e => { if (!isCurrent) e.currentTarget.style.background = 'var(--kw-panel)' }}
                    onMouseOut={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{
                      fontFamily: 'Syne Mono, monospace',
                      fontSize: '0.65rem',
                      color: isCurrent ? 'var(--kw-primary)' : 'var(--kw-border-lt)',
                      marginTop: '2px',
                      flexShrink: 0,
                    }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span style={{
                      fontSize: '0.8rem',
                      color: isCurrent ? 'var(--kw-primary-lt)' : 'var(--kw-muted)',
                      lineHeight: 1.4,
                      fontFamily: isCurrent ? 'Cinzel, serif' : 'Raleway, sans-serif',
                    }}>
                      {l.title}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Back to course */}
          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--kw-border)' }}>
            <Link
              to={`/courses/${courseId}`}
              style={{ fontSize: '0.75rem', color: 'var(--kw-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              ← Back to course overview
            </Link>
          </div>

        </aside>
      </div>

    </div>
  )
}
