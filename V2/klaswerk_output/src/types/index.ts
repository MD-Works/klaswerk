// ═══════════════════════════════════════════════════
// KlasWerk — Shared TypeScript Types
// ═══════════════════════════════════════════════════

// ── Config shape (mirrors config.js / Setup Wizard output) ──────────────────
export interface KlasWerkConfig {
  app: {
    name: string
    clientCode: string
    url: string
    supportEmail: string
    currency: string
    language: string
  }
  supabase: {
    url: string
    anonKey: string
    serviceKey: string
  }
  r2: {
    endpoint: string
    bucket: string
    accessKey: string
    secretKey: string
    publicUrl: string
  }
  payfast: {
    merchantId: string
    merchantKey: string
    passphrase: string
    testMode: boolean
    notifyUrl: string
    returnUrl: string
    cancelUrl: string
  }
  whereby: {
    embedUrl: string
    apiKey: string
  }
  features: {
    liveSessions: boolean
    quizzes: boolean
    certificates: boolean
    payments: boolean
    analytics: boolean
  }
  brand: {
    primary: string
    secondary: string
    background: string
    surface: string
    logoUrl: string
    faviconUrl: string
  }
}

// ── User / Auth ──────────────────────────────────────────────────────────────
export type UserRole = 'trainer' | 'student'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  bio: string | null
  company: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

// ── Courses ──────────────────────────────────────────────────────────────────
export type CourseStatus = 'draft' | 'published' | 'archived'
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced'

export interface Course {
  id: string
  title: string
  description: string | null
  trainer_id: string
  status: CourseStatus
  price: number
  currency: string
  thumbnail_url: string | null
  category: string | null
  level: CourseLevel | null
  estimated_duration: number | null
  version: number
  created_at: string
  updated_at: string
}

// ── Lessons ──────────────────────────────────────────────────────────────────
export interface Lesson {
  id: string
  course_id: string
  title: string
  content: string | null
  slide_data: { slides: SlideData[] } | null
  video_url: string | null
  attachments: Attachment[] | null
  order_index: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface SlideData {
  id: string
  title: string
  content: string
  image_url?: string
}

export interface Attachment {
  name: string
  url: string
  type: string
  size: number
}

// ── Quizzes ──────────────────────────────────────────────────────────────────
export type QuestionType = 'mcq' | 'truefalse' | 'fill_blank'

export interface Quiz {
  id: string
  lesson_id: string
  title: string
  description: string | null
  time_limit: number | null
  passing_score: number
  max_attempts: number
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  quiz_id: string
  question_text: string
  type: QuestionType
  options: QuestionOption[] | null
  correct_answer: string
  explanation: string | null
  order_index: number
  points: number
}

export interface QuestionOption {
  label: string
  value: string
}

// ── Enrollments ──────────────────────────────────────────────────────────────
export type EnrollmentStatus = 'enrolled' | 'in_progress' | 'completed' | 'dropped'
export type PaymentStatus = 'pending' | 'paid' | 'failed'

export interface Enrollment {
  id: string
  student_id: string
  course_id: string
  status: EnrollmentStatus
  progress: number
  lessons_completed: number
  quiz_scores: Record<string, number> | null
  started_at: string
  completed_at: string | null
  last_accessed: string
  payment_status: PaymentStatus | null
  payment_id: string | null
}

// ── Sessions ─────────────────────────────────────────────────────────────────
export type SessionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'

export interface Session {
  id: string
  course_id: string
  trainer_id: string
  title: string
  description: string | null
  scheduled_for: string
  duration: number | null
  status: SessionStatus
  whereby_room_id: string | null
  recording_url: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
  updated_at: string
}

// ── Payments ─────────────────────────────────────────────────────────────────
export type PaymentResult = 'pending' | 'complete' | 'failed' | 'cancelled'

export interface Payment {
  id: string
  student_id: string
  course_id: string
  amount: number
  currency: string
  status: PaymentResult
  transaction_id: string | null
  payment_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

// ── Certificates ─────────────────────────────────────────────────────────────
export interface Certificate {
  id: string
  student_id: string
  course_id: string
  certificate_number: string
  issued_at: string
  certificate_data: {
    student_name: string
    course_title: string
    score: number
    date: string
  }
  verification_url: string | null
  pdf_url: string | null
  is_verified: boolean
  expires_at: string | null
}

// ── UI helpers ───────────────────────────────────────────────────────────────
export interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}
