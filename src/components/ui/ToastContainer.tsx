// ═══════════════════════════════════════════════════
// KlasWerk — Toast Container
// ───────────────────────────────────────────────────
// Place once inside AppShell (already done in the
// updated AppShell.tsx below). Reads from useToast.
// ═══════════════════════════════════════════════════

import { useToast } from '@/hooks/useToast'

const ICONS: Record<string, string> = {
  success: '✓',
  error:   '✕',
  info:    '○',
}

const COLOURS: Record<string, string> = {
  success: 'var(--kw-success)',
  error:   'var(--kw-danger)',
  info:    'var(--kw-info)',
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position:    'fixed',
        bottom:      '1.5rem',
        left:        '50%',
        transform:   'translateX(-50%)',
        zIndex:      9999,
        display:     'flex',
        flexDirection: 'column',
        gap:         '0.5rem',
        alignItems:  'center',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          style={{
            display:         'flex',
            alignItems:      'center',
            gap:             '0.6rem',
            background:      'var(--kw-surface)',
            border:          `1px solid ${COLOURS[toast.type]}`,
            borderRadius:    '50px',
            padding:         '0.65rem 1.2rem 0.65rem 1rem',
            fontFamily:      'Raleway, sans-serif',
            fontSize:        '0.84rem',
            letterSpacing:   '0.03em',
            color:           COLOURS[toast.type],
            boxShadow:       '0 8px 32px rgba(0,0,0,0.5)',
            cursor:          'pointer',
            pointerEvents:   'all',
            animation:       'kw-toast-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
            whiteSpace:      'nowrap',
            maxWidth:        '90vw',
          }}
        >
          <span style={{
            fontFamily:    'Syne Mono, monospace',
            fontSize:      '0.75rem',
            lineHeight:    1,
          }}>
            {ICONS[toast.type]}
          </span>
          {toast.message}
        </div>
      ))}

      <style>{`
        @keyframes kw-toast-in {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  )
}
