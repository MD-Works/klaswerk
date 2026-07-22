// ═══════════════════════════════════════════════════
// KlasWerk — useCourse Hook
// ───────────────────────────────────────────────────
// Encapsulates all course-related Supabase queries.
// Keeps pages thin — no raw supabase calls in components.
//
// Usage:
//   const { courses, isLoading, createCourse, ... } = useCourse()
// ═══════════════════════════════════════════════════

import { useState, useCallback } from 'react'
import { supabase, db } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Course, CourseLevel, CourseStatus, Enrollment } from '@/types'

// ── Extended course type with join data ──────────────────────────────────────
export interface CourseWithStats extends Course {
  trainer?: { full_name: string | null; avatar_url: string | null }
  enrollment_count?: number
  lesson_count?: number
  // For student view
  enrollment?: Enrollment | null
}

export interface CourseFormData {
  title:              string
  description:        string
  price:              number
  currency:           string
  category:           string
  level:              CourseLevel | ''
  estimated_duration: number | ''
  thumbnail_url:      string
  status:             CourseStatus
}

export const EMPTY_COURSE_FORM: CourseFormData = {
  title:              '',
  description:        '',
  price:              0,
  currency:           'ZAR',
  category:           '',
  level:              '',
  estimated_duration: '',
  thumbnail_url:      '',
  status:             'draft',
}

