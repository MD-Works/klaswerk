# KlasWerk — Session Handoff
**Session:** 5 — Quiz System (Builder + Taker + Auto-grading)
**Date:** 2026-07-15
**Built by:** MD Works / Morney Deetlefs

---

## What Was Built This Session

### New Files (3)

| File | Purpose |
|------|---------|
| `src/hooks/useQuiz.ts` | All quiz Supabase queries — fetch, create, update, delete quiz + questions; submit attempt with auto-grading; fetch attempt history |
| `src/pages/QuizBuilder.tsx` | Trainer quiz editor — quiz settings panel + question list with inline editor. Supports MCQ, True/False, Fill-in-the-blank |
| `src/pages/QuizTaker.tsx` | Student quiz flow — three phases: intro (info + attempt history), taking (all questions + countdown timer), results (score card + per-question feedback) |

### Modified Files (3)

| File | Change |
|------|--------|
| `src/pages/LessonViewer.tsx` | Fetches quiz for lesson on load; shows Quiz CTA card with Take/Retake button and best score; trainer sees Edit Quiz link; no-quiz state shows "+ Add Quiz" for trainers |
| `src/pages/LessonEditor.tsx` | Bottom section shows "Quiz Builder" shortcut card when editing an existing lesson |
| `src/App.tsx` | Added `QuizBuilder` route (`/courses/:courseId/lessons/:lessonId/quiz`), real `QuizTaker` route (`/quizzes/:quizId`), Session 5 imports |

---

## Route Map (current state)

| Route | Page | Status |
|-------|------|--------|
| `/login` | LoginPage | ✅ S2 |
| `/register` | RegisterPage | ✅ S2 |
| `/dashboard` | DashboardPage | ✅ S3 |
| `/courses` | CoursesPage | ✅ S3 |
| `/courses/new` | CreateCoursePage | ✅ S3 |
| `/courses/:courseId` | CourseDetailPage | ✅ S3+4 |
| `/courses/:courseId/lessons/new` | LessonEditor | ✅ S4 |
| `/courses/:courseId/lessons/:lessonId/edit` | LessonEditor | ✅ S4 |
| `/courses/:courseId/lessons/:lessonId` | LessonViewer | ✅ S4+5 |
| `/courses/:courseId/lessons/:lessonId/quiz` | QuizBuilder | ✅ **S5** |
| `/quizzes/:quizId` | QuizTaker | ✅ **S5** |
| `/profile` | ProfilePage | ✅ S4 |
| `/live` | Placeholder | ⏳ S6 |
| `/live/:sessionId` | Placeholder | ⏳ S6 |
| `/quizzes` | Placeholder | ⏳ S7 |
| `/certificates` | Placeholder | ⏳ S7 |
| `/analytics` | Placeholder | ⏳ S7 |
| `/payment/return` | Placeholder | ⏳ PayFast session |
| `/payment/cancel` | Placeholder | ⏳ PayFast session |
| `/verify/:certificateNumber` | Placeholder | ⏳ S7 |

---

## Key Architecture Notes

### `useQuiz` Hook
```typescript
const {
  fetchQuiz,            // (quizId) → QuizWithQuestions | null
  fetchQuizByLesson,    // (lessonId) → QuizWithQuestions | null (maybeSingle — no error if none)
  createQuiz,           // (lessonId, form) → Quiz | null
  updateQuiz,           // (quizId, form) → Quiz | null
  deleteQuiz,           // (quizId) → boolean — cascades to questions + attempts
  addQuestion,          // (quizId, form) → Question | null
  updateQuestion,       // (questionId, form) → Question | null
  deleteQuestion,       // (questionId) → boolean
  reorderQuestions,     // ([{ id, order_index }]) → boolean — parallel batch
  fetchAttempts,        // (quizId) → AttemptSummary[] — student's own
  fetchAllAttempts,     // (quizId) → all students (trainer view, Session 7)
  submitAttempt,        // (quiz, answers, timeSpentSeconds) → AttemptResult | null
} = useQuiz()
```

### Auto-grading Logic (`submitAttempt`)
Grading runs entirely client-side before saving to DB:
- MCQ: student answer (label e.g. `"A"`) compared to `correct_answer` (label)
- True/False: `"true"` or `"false"` string comparison
- Fill-in-blank: both sides trimmed + lowercased before comparing
- Points are per-question (default 1, configurable 1–10)
- `percentage = Math.round((earnedPoints / totalPoints) * 100)`
- `passed = percentage >= quiz.passing_score`
- After saving, `updateEnrollmentQuizScore` fires async (fire-and-forget) to update `enrollments.quiz_scores` JSONB with the new best score

### QuizBuilder — Inline Question Editor
Questions are edited inline — clicking "Edit" on a row slides open the `QuestionEditor` component below that row. Only one editor open at a time. "New question" editor appends at the bottom of the list. This avoids modal complexity and keeps the keyboard flow natural.

### QuizTaker — Three Phases
```
intro  →  taking  →  results
          ↑
    (timer expiry auto-submits)
```
Phase is local state — no URL changes between phases. The `quizId` param identifies the quiz; lesson/course IDs are resolved from DB for back-navigation.

### Timer
`CountdownTimer` is a standalone component that counts down from `quiz.time_limit * 60` seconds. On expiry it calls `onExpire` which triggers `handleSubmit(true)` (auto-submit, skips the unanswered-questions confirm). Turns red when ≤ 60 seconds remain.

