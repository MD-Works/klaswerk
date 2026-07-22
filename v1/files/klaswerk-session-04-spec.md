# KlasWerk — Session 4 Build Spec
## Lesson Editor · Lesson Viewer · Profile Page
**Prepared by:** MD Works / Morney Deetlefs
**Date:** 2026-07-13

---

## Session Opener (paste this into the new chat)

> *"I'm Morney Deetlefs (MD Works), South Africa. We're building KlasWerk — a zero-cost React + Supabase training platform. Session 3 is done (courses, dashboard, toast system, DB migration). Now building Session 4: Lesson Editor, Lesson Viewer, and Profile page. The full handoff doc and scaffold zip are attached. Apply the MD Works brand (dark gold aesthetic) throughout. Build everything, zip it, and deliver before tokens run out."*

---

## Files to Attach in New Chat

1. `klaswerk-scaffold-s3.zip` — the Session 3 scaffold
2. `klaswerk-session-03-handoff.md` — the Session 3 handoff
3. `md-works-brand-updated-color-modes.md` — brand tokens
4. `development_brief` — the original full dev brief

---

## What to Build

### 1. `src/hooks/useLesson.ts`
All lesson Supabase queries. Mirror the pattern from `useCourse.ts`.

Functions needed:
- `fetchLessons(courseId)` → `Lesson[]` ordered by `order_index`
- `fetchLesson(lessonId)` → `Lesson | null`
- `createLesson(courseId, form)` → `Lesson | null`
- `updateLesson(lessonId, updates)` → `Lesson | null`
- `deleteLesson(lessonId)` → `boolean`
- `publishLesson(lessonId, published: boolean)` → `boolean`
- `reorderLessons(lessons: { id: string, order_index: number }[])` → `boolean` — batch update order_index
- `markLessonComplete(lessonId, enrollmentId)` → updates `enrollments.lessons_completed` and recalculates `enrollments.progress`

### 2. `src/pages/LessonEditor.tsx` (Trainer only)
Route: `/courses/:courseId/lessons/new` and `/courses/:courseId/lessons/:lessonId`

UI sections:
- **Header** — breadcrumb (Courses → Course Title → Lesson Editor), Save Draft / Publish buttons
- **Title field** — `kw-input`, maps to `lessons.title`
- **Content editor** — a simple `<textarea>` with a live HTML preview toggle. Store as HTML in `lessons.content`. No third-party rich text editor — keep it zero-dependency. Two tabs: "Write" (raw HTML textarea) and "Preview" (dangerouslySetInnerHTML render).
- **Video URL field** — `lessons.video_url` — plain URL input, shows an embedded `<iframe>` preview if a YouTube or Vimeo URL is detected
- **Attachments section** — list of `{ name, url, type, size }` objects stored in `lessons.attachments` JSONB. For now: manual URL entry (name + URL fields + Add button). File upload via R2 comes in Session 9.
- **Order index field** — number input, used for manual reordering until drag-and-drop lands
- **Publish toggle** — checkbox or toggle switch, maps to `lessons.is_published`
- **Delete button** — with confirmation, trainer only, redirects to course detail after

Validation:
- Title required
- Warn (not block) if content is empty

### 3. `src/pages/LessonViewer.tsx` (Students + Trainer preview)
Route: `/courses/:courseId/lessons/:lessonId`

UI layout — two-column on desktop, stacked on mobile:
- **Left / main** — lesson content area
  - Lesson title (Cinzel heading)
  - Video embed if `video_url` is set — detect YouTube (`youtu.be`, `youtube.com`) and Vimeo, render as responsive `<iframe>`; otherwise show a plain link
  - HTML content rendered via `dangerouslySetInnerHTML` (sanitise: strip `<script>` tags before rendering)
  - Attachments list — icons by file type, download links
- **Right / sidebar** — lesson navigation
  - Course title (small, muted)
  - List of all lessons in the course, current one highlighted
  - Previous / Next lesson buttons
  - Progress indicator — "Lesson 3 of 7"

**Mark Complete button** — shown to enrolled students only, at the bottom of the content area. On click: calls `markLessonComplete`, shows toast, updates progress bar. Button becomes "Completed ✓" after.

**Trainer preview banner** — if the viewer is a trainer viewing their own course, show a subtle banner at the top: "Trainer Preview — students see this page when enrolled" with an Edit button linking to the lesson editor.

### 4. `src/pages/Profile.tsx`
Route: `/profile`

Sections:
- **Avatar** — show `avatar_url` as `<img>` if set, else initials in a gold circle. URL input field for now (upload in Session 9).
- **Personal info form** — full_name, bio (textarea), company, phone. Uses `useAuth().updateProfile(updates)`.
- **Account info** — email (read-only, from auth), role badge, member since date. No edits here.
- **Save button** — calls `updateProfile`, shows toast on success/error.
- **Sign out button** — secondary, at bottom.

### 5. Update `src/pages/CourseDetail.tsx`
Currently the lesson rows are non-clickable. Update:
- Enrolled students clicking a lesson → navigate to `/courses/:courseId/lessons/:lessonId`
- Trainer clicking a lesson → navigate to `/courses/:courseId/lessons/:lessonId` (viewer with preview banner + edit button)
- The "+ Add Lesson" button currently fires a toast — replace with `navigate(\`/courses/${courseId}/lessons/new\`)`

