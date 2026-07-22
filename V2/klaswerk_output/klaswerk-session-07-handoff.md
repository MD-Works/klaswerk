# KlasWerk — Session Handoff
**Session:** 7 — Certificates + Analytics + Quizzes List + PayFast
**Date:** 2026-07-16
**Built by:** MD Works / Morney Deetlefs

---

## What Was Built This Session

### New Files (9)

| File | Purpose |
|------|---------|
| `src/hooks/useCertificate.ts` | All certificate queries — generate, fetch (student/trainer), public verify, auto-issue |
| `src/hooks/usePayment.ts` | PayFast integration — initiate payment, verify return, fetch payment history. Includes zero-dep MD5 implementation |
| `src/hooks/useAnalytics.ts` | Trainer analytics — KPIs, per-course breakdown, session attendance log, revenue over time |
| `src/pages/Certificates.tsx` | `/certificates` — Student: list earned certs + one-click claim for completed courses. Trainer: all certs issued across their courses |
| `src/pages/CertificateVerify.tsx` | `/verify/:certificateNumber` — **PUBLIC** (no AppShell, no auth). Employer/third-party verification page with full certificate display |
| `src/pages/Analytics.tsx` | `/analytics` (trainer only) — KPI cards, tabbed views: Overview / Courses / Sessions; per-course breakdown table, attendance log |
| `src/pages/QuizzesList.tsx` | `/quizzes` — Student: score rings, attempt counts, pass/fail status, retry links. Trainer: quiz overview per course |
| `src/pages/PaymentReturn.tsx` | `/payment/return` — Polls DB up to 60s for PayFast ITN confirmation, redirects on completion |
| `src/pages/PaymentCancel.tsx` | `/payment/cancel` — Marks payment cancelled in DB, friendly redirect |

### Modified Files (1)

| File | Change |
|------|--------|
| `src/App.tsx` | Replaced all Session 7 placeholders with real page imports + routes. Removed `Placeholder` component |

---

## Route Map (current state)

| Route | Page | Status |
|-------|------|--------|
| `/login` | LoginPage | ✅ S2 |
| `/register` | RegisterPage | ✅ S2 |
| `/dashboard` | DashboardPage | ✅ S3+6 |
| `/courses` | CoursesPage | ✅ S3 |
| `/courses/new` | CreateCoursePage | ✅ S3 |
| `/courses/:courseId` | CourseDetailPage | ✅ S3+4 |
| `/courses/:courseId/lessons/new` | LessonEditor | ✅ S4 |
| `/courses/:courseId/lessons/:lessonId/edit` | LessonEditor | ✅ S4 |
| `/courses/:courseId/lessons/:lessonId` | LessonViewer | ✅ S4+5 |
| `/courses/:courseId/lessons/:lessonId/quiz` | QuizBuilder | ✅ S5 |
| `/quizzes/:quizId` | QuizTaker | ✅ S5 |
| `/quizzes` | QuizzesListPage | ✅ **S7** |
| `/live` | SessionsPage | ✅ S6 |
| `/live/new` | ScheduleSession | ✅ S6 |
| `/live/:sessionId/edit` | ScheduleSession | ✅ S6 |
| `/live/:sessionId` | LiveRoom | ✅ S6 |
| `/certificates` | CertificatesPage | ✅ **S7** |
| `/verify/:certificateNumber` | CertificateVerifyPage | ✅ **S7** (public) |
| `/analytics` | AnalyticsPage | ✅ **S7** (trainer only) |
| `/payment/return` | PaymentReturnPage | ✅ **S7** |
| `/payment/cancel` | PaymentCancelPage | ✅ **S7** |
| `/profile` | ProfilePage | ✅ S4 |

---

## Key Architecture Notes

### `useCertificate` Hook

```typescript
const {
  generateCertificate,     // (enrollmentId) → CertificateWithCourse | null
                           //   Checks status === 'completed' || progress >= 100
                           //   Idempotent — returns existing cert if already issued
  fetchMyCertificates,     // () → CertificateWithCourse[] — student's own
  fetchTrainerCertificates,// () → CertificateWithCourse[] — issued for trainer's courses
  verifyCertificate,       // (certNumber) → CertificateWithCourse | null — no auth
  hasCertificate,          // (courseId) → boolean — quick check
  autoIssueCertificate,    // (courseId) → CertificateWithCourse | null
                           //   Convenience: checks enrollment + calls generateCertificate
} = useCertificate()
```

**Certificate number format:** `KW-{6 chars from courseId+studentId}-{base36 timestamp}`
Example: `KW-ABC123-L9FGH2K`

**Auto-issue pattern** — call from LessonViewer after marking lesson complete:
```typescript
const { autoIssueCertificate } = useCertificate()
// After updating enrollment to 'completed':
await autoIssueCertificate(courseId)
```

### `usePayment` Hook

```typescript
const {
  initiatePayment,   // (course: Course) → boolean
                     //   Creates DB record, builds PayFast form, submits it
  verifyPayment,     // (paymentId) → { status, courseId }
                     //   Checks DB; auto-enrolls if status = 'complete'
  fetchMyPayments,   // () → (Payment & { course })[] — student view
  fetchCoursePayments, // (courseId) → (Payment & { student })[] — trainer view
} = usePayment()
```

**PayFast flow:**
1. Student clicks "Enrol" on a paid course → `initiatePayment(course)`
2. DB gets `payments` row with `status: 'pending'`
3. User is redirected to PayFast sandbox/live
4. PayFast POSTs ITN to `payfastConfig.notifyUrl` (your Cloudflare Worker)
5. Worker updates `payments.status = 'complete'`
6. `/payment/return` polls every 5s × 12 → detects `complete` → auto-enrolls

