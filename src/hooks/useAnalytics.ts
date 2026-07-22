// ═══════════════════════════════════════════════════
// KlasWerk — useAnalytics Hook
// ───────────────────────────────────────────────────
// Session 9 REFACTOR: fetchCourseBreakdown and
// fetchRevenueStats now query the DB views created in
// migration 002, replacing N+1 per-course JS loops.
//
// Views used:
//   trainer_course_stats    — per-course breakdowns
//   trainer_monthly_revenue — revenue over time
//   student_progress_summary — dashboard stats
//
// fetchDashboardStats and fetchSessionLog unchanged
// (still JS-aggregated; candidates for future views).
// ═══════════════════════════════════════════════════

import { useState, useCallback } from 'react'
import { db } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalStudents:    number
  activeStudents:   number
  completionRate:   number
  avgQuizScore:     number | null
  totalRevenue:     number
  totalCourses:     number
  totalSessions:    number
  totalCerts:       number
}

export interface CourseBreakdown {
  courseId:       string
  courseTitle:    string
  enrollments:    number
  completions:    number
  completionRate: number
  avgProgress:    number
  avgQuizScore:   number | null
  revenue:        number
}

export interface SessionLogEntry {
  sessionId:     string
  sessionTitle:  string
  courseTitle:   string
  scheduledFor:  string
  status:        string
  attendeeCount: number
  avgDuration:   number | null
}

export interface RevenuePoint {
  month:   string   // 'YYYY-MM'
  revenue: number
  count:   number
}

// ── Internal view row types ───────────────────────────────────────────────────

interface CourseStatsRow {
  course_id:       string
  course_title:    string
  total_enrolled:  number
  completed:       number
  completion_rate: number
  avg_progress:    number
  avg_quiz_score:  number | null
  total_revenue:   number
}

interface MonthlyRevenueRow {
  month:           string
  total_revenue:   number
  payment_count:   number
}

