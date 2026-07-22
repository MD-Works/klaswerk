// ═══════════════════════════════════════════════════
// KlasWerk — App Shell Layout
// ───────────────────────────────────────────────────
// Authenticated layout: sidebar nav + top bar + content
// Session 8: full mobile-responsive overhaul
//   • Mobile (<768px): sidebar collapses to off-canvas drawer
//   • Hamburger toggle in top-bar
//   • Backdrop overlay closes drawer on tap-outside
//   • Content shifts right only on desktop (margin-left: 220px)
//   • All padding/font sizes fluid for small screens
// ═══════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
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
  { label: 'Dashboard',    path: '/dashboard',    icon: '⊞' },
  { label: 'Courses',      path: '/courses',      icon: '◈' },
  { label: 'Live',         path: '/live',         icon: '◉', featureFlag: 'liveSessions' },
  { label: 'Quizzes',      path: '/quizzes',      icon: '◇', featureFlag: 'quizzes' },
  { label: 'Analytics',    path: '/analytics',    icon: '▦', trainerOnly: true, featureFlag: 'analytics' },
  { label: 'Certificates', path: '/certificates', icon: '◎', featureFlag: 'certificates' },
  { label: 'Profile',      path: '/profile',      icon: '○' },
]

// ── Hook: detect mobile viewport ─────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    setIsMobile(mq.matches)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])
  return isMobile
}

// ── Sidebar content (shared between desktop fixed + mobile drawer) ────────────
function SidebarContent({
  visibleNav,
  profile,
  isTrainer,
  onNavClick,
  onSignOut,
}: {
  visibleNav: NavItem[]
  profile: any
  isTrainer: boolean
  onNavClick?: () => void
  onSignOut: () => void
}) {
  return (
    <>
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
            onClick={onNavClick}
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
          onClick={onSignOut}
          className="kw-btn-secondary"
          style={{ width: '100%', justifyContent: 'center', fontSize: '0.72rem', padding: '0.5rem' }}
        >
          Sign Out
        </button>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════
// AppShell
// ═══════════════════════════════════════════════════
export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, isTrainer, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const isMobile  = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Close drawer on outside click
  useEffect(() => {
    if (!drawerOpen) return
    function handleOutside(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setDrawerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [drawerOpen])

  // Prevent body scroll when drawer open on mobile
  useEffect(() => {
    document.body.style.overflow = (isMobile && drawerOpen) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobile, drawerOpen])

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
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>

      {/* ══ DESKTOP SIDEBAR (fixed, always visible ≥768px) ══ */}
      {!isMobile && (
        <aside style={{
          width: '220px',
          flexShrink: 0,
          background: 'var(--kw-black)',
          borderRight: '1px solid var(--kw-border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          zIndex: 50,
        }}>
          <SidebarContent
            visibleNav={visibleNav}
            profile={profile}
            isTrainer={isTrainer}
            onSignOut={handleSignOut}
          />
        </aside>
      )}

      {/* ══ MOBILE BACKDROP ══ */}
      {isMobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 60,
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            animation: 'kwFadeIn 0.2s ease',
          }}
        />
      )}

      {/* ══ MOBILE DRAWER (slides in from left) ══ */}
      {isMobile && (
        <aside
          ref={drawerRef}
          style={{
            width: '260px',
            background: 'var(--kw-black)',
            borderRight: '1px solid var(--kw-border)',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            top: 0, left: 0, bottom: 0,
            zIndex: 70,
            transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: drawerOpen ? '4px 0 32px rgba(0,0,0,0.5)' : 'none',
          }}
        >
          {/* Drawer close button */}
          <button
            onClick={() => setDrawerOpen(false)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'var(--kw-surface)',
              border: '1px solid var(--kw-border)',
              borderRadius: '4px',
              color: 'var(--kw-muted)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              lineHeight: 1,
              padding: '4px 8px',
              zIndex: 1,
            }}
            aria-label="Close menu"
          >
            ✕
          </button>
          <SidebarContent
            visibleNav={visibleNav}
            profile={profile}
            isTrainer={isTrainer}
            onNavClick={() => setDrawerOpen(false)}
            onSignOut={handleSignOut}
          />
        </aside>
      )}

      {/* ══ MAIN AREA ══ */}
      <main style={{
        flex: 1,
        marginLeft: isMobile ? 0 : '220px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        minWidth: 0, // prevent overflow from flex child
      }}>

        {/* Top bar */}
        <header style={{
          height: '52px',
          background: 'var(--kw-surface)',
          borderBottom: '1px solid var(--kw-border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 1rem 0 1.25rem',
          gap: '0.75rem',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}>
          {/* Hamburger — mobile only */}
          {isMobile && (
            <button
              onClick={() => setDrawerOpen(o => !o)}
              aria-label="Open navigation"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--kw-muted)',
                cursor: 'pointer',
                fontSize: '1.3rem',
                lineHeight: 1,
                padding: '4px 6px',
                borderRadius: '4px',
                transition: 'color 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.color = 'var(--kw-primary)')}
              onMouseOut={e => (e.currentTarget.style.color = 'var(--kw-muted)')}
            >
              ☰
            </button>
          )}

          {/* Mobile logo (inline in top bar) */}
          {isMobile && (
            <div style={{
              fontFamily: 'Cinzel, serif',
              fontSize: '0.95rem',
              fontWeight: 900,
              background: 'linear-gradient(135deg, var(--kw-primary-lt), var(--kw-primary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {appConfig.name}
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Role badge */}
          <span className="kw-badge kw-badge-gold" style={{ textTransform: 'uppercase', fontSize: '0.58rem' }}>
            {isTrainer ? 'Trainer' : 'Student'}
          </span>
        </header>

        {/* Page content */}
        <div style={{
          flex: 1,
          padding: isMobile ? '1.25rem 1rem' : '2rem',
          maxWidth: '100%',
          overflowX: 'hidden',
        }}>
          {children}
        </div>
      </main>

      <ToastContainer />
    </div>
  )
}