### Route Order — QuizBuilder
`/courses/:courseId/lessons/:lessonId/quiz` must come **before** `/courses/:courseId/lessons/:lessonId` in App.tsx, otherwise React Router will try to render LessonViewer with `lessonId = ":lessonId"` and `quizId` never matched. Current App.tsx has this correct — do not reorder.

---

## Gotchas & Notes

### `maybeSingle()` vs `single()`
`fetchQuizByLesson` uses `.maybeSingle()` — returns `null` (not an error) when no quiz exists for that lesson. Using `.single()` would throw a 406 when a lesson has no quiz, breaking LessonViewer on every lesson without a quiz.

### MCQ Correct Answer Storage
For MCQ questions, `correct_answer` stores the **option label** (`"A"`, `"B"`, etc.), not the option text. The auto-grader compares student's selected label to this. If option text is edited after students have attempted the quiz, old attempts are unaffected (labels are stable). Never store option text as the correct answer.

### Attempt Double-Submission Guard
`submitAttempt` does not have a client-side guard against double-submission. The Submit button is disabled while `submitting === true`, but a network retry could theoretically create two attempts. A DB-level unique constraint on `(student_id, quiz_id, attempt_number)` would be the clean fix — add in Session 8 polish.

### `updateEnrollmentQuizScore` — Fire and Forget
This async function updates `enrollments.quiz_scores` after a successful submission. It's intentionally not awaited — the student sees results immediately. If it fails silently (network issue), the quiz score won't appear on the Course Detail progress card until next attempt. Acceptable for now.

### LessonViewer Quiz Fetch
`fetchQuizByLesson` is called inside the `load` callback using `.then()` (not awaited in the main `Promise.all`) to avoid blocking lesson content render if the quiz DB call is slow. The quiz CTA card appears slightly after the lesson content — this is intentional and acceptable.

---

## What to Build Next — Session 6 (Live Sessions)

### 1. `src/hooks/useSession.ts`
- `fetchSessions(courseId)` — upcoming + past sessions
- `fetchSession(sessionId)` — single session with attendance
- `createSession(courseId, form)` — schedule a new live session
- `updateSession(sessionId, updates)`
- `startSession(sessionId)` — sets `status = 'live'`, `started_at = now()`
- `endSession(sessionId)` — sets `status = 'completed'`, `ended_at = now()`
- `joinSession(sessionId)` — creates attendance record, `joined_at = now()`
- `leaveSession(sessionId)` — updates `left_at`, calculates `duration`

### 2. `src/hooks/useChat.ts`
- `fetchMessages(sessionId)` — initial load
- `sendMessage(sessionId, message, isPrivate?)` → inserts to `chat_messages`
- `subscribeToMessages(sessionId, onMessage)` — Supabase Realtime channel subscription
- Returns: `{ messages, sendMessage, isLoading }`

### 3. `src/pages/Sessions.tsx`
- Route: `/live`
- Trainer: list of scheduled sessions + "Schedule Session" button
- Student: upcoming sessions for enrolled courses
- Session cards: date/time, course, status badge, join/manage button

### 4. `src/pages/ScheduleSession.tsx` (Trainer)
- Route: `/live/new?courseId=...`
- Form: title, description, course selector, date/time picker, duration
- Creates session via `createSession`

### 5. `src/pages/LiveRoom.tsx`
- Route: `/live/:sessionId`
- Two-column layout:
  - Left: Whereby embed `<iframe>` (full height)
  - Right: Chat panel + hand-raise list
- Trainer controls: Start Session / End Session buttons, lower hand buttons
- Student controls: Raise Hand button, chat input
- Real-time: Supabase channel for chat messages + hand-raise broadcasts
- Attendance: `joinSession` on mount, `leaveSession` on unmount

### 6. Whereby Integration
- `VITE_WHEREBY_API_KEY` used to create meeting rooms via Whereby REST API
- Room URL stored in `sessions.where_room_id`
- Embed: `<iframe src="{roomUrl}?embed&background=off" allow="camera; microphone; fullscreen; display-capture" />`

### Supabase Realtime — Enable for Session 6
Make sure these tables are enabled for Realtime in Supabase Dashboard → Database → Replication:
- `chat_messages` — for live chat
- `session_attendance` — for hand-raise presence updates

---

## How to Run

```bash
# Unzip klaswerk-scaffold-s5.zip
npm install

# Edit public/config.js with your Supabase keys
# DB migration from Session 3 still applies — no new migration in S4 or S5

npm run dev
# → http://localhost:5173
```

No new SQL migration required for Session 5. All tables (`quizzes`, `questions`, `quiz_attempts`, `enrollments`) were created in Session 3's `001_initial.sql`.

---

## Session 6 Starter Prompt (paste into new chat)

> *"I'm Morney Deetlefs (MD Works), South Africa. We're building KlasWerk — a zero-cost React + Supabase training platform. Sessions 3–5 are done (courses, lessons, quiz system). Now building Session 6: Live Sessions with Whereby embed, real-time chat, and hand-raise. The full handoff doc and scaffold zip are attached. Apply the MD Works brand (dark gold aesthetic) throughout. Build everything, zip it, and deliver before tokens run out."*

**Files to attach:**
1. `klaswerk-scaffold-s5.zip`
2. `klaswerk-session-05-handoff.md`
3. `md-works-brand-updated-color-modes.md`
4. `development_brief`

---

## Session Deliverables

- `klaswerk-scaffold-s5.zip` — full updated project
- `klaswerk-session-05-handoff.md` — this file

---

*MD Works · Morney Deetlefs · South Africa*
*✦ Builder of useful things for real people ✦*
