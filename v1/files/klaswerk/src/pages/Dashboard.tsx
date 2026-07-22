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
import { appConfig } from '@/config'

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
  const { profile, isTrainer } = useAuth()
  const {
    fetchTrainerStats,
    fetchStudentStats,
    fetchTrainerCourses,
    fetchStudentCourses,
  } = useCourse()

  const [trainerStats, setTrainerStats] = useState<TrainerStats | null>(null)
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null)
  const [recentCourses, setRecentCourses] = useState<CourseWithStats[]>([])
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [isTrainer])

  async function loadData() {
    setStatsLoading(true)

    if (isTrainer) {
      const [stats, courses] = await Promise.all([
        fetchTrainerStats(),
        fetchTrainerCourses(),
      ])
      setTrainerStats(stats)
      setRecentCourses(courses.slice(0, 4))
    } else {
      const [stats, courses] = await Promise.all([
        fetchStudentStats(),
        fetchStudentCourses(),
      ])
      setStudentStats(stats)
      setRecentCourses(courses.slice(0, 4))
    }

    setStatsLoading(false)
  }

  // ─────────────────────────────────────────────────
  return (
    <div className="kw-animate-fade-in">

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="kw-eyebrow" style={{ marginBottom: '0.5rem' }}>
          {appConfig.name} &nbsp;·&nbsp; {isTrainer ? 'Trainer' : 'Student'} Dashboard
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
          {isTrainer
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
            <Link to="/certificates" className="kw-btn-secondary" style={{ textDecoration: 'none', display: 'inline-block', padding: '0.7rem 1.25rem' }}>
              My Certificates
            </Link>
          </>
        )}
      </div>

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
