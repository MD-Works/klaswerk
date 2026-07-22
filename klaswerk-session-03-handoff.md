# KlasWerk — Session Handoff
**Session:** 3 — Database Migration, Courses & Dashboard
**Date:** 2026-07-13
**Built by:** MD Works / Morney Deetlefs

---

## What Was Built This Session

### New Files (8)

| File | Purpose |
|------|---------|
| `supabase/migrations/001_initial.sql` | Full DB schema — all 12 tables, RLS policies, indexes, profile trigger |
| `src/hooks/useToast.ts` | Global toast store (Zustand) — `toast.success/error/info()` from anywhere |
| `src/components/ui/ToastContainer.tsx` | Renders the toast stack, mounted in AppShell |
| `src/hooks/useCourse.ts` | All course Supabase queries — fetch, create, update, status, delete, enrol, stats |
| `src/pages/Courses.tsx` | Trainer: own courses with status badges + kebab menu. Student: enrolled + published browse |
| `src/pages/CreateCourse.tsx` | Trainer form — title, description, category, level, price, duration, thumbnail |
| `src/pages/CourseDetail.tsx` | Trainer edit view + student enrol view, lessons list with lock state |
| `klaswerk-session-03-handoff.md` | This file |

### Modified Files (3)

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Fully rewritten — wired to real Supabase stats, recent courses, quick-action buttons |
| `src/components/layout/AppShell.tsx` | Added `<ToastContainer />` import and render |
| `src/App.tsx` | Replaced Placeholder stubs for `/courses`, `/courses/:courseId`, `/courses/new` with real pages |

---

## Key Architecture Additions

### Toast System
`useToastStore` is a Zustand store (not React context). It auto-dismisses after 4 seconds.

```typescript
// From any component:
const { toast } = useToast()
toast.success('Course published!')
toast.error('Failed to save.')
toast.info('Session starting in 5 minutes.')
```

`ToastContainer` is rendered once inside `AppShell` — no need to add it to individual pages.

### `useCourse` Hook
All Supabase course queries live here. Pages stay thin.

```typescript
const {
  fetchTrainerCourses,    // → CourseWithStats[] (trainer's own)
  fetchPublishedCourses,  // → CourseWithStats[] (student browse)
  fetchStudentCourses,    // → CourseWithStats[] (enrolled, with progress)
  fetchCourse,            // (id) → CourseWithStats | null
  fetchTrainerStats,      // → { activeCourses, totalStudents, liveSessionsThisMonth, completionRate }
  fetchStudentStats,      // → { enrolled, completed, certificates, quizAverage }
  createCourse,           // (form) → Course | null
  updateCourse,           // (id, updates) → Course | null
  setCourseStatus,        // (id, 'published'|'draft'|'archived') → boolean
  deleteCourse,           // (id) → boolean
  enrollStudent,          // (courseId) → boolean
} = useCourse()
```

### Database Migration
Run `supabase/migrations/001_initial.sql` in the Supabase SQL Editor.

**Critical:** The profile trigger `handle_new_user()` auto-creates a row in `public.profiles` when a user signs up. Without it, `useAuth`'s `fetchProfile` returns null and auth breaks.

**What the migration includes:**
- 12 tables: profiles, courses, lessons, quizzes, questions, quiz_attempts, enrollments, sessions, session_attendance, certificates, chat_messages, payments
- `handle_new_user()` trigger on `auth.users` INSERT
- `handle_updated_at()` trigger on all tables with `updated_at`
- 13 performance indexes
- Full RLS policies on every table (trainers see own data, students see enrolled/published)

---

## Route Map (current state)

| Route | Page | Status |
|-------|------|--------|
| `/login` | LoginPage | ✅ Session 2 |
| `/register` | RegisterPage | ✅ Session 2 |
| `/check-email` | CheckEmailPage | ✅ Session 2 |
| `/dashboard` | DashboardPage | ✅ **Session 3 — wired** |
| `/courses` | CoursesPage | ✅ **Session 3** |
| `/courses/new` | CreateCoursePage | ✅ **Session 3** |
| `/courses/:courseId` | CourseDetailPage | ✅ **Session 3** |
| `/live` | Placeholder | ⏳ Session 4 |
| `/live/:sessionId` | Placeholder | ⏳ Session 5 |
| `/quizzes` | Placeholder | ⏳ Session 5 |
| `/quizzes/:quizId` | Placeholder | ⏳ Session 5 |
| `/certificates` | Placeholder | ⏳ Session 6 |
| `/analytics` | Placeholder | ⏳ Session 6 |
| `/profile` | Placeholder | ⏳ Session 4 |
| `/payment/return` | Placeholder | ⏳ PayFast session |
| `/payment/cancel` | Placeholder | ⏳ PayFast session |
| `/verify/:certificateNumber` | Placeholder | ⏳ Session 6 |