**Zero-dependency MD5** — the signature function is inlined in `usePayment.ts`. No npm package required. Pure browser JS, public domain algorithm.

### PayFast Configuration

In `public/config.js`:

```javascript
payfast: {
  merchantId:  'your-merchant-id',     // PayFast dashboard
  merchantKey: 'your-merchant-key',
  passphrase:  'your-passphrase',      // Set in PayFast dashboard → Settings → Passphrase
  testMode:    true,                   // false for production
  notifyUrl:   'https://your-worker.workers.dev/payfast-webhook',
  returnUrl:   'https://yourapp.com/payment/return',
  cancelUrl:   'https://yourapp.com/payment/cancel',
}
```

**Sandbox test cards:** Use PayFast sandbox at `https://sandbox.payfast.co.za`. No real card needed — sandbox accepts any card.

### `useAnalytics` Hook

```typescript
const {
  fetchDashboardStats,   // () → DashboardStats — 8 KPIs
  fetchCourseBreakdown,  // () → CourseBreakdown[] — per-course table
  fetchSessionLog,       // () → SessionLogEntry[] — last 20 sessions with attendance
  fetchRevenueStats,     // () → RevenuePoint[] — monthly revenue array
} = useAnalytics()
```

**Note:** Analytics runs sequential per-course queries — acceptable for <100 courses. For larger scale, add a Postgres view or RPC function in S8.

### Certificate Verification (Public Route)

`/verify/:certificateNumber` has **no `ProtectedRoute` wrapper** — it's accessible without login. It uses `useCertificate().verifyCertificate()` which queries `certificates WHERE is_verified = true`.

The RLS policy from `001_initial.sql` already allows this:
```sql
CREATE POLICY "Anyone can verify certificates"
  ON public.certificates FOR SELECT
  USING (is_verified = true);
```

### QuizzesList — Score Ring

SVG-based circular progress indicator. The ring colour reflects:
- `var(--kw-success)` — passed (score ≥ passing_score)
- `var(--kw-primary)` — attempted but not passed
- `var(--kw-border)` — not attempted (shown as `—` placeholder)

### PaymentReturn — Polling

The return page polls `verifyPayment()` every 5s, up to 60s (12 attempts). This handles the ITN delay between PayFast posting the webhook and the DB updating. If 60s elapses without `complete`, it falls into `'pending'` state with a "Check Again" button.

---

## No New SQL Migration Required

All tables used this session (`certificates`, `payments`) were created in `001_initial.sql` from Session 3. No migration needed for Session 7.

---

## What to Build Next — Session 8 (Polish + PayFast Worker + PDF Certs)

### 1. PayFast ITN Webhook Worker

`workers/payment-webhook/index.ts` (Cloudflare Worker):
- Receives PayFast POST to `/payfast-webhook`
- Validates signature using MD5 (same algorithm)
- Updates `payments.status = 'complete'` via Supabase service key
- Returns `200 OK` to PayFast

### 2. PDF Certificate Generation

Options (zero-cost):
- **jsPDF** (browser-side) — generate and download without server
- **Cloudflare Worker + canvas** — server-side PNG/PDF

Attach PDF URL to `certificates.pdf_url` after generation.

### 3. Analytics Postgres View (Performance)

```sql
CREATE VIEW trainer_course_stats AS
  SELECT
    c.trainer_id,
    c.id AS course_id,
    COUNT(DISTINCT e.student_id) AS enrollment_count,
    ROUND(AVG(e.progress)) AS avg_progress,
    COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.student_id END) AS completions
  FROM courses c
  LEFT JOIN enrollments e ON e.course_id = c.id
  GROUP BY c.trainer_id, c.id;
```

### 4. Auto-Issue Certificate on Course Completion

Wire `autoIssueCertificate` into `LessonViewer` — when `enrollment.progress` hits 100:
```typescript
const { autoIssueCertificate } = useCertificate()
// In the progress-update effect:
if (newProgress >= 100) {
  await autoIssueCertificate(courseId)
}
```

### 5. Whereby Room Expiry Fix

Rooms created >7 days before session are expired. Options:
1. Create room on `startSession` instead of on `createSession`
2. Set longer expiry in `createWherebyRoom`

### 6. Mobile Responsive Pass

Add CSS media queries to AppShell (sidebar → drawer on mobile) and critical pages.

### 7. Email Notifications

Use Supabase Edge Function + Resend (free tier) for:
- Certificate issued → email student
- Session starting soon → email enrolled students
- Payment confirmed → receipt email

---

## How to Run

```bash
# Unzip klaswerk-scaffold-s7.zip
npm install

# Edit public/config.js with your Supabase keys + PayFast keys
# Set testMode: true for development

npm run dev
# → http://localhost:5173
```

No new SQL migration required for Session 7.

---

## Session 8 Starter Prompt

> *"I'm Morney Deetlefs (MD Works), South Africa. We're building KlasWerk — a zero-cost React + Supabase training platform. Sessions 3–7 are done (courses, lessons, quiz system, live sessions, certificates, analytics, quizzes list, PayFast integration). Now building Session 8: PayFast webhook worker, PDF certificate generation, analytics views, mobile polish, email notifications. The full handoff doc and scaffold zip are attached. Apply the MD Works brand (dark gold aesthetic) throughout. Build everything, zip it, and deliver before tokens run out."*

**Files to attach:**
1. `klaswerk-scaffold-s7.zip`
2. `klaswerk-session-07-handoff.md`
3. `md-works-brand-updated-color-modes.md`
4. `development_brief`

---

## Session Deliverables

- `klaswerk-scaffold-s7.zip` — full updated project (zero TS errors, clean prod build)
- `klaswerk-session-07-handoff.md` — this file

---

*MD Works · Morney Deetlefs · South Africa*
*✦ Builder of useful things for real people ✦*
