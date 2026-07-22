// ═══════════════════════════════════════════════════
// KlasWerk — useLesson Hook
// ───────────────────────────────────────────────────
// Encapsulates all lesson-related Supabase queries.
// Mirrors the pattern from useCourse — pages stay thin.
//
// Usage:
//   const { fetchLessons, createLesson, ... } = useLesson()
// ═══════════════════════════════════════════════════

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Lesson, Attachment } from '@/types'

// ── Form shape ───────────────────────────────────────────────────────────────
export interface LessonFormData {
  title:       string
  content:     string       // HTML
  video_url:   string
  attachments: Attachment[]
  order_index: number | ''
  is_published: boolean
}

export const EMPTY_LESSON_FORM: LessonFormData = {
  title:       '',
  content:     '',
  video_url:   '',
  attachments: [],
  order_index: '',
  is_published: false,
}

// ═══════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════
export function useLesson() {
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch all lessons for a course ──────────────────────────────────────
  const fetchLessons = useCallback(async (courseId: string): Promise<Lesson[]> => {
    setIsLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })

    setIsLoading(false)

    if (err) {
      setError(err.message)
      return []
    }

    return data ?? []
  }, [])

  // ── Fetch a single lesson ────────────────────────────────────────────────
  const fetchLesson = useCallback(async (lessonId: string): Promise<Lesson | null> => {
    setIsLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single()

    setIsLoading(false)

    if (err) {
      setError(err.message)
      return null
    }

    return data
  }, [])

  // ── Create a new lesson ──────────────────────────────────────────────────
  const createLesson = useCallback(async (
    courseId: string,
    form: LessonFormData,
  ): Promise<Lesson | null> => {
    if (!user) return null
    setIsLoading(true)
    setError(null)

    // Auto-assign order_index if not provided — put at end
    let orderIndex = typeof form.order_index === 'number' ? form.order_index : 0
    if (!form.order_index && form.order_index !== 0) {
      const { count } = await supabase
        .from('lessons')
        .select('id', { count: 'exact' })
        .eq('course_id', courseId)
      orderIndex = (count ?? 0)
    }

    const { data, error: err } = await supabase
      .from('lessons')
      .insert({
        course_id:    courseId,
        title:        form.title.trim(),
        content:      form.content || null,
        video_url:    form.video_url.trim() || null,
        attachments:  form.attachments.length > 0 ? form.attachments : null,
        order_index:  orderIndex,
        is_published: form.is_published,
      })
      .select()
      .single()

    setIsLoading(false)

    if (err) {
      setError(err.message)
      return null
    }

    return data
  }, [user])

  // ── Update an existing lesson ────────────────────────────────────────────
  const updateLesson = useCallback(async (
    lessonId: string,
    updates: Partial<LessonFormData>,
  ): Promise<Lesson | null> => {
    if (!user) return null
    setIsLoading(true)
    setError(null)

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (updates.title       !== undefined) patch.title        = updates.title.trim()
    if (updates.content     !== undefined) patch.content      = updates.content || null
    if (updates.video_url   !== undefined) patch.video_url    = updates.video_url.trim() || null
    if (updates.attachments !== undefined) patch.attachments  = updates.attachments.length > 0 ? updates.attachments : null
    if (updates.order_index !== undefined) patch.order_index  = updates.order_index
    if (updates.is_published !== undefined) patch.is_published = updates.is_published

    const { data, error: err } = await supabase
      .from('lessons')
      .update(patch)
      .eq('id', lessonId)
      .select()
      .single()

    setIsLoading(false)

    if (err) {
      setError(err.message)
      return null
    }

    return data
  }, [user])

  // ── Delete a lesson ──────────────────────────────────────────────────────
  const deleteLesson = useCallback(async (lessonId: string): Promise<boolean> => {
    if (!user) return false
    setIsLoading(true)
    setError(null)

    const { error: err } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId)

    setIsLoading(false)

    if (err) {
      setError(err.message)
      return false
    }

    return true
  }, [user])

  // ── Toggle lesson published state ────────────────────────────────────────
  const publishLesson = useCallback(async (
    lessonId: string,
    published: boolean,
  ): Promise<boolean> => {
    if (!user) return false

    const { error: err } = await supabase
      .from('lessons')
      .update({ is_published: published, updated_at: new Date().toISOString() })
      .eq('id', lessonId)

    if (err) {
      setError(err.message)
      return false
    }

    return true
  }, [user])

  // ── Batch reorder lessons ────────────────────────────────────────────────
  const reorderLessons = useCallback(async (
    items: { id: string; order_index: number }[],
  ): Promise<boolean> => {
    if (!user) return false

    // Fire all updates in parallel
    const results = await Promise.all(
      items.map(({ id, order_index }) =>
        supabase
          .from('lessons')
          .update({ order_index, updated_at: new Date().toISOString() })
          .eq('id', id)
      )
    )

    const failed = results.some(r => r.error)
    if (failed) {
      setError('Some lessons failed to reorder')
      return false
    }

    return true
  }, [user])

  // ── Mark lesson complete & update enrollment progress ────────────────────
  const markLessonComplete = useCallback(async (
    lessonId: string,
    courseId: string,
  ): Promise<boolean> => {
    if (!user) return false

    // 1. Get current enrollment
    const { data: enrollment, error: enrollErr } = await supabase
      .from('enrollments')
      .select('id, lessons_completed, status')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .single()

    if (enrollErr || !enrollment) return false

    // 2. Get total published lessons — run in parallel with the insert check
    const { count: totalLessons } = await supabase
      .from('lessons')
      .select('id', { count: 'exact' })
      .eq('course_id', courseId)
      .eq('is_published', true)

    const total = totalLessons ?? 1

    // 3. Cap: don't exceed total
    const currentCompleted = enrollment.lessons_completed ?? 0
    if (currentCompleted >= total) return true // already maxed

    const newCompleted = currentCompleted + 1
    const progress     = Math.min(100, Math.round((newCompleted / total) * 100))
    const status       = progress >= 100 ? 'completed' : 'in_progress'

    // 4. Update enrollment
    const { error: updateErr } = await supabase
      .from('enrollments')
      .update({
        lessons_completed: newCompleted,
        progress,
        status,
        last_accessed: new Date().toISOString(),
        completed_at:  status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', enrollment.id)

    if (updateErr) {
      setError(updateErr.message)
      return false
    }

    return true
  }, [user])

  return {
    isLoading,
    error,
    fetchLessons,
    fetchLesson,
    createLesson,
    updateLesson,
    deleteLesson,
    publishLesson,
    reorderLessons,
    markLessonComplete,
  }
}
