# KlasWerk — Session Handoff
**Session:** 9 — Storage for PDF Certs + Analytics DB Views + Public Course Landing + Error Boundary + PWA + Auth Email Templates
**Date:** 2026-07-17
**Built by:** MD Works / Morney Deetlefs

---

## What Was Built This Session

### New Files (9)

| File | Purpose |
|------|---------|
| `supabase/migrations/003_s9_cert_storage_public_page.sql` | `pdf_url` column on certificates, `certificates` storage bucket + policies, `public_courses` view (no-auth), indexes |
| `src/pages/CourseLanding.tsx` | Public course landing page — `/course/:courseId` — no auth to view, auth to enrol. Sticky nav, hero, stats, trainer block, CTA. |
| `src/components/ui/ErrorBoundary.tsx` | React class ErrorBoundary wrapping `<App>`. Catches runtime errors, shows branded recovery UI with Try Again + Dashboard buttons. |
| `public/manifest.json` | PWA manifest — name, icons, theme_color `#c9943c`, background `#110e09`, display standalone, start_url `/dashboard` |
| `public/sw.js` | Workbox-free service worker — Cache First for app shell, Network First for Supabase/PayFast/Whereby APIs, Stale-While-Revalidate for Google Fonts |
| `supabase/email-templates/confirm-signup.html` | Supabase Auth email — dark-gold KlasWerk brand, Supabase `{{ .ConfirmationURL }}` template var |
| `supabase/email-templates/reset-password.html` | Password reset email — same brand |
| `supabase/email-templates/magic-link.html` | Magic link sign-in email — same brand |

### Modified Files (5)

| File | Change |
|------|--------|
| `src/hooks/useCertificate.ts` | Added `uploadCertificatePdf()` — generates PDF via jsPDF, uploads to `supabase.storage.from('certificates')`, updates `certificates.pdf_url`, returns public URL. Added `isUploading` state. |
| `src/pages/Certificates.tsx` | Added "☁ Save to Cloud" button (calls `uploadCertificatePdf`). Shows `↗ Open PDF` link when `pdf_url` exists. `onPdfUploaded` callback updates local state without re-fetch. |
| `src/hooks/useAnalytics.ts` | `fetchCourseBreakdown()` now queries `trainer_course_stats` view (single query, replaces N+1 loop). `fetchRevenueStats()` now queries `trainer_monthly_revenue` view (replaces JS groupBy). |
| `src/App.tsx` | Wrapped everything in `<ErrorBoundary>`. Added `/course/:courseId` public route (CourseLandingPage). |
| `index.html` | Added `<link rel="manifest">`, PWA meta tags, apple-touch-icon, SW registration script. |
| `src/pages/Login.tsx` | Reads `?next=` query param (from public landing redirect) in addition to `location.state.from`. |
| `src/pages/Register.tsx` | Reads `?next=` for post-registration redirect awareness. |

---

## Run Migration 003

```bash
# In Supabase SQL editor or CLI:
supabase db push
# OR paste: supabase/migrations/003_s9_cert_storage_public_page.sql
```

This creates:
- `certificates.pdf_url TEXT` column
- `certificates` storage bucket (public)
- Storage RLS policies (public read, authenticated upload/update)
- `public_courses` view (readable by `anon` role — no auth required)

---

## Apply Auth Email Templates

1. Go to Supabase Dashboard → **Authentication** → **Email Templates**
2. For each template type, paste the HTML from `supabase/email-templates/`:

| Template | File |
|----------|------|
| Confirm signup | `confirm-signup.html` |
| Reset password | `reset-password.html` |
| Magic Link | `magic-link.html` |

The templates use Supabase's `{{ .ConfirmationURL }}` variable — this is automatically replaced by Supabase.

---

## PWA Icons

The manifest references `/icons/icon-192.png` and `/icons/icon-512.png`. To complete PWA setup:

1. Create `/public/icons/` directory
2. Add 192×192 and 512×512 PNG icons (KlasWerk logo on `#110e09` background with gold ✦ mark)
3. Update `<link rel="apple-touch-icon">` in `index.html` to `/icons/icon-192.png`

Until icons are added, browsers will use the favicon as fallback — the PWA still installs.

---

## Public Course Landing URL

