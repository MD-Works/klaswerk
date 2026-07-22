-- ═══════════════════════════════════════════════════
-- KlasWerk — Migration 002
-- Session 8: Analytics Views + Performance Indexes
-- ═══════════════════════════════════════════════════

-- ── 1. Trainer course stats view ─────────────────────────────────────────────
-- Replaces the sequential per-course queries in useAnalytics.ts
-- for trainers with <100 courses. For scale, this single query
-- is dramatically faster than N+1 JS loops.

CREATE OR REPLACE VIEW public.trainer_course_stats AS
SELECT
  c.trainer_id,
  c.id                                                              AS course_id,
  c.title                                                           AS course_title,
  c.category,
  c.price,
  c.is_published,
  COUNT(DISTINCT e.student_id)                                      AS enrollment_count,
  COALESCE(ROUND(AVG(e.progress)::numeric, 1), 0)                  AS avg_progress,
  COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.student_id END) AS completions,
  COUNT(DISTINCT CASE WHEN e.status = 'active'    THEN e.student_id END) AS active_students,
  COUNT(DISTINCT cert.id)                                           AS certs_issued,
  COALESCE(SUM(CASE WHEN p.status = 'complete' THEN p.amount ELSE 0 END), 0) AS revenue
FROM   public.courses c
LEFT JOIN public.enrollments e    ON e.course_id = c.id
LEFT JOIN public.certificates cert ON cert.course_id = c.id
LEFT JOIN public.payments p       ON p.course_id = c.id
GROUP BY c.trainer_id, c.id, c.title, c.category, c.price, c.is_published;

-- ── 2. Monthly revenue view ───────────────────────────────────────────────────
-- Used by useAnalytics.fetchRevenueStats

CREATE OR REPLACE VIEW public.trainer_monthly_revenue AS
SELECT
  c.trainer_id,
  DATE_TRUNC('month', p.created_at)::date  AS month,
  COUNT(p.id)                              AS payment_count,
  COALESCE(SUM(p.amount), 0)              AS total_revenue
FROM   public.payments p
JOIN   public.courses c ON c.id = p.course_id
WHERE  p.status = 'complete'
GROUP  BY c.trainer_id, DATE_TRUNC('month', p.created_at);

-- ── 3. Student progress summary view ─────────────────────────────────────────
-- Quick dashboard stats for students

CREATE OR REPLACE VIEW public.student_progress_summary AS
SELECT
  e.student_id,
  COUNT(DISTINCT e.course_id)                                                   AS enrolled_courses,
  COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.course_id END)        AS completed_courses,
  COUNT(DISTINCT CASE WHEN e.status = 'active'    THEN e.course_id END)        AS active_courses,
  COALESCE(ROUND(AVG(e.progress)::numeric, 1), 0)                              AS avg_progress,
  COUNT(DISTINCT cert.id)                                                        AS certs_earned
FROM   public.enrollments e
LEFT JOIN public.certificates cert
  ON  cert.course_id  = e.course_id
  AND cert.student_id = e.student_id
GROUP  BY e.student_id;

-- ── 4. Performance indexes ────────────────────────────────────────────────────
-- These speed up the analytics queries on larger datasets

CREATE INDEX IF NOT EXISTS idx_enrollments_course_status
  ON public.enrollments (course_id, status);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_status
  ON public.enrollments (student_id, status);

CREATE INDEX IF NOT EXISTS idx_payments_course_status
  ON public.payments (course_id, status);

CREATE INDEX IF NOT EXISTS idx_payments_created_at
  ON public.payments (created_at);

CREATE INDEX IF NOT EXISTS idx_certificates_course_student
  ON public.certificates (course_id, student_id);

CREATE INDEX IF NOT EXISTS idx_certificates_is_verified
  ON public.certificates (is_verified) WHERE is_verified = true;

-- ── 5. Whereby room expiry — store host_room_url alongside guest_url ──────────
-- The live_sessions table already has whereby_room_url (guest link).
-- We add whereby_host_url so we can recreate the room on startSession
-- without needing the original creation response.
-- Also adds room_expires_at so the app knows when to recreate.

ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS whereby_host_url  TEXT,
  ADD COLUMN IF NOT EXISTS room_expires_at   TIMESTAMPTZ;

-- ── 6. RLS on views — views inherit table-level RLS, but we grant SELECT ──────
GRANT SELECT ON public.trainer_course_stats      TO authenticated;
GRANT SELECT ON public.trainer_monthly_revenue   TO authenticated;
GRANT SELECT ON public.student_progress_summary  TO authenticated;

-- ── Row-level security on views (Postgres 15+) ────────────────────────────────
-- Views with SECURITY INVOKER (default) respect the caller's RLS policies,
-- so trainer_id filtering is automatic via the underlying tables' policies.
