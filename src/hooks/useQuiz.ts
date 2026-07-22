// ═══════════════════════════════════════════════════
// KlasWerk — useQuiz Hook
// ───────────────────────────────────────────────────
// All quiz-related Supabase queries.
// Mirrors the pattern from useLesson — pages stay thin.
//
// Usage:
//   const { fetchQuiz, submitAttempt, ... } = useQuiz()
// ═══════════════════════════════════════════════════

import { useState, useCallback } from 'react'
import { supabase, db } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Quiz, Question, QuestionType, QuestionOption } from '@/types'

// ── Extended types ───────────────────────────────────────────────────────────
export interface QuizWithQuestions extends Quiz {
  questions: Question[]
}

export interface AttemptResult {
  id: string
  score: number
  total_questions: number
  correct_answers: number
  percentage: number
  passed: boolean
  attempt_number: number
  started_at: string
  completed_at: string
  time_spent: number
  answers: Record<string, string>
  // Per-question feedback (computed client-side)
  feedback: QuestionFeedback[]
}

export interface QuestionFeedback {
  question_id: string
  question_text: string
  student_answer: string
  correct_answer: string
  is_correct: boolean
  explanation: string | null
  points: number
  points_earned: number
}

export interface AttemptSummary {
  id: string
  percentage: number
  passed: boolean
  attempt_number: number
  completed_at: string
  time_spent: number
}

// ── Form shapes ──────────────────────────────────────────────────────────────
export interface QuizFormData {
  title:         string
  description:   string
  time_limit:    number | ''   // '' = unlimited
  passing_score: number
  max_attempts:  number
}

export interface QuestionFormData {
  question_text:  string
  type:           QuestionType
  options:        QuestionOption[]   // only for mcq
  correct_answer: string
  explanation:    string
  order_index:    number
  points:         number
}

export const EMPTY_QUIZ_FORM: QuizFormData = {
  title:         '',
  description:   '',
  time_limit:    '',
  passing_score: 60,
  max_attempts:  3,
}

export const EMPTY_QUESTION_FORM: QuestionFormData = {
  question_text:  '',
  type:           'mcq',
  options:        [
    { label: 'A', value: '' },
    { label: 'B', value: '' },
    { label: 'C', value: '' },
    { label: 'D', value: '' },
  ],
  correct_answer: '',
  explanation:    '',
  order_index:    0,
  points:         1,
}

