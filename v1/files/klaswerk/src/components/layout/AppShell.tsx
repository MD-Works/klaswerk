// ═══════════════════════════════════════════════════
// KlasWerk — App Shell Layout
// ───────────────────────────────────────────────────
// Wraps authenticated pages. Renders sidebar nav +
// top bar + main content area. Role-aware nav items.
// ═══════════════════════════════════════════════════

import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { appConfig, features, brand } from '@/config'
import { ToastContainer } from '@/components/ui/ToastContainer'

interface NavItem {
  label: string
  path: string
  icon: string
  trainerOnly?: boolean
  studentOnly?: boolean
  featureFlag?: keyof typeof features
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',  path: '/dashboard',  icon: '⊞' },
  { label: 'Courses',    path: '/courses',     icon: '◈' },
  { label: 'Live',       path: '/live',        icon: '◉', featureFlag: 'liveSessions' },
  { label: 'Quizzes',    path: '/quizzes',     icon: '◇', featureFlag: 'quizzes' },
  { label: 'Analytics',  path: '/analytics',   icon: '◈', trainerOnly: true, featureFlag: 'analytics' },
  { label: 'Certificates', path: '/certificates', icon: '◎', featureFlag: 'certificates' },
  { label: 'Profile',    path: '/profile',     icon: '○' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, isTrainer, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const visibleNav = NAV_ITEMS.filter(item => {
    if (item.featureFlag && !features[item.featureFlag]) return false
    if (item.trainerOnly && !isTrainer) return false
    if (item.studentOnly && isTrainer) return false
    return true
  })

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: '220px',
        flexShrink: 0,
        background: 'var(--kw-black)',
        borderRight: '1px solid var(--kw-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 50,
        transform: sidebarOpen ? 'translateX(0)' : undefined,
        transition: 'transform 0.3s',
      }}>
        {/* Logo */}
        <div style={{
          padding: '1.5rem 1.2rem 1rem',
          borderBottom: '1px solid var(--kw-border)',
        }}>
          {brand.logoUrl
            ? <img src={brand.logoUrl} alt={appConfig.name} style={{ height: '32px', objectFit: 'contain' }} />
            : (
              <div style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '1.1rem',
                fontWeight: 900,
                background: 'linear-gradient(135deg, var(--kw-primary-lt), var(--kw-primary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {appConfig.name}
              </div>
            )
          }
          <div style={{
            fontFamily: 'Syne Mono, monospace',
            fontSize: '0.55rem',
            letterSpacing: '0.2em',
            color: 'var(--kw-primary-dk)',
            marginTop: '0.3rem',
            textTransform: 'uppercase',
          }}>
            {isTrainer ? 'Trainer Portal' : 'Student Portal'}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '1rem 0', overflowY: 'auto' }}>
          {visibleNav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 1.2rem',
                fontFamily: 'Raleway, sans-serif',
                fontSize: '0.82rem',
                letterSpacing: '0.04em',
                color: isActive ? 'var(--kw-primary-lt)' : 'var(--kw-muted)',
                background: isActive ? 'rgba(201,148,60,0.08)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--kw-primary)' : '2px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.2s',
              })}
            >
              <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div style={{
          padding: '1rem 1.2rem',
          borderTop: '1px solid var(--kw-border)',
        }}>
          <div style={{
            fontFamily: 'Raleway, sans-serif',
            fontSize: '0.78rem',
            color: 'var(--kw-cream)',
            marginBottom: '0.2rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {profile?.full_name || 'User'}
          </div>
          <div style={{
            fontFamily: 'Syne Mono, monospace',
            fontSize: '0.6rem',
            color: 'var(--kw-muted)',
            marginBottom: '0.8rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {profile?.email}
          </div>
          <button
            onClick={handleSignOut}
            className="kw-btn-secondary"
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.72rem', padding: '0.5rem' }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <main style={{
        flex: 1,
        marginLeft: '220px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        {/* Top bar */}
        <header style={{
          height: '56px',
          background: 'var(--kw-surface)',
          borderBottom: '1px solid var(--kw-border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 1.5rem',
          gap: '1rem',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}>
          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{
              display: 'none', // shown via media query in production
              background: 'none',
              border: 'none',
              color: 'var(--kw-muted)',
              cursor: 'pointer',
              fontSize: '1.2rem',
            }}
          >
            ☰
          </button>

          <div style={{ flex: 1 }} />

          {/* Role badge */}
          <span className="kw-badge kw-badge-gold" style={{ textTransform: 'uppercase' }}>
            {isTrainer ? 'Trainer' : 'Student'}
          </span>
        </header>

        {/* Page content */}
        <div style={{ flex: 1, padding: '2rem 2rem' }}>
          {children}
        </div>
      </main>

      {/* Toast notifications — global, rendered once here */}
      <ToastContainer />
    </div>
  )
}
