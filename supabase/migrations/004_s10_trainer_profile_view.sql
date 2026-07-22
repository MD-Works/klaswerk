-- ═══════════════════════════════════════════════════
-- KlasWerk — Migration 004
-- Session 10: Fix public_courses view to expose
--   trainer_id (needed for /trainer/:id page) and
--   add trainer_id index on courses for fast lookups.
-- ═══════════════════════════════════════════════════

-- 1. Replace public_courses view to include trainer_id
-- Drop first to avoid "cannot change name of view column" error
DROP VIEW IF EXISTS public.public_courses;
CREATE OR REPLACE VIEW public.public_courses AS
  SELECT
    c.id,
    c.trainer_id,
    c.title,
    c.description,
    c.category,
    c.level,
    c.price,
    c.currency,
    c.cover_image_url,
    c.created_at,
    p.full_name      AS trainer_name,
    p.avatar_url     AS trainer_avatar,
    p.bio            AS trainer_bio,
    COUNT(DISTINCT e.id)                    AS enrollment_count,
    COUNT(DISTINCT l.id)                    AS lesson_count
  FROM public.courses c
  LEFT JOIN public.profiles p    ON p.id = c.trainer_id
  LEFT JOIN public.enrollments e ON e.course_id = c.id
  LEFT JOIN public.lessons l     ON l.course_id = c.id AND l.is_published = true
  WHERE c.status = 'published'
  GROUP BY c.id, c.trainer_id, p.full_name, p.avatar_url, p.bio;

-- Re-grant since view was replaced
GRANT SELECT ON public.public_courses TO anon;
GRANT SELECT ON public.public_courses TO authenticated;

-- 2. Index courses by trainer_id for fast profile page queries
CREATE INDEX IF NOT EXISTS idx_courses_trainer_id
  ON public.courses (trainer_id)
  WHERE status = 'published';

-- 3. Index profiles role column (used in TrainerProfilePage query)
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles (role);

COMMENT ON VIEW public.public_courses IS
  'Session 10: now includes trainer_id for use by /trainer/:id public profile page.';
