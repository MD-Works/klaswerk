// ═══════════════════════════════════════════════════
// KlasWerk — Protected Route Guard
// ───────────────────────────────────────────────────
// Session 13: owner role support
//   requiredRole="trainer" — allows trainer AND owner
//   requiredRole="owner"   — owner only
//   requiredRole="student" — student only
// ═══════════════════════════════════════════════════

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isLoggedIn, isReady, role, isOwner } = useAuth()
  const location = useLocation()

  if (!isReady) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '0.8rem',
        color: 'var(--kw-muted)',
        fontFamily: 'Raleway, sans-serif',
        fontSize: '0.85rem',
      }}>
        <span className="kw-spinner" />
        Loading…
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Role check — owner inherits trainer access everywhere
  if (requiredRole) {
    const allowed =
      role === requiredRole ||
      (requiredRole === 'trainer' && isOwner)  // owner can do anything a trainer can

    if (!allowed) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return <>{children}</>
}
