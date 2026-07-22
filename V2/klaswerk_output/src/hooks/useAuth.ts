// ═══════════════════════════════════════════════════
// KlasWerk — useAuth Hook
// ═══════════════════════════════════════════════════

import { useEffect } from 'react'
import { supabase, db } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'

export function useAuth() {
  const {
    user, profile, role, isLoading, isReady,
    setUser, setProfile, setLoading, setReady, clearAuth,
    isTrainer, isStudent, isLoggedIn,
  } = useAuthStore()

  // ── Bootstrap: run once at app startup ──────────────────────────────────
  useEffect(() => {
    let mounted = true

    // 1. Get current session (resolves immediately from localStorage)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return

      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      }

      setLoading(false)
      setReady(true)
    })

    // 2. Listen for future auth state changes
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

  // ── Sign Up ──────────────────────────────────────────────────────────────
  async function signUp(email: string, password: string, fullName: string, role: UserRole = 'student') {
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

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
  async function updateProfile(updates: Partial<{ full_name: string; bio: string; company: string; phone: string; avatar_url: string }>) {
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

  return {
    // State
    user,
    profile,
    role,
    isLoading,
    isReady,
    // Derived
    isTrainer: isTrainer(),
    isStudent: isStudent(),
    isLoggedIn: isLoggedIn(),
    // Actions
    signUp,
    signIn,
    signOut,
    updateProfile,
    fetchProfile,
  }
}
