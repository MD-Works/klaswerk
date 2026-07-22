// ═══════════════════════════════════════════════════
// KlasWerk — Live Room
// ───────────────────────────────────────────────────
// Route: /live/:sessionId
//
// Layout:
//   Full viewport. Left: Whereby embed. Right: chat panel.
//   Trainer: Start/End controls, hand-raise list, edit link.
//   Student: Join/Leave, Raise Hand, chat.
//
// Real-time via Supabase channel:
//   - chat_messages INSERT → postgres_changes
//   - hand raises → broadcast events
// Session 6
// ═══════════════════════════════════════════════════

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSession, type SessionWithCourse, type AttendanceRecord } from '@/hooks/useSession'
import { useChat, type ChatMessage } from '@/hooks/useChat'
import { useToast } from '@/hooks/useToast'
import { wherebyConfig } from '@/config'
import type { SessionStatus } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  return formatTime(iso)
}

const STATUS_COLOR: Record<SessionStatus, string> = {
  scheduled: 'var(--kw-primary)',
  live:      'var(--kw-success)',
  completed: 'var(--kw-muted)',
  cancelled: 'var(--kw-danger)',
}

// ── Chat bubble ───────────────────────────────────────────────────────────────
function ChatBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isOwn ? 'flex-end' : 'flex-start',
      marginBottom: '0.6rem',
    }}>
      {!isOwn && (
        <div style={{
          fontFamily: 'Syne Mono, monospace',
          fontSize: '0.56rem',
          color: 'var(--kw-primary-dk)',
          letterSpacing: '0.08em',
          marginBottom: '0.15rem',
          paddingLeft: '0.5rem',
        }}>
          {msg.sender_name || msg.sender_email.split('@')[0]}
        </div>
      )}
      <div style={{
        maxWidth: '85%',
        padding: '0.5rem 0.8rem',
        background: isOwn ? 'rgba(201,148,60,.15)' : 'var(--kw-panel)',
        border: `1px solid ${isOwn ? 'var(--kw-primary-dk)' : 'var(--kw-border)'}`,
        borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        fontFamily: 'Raleway, sans-serif',
        fontSize: '0.83rem',
        color: 'var(--kw-cream)',
        lineHeight: 1.5,
        wordBreak: 'break-word',
      }}>
        {msg.message}
      </div>
      <div style={{
        fontFamily: 'Syne Mono, monospace',
        fontSize: '0.52rem',
        color: 'var(--kw-border-lt)',
        marginTop: '0.15rem',
        paddingRight: isOwn ? '0.25rem' : 0,
        paddingLeft: isOwn ? 0 : '0.25rem',
      }}>
        {timeAgo(msg.sent_at)}
      </div>
    </div>
  )
}