---

## What to Build Next Session (Priority Order)

### 1. Lesson Editor (Trainer)
The `CourseDetail` page has an "+ Add Lesson" button that fires `toast.info('coming next session')`. Replace with a real lesson editor:
- `src/pages/LessonEditor.tsx` — create/edit lesson: title, rich-text content, slide upload (PPTX), video URL, attachments, publish toggle
- New route: `/courses/:courseId/lessons/new` and `/courses/:courseId/lessons/:lessonId`
- Hook: `src/hooks/useLesson.ts` — fetch, create, update, reorder, delete, publish

### 2. Lesson Viewer (Student)
When a student clicks a lesson in `CourseDetail`, they should enter a viewer:
- `src/pages/LessonViewer.tsx` — renders HTML content, slide deck, video embed, PDF viewer
- Progress tracking: update `enrollments.lessons_completed` and `enrollments.progress` on completion

### 3. Profile Page
- `src/pages/Profile.tsx` — edit full_name, bio, company, phone, avatar_url
- Uses `useAuth().updateProfile(updates)`

### 4. Lesson Reordering (Trainer)
- Drag-to-reorder lesson list in CourseDetail
- Updates `order_index` via batch Supabase update

---

## Gotchas & Notes

### Route Order in App.tsx — Critical
`/courses/new` **must come before** `/courses/:courseId` in the route list. React Router matches top-down; if `:courseId` comes first, visiting `/courses/new` will try to load a course with ID `"new"`.

The current `App.tsx` has this correct:
```tsx
<Route path="/courses/new" element={...CreateCoursePage...} />
<Route path="/courses/:courseId" element={...CourseDetailPage...} />
```

Do not reorder these.

### Lesson Lock State
In `CourseDetail`, lessons show a lock icon (⊘) if `!canAccessLessons && !lesson.is_published`. The `canAccessLessons` flag is true for:
- The trainer who owns the course (always)
- A student who is enrolled and not dropped

### `useCourse` Parallel Queries
`fetchTrainerStats` and `fetchStudentStats` use `Promise.all` to fire queries in parallel. On a slow Windows 10 laptop, this matters — don't change to sequential `await` chains.

### RLS and the Service Role Key
The `config.supabase.serviceKey` in `config.js` is for Cloudflare Workers / server-side use only. The frontend uses `anonKey`. The RLS policies ensure data is scoped per user — the frontend never needs the service key.

### Enrollment Uniqueness
`enrollments` has a `UNIQUE (student_id, course_id)` constraint. Calling `enrollStudent` twice for the same pair will throw a Postgres error. The hook sets `setError(err.message)` and returns `false` — the `CoursesPage` and `CourseDetail` both handle this with `toast.error('Could not enrol — you may already be enrolled.')`.

### `estimated_duration` Formatting
`CourseDetail` uses `formatDuration(minutes)` → `"2h 30m"` etc. This is a local utility in that file, not shared. If needed elsewhere, move it to `src/lib/utils.ts`.

---

## How to Run

```bash
# From unzipped scaffold directory
npm install
# Edit public/config.js with your Supabase keys
# Run the DB migration in Supabase SQL Editor
npm run dev
```

### Run DB Migration
1. Go to Supabase Dashboard → SQL Editor → New Query
2. Paste the entire contents of `supabase/migrations/001_initial.sql`
3. Click Run
4. Look for "Success" — no errors

### Enable Realtime (manual step)
1. Supabase Dashboard → Database → Replication
2. Add tables: `chat_messages`, `session_attendance`, `enrollments`
3. Save

---

## Session Deliverables

- `klaswerk-scaffold-s3.zip` — full updated project, unzip and `npm install` to run
- `klaswerk-session-03-handoff.md` — this file

---

*MD Works · Morney Deetlefs · South Africa*
*✦ Builder of useful things for real people ✦*
