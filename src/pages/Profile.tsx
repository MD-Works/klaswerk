// ═══════════════════════════════════════════════════
// KlasWerk — Profile Page
// ───────────────────────────────────────────────────
// Route: /profile
//
// Sections:
//   - Avatar (initials or avatar_url)
//   - Personal info form
//   - Account info (read-only)
//   - Sign out
// ═══════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { getInitials, formatDate } from '@/lib/utils'

interface ProfileForm {
  full_name:  string
  bio:        string
  company:    string
  phone:      string
  avatar_url: string
}

export function ProfilePage() {
  const { user, profile, isTrainer, signOut, updateProfile, isLoading } = useAuth()
  const { toast }  = useToast()
  const navigate   = useNavigate()

  const [form, setForm]   = useState<ProfileForm>({
    full_name:  '',
    bio:        '',
    company:    '',
    phone:      '',
    avatar_url: '',
  })
  const [saving, setSaving]  = useState(false)
  const [dirty,  setDirty]   = useState(false)
  const [imgError, setImgError] = useState(false)

  // ── Populate form when profile loads ──────────────────────────────────
  useEffect(() => {
    if (profile) {
      setForm({
        full_name:  profile.full_name  ?? '',
        bio:        profile.bio        ?? '',
        company:    profile.company    ?? '',
        phone:      profile.phone      ?? '',
        avatar_url: profile.avatar_url ?? '',
      })
    }
  }, [profile])

  function set<K extends keyof ProfileForm>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    setDirty(true)
    if (key === 'avatar_url') setImgError(false)
  }

  // ── Save ───────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.full_name.trim()) { toast.error('Name is required.'); return }
    setSaving(true)
    try {
      await updateProfile({
        full_name:  form.full_name.trim(),
        bio:        form.bio.trim() || undefined,
        company:    form.company.trim() || undefined,
        phone:      form.phone.trim() || undefined,
        avatar_url: form.avatar_url.trim() || undefined,
      })
      toast.success('Profile updated.')
      setDirty(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  // ── Sign out ───────────────────────────────────────────────────────────
  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  // ── Loading ────────────────────────────────────────────────────────────
  if (isLoading && !profile) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--kw-muted)' }}>
        <div className="kw-spinner" style={{ margin: '0 auto 1rem' }} />
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>Loading profile…</p>
      </div>
    )
  }

  // ─────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>

      {/* ── Page header ── */}
      <div className="kw-eyebrow" style={{ marginBottom: '0.5rem' }}>Account</div>
      <h1 style={{
        fontFamily: 'Cinzel, serif',
        fontSize: '1.6rem',
        fontWeight: 600,
        color: 'var(--kw-primary-lt)',
        marginBottom: '0.5rem',
      }}>
        Your Profile
      </h1>
      <p style={{ color: 'var(--kw-muted)', fontSize: '0.88rem', marginBottom: '2rem' }}>
        Manage your personal information and preferences.
      </p>

      <div className="kw-divider" />

      {/* ── Avatar section ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        padding: '1.5rem',
        background: 'var(--kw-surface)',
        border: '1px solid var(--kw-border)',
        borderRadius: '6px',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle gold glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, var(--kw-primary-glow, rgba(201,148,60,.06)) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        {/* Avatar */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {form.avatar_url && !imgError ? (
            <img
              src={form.avatar_url}
              alt={form.full_name || 'Avatar'}
              onError={() => setImgError(true)}
              style={{
                width: '72px', height: '72px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--kw-primary-dk)',
              }}
            />
          ) : (
            <div style={{
              width: '72px', height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--kw-primary-dk), var(--kw-primary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Cinzel, serif',
              fontWeight: 600,
              fontSize: '1.4rem',
              color: 'var(--kw-black)',
            }}>
              {getInitials(form.full_name || profile?.full_name)}
            </div>
          )}
        </div>

        {/* Name + role */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '1rem',
            color: 'var(--kw-cream)',
            fontWeight: 600,
          }}>
            {form.full_name || 'Your Name'}
          </div>
          <div style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontStyle: 'italic',
            fontSize: '0.9rem',
            color: 'var(--kw-muted)',
            marginTop: '0.15rem',
          }}>
            {form.company ? `${form.company} · ` : ''}
            {isTrainer ? 'Trainer' : 'Student'}
          </div>
          <span className={`kw-badge ${isTrainer ? 'kw-badge-gold' : 'kw-badge-muted'}`} style={{ marginTop: '0.5rem' }}>
            {isTrainer ? '✦ Trainer' : '○ Student'}
          </span>
        </div>
      </div>

      {/* ── Personal info form ── */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '0.9rem',
          fontWeight: 600,
          color: 'var(--kw-primary-lt)',
          letterSpacing: '0.06em',
          marginBottom: '1.25rem',
        }}>
          Personal Information
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Full name */}
          <div>
            <label className="kw-label">Full Name *</label>
            <input
              className="kw-input"
              type="text"
              placeholder="Your full name"
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
            />
          </div>

          {/* Bio */}
          <div>
            <label className="kw-label">Bio</label>
            <textarea
              className="kw-input"
              placeholder="Tell students a little about yourself…"
              value={form.bio}
              onChange={e => set('bio', e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Company + Phone — side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="kw-label">Company / Organisation</label>
              <input
                className="kw-input"
                type="text"
                placeholder="Where do you work?"
                value={form.company}
                onChange={e => set('company', e.target.value)}
              />
            </div>
            <div>
              <label className="kw-label">Phone Number</label>
              <input
                className="kw-input"
                type="tel"
                placeholder="+27 82 123 4567"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
              />
            </div>
          </div>

          {/* Avatar URL */}
          <div>
            <label className="kw-label">Avatar URL</label>
            <input
              className="kw-input"
              type="url"
              placeholder="https://… (public image URL)"
              value={form.avatar_url}
              onChange={e => set('avatar_url', e.target.value)}
            />
            <p style={{ fontSize: '0.7rem', color: 'var(--kw-border-lt)', marginTop: '0.3rem' }}>
              Profile photo upload via Cloudflare R2 — coming Session 9.
            </p>
          </div>

        </div>

        {/* Save button */}
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
          <button
            className="kw-btn-primary"
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? 'Saving…' : '◉ Save Changes'}
          </button>
          {dirty && (
            <button
              className="kw-btn-secondary"
              onClick={() => {
                if (profile) {
                  setForm({
                    full_name:  profile.full_name  ?? '',
                    bio:        profile.bio        ?? '',
                    company:    profile.company    ?? '',
                    phone:      profile.phone      ?? '',
                    avatar_url: profile.avatar_url ?? '',
                  })
                  setDirty(false)
                }
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      <div className="kw-divider" />

      {/* ── Account info (read-only) ── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '0.9rem',
          fontWeight: 600,
          color: 'var(--kw-primary-lt)',
          letterSpacing: '0.06em',
          marginBottom: '1.25rem',
        }}>
          Account Details
        </h2>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
          border: '1px solid var(--kw-border)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          {[
            { label: 'Email address', value: user?.email ?? '—' },
            { label: 'Role', value: isTrainer ? 'Trainer' : 'Student' },
            { label: 'Member since', value: formatDate(profile?.created_at) },
            { label: 'User ID', value: (user?.id?.slice(0, 16) ?? '') + '…' },
          ].map(({ label, value }, i) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                borderTop: i > 0 ? '1px solid var(--kw-border)' : 'none',
                background: i % 2 === 0 ? 'var(--kw-surface)' : 'transparent',
              }}
            >
              <span style={{
                width: '160px',
                flexShrink: 0,
                fontFamily: 'Syne, sans-serif',
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--kw-muted)',
              }}>
                {label}
              </span>
              <span style={{
                fontFamily: label === 'User ID' ? 'Syne Mono, monospace' : 'Raleway, sans-serif',
                fontSize: '0.85rem',
                color: 'var(--kw-cream)',
              }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '0.72rem', color: 'var(--kw-border-lt)', marginTop: '0.75rem' }}>
          To change your email or password, contact your administrator.
        </p>
      </section>

      <div className="kw-divider" />

      {/* ── Sign out ── */}
      <section style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.82rem', color: 'var(--kw-cream)', marginBottom: '0.2rem' }}>
              Sign out of KlasWerk
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--kw-border-lt)' }}>
              You'll need to sign in again to access your courses.
            </div>
          </div>
          <button className="kw-btn-danger" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </section>

    </div>
  )
}
