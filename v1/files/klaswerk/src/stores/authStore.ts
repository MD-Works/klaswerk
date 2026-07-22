// ═══════════════════════════════════════════════════
// KlasWerk — Auth Store (Zustand)
// ═══════════════════════════════════════════════════

import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type { Profile, UserRole } from '@/types'

interface AuthState {
  // Auth state
  user:       User | null
  profile:    Profile | null
  role:       UserRole | null
  isLoading:  boolean
  isReady:    boolean   // true once initial session check is complete

  // Setters
  setUser:     (user: User | null) => void
  setProfile:  (profile: Profile | null) => void
  setLoading:  (loading: boolean) => void
  setReady:    (ready: boolean) => void
  clearAuth:   () => void

  // Derived helpers
  isTrainer:  () => boolean
  isStudent:  () => boolean
  isLoggedIn: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:      null,
  profile:   null,
  role:      null,
  isLoading: true,
  isReady:   false,

  setUser: (user) => set({ user }),

  setProfile: (profile) => set({
    profile,
    role: profile?.role ?? null,
  }),

  setLoading: (isLoading) => set({ isLoading }),
  setReady:   (isReady)   => set({ isReady }),

  clearAuth: () => set({
    user:     null,
    profile:  null,
    role:     null,
    isLoading: false,
  }),

  // Derived — called as functions so they always reflect latest state
  isTrainer:  () => get().role === 'trainer',
  isStudent:  () => get().role === 'student',
  isLoggedIn: () => get().user !== null,
}))
