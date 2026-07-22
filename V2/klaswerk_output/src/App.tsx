// ═══════════════════════════════════════════════════
// KlasWerk — App Router
// Session 9: ErrorBoundary, public CourseLanding route,
//             Login/Register ?next= redirect support
// ═══════════════════════════════════════════════════

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

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
// Session 5
import { QuizBuilder }      from '@/pages/QuizBuilder'
import { QuizTaker }        from '@/pages/QuizTaker'
// Session 6
import { SessionsPage }     from '@/pages/Sessions'
import { ScheduleSession }  from '@/pages/ScheduleSession'
import { LiveRoom }         from '@/pages/LiveRoom'
// Session 7
import { CertificatesPage }      from '@/pages/Certificates'
import { CertificateVerifyPage } from '@/pages/CertificateVerify'
import { AnalyticsPage }         from '@/pages/Analytics'
import { QuizzesListPage }       from '@/pages/QuizzesList'
import { PaymentReturnPage }     from '@/pages/PaymentReturn'
import { PaymentCancelPage }     from '@/pages/PaymentCancel'
// Session 9
import { CourseLandingPage }    from '@/pages/CourseLanding'
// Session 10
import { TrainerProfilePage }   from '@/pages/TrainerProfile'

// ── App root ──────────────────────────────────────
export default function App() {
  useAuth()

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>

          {/* ── Public routes ── */}
          <Route path="/login"       element={<LoginPage />} />
          <Route path="/register"    element={<RegisterPage />} />
          <Route path="/check-email" element={<CheckEmailPage />} />

          {/* Public course landing — no auth — Session 9 */}
          <Route path="/course/:courseId" element={<CourseLandingPage />} />

          {/* Certificate verification — PUBLIC, no AppShell */}
          <Route path="/verify/:certificateNumber" element={<CertificateVerifyPage />} />

          {/* Trainer public profile — PUBLIC, no AppShell — Session 10 */}
          <Route path="/trainer/:trainerId" element={<TrainerProfilePage />} />

          {/* ── Protected — any authenticated user ── */}
          <Route path="/dashboard" element={
            <ProtectedRoute><AppShell><DashboardPage /></AppShell></ProtectedRoute>
          } />

          <Route path="/courses" element={
            <ProtectedRoute><AppShell><CoursesPage /></AppShell></ProtectedRoute>
          } />

          {/* ── Lesson routes — MUST come before /courses/:courseId ── */}
          <Route path="/courses/:courseId/lessons/new" element={
            <ProtectedRoute requiredRole="trainer">
              <AppShell><LessonEditor /></AppShell>
            </ProtectedRoute>
          } />
          <Route path="/courses/:courseId/lessons/:lessonId/edit" element={
            <ProtectedRoute requiredRole="trainer">
              <AppShell><LessonEditor /></AppShell>
            </ProtectedRoute>
          } />

          {/* ── Quiz routes ── */}
          <Route path="/courses/:courseId/lessons/:lessonId/quiz" element={
            <ProtectedRoute requiredRole="trainer">
              <AppShell><QuizBuilder /></AppShell>
            </ProtectedRoute>
          } />
          <Route path="/quizzes/:quizId" element={
            <ProtectedRoute><AppShell><QuizTaker /></AppShell></ProtectedRoute>
          } />
          <Route path="/quizzes" element={
            <ProtectedRoute><AppShell><QuizzesListPage /></AppShell></ProtectedRoute>
          } />

          <Route path="/courses/:courseId/lessons/:lessonId" element={
            <ProtectedRoute><AppShell><LessonViewer /></AppShell></ProtectedRoute>
          } />

          {/* Create course — MUST come before /courses/:courseId */}
          <Route path="/courses/new" element={
            <ProtectedRoute requiredRole="trainer">
              <AppShell><CreateCoursePage /></AppShell>
            </ProtectedRoute>
          } />

          <Route path="/courses/:courseId" element={
            <ProtectedRoute><AppShell><CourseDetailPage /></AppShell></ProtectedRoute>
          } />

          {/* ── Live sessions ── */}
          <Route path="/live/new" element={
            <ProtectedRoute requiredRole="trainer">
              <AppShell><ScheduleSession /></AppShell>
            </ProtectedRoute>
          } />
          <Route path="/live/:sessionId/edit" element={
            <ProtectedRoute requiredRole="trainer">
              <AppShell><ScheduleSession /></AppShell>
            </ProtectedRoute>
          } />
          <Route path="/live/:sessionId" element={
            <ProtectedRoute><AppShell><LiveRoom /></AppShell></ProtectedRoute>
          } />
          <Route path="/live" element={
            <ProtectedRoute><AppShell><SessionsPage /></AppShell></ProtectedRoute>
          } />

          {/* Certificates */}
          <Route path="/certificates" element={
            <ProtectedRoute><AppShell><CertificatesPage /></AppShell></ProtectedRoute>
          } />

          {/* Profile */}
          <Route path="/profile" element={
            <ProtectedRoute><AppShell><ProfilePage /></AppShell></ProtectedRoute>
          } />

          {/* Analytics — trainer only */}
          <Route path="/analytics" element={
            <ProtectedRoute requiredRole="trainer">
              <AppShell><AnalyticsPage /></AppShell>
            </ProtectedRoute>
          } />

          {/* Payment callbacks */}
          <Route path="/payment/return" element={<PaymentReturnPage />} />
          <Route path="/payment/cancel" element={<PaymentCancelPage />} />

          {/* Fallback */}
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />

        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
