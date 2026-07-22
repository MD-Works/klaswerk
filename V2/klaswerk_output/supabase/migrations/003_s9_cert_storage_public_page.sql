-- ═══════════════════════════════════════════════════
-- KlasWerk — Migration 003
-- Session 9: Supabase Storage for PDF Certs
--             Public course landing page support
-- ═══════════════════════════════════════════════════

-- 1. Add pdf_url to certificates table
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- 2. Create storage bucket for PDF certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies — certificates bucket
--    Anyone can read (public certs are shareable)
CREATE POLICY "Public read certificate PDFs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'certificates');

--    Authenticated users can upload their own cert PDFs
CREATE POLICY "Authenticated upload certificate PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'certificates');

--    Users can update their own cert PDFs
CREATE POLICY "Owner update certificate PDFs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Index on certificates.pdf_url for quick null checks
CREATE INDEX IF NOT EXISTS idx_certificates_pdf_url
  ON public.certificates (pdf_url)
  WHERE pdf_url IS NOT NULL;

-- 5. Public course view — exposes published courses for
--    the public-facing landing page (no auth needed)
CREATE OR REPLACE VIEW public.public_courses AS
  SELECT
    c.id,
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
    COUNT(DISTINCT e.id) AS enrollment_count,
    COUNT(DISTINCT l.id) AS lesson_count
  FROM public.courses c
  LEFT JOIN public.profiles p  ON p.id = c.trainer_id
  LEFT JOIN public.enrollments e ON e.course_id = c.id
  LEFT JOIN public.lessons l   ON l.course_id = c.id AND l.is_published = true
  WHERE c.status = 'published'
  GROUP BY c.id, p.full_name, p.avatar_url, p.bio;

-- Public SELECT on this view (no auth)
GRANT SELECT ON public.public_courses TO anon;
GRANT SELECT ON public.public_courses TO authenticated;

-- 6. Helpful comment
COMMENT ON COLUMN public.certificates.pdf_url IS
  'Supabase Storage public URL for the generated PDF — set after upload in Session 9';
