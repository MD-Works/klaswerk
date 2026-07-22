// ═══════════════════════════════════════════════════
// KlasWerk — Lesson Editor (Trainer only)
// ───────────────────────────────────────────────────
// Routes:
//   /courses/:courseId/lessons/new
//   /courses/:courseId/lessons/:lessonId/edit
//
// Sections:
//   - Breadcrumb header + Save/Publish buttons
//   - Title field
//   - Content editor (Write HTML / Preview tabs)
//   - Video URL field with live iframe preview
//   - Attachments (manual URL entry)
//   - Order index + Publish toggle
//   - Delete (edit mode only)
// ═══════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useLesson, type LessonFormData, EMPTY_LESSON_FORM } from '@/hooks/useLesson'
import { useToast } from '@/hooks/useToast'
import { getVideoEmbed, sanitiseHtml, getFileIcon, formatFileSize } from '@/lib/utils'
import type { Attachment } from '@/types'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────────
// Sub-component: Video preview
// ─────────────────────────────────────────────────
function VideoPreview({ url }: { url: string }) {
  const embed = getVideoEmbed(url)
  if (!url) return null
  if (!embed) {
    return (
      <div style={{
        marginTop: '0.75rem',
        padding: '0.75rem 1rem',
        background: 'var(--kw-panel)',
        border: '1px solid var(--kw-border)',
        borderRadius: '4px',
        fontSize: '0.8rem',
        color: 'var(--kw-muted)',
      }}>
        ○ &nbsp; Direct link — not embeddable. Students will see a clickable link.
        &nbsp;<a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--kw-primary)' }}>Preview ↗</a>
      </div>
    )
  }
  return (
    <div style={{ marginTop: '0.75rem', position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--kw-border)' }}>
      <iframe
        src={embed.embedUrl}
        title="Video preview"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

// ─────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────
export function LessonEditor() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>()
  const navigate  = useNavigate()
  const { toast } = useToast()
  const { fetchLesson, createLesson, updateLesson, deleteLesson, isLoading } = useLesson()

  const isEdit = Boolean(lessonId)

  const [form, setForm]             = useState<LessonFormData>(EMPTY_LESSON_FORM)
  const [activeTab, setActiveTab]   = useState<'write' | 'preview'>('write')
  const [saving, setSaving]         = useState(false)
  const [courseTitle, setCourseTitle] = useState('')

  // Attachment draft fields
  const [attachName, setAttachName] = useState('')
  const [attachUrl,  setAttachUrl]  = useState('')
  const [attachType, setAttachType] = useState('document')

  // ── Load existing lesson in edit mode ──────────────────────────────────
  useEffect(() => {
    // Always fetch course title for breadcrumb
    if (courseId) {
      supabase.from('courses').select('title').eq('id', courseId).single()
        .then(({ data }) => { if (data) setCourseTitle(data.title) })
    }

    if (isEdit && lessonId) {
      fetchLesson(lessonId).then(lesson => {
        if (!lesson) { navigate(`/courses/${courseId}`); return }
        setForm({
          title:       lesson.title,
          content:     lesson.content ?? '',
          video_url:   lesson.video_url ?? '',
          attachments: lesson.attachments ?? [],
          order_index: lesson.order_index,
          is_published: lesson.is_published,
        })
      })
    }
  }, [lessonId, courseId, isEdit])

  // ── Form helpers ───────────────────────────────────────────────────────
  function set<K extends keyof LessonFormData>(key: K, value: LessonFormData[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function addAttachment() {
    if (!attachName.trim() || !attachUrl.trim()) {
      toast.error('Both name and URL are required.')
      return
    }
    const newAttach: Attachment = {
      name: attachName.trim(),
      url:  attachUrl.trim(),
      type: attachType,
      size: 0,
    }
    set('attachments', [...form.attachments, newAttach])
    setAttachName(''); setAttachUrl('')
  }

  function removeAttachment(index: number) {
    set('attachments', form.attachments.filter((_, i) => i !== index))
  }

  // ── Save ───────────────────────────────────────────────────────────────
  async function handleSave(publishAfter = false) {
    if (!form.title.trim()) { toast.error('Lesson title is required.'); return }
    if (!courseId) return

    const payload: LessonFormData = {
      ...form,
      is_published: publishAfter ? true : form.is_published,
    }

    setSaving(true)

    if (isEdit && lessonId) {
      const updated = await updateLesson(lessonId, payload)
      setSaving(false)
      if (updated) {
        toast.success(publishAfter ? 'Lesson published!' : 'Lesson saved.')
        navigate(`/courses/${courseId}`)
      } else {
        toast.error('Failed to save lesson.')
      }
    } else {
      const created = await createLesson(courseId, payload)
      setSaving(false)
      if (created) {
        toast.success(publishAfter ? 'Lesson created and published!' : 'Lesson created as draft.')
        navigate(`/courses/${courseId}`)
      } else {
        toast.error('Failed to create lesson.')
      }
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!lessonId || !window.confirm('Delete this lesson? This cannot be undone.')) return
    const ok = await deleteLesson(lessonId)
    if (ok) { toast.success('Lesson deleted.'); navigate(`/courses/${courseId}`) }
    else    toast.error('Failed to delete lesson.')
  }

  // ─────────────────────────────────────────────────
  // Loading skeleton
  // ─────────────────────────────────────────────────
  if (isLoading && isEdit && !form.title) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--kw-muted)' }}>
        <div className="kw-spinner" style={{ margin: '0 auto 1rem' }} />
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>Loading lesson…</p>
      </div>
    )
  }

  // ─────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>

      {/* ── Breadcrumb ── */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.78rem' }}>
        <Link to="/courses" style={{ color: 'var(--kw-muted)' }}>Courses</Link>
        <span style={{ color: 'var(--kw-border-lt)' }}>›</span>
        <Link to={`/courses/${courseId}`} style={{ color: 'var(--kw-muted)' }}>{courseTitle || 'Course'}</Link>
        <span style={{ color: 'var(--kw-border-lt)' }}>›</span>
        <span style={{ color: 'var(--kw-cream)' }}>{isEdit ? 'Edit Lesson' : 'New Lesson'}</span>
      </nav>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div className="kw-eyebrow" style={{ marginBottom: '0.5rem' }}>
            {isEdit ? 'Edit Lesson' : 'New Lesson'}
          </div>
          <h1 style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '1.5rem',
            fontWeight: 600,
            color: 'var(--kw-primary-lt)',
            margin: 0,
          }}>
            {isEdit ? (form.title || 'Untitled Lesson') : 'Create Lesson'}
          </h1>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
          {!form.is_published && (
            <button
              className="kw-btn-secondary"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving ? '…' : '◇ Save Draft'}
            </button>
          )}
          <button
            className="kw-btn-primary"
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            {saving ? '…' : form.is_published ? '◉ Save & Publish' : '◉ Publish'}
          </button>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="kw-divider" />

      {/* ── Title ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label className="kw-label">Lesson Title *</label>
        <input
          className="kw-input"
          type="text"
          placeholder="e.g. Introduction to Financial Statements"
          value={form.title}
          onChange={e => set('title', e.target.value)}
        />
      </div>

      {/* ── Content Editor ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <label className="kw-label" style={{ margin: 0 }}>Lesson Content</label>
          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => setActiveTab('write')}
              style={{
                padding: '0.3rem 0.9rem',
                fontSize: '0.72rem',
                fontFamily: 'Syne, sans-serif',
                letterSpacing: '0.06em',
                cursor: 'pointer',
                borderRadius: '3px',
                border: '1px solid var(--kw-border-lt)',
                background: activeTab === 'write' ? 'linear-gradient(135deg, var(--kw-primary-dk), var(--kw-primary))' : 'transparent',
                color: activeTab === 'write' ? 'var(--kw-black)' : 'var(--kw-muted)',
                transition: 'all 0.2s',
              }}
            >Write HTML</button>
            <button
              onClick={() => setActiveTab('preview')}
              style={{
                padding: '0.3rem 0.9rem',
                fontSize: '0.72rem',
                fontFamily: 'Syne, sans-serif',
                letterSpacing: '0.06em',
                cursor: 'pointer',
                borderRadius: '3px',
                border: '1px solid var(--kw-border-lt)',
                background: activeTab === 'preview' ? 'linear-gradient(135deg, var(--kw-primary-dk), var(--kw-primary))' : 'transparent',
                color: activeTab === 'preview' ? 'var(--kw-black)' : 'var(--kw-muted)',
                transition: 'all 0.2s',
              }}
            >Preview</button>
          </div>
        </div>

        {/* Write tab */}
        {activeTab === 'write' && (
          <textarea
            className="kw-input"
            value={form.content}
            onChange={e => set('content', e.target.value)}
            rows={16}
            placeholder={`<h2>Introduction</h2>\n<p>In this lesson, we'll cover…</p>\n<ul>\n  <li>Key concept one</li>\n  <li>Key concept two</li>\n</ul>`}
            style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.8rem', resize: 'vertical', lineHeight: 1.6 }}
          />
        )}

        {/* Preview tab */}
        {activeTab === 'preview' && (
          <div
            className="kw-lesson-content"
            style={{
              minHeight: '240px',
              background: 'var(--kw-panel)',
              border: '1px solid var(--kw-border)',
              borderRadius: '4px',
              padding: '1.5rem',
            }}
            dangerouslySetInnerHTML={{ __html: sanitiseHtml(form.content) || '<p style="color: var(--kw-border-lt); font-style: italic">Nothing to preview yet.</p>' }}
          />
        )}

        {!form.content && (
          <p style={{ fontSize: '0.72rem', color: 'var(--kw-border-lt)', marginTop: '0.4rem' }}>
            ○ &nbsp; Content is optional — a lesson can be video-only or attachment-only.
          </p>
        )}
      </div>

      {/* ── Video URL ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label className="kw-label">Video URL</label>
        <input
          className="kw-input"
          type="url"
          placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/…"
          value={form.video_url}
          onChange={e => set('video_url', e.target.value)}
        />
        <VideoPreview url={form.video_url} />
      </div>

      {/* ── Attachments ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label className="kw-label">Attachments</label>

        {form.attachments.length > 0 && (
          <div style={{ marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {form.attachments.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                background: 'var(--kw-panel)',
                border: '1px solid var(--kw-border)',
                borderRadius: '4px',
                fontSize: '0.82rem',
              }}>
                <span style={{ color: 'var(--kw-primary-dk)' }}>{getFileIcon(a.type)}</span>
                <span style={{ flex: 1, color: 'var(--kw-cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', color: 'var(--kw-muted)' }}>↗</a>
                <button
                  onClick={() => removeAttachment(i)}
                  style={{ background: 'none', border: 'none', color: 'var(--kw-danger)', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1 }}
                  title="Remove"
                >×</button>
              </div>
            ))}
          </div>
        )}

        {/* Add attachment form */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr auto auto',
          gap: '0.5rem',
          alignItems: 'center',
        }}>
          <input
            className="kw-input"
            placeholder="Name"
            value={attachName}
            onChange={e => setAttachName(e.target.value)}
          />
          <input
            className="kw-input"
            placeholder="https://…"
            value={attachUrl}
            onChange={e => setAttachUrl(e.target.value)}
          />
          <select
            className="kw-input"
            value={attachType}
            onChange={e => setAttachType(e.target.value)}
            style={{ padding: '0.65rem 0.5rem' }}
          >
            <option value="document">Document</option>
            <option value="pdf">PDF</option>
            <option value="image">Image</option>
            <option value="spreadsheet">Spreadsheet</option>
            <option value="video">Video</option>
            <option value="other">Other</option>
          </select>
          <button className="kw-btn-secondary" onClick={addAttachment} style={{ whiteSpace: 'nowrap' }}>
            + Add
          </button>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--kw-border-lt)', marginTop: '0.4rem' }}>
          File upload via Cloudflare R2 — coming Session 9. For now, paste a public URL.
        </p>
      </div>

      {/* ── Order + Publish toggle ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <label className="kw-label">Order Position</label>
          <input
            className="kw-input"
            type="number"
            min={0}
            placeholder="0"
            value={form.order_index}
            onChange={e => set('order_index', e.target.value === '' ? '' : parseInt(e.target.value, 10))}
          />
          <p style={{ fontSize: '0.7rem', color: 'var(--kw-border-lt)', marginTop: '0.3rem' }}>0 = first. Drag-to-reorder coming later.</p>
        </div>

        <div>
          <label className="kw-label">Visibility</label>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.65rem 0.9rem',
            background: 'var(--kw-panel)',
            border: `1px solid ${form.is_published ? 'var(--kw-primary-dk)' : 'var(--kw-border)'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            userSelect: 'none',
          }}>
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={e => set('is_published', e.target.checked)}
              style={{ accentColor: 'var(--kw-primary)', width: '16px', height: '16px' }}
            />
            <span style={{ fontSize: '0.88rem', color: form.is_published ? 'var(--kw-primary-lt)' : 'var(--kw-muted)' }}>
              {form.is_published ? '◉ Published — visible to students' : '◇ Draft — hidden from students'}
            </span>
          </label>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="kw-divider" />

      {/* ── Bottom action row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
        <Link to={`/courses/${courseId}`} style={{ fontSize: '0.82rem', color: 'var(--kw-muted)' }}>
          ← Back to course
        </Link>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isEdit && (
            <button className="kw-btn-danger" onClick={handleDelete}>
              Delete Lesson
            </button>
          )}
          {!form.is_published && (
            <button className="kw-btn-secondary" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? '…' : 'Save Draft'}
            </button>
          )}
          <button className="kw-btn-primary" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? 'Saving…' : form.is_published ? '◉ Save & Publish' : '◉ Publish Lesson'}
          </button>
        </div>
      </div>

    </div>
  )
}
