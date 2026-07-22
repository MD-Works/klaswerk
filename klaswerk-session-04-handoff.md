# KlasWerk — Session Handoff
**Session:** 4 — Lesson Editor · Lesson Viewer · Profile Page
**Date:** 2026-07-14
**Built by:** MD Works / Morney Deetlefs

---

## What Was Built This Session

### New Files (4)

| File | Purpose |
|------|---------|
| `src/lib/utils.ts` | Shared utilities — `getVideoEmbed`, `sanitiseHtml`, `formatDuration`, `formatDate`, `formatFileSize`, `getFileIcon`, `getInitials` |
| `src/hooks/useLesson.ts` | All lesson Supabase queries — fetch, create, update, delete, publish, reorder, markLessonComplete |
| `src/pages/LessonEditor.tsx` | Trainer lesson editor — title, HTML write/preview tabs, video URL with live iframe preview, manual attachments, order index, publish toggle, delete |
| `src/pages/LessonViewer.tsx` | Two-column lesson viewer — content left, lesson nav sidebar right. Trainer preview banner + Edit button. Student Mark Complete button with progress update. |
| `src/pages/Profile.tsx` | Profile page — avatar (initials fallback), personal info form, read-only account info, sign out |

### Modified Files (3)

| File | Change |
|------|--------|
| `src/pages/CourseDetail.tsx` | Lesson rows now navigate to LessonViewer on click. Trainer rows get an inline Edit button. "+ Add Lesson" navigates to LessonEditor. |
| `src/App.tsx` | Added 4 new routes (lesson new, lesson edit, lesson view, profile). Route order corrected — lesson routes come before `/:courseId`. |
| `src/styles/index.css` | Added `.kw-lesson-content` typography system — h1–h4, p, ul, ol, code, pre, blockquote, a, hr, table. Added mobile breakpoint for viewer grid. |

---

## Route Map (current state)

| Route | Page | Status |
|-------|------|--------|
| `/login` | LoginPage | ✅ Session 2 |
| `/register` | RegisterPage | ✅ Session 2 |
| `/check-email` | CheckEmailPage | ✅ Session 2 |
| `/dashboard` | DashboardPage | ✅ Session 3 |
| `/courses` | CoursesPage | ✅ Session 3 |
| `/courses/new` | CreateCoursePage | ✅ Session 3 |
| `/courses/:courseId` | CourseDetailPage | ✅ Session 3 + 4 |
| `/courses/:courseId/lessons/new` | LessonEditor | ✅ **Session 4** |
| `/courses/:courseId/lessons/:lessonId/edit` | LessonEditor | ✅ **Session 4** |
| `/courses/:courseId/lessons/:lessonId` | LessonViewer | ✅ **Session 4** |
| `/profile` | ProfilePage | ✅ **Session 4** |
| `/live` | Placeholder | ⏳ Session 6 |
| `/live/:sessionId` | Placeholder | ⏳ Session 6 |
| `/quizzes` | Placeholder | ⏳ Session 5 |
| `/quizzes/:quizId` | Placeholder | ⏳ Session 5 |
| `/certificates` | Placeholder | ⏳ Session 7 |
| `/analytics` | Placeholder | ⏳ Session 7 |
| `/payment/return` | Placeholder | ⏳ PayFast session |
| `/payment/cancel` | Placeholder | ⏳ PayFast session |
| `/verify/:certificateNumber` | Placeholder | ⏳ Session 7 |

---

## Key Architecture Notes

### `useLesson` Hook
All lesson Supabase queries live here. Pages stay thin.

```typescript
const {
  fetchLessons,        // (courseId) → Lesson[] ordered by order_index
  fetchLesson,         // (lessonId) → Lesson | null
  createLesson,        // (courseId, form) → Lesson | null
  updateLesson,        // (lessonId, updates) → Lesson | null
  deleteLesson,        // (lessonId) → boolean
  publishLesson,       // (lessonId, published: boolean) → boolean
  reorderLessons,      // ([{ id, order_index }]) → boolean — parallel batch
  markLessonComplete,  // (lessonId, courseId) → boolean — updates enrollment progress
} = useLesson()
```

### `src/lib/utils.ts`
New shared utility module. All helpers previously duplicated inline (e.g. `formatDuration` in CourseDetail) should eventually be imported from here. For now CourseDetail still has its own local copy — consolidate in a future cleanup session.

Key functions:

```typescript
getVideoEmbed(url)   // → { type, embedUrl } | null — detects YouTube & Vimeo
sanitiseHtml(html)   // → string — strips <script>, inline handlers, javascript: hrefs
getInitials(name)    // → "MD" style initials from full name
formatDuration(min)  // → "2h 30m"
formatDate(dateStr)  // → "14 Jul 2026" (en-ZA locale)
```

### LessonEditor — Write/Preview Tabs
Two tabs toggle between a raw HTML `<textarea>` and a `dangerouslySetInnerHTML` preview rendered through `sanitiseHtml`. No third-party rich-text editor — keeps bundle size zero.

Tab styling: active tab uses gold gradient background (same as `kw-btn-primary`), inactive tab is secondary-styled. Both are plain `<button>` elements with inline styles — no extra CSS classes needed.

