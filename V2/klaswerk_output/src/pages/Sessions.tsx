// ═══════════════════════════════════════════════════
// KlasWerk — Sessions List
// ───────────────────────────────────────────────────
// Route: /live
//
// Trainer:  all scheduled + past sessions, Schedule button
// Student:  upcoming sessions for enrolled courses
// Session 6
// ═══════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSession, type SessionWithCourse } from '@/hooks/useSession'
import type { SessionStatus } from '@/types'

// ── Status badge colours ────────────────────────────────────────────────────
const STATUS_STYLE: Record<SessionStatus, { color: string; border: string; label: string }> = {
  scheduled:  { color: 'var(--kw-primary)',  border: 'rgba(201,148,60,.3)',  label: 'Scheduled' },
  live:       { color: 'var(--kw-success)',  border: 'rgba(76,175,122,.35)', label: '● Live Now' },
  completed:  { color: 'var(--kw-muted)',    border: 'var(--kw-border)',     label: 'Completed'  },
  cancelled:  { color: 'var(--kw-danger)',   border: 'rgba(201,76,76,.3)',   label: 'Cancelled'  },
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const s = STATUS_STYLE[status]
  return (
    <span style={{
      fontFamily: 'Syne Mono, monospace',
      fontSize: '0.6rem',
      letterSpacing: '0.1em',
      padding: '0.2rem 0.55rem',
      borderRadius: '20px',
      color: s.color,
      border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
    }}>
      {s.label}
    </span>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}
function isPast(iso: string) { return new Date(iso) < new Date() }

// ── Session card ─────────────────────────────────────────────────────────────
function SessionCard({ session, isTrainer }: { session: SessionWithCourse; isTrainer: boolean }) {
  const navigate = useNavigate()
  const isLive      = session.status === 'live'
  const isScheduled = session.status === 'scheduled'
  const canJoin     = isLive || isScheduled

  return (
    <div
      className="kw-card"
      style={{ padding: '1.25rem 1.5rem', cursor: canJoin ? 'pointer' : undefined }}
      onClick={() => canJoin ? navigate(`/live/${session.id}`) : undefined}
    >
      {/* Gold left-accent when live */}
      {isLive && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
          background: 'var(--kw-success)',
          borderRadius: '8px 0 0 8px',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Date block */}
        <div style={{
          flexShrink: 0,
          textAlign: 'center',
          background: 'var(--kw-panel)',
          border: '1px solid var(--kw-border)',
          borderRadius: '4px',
          padding: '0.5rem 0.75rem',
          minWidth: '60px',
        }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.3rem', fontWeight: 700, color: 'var(--kw-primary-lt)', lineHeight: 1 }}>
            {new Date(session.scheduled_for).getDate()}
          </div>
          <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', color: 'var(--kw-primary-dk)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '0.2rem' }}>
            {new Date(session.scheduled_for).toLocaleDateString('en-ZA', { month: 'short' })}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
            <h3 style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--kw-primary-lt)',
              margin: 0,
              flex: 1,
              minWidth: 0,
            }}>
              {session.title}
            </h3>
            <StatusBadge status={session.status} />
          </div>

          {session.description && (
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--kw-muted)', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
              {session.description}
            </p>
          )}

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', color: 'var(--kw-muted)' }}>
              {formatTime(session.scheduled_for)}
            </span>
            {session.duration && (
              <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', color: 'var(--kw-muted)' }}>
                {session.duration} min
              </span>
            )}
            {session.course && (
              <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', color: 'var(--kw-primary-dk)' }}>
                {session.course.title}
              </span>
            )}
            {isTrainer && session.trainer && (
              <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', color: 'var(--kw-border-lt)' }}>
                You
              </span>
            )}
          </div>
        </div>

        {/* Action */}
        {canJoin && (
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <span style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '0.7rem',
              color: isLive ? 'var(--kw-success)' : 'var(--kw-primary)',
              letterSpacing: '0.08em',
            }}>
              {isLive ? 'Join →' : 'View →'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────
export function SessionsPage() {
  const { isTrainer } = useAuth()
  const { fetchSessions, isLoading } = useSession()
  const [sessions, setSessions] = useState<SessionWithCourse[]>([])
  const [filter,   setFilter]   = useState<'all' | 'upcoming' | 'past'>('upcoming')

  const load = useCallback(async () => {
    const data = await fetchSessions()
    setSessions(data)
  }, [fetchSessions])

  useEffect(() => { load() }, [load])

  const filtered = sessions.filter(s => {
    if (filter === 'all') return true
    if (filter === 'upcoming') return s.status === 'live' || (s.status === 'scheduled' && !isPast(s.scheduled_for))
    if (filter === 'past') return s.status === 'completed' || (s.status === 'scheduled' && isPast(s.scheduled_for))
    return true
  })

  const liveSessions = sessions.filter(s => s.status === 'live')

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div>
          <div className="kw-eyebrow" style={{ marginBottom: '0.5rem' }}>
            {isTrainer ? 'Trainer Portal' : 'Student Portal'}
          </div>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.5rem', fontWeight: 600, color: 'var(--kw-primary-lt)', margin: 0 }}>
            Live Sessions
          </h1>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
            {isTrainer ? 'Schedule and manage your live training sessions.' : 'Join upcoming sessions for your enrolled courses.'}
          </p>
        </div>
        {isTrainer && (
          <Link to="/live/new" className="kw-btn-primary" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>
            ◉ Schedule Session
          </Link>
        )}
      </div>

      {/* Live now banner */}
      {liveSessions.length > 0 && (
        <div style={{
          background: 'rgba(76,175,122,.06)',
          border: '1px solid rgba(76,175,122,.3)',
          borderRadius: '6px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <span style={{ color: 'var(--kw-success)', fontSize: '0.9rem' }}>●</span>
          <div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.8rem', color: 'var(--kw-success)', letterSpacing: '0.06em' }}>
              Session Live Now
            </div>
            <div style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.8rem', color: 'var(--kw-muted)', marginTop: '0.15rem' }}>
              {liveSessions.map(s => s.title).join(' · ')}
            </div>
          </div>
          <Link
            to={`/live/${liveSessions[0].id}`}
            className="kw-btn-primary"
            style={{ marginLeft: 'auto', textDecoration: 'none', padding: '0.5rem 1.2rem', fontSize: '0.75rem' }}
          >
            Join Now →
          </Link>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1.5rem' }}>
        {(['upcoming', 'all', 'past'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.4rem 0.9rem',
              fontFamily: 'Syne, sans-serif',
              fontSize: '0.72rem',
              letterSpacing: '0.06em',
              textTransform: 'capitalize',
              cursor: 'pointer',
              borderRadius: '3px',
              border: '1px solid var(--kw-border-lt)',
              background: filter === f ? 'linear-gradient(135deg, var(--kw-primary-dk), var(--kw-primary))' : 'transparent',
              color: filter === f ? 'var(--kw-black)' : 'var(--kw-muted)',
              transition: 'all 0.15s',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="kw-divider" />

      {/* Sessions list */}
      {isLoading && (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="kw-spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)' }}>
            Loading sessions…
          </p>
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          border: '1px dashed var(--kw-border)',
          borderRadius: '6px',
          color: 'var(--kw-border-lt)',
          fontFamily: 'Cormorant Garamond, serif',
          fontStyle: 'italic',
          fontSize: '1rem',
        }}>
          ✦ &nbsp;
          {filter === 'upcoming'
            ? 'No upcoming sessions scheduled.'
            : filter === 'past'
            ? 'No past sessions found.'
            : 'No sessions found.'}
          {isTrainer && filter === 'upcoming' && (
            <div style={{ marginTop: '1rem' }}>
              <Link to="/live/new" className="kw-btn-primary" style={{ textDecoration: 'none', fontSize: '0.78rem' }}>
                Schedule your first session →
              </Link>
            </div>
          )}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Group by date */}
          {(() => {
            const groups: { date: string; items: SessionWithCourse[] }[] = []
            filtered.forEach(s => {
              const dateStr = formatDate(s.scheduled_for)
              const group = groups.find(g => g.date === dateStr)
              if (group) group.items.push(s)
              else groups.push({ date: dateStr, items: [s] })
            })
            return groups.map(group => (
              <div key={group.date}>
                <div style={{
                  fontFamily: 'Syne Mono, monospace',
                  fontSize: '0.58rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--kw-primary-dk)',
                  padding: '0.5rem 0 0.4rem',
                  borderBottom: '1px solid var(--kw-border)',
                  marginBottom: '0.6rem',
                }}>
                  {group.date}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {group.items.map(s => (
                    <SessionCard key={s.id} session={s} isTrainer={isTrainer} />
                  ))}
                </div>
              </div>
            ))
          })()}
        </div>
      )}
    </div>
  )
}
