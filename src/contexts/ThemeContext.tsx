// ═══════════════════════════════════════════════════
// KlasWerk — ThemeContext
// ───────────────────────────────────────────────────
// Wraps the app so any component can call useThemeContext()
// to read or change the current theme without prop-drilling.
// ═══════════════════════════════════════════════════

import { createContext, useContext, ReactNode } from 'react'
import { useTheme, Theme } from '@/hooks/useTheme'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  cycleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useTheme()
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeContext must be used inside <ThemeProvider>')
  return ctx
}