```
https://klaswerk.co.za/course/{courseId}
```

- No auth required to view
- Reads from `public_courses` view (published courses only)
- "Enrol Now" → if not logged in, redirects to `/login?next=/course/{courseId}`
- After login, redirects back to the course landing → enrols + goes to `/courses/{courseId}`
- Trainers see an error toast if they try to self-enrol
- Shareable URL for marketing / social / WhatsApp

---

## PDF Upload to Storage — How It Works

```typescript
// In Certificates.tsx — "☁ Save to Cloud" button:
const url = await uploadCertificatePdf(cert)
// url = https://<project>.supabase.co/storage/v1/object/public/certificates/{userId}/{certNumber}.pdf

// Storage path: {userId}/{certNumber}.pdf
// Policy: public read (anyone with URL can view)
//         authenticated upload (only the student themselves)
```

The `pdf_url` is persisted on the `certificates` row so it survives page refreshes and can be shared directly.

---

## Analytics DB View Refactor — Performance Impact

| Before (Session 7) | After (Session 9) |
|---------------------|-------------------|
| `fetchCourseBreakdown` — N+1 queries (1 per course × 3 sub-queries) | Single query to `trainer_course_stats` view |
| `fetchRevenueStats` — fetch all payments, JS groupBy | Single query to `trainer_monthly_revenue` view |

For a trainer with 20 courses, this reduces `fetchCourseBreakdown` from ~60+ queries to 1.

---

## Error Boundary — Coverage

The `<ErrorBoundary>` wraps the entire `<App>` in `main.tsx`. It catches:
- Render errors in any page component
- Hook errors that bubble to the component tree
- Missing module errors (if code-splitting is added later)

It does **not** catch:
- Async errors in `useEffect` / event handlers (these need their own try/catch)
- Errors in the ErrorBoundary itself

---

## Key Architecture Notes

### useCourse.enrollStudent()
`CourseLandingPage` calls `enrollStudent(courseId)` from `useCourse`. This was built in Session 3 and handles free enrolment. For paid courses, it should redirect to the PayFast flow instead — wire this in Session 10.

### public_courses view vs. RLS
The `public_courses` view uses `WHERE c.status = 'published'`, meaning draft/archived courses are never exposed. The `anon` role can SELECT from this view — no RLS bypass needed.

---

## What to Build Next — Session 10 (Polish + Production)

### 1. Paid Enrolment from Public Landing
Connect `CourseLandingPage` "Enrol Now" to PayFast flow when `course.price > 0`. Currently calls `enrollStudent()` which skips payment.

### 2. PWA Icons
Generate and add `/public/icons/icon-192.png` and `icon-512.png`.

### 3. Trainer Profile Page (public)
`/trainer/:trainerId` — public page listing all published courses by a trainer. Sharable link.

### 4. SW Rate-Limiting on PayFast Worker (S7 carry-over)
Add KV-based dedup in `workers/payment-webhook/index.ts` to prevent `pf_payment_id` replay.

### 5. Lesson Completion Progress Indicator
Visual progress bar on `CourseDetail` showing how many lessons the student has completed.

### 6. Admin/Trainer Course Sharing
"Copy public link" button on `CourseDetail` (trainer view) → copies `/course/{courseId}` to clipboard.

---

## Session 10 Starter Prompt

> *"I'm Morney Deetlefs (MD Works), South Africa. We're building KlasWerk — a zero-cost React + Supabase training platform. Sessions 3–9 are complete (courses, lessons, quizzes, live sessions, certificates + PDF + Storage upload, analytics DB views, PayFast webhook, mobile responsive, email via Resend, public course landing, ErrorBoundary, PWA manifest). Now building Session 10: paid enrolment from public landing (PayFast), PWA icons, trainer public profile page, SW rate-limiting on PayFast worker, lesson progress bar, copy public link for trainers. Full handoff doc and scaffold zip attached. Apply MD Works brand (dark gold aesthetic). Build everything, zip and deliver."*

**Files to attach:**
1. `klaswerk-scaffold-s9.zip`
2. `klaswerk-session-09-handoff.md`
3. `md-works-brand-updated-color-modes.md`

---

*MD Works · Morney Deetlefs · South Africa*
*✦ Builder of useful things for real people ✦*
