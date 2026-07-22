// ═══════════════════════════════════════════════════
// KlasWerk — Owner: Invite Manager
// ───────────────────────────────────────────────────
// Rendered inside the owner's dashboard section.
// Features:
//   - Send invite by email (calls createInvite → Edge Function)
//   - Live list of all invites with status + expiry
//   - Revoke pending invites
// ═══════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import type { TrainerInvite } from '@/types'

function statusBadgeClass(status: TrainerInvite['status']) {
  if (status === 'accepted') return 'kw-badge kw-badge-success'
  if (status === 'expired')  return 'kw-badge kw-badge-muted'
  return 'kw-badge kw-badge-gold'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function InviteManager() {
  const { createInvite, listInvites, revokeInvite } = useAuth()
  const { addToast } = useToast()

  const [invites, setInvites]         = useState<TrainerInvite[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [email, setEmail]             = useState('')
  const [sending, setSending]         = useState(false)
  const [revoking, setRevoking]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setListLoading(true)
    const data = await listInvites()
    setInvites(data)
    setListLoading(false)
  }, [listInvites])

  useEffect(() => { load() }, [load])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    const result = await createInvite(email.trim())
    if (result.ok) {
      addToast(`Invite sent to ${email.trim()}`, 'success')
      setEmail('')
      await load()
    } else {
      addToast(result.error ?? 'Failed to send invite', 'error')
    }
    setSending(false)
  }

  async function handleRevoke(inviteId: string, inviteEmail: string) {
    setRevoking(inviteId)
    try {
      await revokeInvite(inviteId)
      addToast(`Invite to ${inviteEmail} revoked`, 'success')
      await load()
    } catch {
      addToast('Failed to revoke invite', 'error')
    }
    setRevoking(null)
  }

  const sorted = [
    ...invites.filter(i => i.status === 'pending'),
    ...invites.filter(i => i.status === 'accepted'),
    ...invites.filter(i => i.status === 'expired'),
  ]

  return (
    <div>
      {/* Send form */}
      <div className="kw-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="kw-eyebrow" style={{ marginBottom: '1rem' }}>Invite a Trainer</div>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            className="kw-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="trainer@example.com"
            required
            disabled={sending}
            style={{ flex: '1 1 260px', minWidth: 0 }}
          />
          <button type="submit" className="kw-btn-primary" disabled={sending || !email.trim()} style={{ flexShrink: 0 }}>
            {sending ? <><span className="kw-spinner" style={{ width: 14, height: 14 }} /> Sending…</> : '◉ Send Invite'}
          </button>
        </form>
        <p style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.75rem', color: 'var(--kw-muted)', marginTop: '0.75rem', lineHeight: 1.5 }}>
          The trainer receives a personalised email link. Invites expire after 7 days.
        </p>
      </div>

      {/* List */}
      {listLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--kw-muted)', fontSize: '0.85rem', fontFamily: 'Raleway, sans-serif' }}>
          <span className="kw-spinner" style={{ width: 16, height: 16 }} /> Loading invites…
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', fontFamily: 'Raleway, sans-serif', fontSize: '0.85rem', color: 'var(--kw-muted)', border: '1px dashed var(--kw-border)', borderRadius: '8px' }}>
          No invites sent yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sorted.map(invite => (
            <div key={invite.id} className="kw-card" style={{ padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <div style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.85rem', color: 'var(--kw-cream)' }}>
                  {invite.email}
                </div>
                <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.58rem', color: 'var(--kw-muted)', marginTop: '0.2rem', letterSpacing: '0.05em' }}>
                  {invite.status === 'accepted' && invite.accepted_at
                    ? `Accepted ${formatDate(invite.accepted_at)}`
                    : invite.status === 'pending'
                      ? `Expires ${formatDate(invite.expires_at)}`
                      : `Expired ${formatDate(invite.expires_at)}`
                  }
                </div>
              </div>
              <span className={statusBadgeClass(invite.status)} style={{ textTransform: 'uppercase', fontSize: '0.58rem' }}>
                {invite.status}
              </span>
              {invite.status === 'pending' && (
                <button
                  className="kw-btn-danger"
                  disabled={revoking === invite.id}
                  onClick={() => handleRevoke(invite.id, invite.email)}
                  style={{ padding: '0.35rem 0.8rem', fontSize: '0.72rem' }}
                >
                  {revoking === invite.id ? <span className="kw-spinner" style={{ width: 12, height: 12 }} /> : 'Revoke'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
