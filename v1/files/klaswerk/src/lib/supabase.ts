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

// ── Database type map for supabase-js v2 generics ───────────────────────────
export interface Database {
  public: {
    Tables: {
      profiles:          { Row: Profile }
      courses:           { Row: Course }
      lessons:           { Row: Lesson }
      quizzes:           { Row: Quiz }
      questions:         { Row: Question }
      enrollments:       { Row: Enrollment }
      sessions:          { Row: Session }
      payments:          { Row: Payment }
      certificates:      { Row: Certificate }
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

export default supabase
