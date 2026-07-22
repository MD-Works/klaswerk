// ═══════════════════════════════════════════════════
// KlasWerk — Analytics Dashboard Page
// ───────────────────────────────────────────────────
// Route: /analytics (trainer only)
// KPIs, per-course breakdown, session log, revenue
// Session 7
// ═══════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAnalytics, type DashboardStats, type CourseBreakdown, type SessionLogEntry } from '@/hooks/useAnalytics'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return `R ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent = false }: {
  label: string; value: string | number; sub?: string; accent?: boolean
}) {
  return (
    <div className="kw-card" style={{ padding: '1.25rem 1.5rem' }}>
      <div className="kw-eyebrow" style={{ marginBottom: '0.6rem', fontSize: '0.55rem' }}>{label}</div>
      <div style={{
        fontFamily: 'Cinzel, serif',
        fontSize: '1.8rem',
        fontWeight: 700,
        color: accent ? 'var(--kw-primary)' : 'var(--kw-primary-lt)',
        lineHeight: 1,
        marginBottom: sub ? '0.4rem' : 0,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.62rem', color: 'var(--kw-muted)', letterSpacing: '0.05em' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function Bar({ value, label }: { value: number; label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ flex: 1, height: '4px', background: 'var(--kw-border)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(value, 100)}%`,
          background: value >= 75
            ? 'linear-gradient(90deg, var(--kw-success), var(--kw-success))'
            : value >= 40
              ? 'linear-gradient(90deg, var(--kw-primary-dk), var(--kw-primary))'
              : 'linear-gradient(90deg, var(--kw-danger), var(--kw-danger))',
          borderRadius: '2px',
          transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', color: 'var(--kw-muted)', minWidth: '36px', textAlign: 'right' }}>
        {label ?? `${value}%`}
      </span>
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    live: 'var(--kw-danger)',
    scheduled: 'var(--kw-primary)',
    completed: 'var(--kw-success)',
    cancelled: 'var(--kw-muted)',
  }
  return (
    <span style={{
      fontFamily: 'Syne Mono, monospace',
      fontSize: '0.58rem',
      letterSpacing: '0.1em',
      color: map[status] ?? 'var(--kw-muted)',
      textTransform: 'uppercase',
      background: `${map[status] ?? 'var(--kw-muted)'}18`,
      border: `1px solid ${map[status] ?? 'var(--kw-border)'}50`,
      borderRadius: '4px',
      padding: '0.2rem 0.5rem',
    }}>
      {status}
    </span>
  )
}

// ═══════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════
export function AnalyticsPage() {
  const { fetchDashboardStats, fetchCourseBreakdown, fetchSessionLog, isLoading } = useAnalytics()

  const [stats,    setStats]    = useState<DashboardStats | null>(null)
  const [courses,  setCourses]  = useState<CourseBreakdown[]>([])
  const [sessions, setSessions] = useState<SessionLogEntry[]>([])
  const [tab,      setTab]      = useState<'overview' | 'courses' | 'sessions'>('overview')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [s, c, sl] = await Promise.all([
      fetchDashboardStats(),
      fetchCourseBreakdown(),
      fetchSessionLog(),
    ])
    setStats(s)
    setCourses(c)
    setSessions(sl)
  }

  // ── Tab pills ─────────────────────────────────────

  const tabStyle = (active: boolean) => ({
    fontFamily: 'Syne Mono, monospace',
    fontSize: '0.65rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    padding: '0.4rem 1rem',
    borderRadius: '4px',
    border: active ? '1px solid var(--kw-primary-dk)' : '1px solid var(--kw-border)',
    background: active ? 'rgba(201,148,60,0.1)' : 'transparent',
    color: active ? 'var(--kw-primary-lt)' : 'var(--kw-muted)',
    cursor: 'pointer' as const,
    transition: 'all 0.2s',
  })

  return (
    <div className="kw-animate-fade-in">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div className="kw-eyebrow" style={{ marginBottom: '0.5rem' }}>KlasWerk · Trainer</div>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.6rem', fontWeight: 600, color: 'var(--kw-primary-lt)', marginBottom: '0.35rem' }}>
            Analytics
          </h1>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)', fontSize: '1rem' }}>
            Performance across all your courses and sessions.
          </p>
        </div>
        <Link to="/courses" className="kw-btn-secondary" style={{ textDecoration: 'none', fontSize: '0.72rem' }}>
          Manage Courses
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        {(['overview', 'courses', 'sessions'] as const).map(t => (
          <button key={t} style={tabStyle(tab === t)} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--kw-muted)', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>
          Loading analytics…
        </div>
      )}

      {/* ── Overview tab ── */}
      {!isLoading && tab === 'overview' && stats && (
        <>
          {/* KPI grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <KpiCard label="Total Students" value={stats.totalStudents} sub="unique learners" />
            <KpiCard label="Active Learners" value={stats.activeStudents} sub="enrolled / in progress" />
            <KpiCard label="Completion Rate" value={`${stats.completionRate}%`} sub="of all enrollments" accent />
            <KpiCard label="Avg Quiz Score" value={stats.avgQuizScore !== null ? `${stats.avgQuizScore}%` : '—'} sub="across all attempts" accent />
            <KpiCard label="Total Revenue" value={formatCurrency(stats.totalRevenue)} sub="paid enrollments" />
            <KpiCard label="Courses" value={stats.totalCourses} sub="published & draft" />
            <KpiCard label="Live Sessions" value={stats.totalSessions} sub="scheduled & completed" />
            <KpiCard label="Certificates" value={stats.totalCerts} sub="issued" />
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, var(--kw-border-lt), transparent)', margin: '0.5rem 0 2rem' }} />

          {/* Course performance summary */}
          {courses.length > 0 && (
            <>
              <h2 className="kw-heading" style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Course Performance</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {courses.map(c => (
                  <div key={c.courseId} className="kw-card" style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.88rem', color: 'var(--kw-cream)', fontWeight: 500 }}>{c.courseTitle}</div>
                      <div style={{ display: 'flex', gap: '1.5rem', flexShrink: 0 }}>
                        <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', color: 'var(--kw-muted)' }}>{c.enrollments} enrolled</span>
                        <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', color: 'var(--kw-primary)' }}>{formatCurrency(c.revenue)}</span>
                      </div>
                    </div>
                    <Bar value={c.completionRate} label={`${c.completionRate}% complete`} />
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Courses tab ── */}
      {!isLoading && tab === 'courses' && (
        <>
          <h2 className="kw-heading" style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Per-Course Breakdown</h2>
          {courses.length === 0 ? (
            <EmptyState message="No course data yet." cta="Create a Course" ctaHref="/courses/new" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--kw-border)' }}>
                    {['Course', 'Enrolled', 'Completed', 'Rate', 'Avg Progress', 'Quiz Avg', 'Revenue'].map(h => (
                      <th key={h} style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.12em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase', padding: '0.6rem 0.75rem', textAlign: 'left', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c, i) => (
                    <tr key={c.courseId} style={{ borderBottom: '1px solid var(--kw-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.82rem', color: 'var(--kw-cream)', padding: '0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Link to={`/courses/${c.courseId}`} style={{ color: 'inherit', textDecoration: 'none' }} title={c.courseTitle}>{c.courseTitle}</Link>
                      </td>
                      <Td>{c.enrollments}</Td>
                      <Td>{c.completions}</Td>
                      <Td accent={c.completionRate >= 75}>{c.completionRate}%</Td>
                      <Td>{c.avgProgress}%</Td>
                      <Td accent={c.avgQuizScore !== null && c.avgQuizScore >= 70}>{c.avgQuizScore !== null ? `${c.avgQuizScore}%` : '—'}</Td>
                      <Td>{formatCurrency(c.revenue)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Sessions tab ── */}
      {!isLoading && tab === 'sessions' && (
        <>
          <h2 className="kw-heading" style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Session Attendance Log</h2>
          {sessions.length === 0 ? (
            <EmptyState message="No sessions yet." cta="Schedule a Session" ctaHref="/live/new" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sessions.map(s => (
                <div key={s.sessionId} className="kw-card" style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.88rem', color: 'var(--kw-cream)', marginBottom: '0.25rem', fontWeight: 500 }}>{s.sessionTitle}</div>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--kw-muted)' }}>{s.courseTitle}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                      <StatusBadge status={s.status} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    <Meta label="Date" value={formatDate(s.scheduledFor)} />
                    <Meta label="Attendees" value={String(s.attendeeCount)} />
                    <Meta label="Avg Duration" value={formatDuration(s.avgDuration)} />
                    <Link to={`/live/${s.sessionId}`} style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.08em', color: 'var(--kw-primary-dk)', alignSelf: 'flex-end' }}>
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--kw-border)' }}>
        <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--kw-primary-dk)' }}>✦ MD WORKS · KLASWERK ANALYTICS ✦</span>
      </div>
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Td({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <td style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.7rem', color: accent ? 'var(--kw-success)' : 'var(--kw-muted)', padding: '0.75rem', whiteSpace: 'nowrap' }}>
      {children}
    </td>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.52rem', letterSpacing: '0.15em', color: 'var(--kw-primary-dk)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>{label}</div>
      <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.68rem', color: 'var(--kw-muted)' }}>{value}</div>
    </div>
  )
}

function EmptyState({ message, cta, ctaHref }: { message: string; cta: string; ctaHref: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--kw-muted)' }}>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', marginBottom: '1.25rem' }}>{message}</p>
      <Link to={ctaHref} className="kw-btn-primary" style={{ display: 'inline-flex', textDecoration: 'none', fontSize: '0.75rem' }}>{cta}</Link>
    </div>
  )
}
