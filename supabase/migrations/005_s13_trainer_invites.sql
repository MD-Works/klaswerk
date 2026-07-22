-- ═══════════════════════════════════════════════════
-- KlasWerk Migration 005 — Session 13
-- Trainer Invite System + Owner Role
-- ═══════════════════════════════════════════════════
-- Run in Supabase SQL Editor (template base project).
-- Safe to run multiple times (IF NOT EXISTS guards).
-- ───────────────────────────────────────────────────

-- ── 1. Add 'owner' to the role check constraint ─────────────────────────────
-- profiles.role currently defaults to 'student'.
-- We add 'owner' as a valid value. No existing rows change.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'trainer', 'student'));

-- ── 2. trainer_invites table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trainer_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL,
  token        UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_by   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast token lookups (used on invite acceptance page)
CREATE INDEX IF NOT EXISTS trainer_invites_token_idx
  ON public.trainer_invites(token);

-- Index for listing by inviter
CREATE INDEX IF NOT EXISTS trainer_invites_invited_by_idx
  ON public.trainer_invites(invited_by);

-- Index for email dedup check
CREATE INDEX IF NOT EXISTS trainer_invites_email_status_idx
  ON public.trainer_invites(email, status);

-- ── 3. RLS on trainer_invites ────────────────────────────────────────────────
ALTER TABLE public.trainer_invites ENABLE ROW LEVEL SECURITY;

-- Owner can read all invites they created
CREATE POLICY IF NOT EXISTS "Owner can view own invites"
  ON public.trainer_invites
  FOR SELECT
  USING (
    invited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Owner can insert invites
CREATE POLICY IF NOT EXISTS "Owner can create invites"
  ON public.trainer_invites
  FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Owner can update invites (revoke = set status to 'expired')
CREATE POLICY IF NOT EXISTS "Owner can update own invites"
  ON public.trainer_invites
  FOR UPDATE
  USING (
    invited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- PUBLIC: anyone can read a pending invite by token (needed for invite validation on /invite page)
-- Only exposes non-sensitive fields; token itself is the secret
CREATE POLICY IF NOT EXISTS "Public can validate invite token"
  ON public.trainer_invites
  FOR SELECT
  USING (status = 'pending' AND expires_at > now());

-- ── 4. Function: auto-expire old invites ─────────────────────────────────────
-- Called via pg_cron or manually. Marks expired invites without needing a worker.
CREATE OR REPLACE FUNCTION public.expire_trainer_invites()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.trainer_invites
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$;

-- ── 5. How to promote the first user to owner ─────────────────────────────────
-- After first deployment, run this in the SQL Editor to make yourself owner:
--
--   UPDATE public.profiles
--   SET role = 'owner'
--   WHERE email = 'your@email.com';
--
-- Only one owner per deployment is recommended, but the schema supports more.
-- ═══════════════════════════════════════════════════════════════════════════════
