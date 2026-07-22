// ═══════════════════════════════════════════════════
// KlasWerk — Shared Utility Functions
// ═══════════════════════════════════════════════════

// ── Duration formatting ──────────────────────────────────────────────────────
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// ── Date formatting ──────────────────────────────────────────────────────────
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

// ── Video embed detection ────────────────────────────────────────────────────
export interface VideoEmbed {
  type: 'youtube' | 'vimeo'
  embedUrl: string
  thumbnailUrl?: string
}

export function getVideoEmbed(url: string): VideoEmbed | null {
  if (!url) return null

  // YouTube — handles youtu.be, youtube.com/watch, youtube.com/embed
  const ytMatch = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/
  )
  if (ytMatch) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`,
    }
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0`,
    }
  }

  return null
}

// ── HTML sanitiser ───────────────────────────────────────────────────────────
// Zero-dependency — strips script tags and inline event handlers.
// Not a full XSS sanitiser — do NOT use for user-supplied content from untrusted sources
// without a proper library. For trainer-authored content this is adequate.
export function sanitiseHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, 'javascript-blocked:')
}

// ── File size formatting ─────────────────────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── File type icon ───────────────────────────────────────────────────────────
export function getFileIcon(type: string): string {
  if (type.includes('pdf'))                    return '⬡'
  if (type.includes('image'))                  return '◈'
  if (type.includes('video'))                  return '◉'
  if (type.includes('audio'))                  return '◎'
  if (type.includes('zip') || type.includes('rar')) return '⊞'
  if (type.includes('word') || type.includes('doc')) return '◇'
  if (type.includes('excel') || type.includes('sheet')) return '◈'
  return '○'
}

// ── Initials from name ───────────────────────────────────────────────────────
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}