// ═══════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════
export function useQuiz() {
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // ── Fetch quiz by lesson ID (returns null if no quiz) ───────────────────
  const fetchQuizByLesson = useCallback(async (
    lessonId: string,
  ): Promise<QuizWithQuestions | null> => {
    const { data: quiz, error: qErr } = await db
      .from('quizzes')
      .select('*')
      .eq('lesson_id', lessonId)
      .maybeSingle()

    if (qErr) { setError(qErr.message); return null }
    if (!quiz) return null

    const quizData = quiz as any
    const { data: questions, error: qsErr } = await db
      .from('questions')
      .select('*')
      .eq('quiz_id', quizData.id)
      .order('order_index', { ascending: true })

    if (qsErr) { setError(qsErr.message); return null }

    return { ...quizData, questions: questions ?? [] } as QuizWithQuestions
  }, [])

  // ── Fetch quiz by quiz ID ────────────────────────────────────────────────
  const fetchQuiz = useCallback(async (
    quizId: string,
  ): Promise<QuizWithQuestions | null> => {
    setIsLoading(true)
    setError(null)

    const [{ data: quiz, error: qErr }, { data: questions, error: qsErr }] = await Promise.all([
      supabase.from('quizzes').select('*').eq('id', quizId).single(),
      supabase.from('questions').select('*').eq('quiz_id', quizId).order('order_index', { ascending: true }),
    ])

    setIsLoading(false)

    if (qErr)  { setError(qErr.message);  return null }
    if (qsErr) { setError(qsErr.message); return null }
    if (!quiz) return null

    return { ...(quiz as any), questions: questions ?? [] } as QuizWithQuestions
  }, [])

  // ── Create quiz ──────────────────────────────────────────────────────────
  const createQuiz = useCallback(async (
    lessonId: string,
    form: QuizFormData,
  ): Promise<Quiz | null> => {
    if (!user) return null
    setIsLoading(true)
    setError(null)

    const { data, error: err } = await db
      .from('quizzes')
      .insert({
        lesson_id:     lessonId,
        title:         form.title.trim(),
        description:   form.description.trim() || null,
        time_limit:    form.time_limit === '' ? null : Number(form.time_limit),
        passing_score: form.passing_score,
        max_attempts:  form.max_attempts,
      })
      .select()
      .single()

    setIsLoading(false)
    if (err) { setError(err.message); return null }
    return data
  }, [user])

  // ── Update quiz metadata ─────────────────────────────────────────────────
  const updateQuiz = useCallback(async (
    quizId: string,
    form: Partial<QuizFormData>,
  ): Promise<Quiz | null> => {
    if (!user) return null

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (form.title         !== undefined) patch.title         = form.title.trim()
    if (form.description   !== undefined) patch.description   = form.description.trim() || null
    if (form.time_limit    !== undefined) patch.time_limit    = form.time_limit === '' ? null : Number(form.time_limit)
    if (form.passing_score !== undefined) patch.passing_score = form.passing_score
    if (form.max_attempts  !== undefined) patch.max_attempts  = form.max_attempts

    const { data, error: err } = await db
      .from('quizzes')
      .update(patch)
      .eq('id', quizId)
      .select()
      .single()

    if (err) { setError(err.message); return null }
    return data
  }, [user])

  // ── Delete quiz (cascades to questions + attempts) ───────────────────────
  const deleteQuiz = useCallback(async (quizId: string): Promise<boolean> => {
    if (!user) return false
    const { error: err } = await db.from('quizzes').delete().eq('id', quizId)
    if (err) { setError(err.message); return false }
    return true
  }, [user])

  // ── Add question ─────────────────────────────────────────────────────────
  const addQuestion = useCallback(async (
    quizId: string,
    form: QuestionFormData,
  ): Promise<Question | null> => {
    if (!user) return null

    const payload: Record<string, unknown> = {
      quiz_id:       quizId,
      question_text: form.question_text.trim(),
      type:          form.type,
      correct_answer: form.correct_answer.trim(),
      explanation:   form.explanation.trim() || null,
      order_index:   form.order_index,
      points:        form.points,
      options:       null,
    }

    if (form.type === 'mcq') {
      // Only store options that have a value filled in
      const filledOptions = form.options.filter(o => o.value.trim())
      payload.options = filledOptions.length > 0 ? filledOptions : null
    }

    const { data, error: err } = await db
      .from('questions')
      .insert(payload)
      .select()
      .single()

    if (err) { setError(err.message); return null }
    return data
  }, [user])

  // ── Update question ──────────────────────────────────────────────────────
  const updateQuestion = useCallback(async (
    questionId: string,
    form: Partial<QuestionFormData>,
  ): Promise<Question | null> => {
    if (!user) return null

    const patch: Record<string, unknown> = {}
    if (form.question_text  !== undefined) patch.question_text  = form.question_text.trim()
    if (form.type           !== undefined) patch.type           = form.type
    if (form.correct_answer !== undefined) patch.correct_answer = form.correct_answer.trim()
    if (form.explanation    !== undefined) patch.explanation    = form.explanation.trim() || null
    if (form.order_index    !== undefined) patch.order_index    = form.order_index
    if (form.points         !== undefined) patch.points         = form.points
    if (form.options        !== undefined) {
      const filledOptions = (form.options ?? []).filter(o => o.value.trim())
      patch.options = filledOptions.length > 0 ? filledOptions : null
    }

    const { data, error: err } = await db
      .from('questions')
      .update(patch)
      .eq('id', questionId)
      .select()
      .single()

    if (err) { setError(err.message); return null }
    return data
  }, [user])

  // ── Delete question ──────────────────────────────────────────────────────
  const deleteQuestion = useCallback(async (questionId: string): Promise<boolean> => {
    if (!user) return false
    const { error: err } = await db.from('questions').delete().eq('id', questionId)
    if (err) { setError(err.message); return false }
    return true
  }, [user])

  // ── Reorder questions ────────────────────────────────────────────────────
  const reorderQuestions = useCallback(async (
    items: { id: string; order_index: number }[],
  ): Promise<boolean> => {
    if (!user) return false
    const results = await Promise.all(
      items.map(({ id, order_index }) =>
        db.from('questions').update({ order_index }).eq('id', id)
      )
    )
    return !results.some(r => r.error)
  }, [user])

  // ── Fetch attempt history for a quiz (student's own) ────────────────────
  const fetchAttempts = useCallback(async (
    quizId: string,
  ): Promise<AttemptSummary[]> => {
    if (!user) return []

    const { data, error: err } = await db
      .from('quiz_attempts')
      .select('id, percentage, passed, attempt_number, completed_at, time_spent')
      .eq('quiz_id', quizId)
      .eq('student_id', user.id)
      .order('attempt_number', { ascending: true })

    if (err) { setError(err.message); return [] }
    return data ?? []
  }, [user])

  // ── Fetch all attempts for a quiz (trainer view) ─────────────────────────
  const fetchAllAttempts = useCallback(async (quizId: string) => {
    const { data, error: err } = await db
      .from('quiz_attempts')
      .select('*, student:student_id(full_name, email)')
      .eq('quiz_id', quizId)
      .order('completed_at', { ascending: false })

    if (err) { setError(err.message); return [] }
    return data ?? []
  }, [])

  // ── Submit attempt — auto-grades and saves ───────────────────────────────
  const submitAttempt = useCallback(async (
    quiz: QuizWithQuestions,
    answers: Record<string, string>,  // { question_id: selected_answer }
    timeSpentSeconds: number,
  ): Promise<AttemptResult | null> => {
    if (!user) return null
    setIsLoading(true)
    setError(null)

    // ── 1. Auto-grade ────────────────────────────────────────────────────
    let totalPoints   = 0
    let earnedPoints  = 0
    let correctCount  = 0
    const feedback: QuestionFeedback[] = []

    for (const q of quiz.questions) {
      const studentAnswer = (answers[q.id] ?? '').trim().toLowerCase()
      const correctAnswer = (q.correct_answer ?? '').trim().toLowerCase()
      const isCorrect     = studentAnswer === correctAnswer

      if (isCorrect) {
        correctCount++
        earnedPoints += q.points
      }
      totalPoints += q.points

      feedback.push({
        question_id:    q.id,
        question_text:  q.question_text,
        student_answer: answers[q.id] ?? '',
        correct_answer: q.correct_answer,
        is_correct:     isCorrect,
        explanation:    q.explanation,
        points:         q.points,
        points_earned:  isCorrect ? q.points : 0,
      })
    }

    const percentage = totalPoints > 0
      ? Math.round((earnedPoints / totalPoints) * 100)
      : 0
    const passed = percentage >= quiz.passing_score

    // ── 2. Get attempt number ────────────────────────────────────────────
    const { count: prevCount } = await db
      .from('quiz_attempts')
      .select('id', { count: 'exact' })
      .eq('quiz_id', quiz.id)
      .eq('student_id', user.id)

    const attemptNumber = (prevCount ?? 0) + 1

    // ── 3. Save to DB ────────────────────────────────────────────────────
    const { data: saved, error: saveErr } = await db
      .from('quiz_attempts')
      .insert({
        student_id:      user.id,
        quiz_id:         quiz.id,
        score:           earnedPoints,
        total_questions: quiz.questions.length,
        correct_answers: correctCount,
        percentage,
        passed,
        answers,
        completed_at:    new Date().toISOString(),
        time_spent:      timeSpentSeconds,
        attempt_number:  attemptNumber,
      })
      .select()
      .single()

    setIsLoading(false)

    if (saveErr) { setError(saveErr.message); return null }

    // ── 4. Update best score on enrollment ───────────────────────────────
    // Fire and forget — non-blocking
    updateEnrollmentQuizScore(quiz, percentage).catch(console.error)

    return {
      ...saved,
      feedback,
    }
  }, [user])

  // ── Internal: update quiz_scores on enrollment ───────────────────────────
  async function updateEnrollmentQuizScore(quiz: Quiz, percentage: number) {
    if (!user) return

    // Get the course_id via lesson
    const { data: lesson } = await db
      .from('lessons')
      .select('course_id')
      .eq('id', quiz.lesson_id)
      .single()

    if (!lesson) return

    const { data: enrollment } = await db
      .from('enrollments')
      .select('id, quiz_scores')
      .eq('student_id', user.id)
      .eq('course_id', lesson.course_id)
      .single()

    if (!enrollment) return

    const currentScores: Record<string, number> = enrollment.quiz_scores ?? {}
    const prevBest = currentScores[quiz.id] ?? 0

    if (percentage > prevBest) {
      await db
        .from('enrollments')
        .update({
          quiz_scores: { ...currentScores, [quiz.id]: percentage },
          last_accessed: new Date().toISOString(),
        })
        .eq('id', enrollment.id)
    }
  }

  return {
    isLoading,
    error,
    fetchQuiz,
    fetchQuizByLesson,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    fetchAttempts,
    fetchAllAttempts,
    submitAttempt,
  }
}
