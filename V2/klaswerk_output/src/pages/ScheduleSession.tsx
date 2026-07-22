// ═══════════════════════════════════════════════════
// KlasWerk — Schedule Session (Trainer only)
// ───────────────────────────────────────────────────
// Route: /live/new  (create)
//        /live/:sessionId/edit  (edit)
//
// Form: title, description, course, date/time, duration
// Creates Whereby meeting room via API on save.
// Session 6
// ═══════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  useSession,
  createWherebyRoom,
  type SessionFormData,
  EMPTY_SESSION_FORM,
} from '@/hooks/useSession'
import { useToast } from '@/hooks/useToast'
import { wherebyConfig as whereby } from '@/config'
import { supabase } from '@/lib/supabase'

interface Course { id: string; title: string }

export function ScheduleSession() {
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId?: string }>()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const { createSession, updateSession, deleteSession, fetchSession, isLoading } = useSession()

  const isEdit = Boolean(sessionId)

  const [form,    setForm]    = useState<SessionFormData>({
    ...EMPTY_SESSION_FORM,
    course_id: searchParams.get('courseId') ?? '',
  })
  const [courses,   setCourses]   = useState<Course[]>([])
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const [existingRoomUrl, setExistingRoomUrl] = useState<string | null>(null)

  // ── Load courses for selector ─────────────────────────────────────────────
  const loadCourses = useCallback(async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, title')
      .order('title')
    setCourses(data ?? [])
  }, [])

  // ── Load existing session if editing ─────────────────────────────────────
  const loadSession = useCallback(async () => {
    if (!sessionId) return
    const s = await fetchSession(sessionId)
    if (!s) return

    // Convert stored ISO back to datetime-local format
    const d = new Date(s.scheduled_for)
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)

    setForm({
      title:         s.title,
      description:   s.description ?? '',
      course_id:     s.course_id ?? '',
      scheduled_for: localIso,
      duration:      s.duration ?? '',
    })
    setExistingRoomUrl(s.whereby_room_id)
  }, [sessionId])

  useEffect(() => {
    loadCourses()
    if (isEdit) loadSession()
  }, [isEdit])

  function set<K extends keyof SessionFormData>(key: K, value: SessionFormData[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.title.trim()) { toast.error('Session title is required.'); return }
    if (!form.scheduled_for) { toast.error('Date and time is required.'); return }

    setSaving(true)

    try {
      // Try to create a Whereby room (only if API key configured and not editing)
      let roomUrl = existingRoomUrl
      if (!isEdit && whereby?.apiKey) {
        const room = await createWherebyRoom(whereby.apiKey)
        if (room) roomUrl = room.roomUrl
      }

      if (isEdit && sessionId) {
        const updated = await updateSession(sessionId, form)
        if (updated) {
          toast.success('Session updated.')
          navigate(`/live/${sessionId}`)
        } else {
          toast.error('Failed to update session.')
        }
      } else {
        const created = await createSession(form, roomUrl as any)
        if (created) {
          toast.success('Session scheduled!')
          navigate(`/live/${created.id}`)
        } else {
          toast.error('Failed to schedule session.')
        }
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!sessionId || !window.confirm('Delete this session? This cannot be undone.')) return
    setDeleting(true)
    const ok = await deleteSession(sessionId)
    setDeleting(false)
    if (ok) { toast.success('Session deleted.'); navigate('/live') }
    else toast.error('Failed to delete session.')
  }

  // ── Min datetime = now ────────────────────────────────────────────────────
  const minDatetime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>

      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.78rem' }}>
        <Link to="/live" style={{ color: 'var(--kw-muted)' }}>Live Sessions</Link>
        <span style={{ color: 'var(--kw-border-lt)' }}>›</span>
        <span style={{ color: 'var(--kw-cream)' }}>{isEdit ? 'Edit Session' : 'Schedule Session'}</span>
      </nav>

      {/* Header */}
      <div className="kw-eyebrow" style={{ marginBottom: '0.5rem' }}>
        {isEdit ? 'Edit Session' : 'New Session'}
      </div>
      <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.5rem', fontWeight: 600, color: 'var(--kw-primary-lt)', marginBottom: '0.5rem' }}>
        {isEdit ? form.title || 'Edit Session' : 'Schedule a Live Session'}
      </h1>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--kw-muted)', marginBottom: '2rem' }}>
        {isEdit
          ? 'Update session details below.'
          : 'Set up a live session with a Whereby video room and real-time chat.'}
      </p>

      <div className="kw-divider" />

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>

        {/* Title */}
        <div>
          <label className="kw-label">Session Title *</label>
          <input
            className="kw-input"
            placeholder="e.g. Module 3 — Live Q&A"
            value={form.title}
            onChange={e => set('title', e.target.value)}
          />
        </div>

        {/* Description */}
        <div>
          <label className="kw-label">Description</label>
          <textarea
            className="kw-input"
            rows={3}
            placeholder="What will be covered in this session? (optional)"
            value={form.description}
            style={{ resize: 'vertical' }}
            onChange={e => set('description', e.target.value)}
          />
        </div>

        {/* Course */}
        <div>
          <label className="kw-label">Course (optional)</label>
          <select
            className="kw-input"
            value={form.course_id}
            onChange={e => set('course_id', e.target.value)}
            style={{ cursor: 'pointer' }}
          >
            <option value="">— Not linked to a specific course —</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        {/* Date/time + Duration */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="kw-label">Date & Time *</label>
            <input
              className="kw-input"
              type="datetime-local"
              min={minDatetime}
              value={form.scheduled_for}
              onChange={e => set('scheduled_for', e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <div>
            <label className="kw-label">Duration (minutes)</label>
            <input
              className="kw-input"
              type="number"
              min={15}
              max={480}
              placeholder="60"
              value={form.duration}
              onChange={e => set('duration', e.target.value === '' ? '' : parseInt(e.target.value))}
            />
          </div>
        </div>

        {/* Whereby info */}
        <div style={{
          padding: '0.9rem 1.1rem',
          background: 'var(--kw-panel)',
          border: '1px solid var(--kw-border)',
          borderRadius: '4px',
          fontSize: '0.8rem',
          color: 'var(--kw-muted)',
          fontFamily: 'Syne, sans-serif',
        }}>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--kw-primary-dk)', flexShrink: 0 }}>◈</span>
            <div>
              {whereby?.apiKey
                ? (
                  <>
                    <strong style={{ color: 'var(--kw-primary)', fontWeight: 600 }}>Whereby connected.</strong>
                    {' '}A private video room will be{' '}
                    {isEdit
                      ? (existingRoomUrl ? 'reused from original schedule.' : 'created on save.')
                      : 'created automatically when you save.'}
                  </>
                )
                : (
                  <>
                    <strong style={{ color: 'var(--kw-muted)', fontWeight: 600 }}>Whereby not configured.</strong>
                    {' '}Add your API key to{' '}
                    <code style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.75rem', color: 'var(--kw-primary-dk)' }}>
                      public/config.js
                    </code>
                    {' '}to enable automatic video rooms.
                  </>
                )}
            </div>
          </div>
          {existingRoomUrl && isEdit && (
            <div style={{ marginTop: '0.5rem', paddingLeft: '1.4rem' }}>
              <span style={{ color: 'var(--kw-border-lt)', fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem' }}>
                Room: {existingRoomUrl}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', flexWrap: 'wrap' }}>
        <button
          className="kw-btn-primary"
          onClick={handleSave}
          disabled={saving || isLoading}
          style={{ minWidth: '160px', justifyContent: 'center' }}
        >
          {saving ? '…' : isEdit ? '◉ Save Changes' : '◉ Schedule Session'}
        </button>

        <Link to="/live" className="kw-btn-secondary" style={{ textDecoration: 'none' }}>
          Cancel
        </Link>

        {isEdit && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              marginLeft: 'auto',
              padding: '0.7rem 1rem',
              background: 'transparent',
              border: '1px solid rgba(201,76,76,.3)',
              borderRadius: '4px',
              color: 'var(--kw-danger)',
              fontFamily: 'Raleway, sans-serif',
              fontSize: '0.78rem',
              cursor: 'pointer',
            }}
          >
            {deleting ? '…' : 'Delete Session'}
          </button>
        )}
      </div>
    </div>
  )
}
