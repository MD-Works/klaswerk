-- ═══════════════════════════════════════════════════════════
-- KlasWerk — Initial Database Schema
-- Migration: 001_initial
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ───────────────────────────────────────────────────────────
-- Patched (Session 11b): 
--   • courses table now includes is_published + cover_image_url
--   • live_sessions table named correctly (was 'sessions')
-- ═══════════════════════════════════════════════════════════

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ═══════════════════════════════════════════════════════════
-- USERS & AUTHENTICATION
-- ═══════════════════════════════════════════════════════════

-- Profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  role        TEXT CHECK (role IN ('trainer', 'student')) NOT NULL DEFAULT 'student',
  bio         TEXT,
  company     TEXT,
  phone       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Auto-create profile on new auth user ─────────────────────────────────────
-- This trigger fires whenever a new row is inserted into auth.users.
-- It reads full_name and role from the signup metadata (raw_user_meta_data).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Auto-update updated_at on profiles ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ═══════════════════════════════════════════════════════════
-- COURSES & LESSONS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.courses (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title               TEXT NOT NULL,
  description         TEXT,
  trainer_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status              TEXT CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
  price               DECIMAL(10,2) DEFAULT 0,
  currency            TEXT DEFAULT 'ZAR',
  thumbnail_url       TEXT,
  cover_image_url     TEXT,
  is_published        BOOLEAN DEFAULT FALSE,
  category            TEXT,
  level               TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  estimated_duration  INTEGER, -- minutes
  version             INTEGER DEFAULT 1,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.lessons (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id    UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  content      TEXT,
  slide_data   JSONB,
  video_url    TEXT,
  attachments  JSONB,
  order_index  INTEGER NOT NULL,
  is_published BOOLEAN DEFAULT false,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ═══════════════════════════════════════════════════════════
-- QUIZZES & ASSESSMENTS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.quizzes (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id     UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  time_limit    INTEGER,          -- minutes; null = unlimited
  passing_score INTEGER DEFAULT 60,  -- percentage
  max_attempts  INTEGER DEFAULT 3,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.questions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id        UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text  TEXT NOT NULL,
  type           TEXT CHECK (type IN ('mcq', 'truefalse', 'fill_blank')),
  options        JSONB,   -- [{ label: 'A', value: 'text' }, ...]
  correct_answer TEXT,
  explanation    TEXT,
  order_index    INTEGER DEFAULT 0,
  points         INTEGER DEFAULT 1,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════
-- STUDENT PROGRESS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.quiz_attempts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  quiz_id         UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score           INTEGER,
  total_questions INTEGER,
  correct_answers INTEGER,
  percentage      DECIMAL(5,2),
  passed          BOOLEAN DEFAULT false,
  answers         JSONB,    -- { question_id: selected_answer }
  started_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at    TIMESTAMP WITH TIME ZONE,
  time_spent      INTEGER,  -- seconds
  attempt_number  INTEGER DEFAULT 1
);

CREATE TABLE public.enrollments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id         UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  status            TEXT CHECK (status IN ('enrolled', 'in_progress', 'completed', 'dropped')) DEFAULT 'enrolled',
  progress          INTEGER DEFAULT 0,  -- percentage
  lessons_completed INTEGER DEFAULT 0,
  quiz_scores       JSONB,    -- { quiz_id: best_score }
  started_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at      TIMESTAMP WITH TIME ZONE,
  last_accessed     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  payment_status    TEXT CHECK (payment_status IN ('pending', 'paid', 'failed')),
  payment_id        TEXT,     -- PayFast transaction ID
  UNIQUE (student_id, course_id)
);


-- ═══════════════════════════════════════════════════════════
-- LIVE SESSIONS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.live_sessions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id        UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  trainer_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  scheduled_for    TIMESTAMP WITH TIME ZONE NOT NULL,
  duration         INTEGER,   -- minutes
  status           TEXT CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')) DEFAULT 'scheduled',
  whereby_room_id  TEXT,
  recording_url    TEXT,
  slides_snapshot  JSONB,
  started_at       TIMESTAMP WITH TIME ZONE,
  ended_at         TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER live_sessions_updated_at
  BEFORE UPDATE ON public.live_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.session_attendance (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id    UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  student_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at     TIMESTAMP WITH TIME ZONE,
  left_at       TIMESTAMP WITH TIME ZONE,
  duration      INTEGER,   -- seconds
  chat_messages INTEGER DEFAULT 0,
  hand_raises   INTEGER DEFAULT 0,
  UNIQUE (session_id, student_id)
);


-- ═══════════════════════════════════════════════════════════
-- CERTIFICATES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.certificates (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id          UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  certificate_number TEXT UNIQUE NOT NULL,
  issued_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  certificate_data   JSONB,   -- { student_name, course_title, score, date }
  verification_url   TEXT,
  pdf_url            TEXT,
  is_verified        BOOLEAN DEFAULT true,
  expires_at         TIMESTAMP WITH TIME ZONE,
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════
-- CHAT MESSAGES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.chat_messages (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message    TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  sent_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════
-- PAYMENTS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.payments (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id      UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  amount         DECIMAL(10,2) NOT NULL,
  currency       TEXT DEFAULT 'ZAR',
  payment_method TEXT,
  status         TEXT CHECK (status IN ('pending', 'complete', 'failed', 'cancelled')) DEFAULT 'pending',
  transaction_id TEXT,
  payment_data   JSONB,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ═══════════════════════════════════════════════════════════
-- INDEXES (performance)
-- ═══════════════════════════════════════════════════════════

CREATE INDEX idx_courses_trainer    ON public.courses(trainer_id);
CREATE INDEX idx_courses_status     ON public.courses(status);
CREATE INDEX idx_lessons_course     ON public.lessons(course_id, order_index);
CREATE INDEX idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX idx_enrollments_course  ON public.enrollments(course_id);
CREATE INDEX idx_sessions_course    ON public.live_sessions(course_id);
CREATE INDEX idx_sessions_trainer   ON public.live_sessions(trainer_id);
CREATE INDEX idx_sessions_scheduled ON public.live_sessions(scheduled_for);
CREATE INDEX idx_chat_session       ON public.chat_messages(session_id, sent_at);
CREATE INDEX idx_quiz_attempts_student ON public.quiz_attempts(student_id);
CREATE INDEX idx_certificates_number  ON public.certificates(certificate_number);


-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments          ENABLE ROW LEVEL SECURITY;

-- ── Profiles ─────────────────────────────────────────────────────────────────
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trainer can see their students' profiles via enrollments
CREATE POLICY "Trainers can view student profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.courses c ON c.id = e.course_id
      WHERE e.student_id = profiles.id
        AND c.trainer_id = auth.uid()
    )
  );

-- ── Courses ───────────────────────────────────────────────────────────────────
-- Trainers: full CRUD on their own courses
CREATE POLICY "Trainers can view own courses"
  ON public.courses FOR SELECT
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can insert courses"
  ON public.courses FOR INSERT
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update own courses"
  ON public.courses FOR UPDATE
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete own courses"
  ON public.courses FOR DELETE
  USING (trainer_id = auth.uid());

-- Students: view published courses
CREATE POLICY "Students can view published courses"
  ON public.courses FOR SELECT
  USING (status = 'published');

-- ── Lessons ───────────────────────────────────────────────────────────────────
CREATE POLICY "Trainers can manage lessons"
  ON public.lessons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id AND c.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Enrolled students can view published lessons"
  ON public.lessons FOR SELECT
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = lessons.course_id
        AND e.student_id = auth.uid()
        AND e.status NOT IN ('dropped')
    )
  );

