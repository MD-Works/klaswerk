// ═══════════════════════════════════════════════════
// KlasWerk — App Router
// Session 4: Lesson Editor, Lesson Viewer, Profile page.
// ═══════════════════════════════════════════════════

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'

// ── Pages ─────────────────────────────────────────
import { LoginPage }        from '@/pages/Login'
import { RegisterPage }     from '@/pages/Register'
import { CheckEmailPage }   from '@/pages/CheckEmail'
import { DashboardPage }    from '@/pages/Dashboard'
import { CoursesPage }      from '@/pages/Courses'
import { CourseDetailPage } from '@/pages/CourseDetail'
import { CreateCoursePage } from '@/pages/CreateCourse'
// Session 4
import { LessonEditor }     from '@/pages/LessonEditor'
import { LessonViewer }     from '@/pages/LessonViewer'
import { ProfilePage }      from '@/pages/Profile'

// Placeholder stubs — replaced as sessions progress
const Placeholder = ({ name }: { name: string }) => (
  <div style={{
    padding: '2rem',
    color: 'var(--kw-muted)',
    fontFamily: 'Cormorant Garamond, serif',
    fontStyle: 'italic',
    fontSize: '1.1rem',
    textAlign: 'center',
  }}>
    ✦ &nbsp; {name} — coming in next session &nbsp; ✦
  </div>
)

// ── App root ──────────────────────────────────────
export default function App() {
  useAuth()

  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public routes ── */}
        <Route path="/login"       element={<LoginPage />} />
        <Route path="/register"    element={<RegisterPage />} />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/verify/:certificateNumber" element={<Placeholder name="Certificate Verification" />} />

        {/* ── Protected — any authenticated user ── */}
        <Route path="/dashboard" element={
          <ProtectedRoute><AppShell><DashboardPage /></AppShell></ProtectedRoute>
        } />

        <Route path="/courses" element={
          <ProtectedRoute><AppShell><CoursesPage /></AppShell></ProtectedRoute>
        } />

        {/* ── Lesson routes — MUST come before /courses/:courseId ── */}

        {/* New lesson — trainer only */}
        <Route path="/courses/:courseId/lessons/new" element={
          <ProtectedRoute requiredRole="trainer">
            <AppShell><LessonEditor /></AppShell>
          </ProtectedRoute>
        } />

        {/* Edit lesson — trainer only */}
        <Route path="/courses/:courseId/lessons/:lessonId/edit" element={
          <ProtectedRoute requiredRole="trainer">
            <AppShell><LessonEditor /></AppShell>
          </ProtectedRoute>
        } />

        {/* View lesson — any authenticated user */}
        <Route path="/courses/:courseId/lessons/:lessonId" element={
          <ProtectedRoute>
            <AppShell><LessonViewer /></AppShell>
          </ProtectedRoute>
        } />

        {/* Course detail — after lesson routes */}
        <Route path="/courses/:courseId" element={
          <ProtectedRoute><AppShell><CourseDetailPage /></AppShell></ProtectedRoute>
        } />

        {/* Create course — MUST come before /courses/:courseId */}
        <Route path="/courses/new" element={
          <ProtectedRoute requiredRole="trainer">
            <AppShell><CreateCoursePage /></AppShell>
          </ProtectedRoute>
        } />

        {/* Live sessions */}
        <Route path="/live" element={
          <ProtectedRoute><AppShell><Placeholder name="Live Sessions" /></AppShell></ProtectedRoute>
        } />
        <Route path="/live/:sessionId" element={
          <ProtectedRoute><AppShell><Placeholder name="Live Session Room" /></AppShell></ProtectedRoute>
        } />

        {/* Quizzes */}
        <Route path="/quizzes" element={
          <ProtectedRoute><AppShell><Placeholder name="Quizzes" /></AppShell></ProtectedRoute>
        } />
        <Route path="/quizzes/:quizId" element={
          <ProtectedRoute><AppShell><Placeholder name="Quiz" /></AppShell></ProtectedRoute>
        } />

        {/* Certificates */}
        <Route path="/certificates" element={
          <ProtectedRoute><AppShell><Placeholder name="Certificates" /></AppShell></ProtectedRoute>
        } />

        {/* Profile — Session 4 */}
        <Route path="/profile" element={
          <ProtectedRoute><AppShell><ProfilePage /></AppShell></ProtectedRoute>
        } />

        {/* Analytics — trainer only */}
        <Route path="/analytics" element={
          <ProtectedRoute requiredRole="trainer">
            <AppShell><Placeholder name="Analytics Dashboard" /></AppShell>
          </ProtectedRoute>
        } />

        {/* Payment callbacks */}
        <Route path="/payment/return"  element={<Placeholder name="Payment Return" />} />
        <Route path="/payment/cancel"  element={<Placeholder name="Payment Cancelled" />} />

        {/* Fallback */}
        <Route path="/"  element={<Navigate to="/dashboard" replace />} />
        <Route path="*"  element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </BrowserRouter>
  )
}
