// ═══════════════════════════════════════════════════
// KlasWerk — useSession Hook
// ───────────────────────────────────────────────────
// All live-session Supabase queries.
// Mirrors the pattern from useQuiz — pages stay thin.
//
// Usage:
//   const { fetchSessions, createSession, startSession, ... } = useSession()
// Session 6
// ═══════════════════════════════════════════════════

import { useState, useCallback } from 'react'
import { supabase, db } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Session, SessionStatus } from '@/types'

// ── Extended types ────────────────────────────────────────────────────────────

export interface SessionWithCourse extends Session {
  course: { id: string; title: string } | null
  trainer: { id: string; full_name: string | null; email: string } | null
  attendance_count?: number
}

export interface AttendanceRecord {
  id: string
  session_id: string
  student_id: string
  joined_at: string | null
  left_at: string | null
  duration: number | null
  hand_raises: number
  student?: { full_name: string | null; email: string }
}

export interface SessionFormData {
  title:         string
  description:   string
  course_id:     string
  scheduled_for: string   // ISO string (datetime-local value)
  duration:      number | ''
}

export const EMPTY_SESSION_FORM: SessionFormData = {
  title:         '',
  description:   '',
  course_id:     '',
  scheduled_for: '',
  duration:      60,
}

// ── Whereby room creation ─────────────────────────────────────────────────────

// ── Session 8: rooms now expire after 90 days and store the expiry date ──────
export async function createWherebyRoom(
  apiKey: string,
  sessionScheduledFor?: string, // ISO date — room expiry is set to session date + 7 days as a floor
): Promise<{ roomUrl: string; hostRoomUrl: string; expiresAt: string } | null> {
  if (!apiKey) return null
  try {
    // Set expiry to the later of: 90 days from now, OR 7 days after the session
    const ninetyDays = new Date()
    ninetyDays.setDate(ninetyDays.getDate() + 90)

    let endDate = ninetyDays
    if (sessionScheduledFor) {
      const sessionDay = new Date(sessionScheduledFor)
      sessionDay.setDate(sessionDay.getDate() + 7)
      if (sessionDay > endDate) endDate = sessionDay
    }

    const res = await fetch('https://api.whereby.dev/v1/meetings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endDate: endDate.toISOString(),
        fields: ['hostRoomUrl'],
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    return {
      roomUrl:     data.roomUrl,
      hostRoomUrl: data.hostRoomUrl,
      expiresAt:   endDate.toISOString(),
    }
  } catch {
    return null
  }
}

// ── Check if a Whereby room has expired ──────────────────────────────────────
export function wherebyRoomIsExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true // no expiry stored → assume expired (legacy rooms)
  return new Date(expiresAt) < new Date()
}