-- ── Quizzes ───────────────────────────────────────────────────────────────────
CREATE POLICY "Trainers can manage quizzes"
  ON public.quizzes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = quizzes.lesson_id AND c.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Enrolled students can view quizzes"
  ON public.quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.enrollments e ON e.course_id = l.course_id
      WHERE l.id = quizzes.lesson_id
        AND e.student_id = auth.uid()
        AND e.status NOT IN ('dropped')
    )
  );

-- ── Questions ─────────────────────────────────────────────────────────────────
CREATE POLICY "Trainers can manage questions"
  ON public.questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.lessons l ON l.id = q.lesson_id
      JOIN public.courses c ON c.id = l.course_id
      WHERE q.id = questions.quiz_id AND c.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Enrolled students can view questions"
  ON public.questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.lessons l ON l.id = q.lesson_id
      JOIN public.enrollments e ON e.course_id = l.course_id
      WHERE q.id = questions.quiz_id
        AND e.student_id = auth.uid()
        AND e.status NOT IN ('dropped')
    )
  );

-- ── Enrollments ───────────────────────────────────────────────────────────────
CREATE POLICY "Students can view own enrollments"
  ON public.enrollments FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can enroll themselves"
  ON public.enrollments FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own enrollment"
  ON public.enrollments FOR UPDATE
  USING (student_id = auth.uid());

