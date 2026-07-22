// ═══════════════════════════════════════════════════
// KlasWerk — Quiz Builder (Trainer only)
// ───────────────────────────────────────────────────
// Route: /courses/:courseId/lessons/:lessonId/quiz
//
// Three panels:
//   1. Quiz settings (title, timer, pass score, attempts)
//   2. Question list with add/edit/delete
//   3. Question editor (inline, slides open below the list)
// ═══════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  useQuiz,
  type QuizWithQuestions,
  type QuizFormData,
  type QuestionFormData,
  EMPTY_QUIZ_FORM,
  EMPTY_QUESTION_FORM,
} from '@/hooks/useQuiz'
import { useToast } from '@/hooks/useToast'
import type { Question, QuestionType } from '@/types'
import { db } from '@/lib/supabase'

// ─────────────────────────────────────────────────
// Question type labels
// ─────────────────────────────────────────────────
const TYPE_LABELS: Record<QuestionType, string> = {
  mcq:        'Multiple Choice',
  truefalse:  'True / False',
  fill_blank: 'Fill in the Blank',
}

// ─────────────────────────────────────────────────
// Question Editor (inline panel)
// ─────────────────────────────────────────────────
function QuestionEditor({
  initial,
  index,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: QuestionFormData
  index: number
  onSave: (form: QuestionFormData) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [form, setForm] = useState<QuestionFormData>(initial)

  function set<K extends keyof QuestionFormData>(key: K, value: QuestionFormData[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function setOption(i: number, value: string) {
    const next = [...form.options]
    next[i] = { ...next[i], value }
    set('options', next)
  }

  function addOption() {
    if (form.options.length >= 6) return
    const labels = ['A', 'B', 'C', 'D', 'E', 'F']
    set('options', [...form.options, { label: labels[form.options.length], value: '' }])
  }

  function removeOption(i: number) {
    const next = form.options.filter((_, idx) => idx !== i)
    set('options', next)
    // Clear correct_answer if it was this option's label
    if (form.correct_answer === form.options[i]?.label) set('correct_answer', '')
  }

  function handleTypeChange(type: QuestionType) {
    set('type', type)
    set('correct_answer', '')
    if (type === 'truefalse') set('options', [])
    if (type === 'mcq' && form.options.length === 0) {
      set('options', [
        { label: 'A', value: '' }, { label: 'B', value: '' },
        { label: 'C', value: '' }, { label: 'D', value: '' },
      ])
    }
  }

  const isValid =
    form.question_text.trim() &&
    form.correct_answer.trim() &&
    (form.type !== 'mcq' || form.options.filter(o => o.value.trim()).length >= 2)

  return (
    <div style={{
      background: 'var(--kw-panel)',
      border: '1px solid var(--kw-primary-dk)',
      borderRadius: '6px',
      padding: '1.5rem',
      marginTop: '0.5rem',
    }}>
      <div className="kw-eyebrow" style={{ marginBottom: '1rem' }}>
        Question {index} Editor
      </div>

      {/* Question text */}
      <div style={{ marginBottom: '1rem' }}>
        <label className="kw-label">Question *</label>
        <textarea
          className="kw-input"
          value={form.question_text}
          onChange={e => set('question_text', e.target.value)}
          rows={2}
          placeholder="Enter the question…"
          style={{ resize: 'vertical' }}
        />
      </div>

      {/* Type + Points row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label className="kw-label">Question Type</label>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {(['mcq', 'truefalse', 'fill_blank'] as QuestionType[]).map(t => (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.72rem',
                  fontFamily: 'Syne, sans-serif',
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  borderRadius: '3px',
                  border: '1px solid var(--kw-border-lt)',
                  background: form.type === t
                    ? 'linear-gradient(135deg, var(--kw-primary-dk), var(--kw-primary))'
                    : 'transparent',
                  color: form.type === t ? 'var(--kw-black)' : 'var(--kw-muted)',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        <div style={{ minWidth: '80px' }}>
          <label className="kw-label">Points</label>
          <input
            className="kw-input"
            type="number"
            min={1}
            max={10}
            value={form.points}
            onChange={e => set('points', Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>
      </div>

      {/* MCQ options */}
      {form.type === 'mcq' && (
        <div style={{ marginBottom: '1rem' }}>
          <label className="kw-label">Answer Options * (mark the correct one)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
            {form.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Radio = select as correct */}
                <input
                  type="radio"
                  name="correct_mcq"
                  checked={form.correct_answer === opt.label}
                  onChange={() => set('correct_answer', opt.label)}
                  style={{ accentColor: 'var(--kw-primary)', flexShrink: 0 }}
                  title="Mark as correct answer"
                />
                <span style={{
                  fontFamily: 'Syne Mono, monospace',
                  fontSize: '0.7rem',
                  color: 'var(--kw-primary-dk)',
                  minWidth: '16px',
                }}>
                  {opt.label}
                </span>
                <input
                  className="kw-input"
                  style={{ flex: 1 }}
                  placeholder={`Option ${opt.label}`}
                  value={opt.value}
                  onChange={e => setOption(i, e.target.value)}
                />
                {form.options.length > 2 && (
                  <button
                    onClick={() => removeOption(i)}
                    style={{ background: 'none', border: 'none', color: 'var(--kw-danger)', cursor: 'pointer', fontSize: '1rem', padding: '0 0.25rem' }}
                  >×</button>
                )}
              </div>
            ))}
          </div>
          {form.options.length < 6 && (
            <button className="kw-btn-secondary" onClick={addOption} style={{ fontSize: '0.72rem', padding: '0.3rem 0.8rem' }}>
              + Add Option
            </button>
          )}
          {!form.correct_answer && (
            <p style={{ fontSize: '0.7rem', color: 'var(--kw-danger)', marginTop: '0.4rem' }}>
              ○ Select the correct answer using the radio button.
            </p>
          )}
        </div>
      )}

      {/* True / False */}
      {form.type === 'truefalse' && (
        <div style={{ marginBottom: '1rem' }}>
          <label className="kw-label">Correct Answer *</label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {['true', 'false'].map(val => (
              <label key={val} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1.25rem',
                background: form.correct_answer === val ? 'rgba(201,148,60,.12)' : 'var(--kw-surface)',
                border: `1px solid ${form.correct_answer === val ? 'var(--kw-primary-dk)' : 'var(--kw-border)'}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                color: form.correct_answer === val ? 'var(--kw-primary-lt)' : 'var(--kw-muted)',
              }}>
                <input
                  type="radio"
                  name="correct_tf"
                  value={val}
                  checked={form.correct_answer === val}
                  onChange={() => set('correct_answer', val)}
                  style={{ accentColor: 'var(--kw-primary)' }}
                />
                {val === 'true' ? 'True' : 'False'}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Fill in the blank */}
      {form.type === 'fill_blank' && (
        <div style={{ marginBottom: '1rem' }}>
          <label className="kw-label">Correct Answer * (exact text match, case-insensitive)</label>
          <input
            className="kw-input"
            placeholder="The answer students must type"
            value={form.correct_answer}
            onChange={e => set('correct_answer', e.target.value)}
          />
          <p style={{ fontSize: '0.7rem', color: 'var(--kw-border-lt)', marginTop: '0.3rem' }}>
            Student input is trimmed and lowercased before comparison.
          </p>
        </div>
      )}

      {/* Explanation */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label className="kw-label">Explanation (shown after attempt)</label>
        <textarea
          className="kw-input"
          value={form.explanation}
          onChange={e => set('explanation', e.target.value)}
          rows={2}
          placeholder="Why is this the correct answer? (optional)"
          style={{ resize: 'vertical' }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button className="kw-btn-secondary" onClick={onCancel}>Cancel</button>
        <button
          className="kw-btn-primary"
          onClick={() => onSave(form)}
          disabled={!isValid || isSaving}
        >
          {isSaving ? '…' : '◉ Save Question'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// Main QuizBuilder
// ─────────────────────────────────────────────────
export function QuizBuilder() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>()
  const { toast } = useToast()
  const {
    fetchQuizByLesson, createQuiz, updateQuiz, deleteQuiz,
    addQuestion, updateQuestion, deleteQuestion,
  } = useQuiz()

  const [quiz,        setQuiz]        = useState<QuizWithQuestions | null>(null)
  const [quizForm,    setQuizForm]    = useState<QuizFormData>(EMPTY_QUIZ_FORM)
  const [lessonTitle, setLessonTitle] = useState('')
  const [courseTitle, setCourseTitle] = useState('')

  // Question editor state
  const [editingId,   setEditingId]   = useState<string | 'new' | null>(null)
  const [editForm,    setEditForm]    = useState<QuestionFormData>(EMPTY_QUESTION_FORM)
  const [savingQ,     setSavingQ]     = useState(false)
  const [savingMeta,  setSavingMeta]  = useState(false)

  const load = useCallback(async () => {
    if (!lessonId || !courseId) return

    const [quizData, lessonRes, courseRes] = await Promise.all([
      fetchQuizByLesson(lessonId),
      db.from('lessons').select('title').eq('id', lessonId).single(),
      db.from('courses').select('title').eq('id', courseId).single(),
    ])

    if (quizData) {
      setQuiz(quizData)
      setQuizForm({
        title:         quizData.title,
        description:   quizData.description ?? '',
        time_limit:    quizData.time_limit ?? '',
        passing_score: quizData.passing_score,
        max_attempts:  quizData.max_attempts,
      })
    }
    if (lessonRes.data) setLessonTitle((lessonRes.data as any).title)
    if (courseRes.data) setCourseTitle((courseRes.data as any).title)
  }, [lessonId, courseId])

  useEffect(() => { load() }, [load])

  // ── Quiz meta save / create ─────────────────────────────────────────────
  async function handleSaveMeta() {
    if (!quizForm.title.trim()) { toast.error('Quiz title is required.'); return }
    setSavingMeta(true)
    if (quiz) {
      const updated = await updateQuiz(quiz.id, quizForm)
      if (updated) { setQuiz(q => q ? { ...q, ...updated } : q); toast.success('Quiz settings saved.') }
      else toast.error('Failed to save quiz settings.')
    } else {
      const created = await createQuiz(lessonId!, quizForm)
      if (created) { await load(); toast.success('Quiz created!') }
      else toast.error('Failed to create quiz.')
    }
    setSavingMeta(false)
  }

  // ── Delete quiz ─────────────────────────────────────────────────────────
  async function handleDeleteQuiz() {
    if (!quiz || !window.confirm('Delete this entire quiz including all questions and student attempts? This cannot be undone.')) return
    const ok = await deleteQuiz(quiz.id)
    if (ok) { toast.success('Quiz deleted.'); setQuiz(null); setQuizForm(EMPTY_QUIZ_FORM) }
    else toast.error('Failed to delete quiz.')
  }

  // ── Open editor for new question ────────────────────────────────────────
  function openNewQuestion() {
    setEditForm({
      ...EMPTY_QUESTION_FORM,
      order_index: quiz ? quiz.questions.length : 0,
    })
    setEditingId('new')
  }

  // ── Open editor for existing question ──────────────────────────────────
  function openEditQuestion(q: Question) {
    setEditForm({
      question_text:  q.question_text,
      type:           q.type,
      options:        q.options ?? [
        { label: 'A', value: '' }, { label: 'B', value: '' },
        { label: 'C', value: '' }, { label: 'D', value: '' },
      ],
      correct_answer: q.correct_answer,
      explanation:    q.explanation ?? '',
      order_index:    q.order_index,
      points:         q.points,
    })
    setEditingId(q.id)
  }

  // ── Save question (add or update) ───────────────────────────────────────
  async function handleSaveQuestion(form: QuestionFormData) {
    if (!quiz) return
    setSavingQ(true)

    if (editingId === 'new') {
      const created = await addQuestion(quiz.id, form)
      if (created) {
        setQuiz(q => q ? { ...q, questions: [...q.questions, created] } : q)
        toast.success('Question added.')
        setEditingId(null)
      } else {
        toast.error('Failed to add question.')
      }
    } else if (editingId) {
      const updated = await updateQuestion(editingId, form)
      if (updated) {
        setQuiz(q => q ? {
          ...q,
          questions: q.questions.map(qq => qq.id === editingId ? updated : qq),
        } : q)
        toast.success('Question updated.')
        setEditingId(null)
      } else {
        toast.error('Failed to update question.')
      }
    }
    setSavingQ(false)
  }

  // ── Delete question ─────────────────────────────────────────────────────
  async function handleDeleteQuestion(qId: string) {
    if (!window.confirm('Delete this question?')) return
    const ok = await deleteQuestion(qId)
    if (ok) {
      setQuiz(q => q ? { ...q, questions: q.questions.filter(qq => qq.id !== qId) } : q)
      toast.success('Question deleted.')
      if (editingId === qId) setEditingId(null)
    } else {
      toast.error('Failed to delete question.')
    }
  }

  const totalPoints = quiz?.questions.reduce((sum, q) => sum + q.points, 0) ?? 0

  // ─────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.78rem' }}>
        <Link to="/courses" style={{ color: 'var(--kw-muted)' }}>Courses</Link>
        <span style={{ color: 'var(--kw-border-lt)' }}>›</span>
        <Link to={`/courses/${courseId}`} style={{ color: 'var(--kw-muted)' }}>{courseTitle || 'Course'}</Link>
        <span style={{ color: 'var(--kw-border-lt)' }}>›</span>
        <Link to={`/courses/${courseId}/lessons/${lessonId}`} style={{ color: 'var(--kw-muted)' }}>{lessonTitle || 'Lesson'}</Link>
        <span style={{ color: 'var(--kw-border-lt)' }}>›</span>
        <span style={{ color: 'var(--kw-cream)' }}>Quiz Builder</span>
      </nav>

      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="kw-eyebrow" style={{ marginBottom: '0.5rem' }}>Quiz Builder</div>
        <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.5rem', fontWeight: 600, color: 'var(--kw-primary-lt)', margin: 0 }}>
          {quiz ? quiz.title : 'New Quiz'}
        </h1>
        {quiz && (
          <p style={{ fontSize: '0.8rem', color: 'var(--kw-muted)', marginTop: '0.4rem', fontFamily: 'Syne Mono, monospace' }}>
            {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''} · {totalPoints} point{totalPoints !== 1 ? 's' : ''} total
          </p>
        )}
      </div>

      <div className="kw-divider" />

      {/* ══ SECTION 1: Quiz Settings ══ */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', fontWeight: 600, color: 'var(--kw-primary-lt)', letterSpacing: '0.06em', marginBottom: '1.25rem' }}>
          Quiz Settings
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="kw-label">Quiz Title *</label>
            <input className="kw-input" placeholder="e.g. Module 1 Assessment" value={quizForm.title}
              onChange={e => setQuizForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          <div>
            <label className="kw-label">Description</label>
            <textarea className="kw-input" rows={2} placeholder="Instructions for students (optional)"
              value={quizForm.description} style={{ resize: 'vertical' }}
              onChange={e => setQuizForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="kw-label">Time Limit (minutes)</label>
              <input className="kw-input" type="number" min={1} placeholder="None"
                value={quizForm.time_limit}
                onChange={e => setQuizForm(f => ({ ...f, time_limit: e.target.value === '' ? '' : parseInt(e.target.value) }))} />
              <p style={{ fontSize: '0.68rem', color: 'var(--kw-border-lt)', marginTop: '0.3rem' }}>Leave blank for unlimited</p>
            </div>
            <div>
              <label className="kw-label">Passing Score (%)</label>
              <input className="kw-input" type="number" min={1} max={100}
                value={quizForm.passing_score}
                onChange={e => setQuizForm(f => ({ ...f, passing_score: parseInt(e.target.value) || 60 }))} />
            </div>
            <div>
              <label className="kw-label">Max Attempts</label>
              <input className="kw-input" type="number" min={1} max={10}
                value={quizForm.max_attempts}
                onChange={e => setQuizForm(f => ({ ...f, max_attempts: parseInt(e.target.value) || 3 }))} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button className="kw-btn-primary" onClick={handleSaveMeta} disabled={savingMeta}>
            {savingMeta ? '…' : quiz ? '◉ Save Settings' : '◉ Create Quiz'}
          </button>
          {quiz && (
            <button className="kw-btn-secondary" onClick={handleDeleteQuiz}
              style={{ color: 'var(--kw-danger)', borderColor: 'var(--kw-danger)33' }}>
              Delete Quiz
            </button>
          )}
        </div>
      </section>

      <div className="kw-divider" />

      {/* ══ SECTION 2: Questions ══ */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', fontWeight: 600, color: 'var(--kw-primary-lt)', letterSpacing: '0.06em', margin: 0 }}>
            Questions
          </h2>
          {quiz && editingId === null && (
            <button className="kw-btn-secondary" onClick={openNewQuestion}
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem' }}>
              + Add Question
            </button>
          )}
        </div>

        {!quiz && (
          <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--kw-border)', borderRadius: '6px', color: 'var(--kw-border-lt)', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>
            Create the quiz above first, then add questions.
          </div>
        )}

        {quiz && quiz.questions.length === 0 && editingId === null && (
          <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--kw-border-lt)', borderRadius: '6px', color: 'var(--kw-muted)', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>
            ✦ &nbsp; No questions yet — add the first one above
          </div>
        )}

        {/* Question list */}
        {quiz && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {quiz.questions.map((q, idx) => (
              <div key={q.id}>
                {/* Question row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.9rem 1rem',
                  background: editingId === q.id ? 'rgba(201,148,60,.05)' : 'var(--kw-surface)',
                  border: `1px solid ${editingId === q.id ? 'var(--kw-primary-dk)' : 'var(--kw-border)'}`,
                  borderRadius: editingId === q.id ? '6px 6px 0 0' : '6px',
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', color: 'var(--kw-primary-dk)', minWidth: '1.5rem', paddingTop: '2px' }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', color: 'var(--kw-cream)', fontFamily: 'Raleway, sans-serif', lineHeight: 1.5 }}>
                      {q.question_text}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem' }}>
                      <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', color: 'var(--kw-primary-dk)', letterSpacing: '0.08em' }}>
                        {TYPE_LABELS[q.type]}
                      </span>
                      <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', color: 'var(--kw-muted)' }}>
                        {q.points} pt{q.points !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <button
                      onClick={() => editingId === q.id ? setEditingId(null) : openEditQuestion(q)}
                      style={{ padding: '0.25rem 0.6rem', background: 'transparent', border: '1px solid var(--kw-border-lt)', borderRadius: '3px', color: 'var(--kw-muted)', fontFamily: 'Syne, sans-serif', fontSize: '0.65rem', cursor: 'pointer' }}
                    >
                      {editingId === q.id ? 'Close' : 'Edit'}
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      style={{ padding: '0.25rem 0.5rem', background: 'transparent', border: '1px solid transparent', borderRadius: '3px', color: 'var(--kw-danger)', cursor: 'pointer', fontSize: '0.85rem' }}
                    >×</button>
                  </div>
                </div>

                {/* Inline editor */}
                {editingId === q.id && (
                  <QuestionEditor
                    initial={editForm}
                    index={idx + 1}
                    onSave={handleSaveQuestion}
                    onCancel={() => setEditingId(null)}
                    isSaving={savingQ}
                  />
                )}
              </div>
            ))}

            {/* New question editor at bottom */}
            {editingId === 'new' && (
              <QuestionEditor
                initial={editForm}
                index={quiz.questions.length + 1}
                onSave={handleSaveQuestion}
                onCancel={() => setEditingId(null)}
                isSaving={savingQ}
              />
            )}
          </div>
        )}

        {/* Bottom add button */}
        {quiz && editingId === null && quiz.questions.length > 0 && (
          <button className="kw-btn-secondary" onClick={openNewQuestion}
            style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
            + Add Another Question
          </button>
        )}
      </section>

      {/* Back link */}
      <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--kw-border)' }}>
        <Link to={`/courses/${courseId}/lessons/${lessonId}`}
          style={{ fontSize: '0.82rem', color: 'var(--kw-muted)' }}>
          ← Back to lesson
        </Link>
      </div>

    </div>
  )
}
