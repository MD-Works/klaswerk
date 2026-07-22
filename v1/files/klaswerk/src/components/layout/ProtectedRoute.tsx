// ═══════════════════════════════════════════════════
// KlasWerk — Protected Route Guard
// ═══════════════════════════════════════════════════

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole   // if set, only that role can access
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isLoggedIn, isReady, role } = useAuth()
  const location = useLocation()

  // Still checking session — show nothing (avoids flash to login)
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

  // Not logged in — redirect to login, preserve intended destination
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Wrong role — redirect to their own dashboard
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