// ── Chat panel ────────────────────────────────────────────────────────────────
function ChatPanel({
  messages,
  onSend,
  userId,
  disabled,
}: {
  messages: ChatMessage[]
  onSend: (text: string) => void
  userId: string
  disabled: boolean
}) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function submit() {
    if (!draft.trim() || disabled) return
    onSend(draft.trim())
    setDraft('')
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--kw-surface)',
    }}>
      {/* Chat header */}
      <div style={{
        padding: '0.8rem 1rem',
        borderBottom: '1px solid var(--kw-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexShrink: 0,
      }}>
        <span style={{ color: 'var(--kw-primary-dk)', fontSize: '0.8rem' }}>◈</span>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', color: 'var(--kw-primary-lt)', letterSpacing: '0.08em' }}>
          Live Chat
        </span>
        <span style={{
          marginLeft: 'auto',
          fontFamily: 'Syne Mono, monospace',
          fontSize: '0.58rem',
          color: 'var(--kw-border-lt)',
        }}>
          {messages.length} messages
        </span>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {messages.length === 0 && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--kw-border-lt)',
            fontFamily: 'Cormorant Garamond, serif',
            fontStyle: 'italic',
            fontSize: '0.9rem',
            textAlign: 'center',
          }}>
            ✦ Chat is open —<br/>be the first to say something
          </div>
        )}
        {messages.map(msg => (
          <ChatBubble key={msg.id} msg={msg} isOwn={msg.user_id === userId} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '0.75rem',
        borderTop: '1px solid var(--kw-border)',
        display: 'flex',
        gap: '0.5rem',
        flexShrink: 0,
      }}>
        <input
          className="kw-input"
          placeholder={disabled ? 'Session not live yet…' : 'Type a message…'}
          value={draft}
          disabled={disabled}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          style={{ flex: 1 }}
        />
        <button
          onClick={submit}
          disabled={disabled || !draft.trim()}
          style={{
            padding: '0.6rem 0.9rem',
            background: 'linear-gradient(135deg, var(--kw-primary-dk), var(--kw-primary))',
            border: 'none',
            borderRadius: '4px',
            color: 'var(--kw-black)',
            fontFamily: 'Cinzel, serif',
            fontSize: '0.7rem',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'opacity 0.2s',
            opacity: disabled || !draft.trim() ? 0.4 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}

// ── Pre-session info panel ────────────────────────────────────────────────────
function SessionInfo({ session }: { session: SessionWithCourse }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--kw-black)',
    }}>
      <div style={{ maxWidth: '460px', textAlign: 'center', padding: '2rem' }}>
        {/* Pulsing icon */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(201,148,60,.08)',
          border: '1px solid var(--kw-primary-dk)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: '1.8rem',
          color: 'var(--kw-primary-dk)',
        }}>
          ◉
        </div>

        <div className="kw-eyebrow" style={{ justifyContent: 'center', marginBottom: '0.75rem' }}>
          Live Session
        </div>

        <h2 style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '1.4rem',
          fontWeight: 600,
          color: 'var(--kw-primary-lt)',
          marginBottom: '0.75rem',
        }}>
          {session.title}
        </h2>

        {session.description && (
          <p style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontStyle: 'italic',
            fontSize: '0.98rem',
            color: 'var(--kw-muted)',
            lineHeight: 1.6,
            marginBottom: '1.5rem',
          }}>
            {session.description}
          </p>
        )}

        <div style={{
          display: 'inline-flex',
          gap: '0.5rem',
          alignItems: 'center',
          padding: '0.5rem 1rem',
          background: 'var(--kw-surface)',
          border: '1px solid var(--kw-border)',
          borderRadius: '20px',
          fontFamily: 'Syne Mono, monospace',
          fontSize: '0.72rem',
          color: STATUS_COLOR[session.status],
        }}>
          {session.status === 'scheduled' && '○'}
          {session.status === 'live' && '●'}
          {session.status === 'completed' && '◎'}
          {session.status === 'cancelled' && '×'}
          &nbsp;
          {session.status === 'scheduled' && `Starts at ${formatTime(session.scheduled_for)}`}
          {session.status === 'live' && 'Session is live'}
          {session.status === 'completed' && 'Session ended'}
          {session.status === 'cancelled' && 'Session cancelled'}
        </div>

        {session.trainer && (
          <div style={{
            marginTop: '1.25rem',
            fontFamily: 'Raleway, sans-serif',
            fontSize: '0.8rem',
            color: 'var(--kw-border-lt)',
          }}>
            Trainer: {session.trainer.full_name ?? session.trainer.email}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// Main LiveRoom
// ─────────────────────────────────────────────────
export function LiveRoom() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate      = useNavigate()
  const { user, isTrainer, profile } = useAuth()
  const { fetchSession, startSession, endSession, joinSession, leaveSession, raiseHand, fetchAttendance } = useSession()
  const { toast } = useToast()

  const {
    messages,
    raisedHands,
    sendMessage,
    broadcastHandRaise,
  } = useChat(sessionId ?? null)

  const [session,       setSession]       = useState<SessionWithCourse | null>(null)
  const [attendance,    setAttendance]    = useState<AttendanceRecord[]>([])
  const [loading,       setLoading]       = useState(true)
  const [handRaised,    setHandRaised]    = useState(false)
  const [sessionCtrl,   setSessionCtrl]   = useState(false) // trainer start/end in progress
  const [chatOpen,      setChatOpen]      = useState(true)
  const [handListOpen,  setHandListOpen]  = useState(false)

  // Track when student joined for duration calculation
  const joinedAtRef = useRef<string | null>(null)

  // ── Load session ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    const data = await fetchSession(sessionId)
    if (!data) { navigate('/live'); return }
    setSession(data)
    setLoading(false)
  }, [sessionId])

  // ── Load attendance (trainers only) ───────────────────────────────────────
  const loadAttendance = useCallback(async () => {
    if (!sessionId || !isTrainer) return
    const data = await fetchAttendance(sessionId)
    setAttendance(data)
  }, [sessionId, isTrainer])

  useEffect(() => {
    load()
    loadAttendance()
  }, [load, loadAttendance])

  // ── Auto-join for students when session is live ───────────────────────────
  useEffect(() => {
    if (!session || !user || isTrainer) return
    if (session.status === 'live' && !joinedAtRef.current) {
      const now = new Date().toISOString()
      joinedAtRef.current = now
      joinSession(sessionId!)
    }
  }, [session?.status, user, isTrainer])

  // ── Leave on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (!isTrainer && joinedAtRef.current && sessionId) {
        leaveSession(sessionId, joinedAtRef.current)
      }
    }
  }, [sessionId, isTrainer])

  // ── Trainer: start session ────────────────────────────────────────────────
  async function handleStart() {
    if (!sessionId) return
    setSessionCtrl(true)
    const ok = await startSession(sessionId)
    setSessionCtrl(false)
    if (ok) {
      toast.success('Session started — students can now join.')
      setSession(s => s ? { ...s, status: 'live', started_at: new Date().toISOString() } : s)
    } else {
      toast.error('Failed to start session.')
    }
  }

  // ── Trainer: end session ──────────────────────────────────────────────────
  async function handleEnd() {
    if (!sessionId || !window.confirm('End this session? Students will be disconnected.')) return
    setSessionCtrl(true)
    const ok = await endSession(sessionId)
    setSessionCtrl(false)
    if (ok) {
      toast.success('Session ended.')
      setSession(s => s ? { ...s, status: 'completed', ended_at: new Date().toISOString() } : s)
      await loadAttendance()
    } else {
      toast.error('Failed to end session.')
    }
  }

  // ── Student: raise/lower hand ─────────────────────────────────────────────
  async function toggleHand() {
    if (!user || !sessionId) return
    const next = !handRaised
    setHandRaised(next)

    // Persist increment to DB
    if (next) await raiseHand(sessionId)

    // Broadcast ephemeral event to channel
    broadcastHandRaise(next)
  }

  // ── Send chat message ─────────────────────────────────────────────────────
  async function handleSend(text: string) {
    if (!session) return
    const ok = await sendMessage(text)
    if (!ok) toast.error('Failed to send message.')
  }

  // ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <div className="kw-spinner" style={{ margin: '0 auto 1rem' }} />
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: 'var(--kw-muted)' }}>
          Loading session…
        </p>
      </div>
    )
  }

  if (!session) return null

  const isLive      = session.status === 'live'
  const isCompleted = session.status === 'completed'
  const isCancelled = session.status === 'cancelled'
  const showVideo   = isLive && session.whereby_room_id
  void wherebyConfig // referenced for future room creation

  // Build Whereby embed URL
  const wherebyUrl = session.whereby_room_id
    ? `${session.whereby_room_id}?embed&background=off&displayName=${encodeURIComponent(profile?.full_name ?? 'Student')}`
    : null

  const hostWherebyUrl = session.whereby_room_id
    ? `${session.whereby_room_id}?embed&background=off&displayName=${encodeURIComponent(profile?.full_name ?? 'Trainer')}&roomKey=host`
    : null

  const raisedHandCount = raisedHands.size

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 56px)', // subtract AppShell topbar
      overflow: 'hidden',
    }}>

      {/* ── Top bar ── */}
      <div style={{
        height: '52px',
        background: 'var(--kw-surface)',
        borderBottom: '1px solid var(--kw-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1rem',
        gap: '0.75rem',
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Back */}
        <Link
          to="/live"
          style={{
            fontFamily: 'Syne Mono, monospace',
            fontSize: '0.65rem',
            color: 'var(--kw-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          ← Live
        </Link>

        <div style={{ width: '1px', height: '20px', background: 'var(--kw-border)' }} />

        {/* Session title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '0.85rem',
            color: 'var(--kw-primary-lt)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {session.title}
          </div>
          {session.course && (
            <div style={{
              fontFamily: 'Syne Mono, monospace',
              fontSize: '0.55rem',
              color: 'var(--kw-primary-dk)',
              letterSpacing: '0.08em',
            }}>
              {session.course.title}
            </div>
          )}
        </div>

        {/* Status */}
        <span style={{
          fontFamily: 'Syne Mono, monospace',
          fontSize: '0.6rem',
          color: STATUS_COLOR[session.status],
          letterSpacing: '0.08em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
        }}>
          {isLive && <span style={{ animation: 'kw-pulse 1.5s ease infinite' }}>●</span>}
          {session.status === 'scheduled' && '○'}
          {isCompleted && '◎'}
          {isCancelled && '×'}
          {' '}{isLive ? 'LIVE' : session.status.toUpperCase()}
        </span>

        {/* Trainer controls */}
        {isTrainer && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {raisedHandCount > 0 && (
              <button
                onClick={() => setHandListOpen(o => !o)}
                style={{
                  padding: '0.3rem 0.7rem',
                  background: 'rgba(201,148,60,.1)',
                  border: '1px solid var(--kw-primary-dk)',
                  borderRadius: '20px',
                  color: 'var(--kw-primary)',
                  fontFamily: 'Syne, sans-serif',
                  fontSize: '0.68rem',
                  cursor: 'pointer',
                }}
              >
                ✋ {raisedHandCount}
              </button>
            )}

            {session.status === 'scheduled' && (
              <button
                className="kw-btn-primary"
                onClick={handleStart}
                disabled={sessionCtrl}
                style={{ fontSize: '0.72rem', padding: '0.4rem 1rem' }}
              >
                {sessionCtrl ? '…' : '▶ Start Session'}
              </button>
            )}

            {isLive && (
              <button
                onClick={handleEnd}
                disabled={sessionCtrl}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: 'transparent',
                  border: '1px solid rgba(201,76,76,.4)',
                  borderRadius: '4px',
                  color: 'var(--kw-danger)',
                  fontFamily: 'Syne, sans-serif',
                  fontSize: '0.68rem',
                  cursor: 'pointer',
                }}
              >
                {sessionCtrl ? '…' : '■ End Session'}
              </button>
            )}

            <Link
              to={`/live/${sessionId}/edit`}
              style={{
                fontFamily: 'Syne, sans-serif',
                fontSize: '0.65rem',
                color: 'var(--kw-muted)',
                padding: '0.3rem 0.6rem',
                border: '1px solid var(--kw-border)',
                borderRadius: '3px',
              }}
            >
              Edit
            </Link>
          </div>
        )}

        {/* Student: raise hand */}
        {!isTrainer && isLive && (
          <button
            onClick={toggleHand}
            style={{
              padding: '0.35rem 0.8rem',
              background: handRaised ? 'rgba(201,148,60,.15)' : 'transparent',
              border: `1px solid ${handRaised ? 'var(--kw-primary-dk)' : 'var(--kw-border)'}`,
              borderRadius: '20px',
              color: handRaised ? 'var(--kw-primary)' : 'var(--kw-muted)',
              fontFamily: 'Syne, sans-serif',
              fontSize: '0.7rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {handRaised ? '✋ Hand raised' : '✋ Raise hand'}
          </button>
        )}

        {/* Chat toggle */}
        <button
          onClick={() => setChatOpen(o => !o)}
          style={{
            padding: '0.3rem 0.6rem',
            background: chatOpen ? 'rgba(201,148,60,.08)' : 'transparent',
            border: '1px solid var(--kw-border)',
            borderRadius: '3px',
            color: chatOpen ? 'var(--kw-primary)' : 'var(--kw-muted)',
            fontFamily: 'Syne, sans-serif',
            fontSize: '0.65rem',
            cursor: 'pointer',
          }}
        >
          ◈ Chat {messages.length > 0 ? `(${messages.length})` : ''}
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Video / info area ── */}
        <div style={{
          flex: 1,
          position: 'relative',
          background: 'var(--kw-black)',
          overflow: 'hidden',
        }}>
          {showVideo && wherebyUrl ? (
            <iframe
              src={isTrainer && hostWherebyUrl ? hostWherebyUrl : wherebyUrl}
              title="Live session video"
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          ) : (
            <SessionInfo session={session} />
          )}

          {/* No Whereby configured — show placeholder */}
          {isLive && !session.whereby_room_id && (
            <div style={{
              position: 'absolute',
              bottom: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--kw-surface)',
              border: '1px solid var(--kw-border)',
              borderRadius: '4px',
              padding: '0.65rem 1.1rem',
              fontSize: '0.78rem',
              color: 'var(--kw-muted)',
              fontFamily: 'Syne, sans-serif',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}>
              ◈ &nbsp; No video room configured. Add Whereby API key to enable video.
            </div>
          )}

          {/* Trainer hand-raise list overlay */}
          {isTrainer && handListOpen && raisedHandCount > 0 && (
            <div style={{
              position: 'absolute',
              top: '0.75rem',
              right: chatOpen ? '0' : '0.75rem',
              background: 'var(--kw-surface)',
              border: '1px solid var(--kw-primary-dk)',
              borderRadius: '6px',
              padding: '0.75rem',
              minWidth: '200px',
              zIndex: 20,
            }}>
              <div style={{
                fontFamily: 'Syne Mono, monospace',
                fontSize: '0.6rem',
                color: 'var(--kw-primary-dk)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '0.5rem',
              }}>
                Hands Raised ({raisedHandCount})
              </div>
              {attendance
                .filter(a => raisedHands.has(a.student_id))
                .map(a => (
                  <div key={a.id} style={{
                    fontFamily: 'Raleway, sans-serif',
                    fontSize: '0.8rem',
                    color: 'var(--kw-cream)',
                    padding: '0.2rem 0',
                  }}>
                    ✋ {a.student?.full_name ?? a.student?.email?.split('@')[0] ?? 'Student'}
                  </div>
                ))}
              {raisedHandCount > attendance.filter(a => raisedHands.has(a.student_id)).length && (
                <div style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.78rem', color: 'var(--kw-muted)', paddingTop: '0.25rem' }}>
                  +{raisedHandCount - attendance.filter(a => raisedHands.has(a.student_id)).length} other{raisedHandCount - attendance.filter(a => raisedHands.has(a.student_id)).length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Chat sidebar ── */}
        {chatOpen && (
          <div style={{
            width: '300px',
            flexShrink: 0,
            borderLeft: '1px solid var(--kw-border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <ChatPanel
              messages={messages}
              onSend={handleSend}
              userId={user?.id ?? ''}
              disabled={!isLive}
            />

            {/* Trainer: attendance panel below chat */}
            {isTrainer && attendance.length > 0 && (
              <div style={{
                flexShrink: 0,
                borderTop: '1px solid var(--kw-border)',
                padding: '0.75rem',
                maxHeight: '180px',
                overflowY: 'auto',
              }}>
                <div style={{
                  fontFamily: 'Syne Mono, monospace',
                  fontSize: '0.57rem',
                  color: 'var(--kw-primary-dk)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem',
                }}>
                  In Session ({attendance.length})
                </div>
                {attendance.map(a => (
                  <div key={a.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.25rem 0',
                    fontSize: '0.78rem',
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: a.left_at ? 'var(--kw-border-lt)' : 'var(--kw-success)',
                      flexShrink: 0,
                    }} />
                    <span style={{ fontFamily: 'Raleway, sans-serif', color: 'var(--kw-cream)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.student?.full_name ?? a.student?.email?.split('@')[0] ?? 'Student'}
                    </span>
                    {raisedHands.has(a.student_id) && (
                      <span style={{ fontSize: '0.7rem' }}>✋</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Completed session footer ── */}
      {isCompleted && (
        <div style={{
          background: 'var(--kw-surface)',
          borderTop: '1px solid var(--kw-border)',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', color: 'var(--kw-muted)' }}>
            Session ended {session.ended_at ? formatTime(session.ended_at) : ''}
          </span>
          {isTrainer && (
            <Link to="/live" style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.7rem', color: 'var(--kw-primary)' }}>
              ← All Sessions
            </Link>
          )}
        </div>
      )}

      <style>{`
        @keyframes kw-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
