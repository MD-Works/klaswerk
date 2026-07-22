// ═══════════════════════════════════════════════════
// KlasWerk — Supabase Client
// ───────────────────────────────────────────────────
// Single shared instance — import { supabase } wherever needed.
// Keys come from config.js via the config reader, never from
// .env files, so the same build works for every client.
// ═══════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'
import { supabaseConfig } from '@/config'
import type { Profile, Course, Lesson, Quiz, Question, Enrollment, Session, Payment, Certificate } from '@/types'

// ── Inline row types for tables not yet in types/index.ts ────────────────────
interface QuizAttemptRow {
  id: string
  quiz_id: string
  student_id: string
  attempt_number: number
  answers: Record<string, string>
  score: number
  total_points: number
  percentage: number
  passed: boolean
  time_spent_seconds: number | null
  submitted_at: string
}

interface SessionAttendanceRow {
  id: string
  session_id: string
  student_id: string
  joined_at: string | null
  left_at: string | null
  duration: number | null
  hand_raises: number
}

interface ChatMessageRow {
  id: string
  session_id: string
  user_id: string
  message: string
  is_private: boolean
  sent_at: string
}

// ── Helper: make all fields optional for Insert/Update ───────────────────────
// Supabase-js v2 needs Insert/Update/Relationships on each table entry.
type Ins<T> = Partial<T>
type Upd<T> = Partial<T>
type Rel = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] }

// ── Database type map for supabase-js v2 generics ───────────────────────────
export interface Database {
  public: {
    Views:     Record<string, never>
    Functions: Record<string, never>
    Tables: {
      profiles:           { Row: Profile;             Insert: Ins<Profile>;             Update: Upd<Profile>;             Relationships: Rel[] }
      courses:            { Row: Course;              Insert: Ins<Course>;              Update: Upd<Course>;              Relationships: Rel[] }
      lessons:            { Row: Lesson;              Insert: Ins<Lesson>;              Update: Upd<Lesson>;              Relationships: Rel[] }
      quizzes:            { Row: Quiz;                Insert: Ins<Quiz>;                Update: Upd<Quiz>;                Relationships: Rel[] }
      questions:          { Row: Question;            Insert: Ins<Question>;            Update: Upd<Question>;            Relationships: Rel[] }
      enrollments:        { Row: Enrollment;          Insert: Ins<Enrollment>;          Update: Upd<Enrollment>;          Relationships: Rel[] }
      quiz_attempts:      { Row: QuizAttemptRow;      Insert: Ins<QuizAttemptRow>;      Update: Upd<QuizAttemptRow>;      Relationships: Rel[] }
      sessions:           { Row: Session;             Insert: Ins<Session>;             Update: Upd<Session>;             Relationships: Rel[] }
      session_attendance: { Row: SessionAttendanceRow; Insert: Ins<SessionAttendanceRow>; Update: Upd<SessionAttendanceRow>; Relationships: Rel[] }
      chat_messages:      { Row: ChatMessageRow;      Insert: Ins<ChatMessageRow>;      Update: Upd<ChatMessageRow>;      Relationships: Rel[] }
      payments:           { Row: Payment;             Insert: Ins<Payment>;             Update: Upd<Payment>;             Relationships: Rel[] }
      certificates:       { Row: Certificate;         Insert: Ins<Certificate>;         Update: Upd<Certificate>;         Relationships: Rel[] }
    }
  }
}

// ── Client ───────────────────────────────────────────────────────────────────
export const supabase = createClient<Database>(
  supabaseConfig.url,
  supabaseConfig.anonKey,
  {
    auth: {
      // Persist session in localStorage so users stay logged in across reloads
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        // Throttle realtime events — keeps free tier comfortable
        eventsPerSecond: 10,
      },
    },
  }
)

// ── Untyped escape-hatch for tables where the generic hits 'never' ───────────
// Use this only when supabase.from('table') resolves to `never` due to a
// missing Insert/Update signature. Keeps business logic readable without
// per-call `as any` casts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any

export default supabase
