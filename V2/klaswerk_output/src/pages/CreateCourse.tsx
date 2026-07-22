// ═══════════════════════════════════════════════════
// KlasWerk — Create Course Page (Trainer Only)
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCourse, EMPTY_COURSE_FORM, type CourseFormData } from '@/hooks/useCourse'
import { useToast } from '@/hooks/useToast'

const CATEGORIES = [
  'Business', 'Technology', 'Design', 'Marketing',
  'Finance', 'Health & Wellness', 'Personal Development', 'Other',
]

export function CreateCoursePage() {
  const navigate = useNavigate()
  const { createCourse, isLoading } = useCourse()
  const { toast } = useToast()

  const [form, setForm] = useState<CourseFormData>(EMPTY_COURSE_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof CourseFormData, string>>>({})

  function update<K extends keyof CourseFormData>(key: K, value: CourseFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const next: typeof errors = {}
    if (!form.title.trim())             next.title = 'Title is required'
    if (!form.description.trim())       next.description = 'Description helps students find your course'
    if (form.price < 0)                 next.price = 'Price cannot be negative'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return

    const course = await createCourse(form)
    if (course) {
      toast.success('Course created!')
      navigate(`/courses/${course.id}`)
    } else {
      toast.error('Failed to create course — please try again.')
    }
  }

  async function handleSaveDraft() {
    if (!form.title.trim()) {
      setErrors({ title: 'Title is required even for a draft' })
      return
    }
    const course = await createCourse({ ...form, status: 'draft' })
    if (course) {
      toast.success('Draft saved')
      navigate(`/courses/${course.id}`)
    } else {
      toast.error('Failed to save draft')
    }
  }

  // ─────────────────────────────────────────────────
  return (
    <div className="kw-animate-fade-in" style={{ maxWidth: '680px' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="kw-eyebrow" style={{ marginBottom: '0.4rem' }}>Course Management</div>
        <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.5rem', fontWeight: 600, color: 'var(--kw-primary-lt)' }}>
          Create Course
        </h1>
        <p style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.85rem', color: 'var(--kw-muted)', marginTop: '0.3rem' }}>
          Fill in the details below. You can save a draft and publish later.
        </p>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Title */}
        <FormField label="Course Title" error={errors.title} required>
          <input
            type="text"
            placeholder="e.g. Advanced Excel for Finance"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            className="kw-input"
            maxLength={120}
          />
        </FormField>

        {/* Description */}
        <FormField label="Description" error={errors.description} hint="Shown to students on the course listing">
          <textarea
            placeholder="What will students learn? Who is this for?"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            className="kw-input"
            rows={4}
            style={{ resize: 'vertical', minHeight: '100px' }}
          />
        </FormField>

        {/* Category + Level row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormField label="Category" hint="Helps students filter courses">
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              className="kw-input"
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Level">
            <select
              value={form.level}
              onChange={(e) => update('level', e.target.value as CourseFormData['level'])}
              className="kw-input"
            >
              <option value="">Any level</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </FormField>
        </div>

        {/* Price + Duration row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FormField label="Price (ZAR)" error={errors.price} hint="Set to 0 for a free course">
            <div style={{ position: 'relative' }}>
              <span style={{
                position:   'absolute',
                left:       '0.75rem',
                top:        '50%',
                transform:  'translateY(-50%)',
                fontFamily: 'Syne Mono, monospace',
                fontSize:   '0.8rem',
                color:      'var(--kw-muted)',
              }}>R</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => update('price', parseFloat(e.target.value) || 0)}
                className="kw-input"
                style={{ paddingLeft: '2rem' }}
              />
            </div>
          </FormField>

          <FormField label="Duration (minutes)" hint="Estimated total time">
            <input
              type="number"
              min="0"
              placeholder="e.g. 180"
              value={form.estimated_duration}
              onChange={(e) => update('estimated_duration', e.target.value ? parseInt(e.target.value) : '')}
              className="kw-input"
            />
          </FormField>
        </div>

        {/* Thumbnail URL */}
        <FormField label="Thumbnail URL" hint="Direct image link for the course card (optional)">
          <input
            type="url"
            placeholder="https://…"
            value={form.thumbnail_url}
            onChange={(e) => update('thumbnail_url', e.target.value)}
            className="kw-input"
          />
        </FormField>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--kw-border)', margin: '0.25rem 0' }} />

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="kw-btn-primary"
            onClick={handleSubmit}
            disabled={isLoading}
            style={{ flex: 1, minWidth: '140px' }}
          >
            {isLoading ? 'Creating…' : 'Create & Open'}
          </button>
          <button
            className="kw-btn-secondary"
            onClick={handleSaveDraft}
            disabled={isLoading}
          >
            Save as Draft
          </button>
          <button
            className="kw-btn-secondary"
            onClick={() => navigate('/courses')}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// Form field wrapper
// ─────────────────────────────────────────────────
function FormField({
  label,
  hint,
  error,
  required = false,
  children,
}: {
  label:    string
  hint?:    string
  error?:   string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label style={{
        display:       'block',
        fontFamily:    'Syne Mono, monospace',
        fontSize:      '0.62rem',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color:         error ? 'var(--kw-danger)' : 'var(--kw-primary-dk)',
        marginBottom:  '0.4rem',
      }}>
        {label}
        {required && <span style={{ color: 'var(--kw-danger)', marginLeft: '0.25rem' }}>*</span>}
      </label>
      {children}
      {hint && !error && (
        <div style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.72rem', color: 'var(--kw-muted)', marginTop: '0.3rem' }}>
          {hint}
        </div>
      )}
      {error && (
        <div style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.72rem', color: 'var(--kw-danger)', marginTop: '0.3rem' }}>
          {error}
        </div>
      )}
    </div>
  )
}