// ═══════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════
export function useAnalytics() {
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // ── Top-level KPIs (JS-aggregated, kept from S7) ────────────────────────
  const fetchDashboardStats = useCallback(async (): Promise<DashboardStats> => {
    if (!user) return emptyStats()
    setIsLoading(true)
    setError(null)

    try {
      const { data: courses } = await db
        .from('courses')
        .select('id')
        .eq('trainer_id', user.id)

      const courseIds: string[] = (courses ?? []).map((c: { id: string }) => c.id)
      if (courseIds.length === 0) { setIsLoading(false); return emptyStats() }

      const [enrollRes, certRes, payRes, sessRes, quizRes] = await Promise.all([
        db.from('enrollments').select('id, status, student_id').in('course_id', courseIds),
        db.from('certificates').select('id').in('course_id', courseIds),
        db.from('payments').select('amount, status').in('course_id', courseIds).eq('status', 'complete'),
        db.from('live_sessions').select('id').in('course_id', courseIds),
        db.from('quiz_attempts').select('percentage, quiz_id').in('quiz_id', await getQuizIds(courseIds)),
      ])

      const enrollments: { id: string; status: string; student_id: string }[] = enrollRes.data ?? []
      const totalStudents  = new Set(enrollments.map(e => e.student_id)).size
      const activeStudents = enrollments.filter(e => ['enrolled', 'in_progress'].includes(e.status)).length
      const completed      = enrollments.filter(e => e.status === 'completed').length
      const completionRate = enrollments.length > 0 ? Math.round((completed / enrollments.length) * 100) : 0

      const payments: { amount: number }[] = payRes.data ?? []
      const totalRevenue = payments.reduce((s, p) => s + p.amount, 0)

      const attempts: { percentage: number }[] = quizRes.data ?? []
      const avgQuizScore = attempts.length > 0
        ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length)
        : null

      setIsLoading(false)
      return {
        totalStudents, activeStudents, completionRate, avgQuizScore,
        totalRevenue,
        totalCourses:  courseIds.length,
        totalSessions: (sessRes.data ?? []).length,
        totalCerts:    (certRes.data ?? []).length,
      }
    } catch (err) {
      setError(String(err))
      setIsLoading(false)
      return emptyStats()
    }
  }, [user])

  // ── Per-course breakdown — REFACTORED to DB view (S9) ───────────────────
  // Single query to trainer_course_stats replaces N+1 JS loops
  const fetchCourseBreakdown = useCallback(async (): Promise<CourseBreakdown[]> => {
    if (!user) return []
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: err } = await db
        .from('trainer_course_stats')
        .select('*')
        .eq('trainer_id', user.id)
        .order('course_title', { ascending: true })

      setIsLoading(false)
      if (err) { setError(err.message); return [] }

      return (data ?? []).map((row: CourseStatsRow): CourseBreakdown => ({
        courseId:       row.course_id,
        courseTitle:    row.course_title,
        enrollments:    row.total_enrolled  ?? 0,
        completions:    row.completed       ?? 0,
        completionRate: row.completion_rate ?? 0,
        avgProgress:    row.avg_progress    ?? 0,
        avgQuizScore:   row.avg_quiz_score  ?? null,
        revenue:        row.total_revenue   ?? 0,
      }))
    } catch (err) {
      setError(String(err))
      setIsLoading(false)
      return []
    }
  }, [user])

  // ── Revenue over time — REFACTORED to DB view (S9) ──────────────────────
  // Single query to trainer_monthly_revenue replaces manual groupBy
  const fetchRevenueStats = useCallback(async (): Promise<RevenuePoint[]> => {
    if (!user) return []
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: err } = await db
        .from('trainer_monthly_revenue')
        .select('*')
        .eq('trainer_id', user.id)
        .order('month', { ascending: true })

      setIsLoading(false)
      if (err) { setError(err.message); return [] }

      return (data ?? []).map((row: MonthlyRevenueRow): RevenuePoint => ({
        month:   row.month,
        revenue: row.total_revenue  ?? 0,
        count:   row.payment_count  ?? 0,
      }))
    } catch (err) {
      setError(String(err))
      setIsLoading(false)
      return []
    }
  }, [user])

  // ── Session attendance log (JS-aggregated, unchanged from S7) ───────────
  const fetchSessionLog = useCallback(async (): Promise<SessionLogEntry[]> => {
    if (!user) return []
    setIsLoading(true)

    const { data: sessions } = await db
      .from('live_sessions')
      .select('id, title, scheduled_for, status, course:course_id(title)')
      .eq('trainer_id', user.id)
      .order('scheduled_for', { ascending: false })
      .limit(20)

    if (!sessions || sessions.length === 0) { setIsLoading(false); return [] }

    const log: SessionLogEntry[] = []
    for (const s of sessions) {
      const { data: attendance } = await db
        .from('session_attendance')
        .select('id, duration')
        .eq('session_id', s.id)

      const att: { id: string; duration: number | null }[] = attendance ?? []
      const durWithValues = att.filter(a => a.duration !== null)
      const avgDuration = durWithValues.length > 0
        ? Math.round(durWithValues.reduce((sum, a) => sum + (a.duration ?? 0), 0) / durWithValues.length)
        : null

      log.push({
        sessionId:    s.id,
        sessionTitle: s.title,
        courseTitle:  (s.course as { title: string } | null)?.title ?? 'Unknown',
        scheduledFor: s.scheduled_for,
        status:       s.status,
        attendeeCount: att.length,
        avgDuration,
      })
    }

    setIsLoading(false)
    return log
  }, [user])

  return { isLoading, error, fetchDashboardStats, fetchCourseBreakdown, fetchSessionLog, fetchRevenueStats }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyStats(): DashboardStats {
  return { totalStudents: 0, activeStudents: 0, completionRate: 0, avgQuizScore: null, totalRevenue: 0, totalCourses: 0, totalSessions: 0, totalCerts: 0 }
}

async function getQuizIds(courseIds: string[]): Promise<string[]> {
  if (courseIds.length === 0) return []
  const { data: lessons } = await db.from('lessons').select('id').in('course_id', courseIds)
  const lessonIds: string[] = (lessons ?? []).map((l: { id: string }) => l.id)
  if (lessonIds.length === 0) return []
  const { data: quizzes } = await db.from('quizzes').select('id').in('lesson_id', lessonIds)
  return (quizzes ?? []).map((q: { id: string }) => q.id)
}

