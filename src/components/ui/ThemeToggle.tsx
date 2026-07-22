// ═══════════════════════════════════════════════════
// KlasWerk — ThemeToggle
// ───────────────────────────────────────────────────
// Session 12: Three-mode toggle button
//   Cycles: dark → light → high-contrast → dark
//   Shows current mode icon + accessible label.
//   Renders as a compact button suitable for the
//   AppShell top bar or sidebar footer.
// ═══════════════════════════════════════════════════

import { useThemeContext } from '@/contexts/ThemeContext'
import type { Theme } from '@/hooks/useTheme'

// ── Icons ────────────────────────────────────────────────────────────────────
function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function ContrastIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
    </svg>
  )
}

// ── Config per theme ─────────────────────────────────────────────────────────
const THEME_META: Record<Theme, { icon: React.ReactNode; label: string; next: string }> = {
  dark: {
    icon: <MoonIcon />,
    label: 'Dark mode active — click for Light',
    next: 'Light',
  },
  light: {
    icon: <SunIcon />,
    label: 'Light mode active — click for High Contrast',
    next: 'High Contrast',
  },
  'high-contrast': {
    icon: <ContrastIcon />,
    label: 'High Contrast mode active — click for Dark',
    next: 'Dark',
  },
}

// ── Component ────────────────────────────────────────────────────────────────
interface ThemeToggleProps {
  /** compact = icon-only button (default). expanded = icon + label text */
  variant?: 'compact' | 'expanded'
  className?: string
}

export function ThemeToggle({ variant = 'compact', className }: ThemeToggleProps) {
  const { theme, cycleTheme } = useThemeContext()
  const meta = THEME_META[theme]

  return (
    <button
      onClick={cycleTheme}
      aria-label={meta.label}
      title={meta.label}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: variant === 'expanded' ? '0.5rem 0.9rem' : '0.45rem',
        background: 'var(--kw-surface)',
        border: '1px solid var(--kw-border-lt)',
        borderRadius: 'var(--kw-radius-lg, 8px)',
        color: 'var(--kw-primary)',
        cursor: 'pointer',
        transition: 'border-color 0.2s, color 0.2s, background-color 0.2s',
        flexShrink: 0,
      }}
      onMouseOver={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--kw-primary-dk)'
      }}
      onMouseOut={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--kw-border-lt)'
      }}
    >
      {meta.icon}
      {variant === 'expanded' && (
        <span style={{
          fontFamily: 'Syne Mono, monospace',
          fontSize: '0.6rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'var(--kw-muted)',
          whiteSpace: 'nowrap',
        }}>
          {meta.next}
        </span>
      )}
    </button>
  )
}
