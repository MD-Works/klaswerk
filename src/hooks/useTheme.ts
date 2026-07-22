// ═══════════════════════════════════════════════════
// KlasWerk — useTheme Hook
// ───────────────────────────────────────────────────
// Session 12: Three-mode theming system
//   dark        — default MD Works dark-gold aesthetic
//   light       — warm cream inversion, gold accent unchanged
//   high-contrast — maximum legibility, WCAG AAA target
//
// Theme is applied via data-theme="dark|light|high-contrast"
// on <html>. CSS variables in index.css respond to each mode.
// Persisted to localStorage key 'kw-theme'.
// System preference honoured on first visit (dark|light only).
// ═══════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'

export type Theme = 'dark' | 'light' | 'high-contrast'

const STORAGE_KEY = 'kw-theme'
const DEFAULT_THEME: Theme = 'dark'

function getSystemPreference(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function resolveInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (saved === 'dark' || saved === 'light' || saved === 'high-contrast') return saved
  } catch {
    // localStorage unavailable (private mode, etc.)
  }
  return getSystemPreference()
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme)

  // Apply on mount (covers SSR / hydration edge cases)
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    applyTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // silent — continue without persistence
    }
  }, [])

  const cycleTheme = useCallback(() => {
    setTheme(
      theme === 'dark'
        ? 'light'
        : theme === 'light'
          ? 'high-contrast'
          : 'dark'
    )
  }, [theme, setTheme])

  return { theme, setTheme, cycleTheme }
}