CREATE POLICY "Trainers can view enrollments for their courses"
  ON public.enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = enrollments.course_id AND c.trainer_id = auth.uid()
    )
  );

-- ── Quiz Attempts ─────────────────────────────────────────────────────────────
CREATE POLICY "Students can manage own attempts"
  ON public.quiz_attempts FOR ALL
  USING (student_id = auth.uid());

CREATE POLICY "Trainers can view attempts for their quizzes"
  ON public.quiz_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.lessons l ON l.id = q.lesson_id
      JOIN public.courses c ON c.id = l.course_id
      WHERE q.id = quiz_attempts.quiz_id AND c.trainer_id = auth.uid()
    )
  );

-- ── Sessions ──────────────────────────────────────────────────────────────────
CREATE POLICY "Trainers can manage their live_sessions"
  ON public.live_sessions FOR ALL
  USING (trainer_id = auth.uid());

CREATE POLICY "Enrolled students can view live_sessions"
  ON public.live_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = live_sessions.course_id
        AND e.student_id = auth.uid()
        AND e.status NOT IN ('dropped')
    )
  );

-- ── Session Attendance ────────────────────────────────────────────────────────
CREATE POLICY "Students can manage own attendance"
  ON public.session_attendance FOR ALL
  USING (student_id = auth.uid());

CREATE POLICY "Trainers can view session attendance"
  ON public.session_attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_sessions s
      WHERE s.id = session_attendance.session_id AND s.trainer_id = auth.uid()
    )
  );

-- ── Certificates ──────────────────────────────────────────────────────────────
CREATE POLICY "Students can view own certificates"
  ON public.certificates FOR SELECT
  USING (student_id = auth.uid());

-- Public certificate verification (no auth required)
CREATE POLICY "Anyone can verify certificates"
  ON public.certificates FOR SELECT
  USING (is_verified = true);

-- Trainers can insert certificates for their courses
CREATE POLICY "Trainers can issue certificates"
  ON public.certificates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = certificates.course_id AND c.trainer_id = auth.uid()
    )
  );

-- ── Chat Messages ─────────────────────────────────────────────────────────────
CREATE POLICY "Session participants can view chat"
  ON public.chat_messages FOR SELECT
  USING (
    user_id = auth.uid()
    OR NOT is_private
  );

CREATE POLICY "Authenticated users can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ── Payments ──────────────────────────────────────────────────────────────────
CREATE POLICY "Students can view own payments"
  ON public.payments FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can create payments"
  ON public.payments FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Trainers can view payments for their courses"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = payments.course_id AND c.trainer_id = auth.uid()
    )
  );


-- ═══════════════════════════════════════════════════════════
-- REALTIME PUBLICATIONS
-- (Run after enabling Realtime in Supabase dashboard)
-- ═══════════════════════════════════════════════════════════

-- Uncomment these if you're setting up Realtime via SQL:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.session_attendance;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.enrollments;


-- ═══════════════════════════════════════════════════════════
-- DONE
-- All tables, triggers, indexes, and RLS policies created.
-- ═══════════════════════════════════════════════════════════