### 6. Update `src/App.tsx`
Add routes:
```tsx
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

<Route path="/courses/:courseId/lessons/:lessonId" element={
  <ProtectedRoute>
    <AppShell><LessonViewer /></AppShell>
  </ProtectedRoute>
} />

<Route path="/profile" element={
  <ProtectedRoute>
    <AppShell><ProfilePage /></AppShell>
  </ProtectedRoute>
} />
```

**Route order note:** `/courses/:courseId/lessons/new` must come before `/courses/:courseId/lessons/:lessonId` — same reason as `/courses/new` vs `/courses/:courseId`.

---

## `markLessonComplete` Logic

This needs careful implementation:

```typescript
async function markLessonComplete(lessonId: string, courseId: string) {
  if (!user) return false

  // 1. Get current enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, lessons_completed, quiz_scores')
    .eq('student_id', user.id)
    .eq('course_id', courseId)
    .single()

  if (!enrollment) return false

  // 2. Get total published lessons in the course
  const { count: totalLessons } = await supabase
    .from('lessons')
    .select('id', { count: 'exact' })
    .eq('course_id', courseId)
    .eq('is_published', true)

  const newCompleted = enrollment.lessons_completed + 1
  const progress = Math.min(100, Math.round((newCompleted / (totalLessons ?? 1)) * 100))
  const status = progress >= 100 ? 'completed' : 'in_progress'

  // 3. Update enrollment
  await supabase
    .from('enrollments')
    .update({
      lessons_completed: newCompleted,
      progress,
      status,
      last_accessed: new Date().toISOString(),
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', enrollment.id)

  return true
}
```

Note: This doesn't prevent double-counting (clicking "Complete" twice). A production solution would track completed lesson IDs in a separate table or JSONB column. For now, document this as a known limitation and cap `lessons_completed` at `totalLessons`.

---

## Video URL Detection Helper

Reuse in both LessonEditor (preview) and LessonViewer (render):

```typescript
// src/lib/utils.ts — add this function
export function getVideoEmbed(url: string): { type: 'youtube' | 'vimeo' | 'other'; embedUrl: string } | null {
  if (!url) return null

  // YouTube
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([A-Za-z0-9_-]{11})/)
  if (ytMatch) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` }

  return null
}
```

---

## HTML Content Sanitiser

Simple, zero-dependency — strip script tags before rendering:

```typescript
// src/lib/utils.ts — add this function
export function sanitiseHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')   // strip inline event handlers
    .replace(/javascript:/gi, '')      // strip javascript: hrefs
}
```

---

## Styling Notes (MD Works brand)

- All new pages follow the `kw-*` class system already in `src/styles/index.css`
- Lesson content area: wrap rendered HTML in a `.kw-lesson-content` div, add to index.css — set sensible typography defaults for `h1–h4`, `p`, `ul`, `ol`, `code`, `blockquote` so trainer-authored HTML looks good
- The Write/Preview tab toggle in LessonEditor: use two `kw-btn-secondary` buttons side by side, active state uses `kw-btn-primary` styling
- Progress indicator in LessonViewer sidebar: reuse the progress bar pattern from `CoursesPage` (gold gradient bar)

Add to `src/styles/index.css` under `@layer components`:
```css
/* Lesson content typography */
.kw-lesson-content {
  font-family: 'Raleway', sans-serif;
  font-size: 0.92rem;
  line-height: 1.75;
  color: var(--kw-cream);
}
.kw-lesson-content h1, .kw-lesson-content h2, .kw-lesson-content h3 {
  font-family: 'Cinzel', serif;
  color: var(--kw-primary-lt);
  margin: 1.5rem 0 0.75rem;
}
.kw-lesson-content p { margin-bottom: 1rem; }
.kw-lesson-content ul, .kw-lesson-content ol { padding-left: 1.5rem; margin-bottom: 1rem; }
.kw-lesson-content li { margin-bottom: 0.4rem; }
.kw-lesson-content code {
  font-family: 'Syne Mono', monospace;
  font-size: 0.82rem;
  background: var(--kw-panel);
  border: 1px solid var(--kw-border);
  border-radius: 3px;
  padding: 0.1rem 0.4rem;
}
.kw-lesson-content blockquote {
  border-left: 2px solid var(--kw-primary-dk);
  padding-left: 1rem;
  color: var(--kw-muted);
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 1.05rem;
  margin: 1rem 0;
}
```

---

## Deliverables Expected

- `klaswerk-scaffold-s4.zip` — full updated project (all Session 3 files + Session 4 additions)
- `klaswerk-session-04-handoff.md` — what was built, gotchas, what's next

---

## What Comes After Session 4

Session 5 = Quiz system (builder + taking flow + auto-grading)
Session 6 = Live sessions (Whereby embed + real-time chat + hand-raise)

---

*MD Works · Morney Deetlefs · South Africa*
*✦ Builder of useful things for real people ✦*