// ═══════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════
export function useSession() {
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // ── Fetch all sessions (role-aware) ──────────────────────────────────────
  const fetchSessions = useCallback(async (
    courseId?: string,
  ): Promise<SessionWithCourse[]> => {
    setIsLoading(true)
    setError(null)

    let query = supabase
      .from('live_sessions')
      .select(`
        *,
        course:course_id ( id, title ),
        trainer:trainer_id ( id, full_name, email )
      `)
      .order('scheduled_for', { ascending: true })

    if (courseId) query = query.eq('course_id', courseId)

    const { data, error: err } = await query
    setIsLoading(false)
    if (err) { setError(err.message); return [] }
    return (data ?? []) as SessionWithCourse[]
  }, [])

  // ── Fetch single session ──────────────────────────────────────────────────
  const fetchSession = useCallback(async (
    sessionId: string,
  ): Promise<SessionWithCourse | null> => {
    setIsLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('live_sessions')
      .select(`
        *,
        course:course_id ( id, title ),
        trainer:trainer_id ( id, full_name, email )
      `)
      .eq('id', sessionId)
      .single()

    setIsLoading(false)
    if (err) { setError(err.message); return null }
    return data as SessionWithCourse
  }, [])

  // ── Create session ────────────────────────────────────────────────────────
  const createSession = useCallback(async (
    form: SessionFormData,
    whereby?: { roomUrl: string; hostRoomUrl: string; expiresAt: string } | null,
  ): Promise<Session | null> => {
    if (!user) return null
    setIsLoading(true)
    setError(null)

    const { data, error: err } = await db
      .from('live_sessions')
      .insert({
        trainer_id:        user.id,
        course_id:         form.course_id || null,
        title:             form.title.trim(),
        description:       form.description.trim() || null,
        scheduled_for:     new Date(form.scheduled_for).toISOString(),
        duration:          form.duration === '' ? null : Number(form.duration),
        whereby_room_id:   whereby?.roomUrl    ?? null,
        whereby_host_url:  whereby?.hostRoomUrl ?? null,
        room_expires_at:   whereby?.expiresAt  ?? null,
        status:            'scheduled',
      })
      .select()
      .single()

    setIsLoading(false)
    if (err) { setError(err.message); return null }
    return data
  }, [user])

  // ── Update session metadata ───────────────────────────────────────────────
  const updateSession = useCallback(async (
    sessionId: string,
    updates: Partial<SessionFormData & { status: SessionStatus; whereby_room_id: string }>,
  ): Promise<Session | null> => {
    if (!user) return null

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (updates.title         !== undefined) patch.title         = updates.title.trim()
    if (updates.description   !== undefined) patch.description   = updates.description.trim() || null
    if (updates.scheduled_for !== undefined) patch.scheduled_for = new Date(updates.scheduled_for).toISOString()
    if (updates.duration      !== undefined) patch.duration      = updates.duration === '' ? null : Number(updates.duration)
    if (updates.status        !== undefined) patch.status        = updates.status
    if (updates.whereby_room_id !== undefined) patch.whereby_room_id = updates.whereby_room_id

    const { data, error: err } = await db
      .from('live_sessions')
      .update(patch)
      .eq('id', sessionId)
      .select()
      .single()

    if (err) { setError(err.message); return null }
    return data
  }, [user])

  // ── Delete session ────────────────────────────────────────────────────────
  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!user) return false
    const { error: err } = await supabase.from('live_sessions').delete().eq('id', sessionId)
    if (err) { setError(err.message); return false }
    return true
  }, [user])

  // ── Start session (trainer) ───────────────────────────────────────────────
  // Session 8: checks if Whereby room is expired and recreates it if needed.
  const startSession = useCallback(async (
    sessionId: string,
    wherebyApiKey?: string,
  ): Promise<boolean> => {
    if (!user) return false

    const patch: Record<string, unknown> = {
      status:     'live',
      started_at: new Date().toISOString(),
    }

    // Check if the room has expired and recreate it
    if (wherebyApiKey) {
      const { data: sessionRow } = await db
        .from('live_sessions')
        .select('whereby_room_id, whereby_host_url, room_expires_at, scheduled_for')
        .eq('id', sessionId)
        .single()

      const row = sessionRow as any
      const expired = wherebyRoomIsExpired(row?.room_expires_at)

      if (expired) {
        const newRoom = await createWherebyRoom(wherebyApiKey, row?.scheduled_for)
        if (newRoom) {
          patch.whereby_room_id  = newRoom.roomUrl
          patch.whereby_host_url = newRoom.hostRoomUrl
          patch.room_expires_at  = newRoom.expiresAt
        }
      }
    }

    const { error: err } = await db
      .from('live_sessions')
      .update(patch)
      .eq('id', sessionId)

    if (err) { setError(err.message); return false }
    return true
  }, [user])

  // ── End session (trainer) ─────────────────────────────────────────────────
  const endSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!user) return false
    const { error: err } = await db
      .from('live_sessions')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', sessionId)
    if (err) { setError(err.message); return false }
    return true
  }, [user])

  // ── Join session (student attendance) ────────────────────────────────────
  const joinSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!user) return false

    // Upsert — if already joined, just update joined_at
    const { error: err } = await db
      .from('session_attendance')
      .upsert({
        session_id: sessionId,
        student_id: user.id,
        joined_at:  new Date().toISOString(),
        left_at:    null,
      }, { onConflict: 'session_id,student_id' })

    if (err) { setError(err.message); return false }
    return true
  }, [user])

  // ── Leave session (student) ───────────────────────────────────────────────
  const leaveSession = useCallback(async (
    sessionId: string,
    joinedAt: string,
  ): Promise<boolean> => {
    if (!user) return false

    const leftAt  = new Date().toISOString()
    const duration = Math.round((new Date(leftAt).getTime() - new Date(joinedAt).getTime()) / 1000)

    const { error: err } = await db
      .from('session_attendance')
      .update({ left_at: leftAt, duration })
      .eq('session_id', sessionId)
      .eq('student_id', user.id)

    if (err) { setError(err.message); return false }
    return true
  }, [user])

  // ── Increment hand raise count ────────────────────────────────────────────
  const raiseHand = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!user) return false

    // Read current, then increment
    const { data } = await db
      .from('session_attendance')
      .select('hand_raises')
      .eq('session_id', sessionId)
      .eq('student_id', user.id)
      .single()

    const { error: err } = await db
      .from('session_attendance')
      .update({ hand_raises: (data?.hand_raises ?? 0) + 1 })
      .eq('session_id', sessionId)
      .eq('student_id', user.id)

    if (err) { setError(err.message); return false }
    return true
  }, [user])

  // ── Fetch attendance for a session ────────────────────────────────────────
  const fetchAttendance = useCallback(async (
    sessionId: string,
  ): Promise<AttendanceRecord[]> => {
    const { data, error: err } = await supabase
      .from('session_attendance')
      .select('*, student:student_id(full_name, email)')
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true })

    if (err) { setError(err.message); return [] }
    return (data ?? []) as AttendanceRecord[]
  }, [])

  return {
    isLoading,
    error,
    fetchSessions,
    fetchSession,
    createSession,
    updateSession,
    deleteSession,
    startSession,
    endSession,
    joinSession,
    leaveSession,
    raiseHand,
    fetchAttendance,
  }
}

