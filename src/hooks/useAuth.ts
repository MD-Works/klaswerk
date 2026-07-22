// ═══════════════════════════════════════════════════
// KlasWerk — useAuth Hook
// ───────────────────────────────────────────────────
// Session 13: Role-based access control
//   - signUp always creates 'student' (role param removed from public API)
//   - isOwner exposed
//   - invite functions: createInvite, validateInvite, acceptInvite
// ═══════════════════════════════════════════════════

import { useEffect } from 'react'
import { supabase, db } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { TrainerInvite } from '@/types'

export function useAuth() {
  const {
    user, profile, role, isLoading, isReady,
    setUser, setProfile, setLoading, setReady, clearAuth,
    isOwner, isTrainer, isStudent, isLoggedIn,
  } = useAuthStore()

  // ── Bootstrap: run once at app startup ──────────────────────────────────
  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      }
      setLoading(false)
      setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        } else {
          clearAuth()
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Profile fetch ────────────────────────────────────────────────────────
  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[KlasWerk] Failed to fetch profile:', error.message)
      return
    }
    setProfile(data)
  }

  // ── Sign Up — ALWAYS creates student ────────────────────────────────────
  // Role is NOT a parameter. Trainer accounts come via invite only.
  async function signUp(email: string, password: string, fullName: string) {
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'student',   // hardcoded — cannot be overridden by callers
        },
      },
    })

    setLoading(false)
    if (error) throw error
    return data
  }

  // ── Sign In ──────────────────────────────────────────────────────────────
  async function signIn(email: string, password: string) {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) throw error
    return data
  }

  // ── Sign Out ─────────────────────────────────────────────────────────────
  async function signOut() {
    await supabase.auth.signOut()
    clearAuth()
  }

  // ── Update Profile ───────────────────────────────────────────────────────
  async function updateProfile(updates: Partial<{
    full_name: string
    bio: string
    company: string
    phone: string
    avatar_url: string
  }>) {
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await db
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    setProfile(data)
    return data
  }

  // ── Invite: create ───────────────────────────────────────────────────────
  // Owner only. Calls Edge Function which emails the invite link.
  async function createInvite(email: string): Promise<{ ok: boolean; error?: string }> {
    if (!user) return { ok: false, error: 'Not authenticated' }

    const { data, error } = await supabase.functions.invoke('send-trainer-invite', {
      body: { email, invitedBy: user.id },
    })

    if (error) return { ok: false, error: error.message }
    if (data?.error) return { ok: false, error: data.error }
    return { ok: true }
  }

  // ── Invite: validate token (used by InvitePage before showing form) ──────
  async function validateInvite(token: string): Promise<TrainerInvite | null> {
    const { data, error } = await db
      .from('trainer_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) return null
    return data as TrainerInvite
  }

  // ── Invite: accept — registers trainer account + marks token used ────────
  async function acceptInvite(token: string, password: string, fullName: string): Promise<void> {
    // 1. Validate token first
    const invite = await validateInvite(token)
    if (!invite) throw new Error('This invite link is invalid or has expired.')

    // 2. Create auth account — role set to trainer via metadata
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: invite.email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'trainer',   // trainer invite — only path to trainer role
        },
      },
    })

    if (signUpError) throw signUpError

    // 3. Mark invite as accepted
    if (authData.user) {
      await db
        .from('trainer_invites')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('token', token)
    }
  }

  // ── Owner: list all invites ──────────────────────────────────────────────
  async function listInvites(): Promise<TrainerInvite[]> {
    if (!user) return []

    const { data, error } = await db
      .from('trainer_invites')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[KlasWerk] listInvites error:', error.message)
      return []
    }
    return (data ?? []) as TrainerInvite[]
  }

  // ── Owner: revoke a pending invite ──────────────────────────────────────
  async function revokeInvite(inviteId: string): Promise<void> {
    const { error } = await db
      .from('trainer_invites')
      .update({ status: 'expired' })
      .eq('id', inviteId)
      .eq('status', 'pending')

    if (error) throw error
  }

  return {
    // State
    user,
    profile,
    role,
    isLoading,
    isReady,
    // Derived
    isOwner:   isOwner(),
    isTrainer: isTrainer(),
    isStudent: isStudent(),
    isLoggedIn: isLoggedIn(),
    // Auth actions
    signUp,
    signIn,
    signOut,
    updateProfile,
    fetchProfile,
    // Invite actions
    createInvite,
    validateInvite,
    acceptInvite,
    listInvites,
    revokeInvite,
  }
}