### LessonViewer — Two-Column Layout
Uses `display: grid; grid-template-columns: minmax(0, 1fr) 300px`. The sidebar is `position: sticky; top: 0; max-height: 100vh; overflow-y: auto` so it stays visible while scrolling long content.

On screens narrower than 768px the sidebar is hidden (`display: none`) — students navigate via the Prev/Next buttons at the bottom of the content area.

### markLessonComplete — Known Limitation
The current implementation increments `enrollments.lessons_completed` by 1 each time "Mark as Complete" is clicked, capped at the total published lesson count. It does **not** track which specific lessons have been completed — clicking the button on the same lesson twice would double-count until the cap is hit.

A proper implementation needs a `lesson_completions` junction table (`student_id`, `lesson_id`, `completed_at`). This is documented as tech debt for Session 8 (progress tracking polish). For now: the UI disables the button visually once `status === 'completed'` on the enrollment, which mitigates the most obvious path to double-counting.

### Video URL Detection
`getVideoEmbed()` handles:
- `youtube.com/watch?v=ID`
- `youtu.be/ID`
- `youtube.com/embed/ID`
- `youtube.com/shorts/ID`
- `vimeo.com/ID`

Anything else renders as a plain clickable link in the viewer, and shows an info message in the editor.

### HTML Sanitiser
`sanitiseHtml()` is a lightweight regex-based sanitiser — sufficient for trainer-authored content where the HTML source is trusted. If user-generated content from students is ever rendered with `dangerouslySetInnerHTML` in future, replace with DOMPurify.

---

## Gotchas & Notes

### Route Order — Critical
The lesson routes must come in this order in App.tsx:
```
/courses/:courseId/lessons/new          ← 1st (specific)
/courses/:courseId/lessons/:lessonId/edit  ← 2nd
/courses/:courseId/lessons/:lessonId    ← 3rd
/courses/:courseId                      ← 4th (catch-all for courseId)
/courses/new                            ← still before /:courseId
```
React Router matches top-down. `/courses/new` before `/:courseId` was already correct from Session 3 — maintained here.

### `isTrainer` in LessonViewer
The viewer checks `isTrainer` from `useAuth()` to decide whether to show the preview banner and Edit button. It also checks `isOwnCourse` (trainer_id === user.id) so a trainer can't accidentally see the edit UI for another trainer's course.

### Attachment File Sizes
Attachments added via the manual URL form default to `size: 0` — there's no way to know the file size from a URL alone. The `formatFileSize(0)` call returns `"0 B"` which looks odd, so the LessonViewer attachment list doesn't display size. The editor shows the size field only for future R2-uploaded files where the size is known.

### Profile `updateProfile` Error Handling
`updateProfile` in `useAuth` throws on error (doesn't return null). The Profile page wraps the call in `try/catch` and calls `toast.error()`. This is the correct pattern — the hook throws, the page handles the UX.

### `formatDuration` Duplication
`CourseDetail.tsx` still has a local `formatDuration` function from Session 3. It's identical to the one now in `src/lib/utils.ts`. Safe to leave for now — consolidate in a cleanup pass before Session 9.

---

## What to Build Next Session (Session 5 — Quiz System)

### 1. `src/hooks/useQuiz.ts`
- `fetchQuiz(quizId)` — quiz + questions
- `createQuiz(lessonId, form)` — quiz metadata
- `addQuestion(quizId, form)` — MCQ / true-false / fill blank
- `updateQuestion(questionId, updates)`
- `deleteQuestion(questionId)`
- `submitAttempt(quizId, answers)` → auto-grades, saves to `quiz_attempts`, returns result
- `fetchAttempts(quizId, studentId)` → attempt history

### 2. `src/pages/QuizBuilder.tsx` (Trainer)
- Route: `/courses/:courseId/lessons/:lessonId/quiz`
- Create/edit quiz: title, time limit, passing score, max attempts
- Question list with add/edit/delete
- Question types: MCQ (up to 4 options, mark correct), True/False, Fill-in-the-blank
- Drag-to-reorder questions (or manual order index for now)
- Link to lesson: a "Quiz" button in LessonEditor linking to this route

### 3. `src/pages/QuizTaker.tsx` (Student)
- Route: `/quizzes/:quizId`
- Full-screen quiz mode: one question per screen or all on one page (one page simpler)
- Timer countdown if `time_limit` is set
- Submit → auto-grade → show score, pass/fail, per-question feedback
- Attempt history shown below if student has previous attempts
- Blocked if max_attempts reached

### 4. Update `LessonViewer`
- Show "Take Quiz" button if the lesson has a linked quiz
- Show quiz score badge if student has already attempted

### 5. Update `LessonEditor`
- Show "Add/Edit Quiz" button linking to QuizBuilder if lesson is saved

---

## How to Run

```bash
# Unzip klaswerk-scaffold-s4.zip
npm install

# Edit public/config.js with your Supabase keys
# (DB migration from Session 3 still applies — no new migration this session)

npm run dev
# → http://localhost:5173
```

No new SQL migration required for Session 4 — all tables (`lessons`, `enrollments`) were created in Session 3's `001_initial.sql`.

---

## Session Deliverables

- `klaswerk-scaffold-s4.zip` — full updated project
- `klaswerk-session-04-handoff.md` — this file

---

*MD Works · Morney Deetlefs · South Africa*
*✦ Builder of useful things for real people ✦*
