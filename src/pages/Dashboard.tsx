// ═══════════════════════════════════════════════════
// KlasWerk — Dashboard Page
// ───────────────────────────────────────────────────
// Wired to real Supabase queries via useCourse.
// Trainer and student views.
// ═══════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCourse, type CourseWithStats } from '@/hooks/useCourse'
import { useSession, type SessionWithCourse } from '@/hooks/useSession'
import { appConfig } from '@/config'
import { InviteManager } from '@/components/owner/InviteManager'

// ── Trainer stat shape ───────────────────────────────────────────────────────
interface TrainerStats {
  activeCourses:          number
  totalStudents:          number
  liveSessionsThisMonth:  number
  completionRate:         number
}

// ── Student stat shape ───────────────────────────────────────────────────────
interface StudentStats {
  enrolled:    number
  completed:   number
  certificates: number
  quizAverage: number | null
}

// ═══════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════
export function DashboardPage() {
  const { profile, isTrainer, isOwner, isReady } = useAuth()
  const {
    fetchTrainerStats,
    fetchStudentStats,
    fetchTrainerCourses,
    fetchStudentCourses,
  } = useCourse()
  const { fetchSessions } = useSession()

  const [trainerStats,      setTrainerStats]      = useState<TrainerStats | null>(null)
  const [studentStats,      setStudentStats]      = useState<StudentStats | null>(null)
  const [recentCourses,     setRecentCourses]     = useState<CourseWithStats[]>([])
  const [upcomingSessions,  setUpcomingSessions]  = useState<SessionWithCourse[]>([])
  const [statsLoading,      setStatsLoading]      = useState(true)

  useEffect(() => {
    loadData()
  }, [isTrainer])

  async function loadData() {
    setStatsLoading(true)

    if (isTrainer) {
      const [stats, courses, sessions] = await Promise.all([
        fetchTrainerStats(),
        fetchTrainerCourses(),
        fetchSessions(),
      ])
      setTrainerStats(stats)
      setRecentCourses(courses.slice(0, 4))
      // Live + upcoming scheduled sessions, capped at 3
      setUpcomingSessions(
        sessions
          .filter(s => s.status === 'live' || s.status === 'scheduled')
          .slice(0, 3)
      )
    } else {
      const [stats, courses, sessions] = await Promise.all([
        fetchStudentStats(),
        fetchStudentCourses(),
        fetchSessions(),
      ])
      setStudentStats(stats)
      setRecentCourses(courses.slice(0, 4))
      setUpcomingSessions(
        sessions
          .filter(s => s.status === 'live' || s.status === 'scheduled')
          .slice(0, 3)
      )
    }

    setStatsLoading(false)
  }

  // ─────────────────────────────────────────────────
  if (!isReady) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--kw-muted)', fontFamily: 'Syne Mono, monospace', fontSize: '0.7rem', letterSpacing: '0.15em' }}>
      LOADING...
    </div>
  )

  return (
    <div className="kw-animate-fade-in">

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="kw-eyebrow" style={{ marginBottom: '0.5rem' }}>
          {appConfig.name} &nbsp;·&nbsp; {isOwner ? 'Owner' : isTrainer ? 'Trainer' : 'Student'} Dashboard
        </div>
        <h1 style={{
          fontFamily:   'Cinzel, serif',
          fontSize:     '1.6rem',
          fontWeight:   600,
          color:        'var(--kw-primary-lt)',
          marginBottom: '0.3rem',
        }}>
          Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <p style={{ color: 'var(--kw-muted)', fontFamily: 'Raleway, sans-serif', fontSize: '0.88rem' }}>
          {isOwner
            ? 'Manage your platform, invite trainers, and oversee all activity.'
            : isTrainer
              ? 'Manage your courses, schedule live sessions, and track student progress.'
              : 'Pick up where you left off or explore new courses.'}
        </p>
      </div>

      {/* ── Stat Cards ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {isTrainer
          ? <TrainerStatCards stats={trainerStats} loading={statsLoading} />
          : <StudentStatCards stats={studentStats} loading={statsLoading} />
        }
      </div>

      {/* ── Quick Actions ───────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        {isTrainer ? (
          <>
            <Link to="/courses/new" className="kw-btn-primary" style={{ textDecoration: 'none', display: 'inline-block', padding: '0.7rem 1.25rem' }}>
              + New Course
            </Link>
            <Link to="/live/new" className="kw-btn-secondary" style={{ textDecoration: 'none', display: 'inline-block', padding: '0.7rem 1.25rem' }}>
              ◉ Schedule Session
            </Link>
            <Link to="/courses" className="kw-btn-secondary" style={{ textDecoration: 'none', display: 'inline-block', padding: '0.7rem 1.25rem' }}>
              Manage Courses
            </Link>
            <Link to="/analytics" className="kw-btn-secondary" style={{ textDecoration: 'none', display: 'inline-block', padding: '0.7rem 1.25rem' }}>
              Analytics
            </Link>
          </>
        ) : (
          <>
            <Link to="/courses" className="kw-btn-primary" style={{ textDecoration: 'none', display: 'inline-block', padding: '0.7rem 1.25rem' }}>
              Browse Courses
            </Link>
            <Link to="/live" className="kw-btn-secondary" style={{ textDecoration: 'none', display: 'inline-block', padding: '0.7rem 1.25rem' }}>
              Live Sessions
            </Link>
            <Link to="/certificates" className="kw-btn-secondary" style={{ textDecoration: 'none', display: 'inline-block', padding: '0.7rem 1.25rem' }}>
              My Certificates
            </Link>
          </>
        )}
      </div>

      {/* ── Upcoming Live Sessions ─────────────────────── */}
      {(upcomingSessions.length > 0 || statsLoading) && (
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div className="kw-eyebrow">Upcoming Sessions</div>
            <Link
              to="/live"
              style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--kw-muted)', textDecoration: 'none' }}
            >
              View all →
            </Link>
          </div>

          {statsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[1, 2].map(i => (
                <div key={i} className="kw-card" style={{ padding: '1rem 1.25rem', height: '64px', opacity: 0.5 }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {upcomingSessions.map(s => (
                <UpcomingSessionRow key={s.id} session={s} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Recent Courses ──────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="kw-eyebrow">
            {isTrainer ? 'Recent Courses' : 'Continue Learning'}
          </div>
          <Link
            to="/courses"
            style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--kw-muted)', textDecoration: 'none' }}
          >
            View all →
          </Link>
        </div>

        {statsLoading ? (
          <CourseSkeleton />
        ) : recentCourses.length === 0 ? (
          <div style={{ background: 'var(--kw-surface)', border: '1px dashed var(--kw-border-lt)', borderRadius: '8px', padding: '3rem', textAlign: 'center', color: 'var(--kw-muted)', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>
            {isTrainer
              ? '✦  No courses yet — create your first one above'
              : '✦  You are not enrolled in any courses yet'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {recentCourses.map((course) => (
              <MiniCourseCard key={course.id} course={course} isTrainer={isTrainer} />
            ))}
          </div>
        )}
      </div>


      {/* ── Owner Panel: Trainer Invites ───────────────── */}
      {isOwner && (
        <div style={{ marginTop: '2.5rem' }}>
          <div className="kw-divider" style={{ marginBottom: '2rem' }} />
          <div style={{ marginBottom: '1.25rem' }}>
            <div className="kw-eyebrow" style={{ marginBottom: '0.5rem' }}>Platform Management</div>
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', fontWeight: 600, color: 'var(--kw-primary-lt)' }}>
              Trainer Access
            </h2>
            <p style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.82rem', color: 'var(--kw-muted)', marginTop: '0.25rem' }}>
              Invite co-trainers by email. Only invited users can hold the trainer role.
            </p>
          </div>
          <InviteManager />
        </div>
      )}

    </div>
  )
}

// ═══════════════════════════════════════════════════
// Trainer stat cards
// ═══════════════════════════════════════════════════
function TrainerStatCards({ stats, loading }: { stats: TrainerStats | null; loading: boolean }) {
  const items = [
    { label: 'Active Courses',  value: loading ? null : String(stats?.activeCourses ?? 0),          sub: 'Published' },
    { label: 'Total Students',  value: loading ? null : String(stats?.totalStudents ?? 0),           sub: 'Enrolled across all courses' },
    { label: 'Sessions',        value: loading ? null : String(stats?.liveSessionsThisMonth ?? 0),  sub: 'This month' },
    { label: 'Completion Rate', value: loading ? null : `${stats?.completionRate ?? 0}%`,            sub: 'Average' },
  ]
  return <>{items.map((s) => <StatCard key={s.label} {...s} />)}</>
}

// ═══════════════════════════════════════════════════
// Student stat cards
// ═══════════════════════════════════════════════════
function StudentStatCards({ stats, loading }: { stats: StudentStats | null; loading: boolean }) {
  const items = [
    { label: 'Enrolled',     value: loading ? null : String(stats?.enrolled ?? 0),                          sub: 'Active courses' },
    { label: 'Completed',    value: loading ? null : String(stats?.completed ?? 0),                         sub: 'Courses finished' },
    { label: 'Certificates', value: loading ? null : String(stats?.certificates ?? 0),                      sub: 'Earned' },
    { label: 'Quiz Average', value: loading ? null : (stats?.quizAverage != null ? `${stats.quizAverage}%` : '—'), sub: 'Across all attempts' },
  ]
  return <>{items.map((s) => <StatCard key={s.label} {...s} />)}</>
}

// ═══════════════════════════════════════════════════
// Individual stat card
// ═══════════════════════════════════════════════════
function StatCard({ label, value, sub }: { label: string; value: string | null; sub: string }) {
  return (
    <div className="kw-card" style={{ padding: '1.2rem 1.4rem' }}>
      <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--kw-primary-dk)', marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '2rem', fontWeight: 600, color: 'var(--kw-primary-lt)', lineHeight: 1 }}>
        {value === null
          ? <span style={{ opacity: 0.3 }}>—</span>
          : value
        }
      </div>
      <div style={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.7rem', color: 'var(--kw-muted)', marginTop: '0.3rem' }}>
        {sub}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// Mini course card (dashboard preview)
// ═══════════════════════════════════════════════════
function MiniCourseCard({ course, isTrainer }: { course: CourseWithStats; isTrainer: boolean }) {
  const progress = course.enrollment?.progress

  return (
    <Link to={`/courses/${course.id}`} style={{ textDecoration: 'none' }}>
      <div className="kw-card" style={{ padding: '1rem 1.1rem' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem', fontWeight: 600, color: 'var(--kw-primary-lt)', marginBottom: '0.3rem', lineHeight: 1.3 }}>
          {course.title}
        </div>

        {isTrainer ? (
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.6rem' }}>
            <MiniStat label="Students" value={String(course.enrollment_count ?? 0)} />
            <MiniStat label="Lessons"  value={String(course.lesson_count ?? 0)} />
            <MiniStat label="Status"   value={course.status} />
          </div>
        ) : (
          <>
            {progress != null && (
              <div style={{ marginTop: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.57rem', color: 'var(--kw-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Progress</span>
                  <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.57rem', color: 'var(--kw-primary)' }}>{progress}%</span>
                </div>
                <div style={{ height: '2px', background: 'var(--kw-border)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--kw-primary-dk), var(--kw-primary))', borderRadius: '2px' }} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Link>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.53rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--kw-primary-dk)' }}>{label}</div>
      <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.75rem', color: 'var(--kw-cream)', marginTop: '0.1rem' }}>{value}</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// Upcoming session row (dashboard widget)
// ═══════════════════════════════════════════════════
function UpcomingSessionRow({ session }: { session: SessionWithCourse }) {
  const isLive = session.status === 'live'
  const d = new Date(session.scheduled_for)

  return (
    <Link to={`/live/${session.id}`} style={{ textDecoration: 'none' }}>
      <div
        className="kw-card"
        style={{
          padding: '0.8rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          borderLeft: isLive ? '3px solid var(--kw-success)' : '3px solid transparent',
        }}
      >
        {/* Date pill */}
        <div style={{
          flexShrink: 0,
          textAlign: 'center',
          minWidth: '42px',
        }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--kw-primary-lt)', lineHeight: 1 }}>
            {d.getDate()}
          </div>
          <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.5rem', color: 'var(--kw-primary-dk)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {d.toLocaleDateString('en-ZA', { month: 'short' })}
          </div>
        </div>

        <div style={{ width: '1px', height: '32px', background: 'var(--kw-border)', flexShrink: 0 }} />

        {/* Title + course */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: 'var(--kw-primary-lt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.title}
          </div>
          {session.course && (
            <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.57rem', color: 'var(--kw-primary-dk)', marginTop: '0.15rem', letterSpacing: '0.06em' }}>
              {session.course.title}
            </div>
          )}
        </div>

        {/* Time + status */}
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          {isLive ? (
            <span style={{
              fontFamily: 'Syne Mono, monospace',
              fontSize: '0.6rem',
              color: 'var(--kw-success)',
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}>
              <span style={{ animation: 'kw-pulse 1.5s ease infinite' }}>●</span> LIVE NOW
            </span>
          ) : (
            <span style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.6rem', color: 'var(--kw-muted)' }}>
              {d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {session.duration && (
            <div style={{ fontFamily: 'Syne Mono, monospace', fontSize: '0.55rem', color: 'var(--kw-border-lt)', marginTop: '0.15rem' }}>
              {session.duration} min
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────
// Skeleton while loading
// ─────────────────────────────────────────────────
function CourseSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="kw-card" style={{ padding: '1rem 1.1rem', height: '90px' }}>
          <div style={{ height: '0.8rem', width: '60%', background: 'var(--kw-border-lt)', borderRadius: '3px', marginBottom: '0.6rem', opacity: 0.5 }} />
          <div style={{ height: '0.6rem', width: '40%', background: 'var(--kw-border)', borderRadius: '3px', opacity: 0.4 }} />
        </div>
      ))}
    </div>
  )
}