// ═══════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════
export function useCourse() {
  const { user, role } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch courses for the logged-in trainer ──────────────────────────────
  const fetchTrainerCourses = useCallback(async (): Promise<CourseWithStats[]> => {
    if (!user) return []
    setIsLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('courses')
      .select(`
        *,
        trainer:trainer_id ( full_name, avatar_url ),
        enrollments ( id ),
        lessons ( id )
      `)
      .eq('trainer_id', user.id)
      .order('created_at', { ascending: false })

    setIsLoading(false)

    if (err) {
      setError(err.message)
      return []
    }

    // Shape the aggregate data
    return (data ?? []).map((c: any) => ({
      ...c,
      enrollment_count: (c.enrollments ?? []).length,
      lesson_count:     (c.lessons ?? []).length,
      enrollments:      undefined,
      lessons:          undefined,
    }))
  }, [user])

  // ── Fetch published courses for student browsing ─────────────────────────
  const fetchPublishedCourses = useCallback(async (): Promise<CourseWithStats[]> => {
    setIsLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('courses')
      .select(`
        *,
        trainer:trainer_id ( full_name, avatar_url ),
        enrollments ( id ),
        lessons ( id )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    setIsLoading(false)

    if (err) {
      setError(err.message)
      return []
    }

    return (data ?? []).map((c: any) => ({
      ...c,
      enrollment_count: (c.enrollments ?? []).length,
      lesson_count:     (c.lessons ?? []).length,
      enrollments:      undefined,
      lessons:          undefined,
    }))
  }, [])

  // ── Fetch courses a student is enrolled in ───────────────────────────────
  const fetchStudentCourses = useCallback(async (): Promise<CourseWithStats[]> => {
    if (!user) return []
    setIsLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('enrollments')
      .select(`
        *,
        course:course_id (
          *,
          trainer:trainer_id ( full_name, avatar_url )
        )
      `)
      .eq('student_id', user.id)
      .neq('status', 'dropped')
      .order('last_accessed', { ascending: false })

    setIsLoading(false)

    if (err) {
      setError(err.message)
      return []
    }

    return (data ?? []).map((e: any) => ({
      ...e.course,
      enrollment: {
        id:                e.id,
        student_id:        e.student_id,
        course_id:         e.course_id,
        status:            e.status,
        progress:          e.progress,
        lessons_completed: e.lessons_completed,
        quiz_scores:       e.quiz_scores,
        started_at:        e.started_at,
        completed_at:      e.completed_at,
        last_accessed:     e.last_accessed,
        payment_status:    e.payment_status,
        payment_id:        e.payment_id,
      },
    }))
  }, [user])

  // ── Fetch a single course by ID ───────────────────────────────────────────
  const fetchCourse = useCallback(async (courseId: string): Promise<CourseWithStats | null> => {
    setIsLoading(true)
    setError(null)

    const { data, error: err } = await db
      .from('courses')
      .select(`
        *,
        trainer:trainer_id ( full_name, avatar_url ),
        lessons ( id, title, order_index, is_published, estimated_duration ),
        enrollments ( id )
      `)
      .eq('id', courseId)
      .single()

    setIsLoading(false)

    if (err) {
      setError(err.message)
      return null
    }

    return {
      ...data,
      enrollment_count: (data.enrollments ?? []).length,
      lesson_count:     (data.lessons ?? []).length,
    }
  }, [])

  // ── Create a new course ───────────────────────────────────────────────────
  const createCourse = useCallback(async (form: CourseFormData): Promise<Course | null> => {
    if (!user) return null
    setIsLoading(true)
    setError(null)

    const payload = {
      trainer_id:         user.id,
      title:              form.title.trim(),
      description:        form.description.trim() || null,
      price:              Number(form.price) || 0,
      currency:           form.currency,
      category:           form.category.trim() || null,
      level:              form.level || null,
      estimated_duration: form.estimated_duration ? Number(form.estimated_duration) : null,
      thumbnail_url:      form.thumbnail_url.trim() || null,
      status:             form.status,
    }

    const { data, error: err } = await db
      .from('courses')
      .insert(payload)
      .select()
      .single()

    setIsLoading(false)

    if (err) {
      setError(err.message)
      return null
    }

    return data
  }, [user])

  // ── Update an existing course ─────────────────────────────────────────────
  const updateCourse = useCallback(async (courseId: string, updates: Partial<CourseFormData>): Promise<Course | null> => {
    setIsLoading(true)
    setError(null)

    const { data, error: err } = await db
      .from('courses')
      .update({
        ...updates,
        level:              updates.level || null,
        estimated_duration: updates.estimated_duration ? Number(updates.estimated_duration) : null,
      })
      .eq('id', courseId)
      .select()
      .single()

    setIsLoading(false)

    if (err) {
      setError(err.message)
      return null
    }

    return data
  }, [])

  // ── Publish / Unpublish / Archive ─────────────────────────────────────────
  const setCourseStatus = useCallback(async (courseId: string, status: CourseStatus): Promise<boolean> => {
    const { error: err } = await db
      .from('courses')
      .update({ status })
      .eq('id', courseId)

    if (err) { setError(err.message); return false }
    return true
  }, [])

  // ── Delete a course ───────────────────────────────────────────────────────
  const deleteCourse = useCallback(async (courseId: string): Promise<boolean> => {
    const { error: err } = await db
      .from('courses')
      .delete()
      .eq('id', courseId)

    if (err) { setError(err.message); return false }
    return true
  }, [])

  // ── Enroll a student in a course ─────────────────────────────────────────
  const enrollStudent = useCallback(async (courseId: string): Promise<boolean> => {
    if (!user) return false

    const { error: err } = await db
      .from('enrollments')
      .insert({
        student_id:     user.id,
        course_id:      courseId,
        payment_status: 'paid',   // set to 'pending' for paid courses before PayFast
      })

    if (err) { setError(err.message); return false }
    return true
  }, [user])

  // ── Fetch trainer dashboard stats ─────────────────────────────────────────
  const fetchTrainerStats = useCallback(async () => {
    if (!user) return null

    // Run queries in parallel
    const [coursesRes, enrollmentsRes, sessionsRes] = await Promise.all([
      db
        .from('courses')
        .select('id, status')
        .eq('trainer_id', user.id),

      db
        .from('enrollments')
        .select('id, status, course_id, student_id')
        .eq('courses.trainer_id', user.id),

      db
        .from('live_sessions')
        .select('id, status, scheduled_for')
        .eq('trainer_id', user.id)
        .gte('scheduled_for', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ])

    const courses      = coursesRes.data ?? []
    const enrollments  = enrollmentsRes.data ?? []
    const sessions     = sessionsRes.data ?? []

    const activeCourses = courses.filter((c: any) => c.status === 'published').length
    const totalStudents = new Set(enrollments.map((e: any) => e.student_id)).size

    const completedEnrollments = enrollments.filter((e: any) => e.status === 'completed')
    const completionRate = enrollments.length > 0
      ? Math.round((completedEnrollments.length / enrollments.length) * 100)
      : 0

    return {
      activeCourses,
      totalStudents,
      liveSessionsThisMonth: sessions.length,
      completionRate,
    }
  }, [user])

  // ── Fetch student dashboard stats ─────────────────────────────────────────
  const fetchStudentStats = useCallback(async () => {
    if (!user) return null

    const [enrollmentsRes, certificatesRes, attemptsRes] = await Promise.all([
      db
        .from('enrollments')
        .select('id, status')
        .eq('student_id', user.id)
        .neq('status', 'dropped'),

      db
        .from('certificates')
        .select('id')
        .eq('student_id', user.id),

      db
        .from('quiz_attempts')
        .select('percentage')
        .eq('student_id', user.id)
        .not('percentage', 'is', null),
    ])

    const enrollments  = enrollmentsRes.data ?? []
    const certificates = certificatesRes.data ?? []
    const attempts     = attemptsRes.data ?? []

    const activeEnrolled  = enrollments.filter((e: any) => e.status !== 'completed').length
    const completed       = enrollments.filter((e: any) => e.status === 'completed').length

    const avgQuiz = attempts.length > 0
      ? Math.round(
          attempts.reduce((sum: number, a: any) => sum + (a.percentage ?? 0), 0) / attempts.length
        )
      : null

    return {
      enrolled:     activeEnrolled,
      completed,
      certificates: certificates.length,
      quizAverage:  avgQuiz,
    }
  }, [user])

  return {
    isLoading,
    error,
    role,
    // Fetchers
    fetchTrainerCourses,
    fetchPublishedCourses,
    fetchStudentCourses,
    fetchCourse,
    fetchTrainerStats,
    fetchStudentStats,
    // Mutations
    createCourse,
    updateCourse,
    setCourseStatus,
    deleteCourse,
    enrollStudent,
  }
}

