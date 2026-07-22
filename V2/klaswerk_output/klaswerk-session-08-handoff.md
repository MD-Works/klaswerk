# KlasWerk — Session Handoff
**Session:** 8 — PayFast Worker + PDF Certs + Analytics Views + Mobile + Email
**Date:** 2026-07-16
**Built by:** MD Works / Morney Deetlefs

---

## What Was Built This Session

### New Files (8)

| File | Purpose |
|------|---------|
| `workers/payment-webhook/index.ts` | Cloudflare Worker — receives PayFast ITN POST, validates MD5 signature, verifies with PayFast API (production), updates `payments.status` in Supabase |
| `workers/payment-webhook/wrangler.toml` | Wrangler config — deploy with `wrangler deploy` |
| `src/lib/generateCertPdf.ts` | Browser-side PDF certificate generator using jsPDF. A4 landscape, dark-gold aesthetic matching MD Works brand. Called from Certificates page. |
| `supabase/migrations/002_s8_analytics_views.sql` | `trainer_course_stats` view, `trainer_monthly_revenue` view, `student_progress_summary` view, performance indexes, `whereby_host_url` + `room_expires_at` columns on `live_sessions` |
| `supabase/functions/send-certificate-email/index.ts` | Resend-powered email — certificate issued notification to student |
| `supabase/functions/send-session-reminder/index.ts` | Resend-powered email — session starting in 30 min to enrolled students |
| `supabase/functions/send-payment-receipt/index.ts` | Resend-powered email — payment confirmation receipt |

### Modified Files (5)

| File | Change |
|------|--------|
| `src/pages/Certificates.tsx` | Added "↓ Download PDF" button calling `generateCertPdf`. Imports `useToast` for success/error feedback |
| `src/pages/LessonViewer.tsx` | Wired `autoIssueCertificate` — after marking the last lesson complete, auto-issues certificate and toasts "🎓 Certificate issued!" |
| `src/components/layout/AppShell.tsx` | Full mobile-responsive overhaul: desktop = fixed sidebar, mobile = off-canvas drawer with backdrop overlay, hamburger toggle in top bar, mobile logo, body scroll lock |
| `src/hooks/useSession.ts` | `createWherebyRoom` now sets 90-day expiry + stores `hostRoomUrl` + `expiresAt`. `createSession` persists all three. `startSession` accepts `wherebyApiKey` and auto-recreates expired rooms. Added `wherebyRoomIsExpired()` helper |
| `src/styles/index.css` | Mobile responsive pass: touch targets, font scaling, 2-col KPI grids, table horizontal scroll, form font-size 16px (prevents iOS zoom), drawer animation, safe-area-inset support |
| `package.json` | Added `jspdf: ^2.5.1` |

---

## Run Migration 002

```sql
-- In Supabase SQL editor, or via CLI:
supabase db push
-- OR manually paste contents of supabase/migrations/002_s8_analytics_views.sql
```

---

## Deploy the PayFast Worker

```bash
cd workers/payment-webhook
npm install -g wrangler   # if not already installed
wrangler deploy

# Set secrets:
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY   # service_role key
wrangler secret put PAYFAST_PASSPHRASE
wrangler secret put PAYFAST_MERCHANT_ID
wrangler secret put TEST_MODE              # 'true' for sandbox

# Then update public/config.js:
notifyUrl: 'https://klaswerk-payment-webhook.<your-subdomain>.workers.dev/payfast-webhook'
```

---

## Deploy Edge Functions

```bash
# Set shared secrets once:
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
supabase secrets set APP_URL=https://klaswerk.co.za
supabase secrets set FROM_EMAIL=noreply@klaswerk.co.za

# Deploy all three:
supabase functions deploy send-certificate-email
supabase functions deploy send-session-reminder
supabase functions deploy send-payment-receipt
```

### Wire DB Webhooks in Supabase Dashboard

1. **Certificate email** — Database → Webhooks → New:
   - Table: `certificates`, Event: `INSERT`
   - URL: `https://<project>.supabase.co/functions/v1/send-certificate-email`

2. **Payment receipt** — Table: `payments`, Event: `UPDATE`, Filter: `status=eq.complete`
   - URL: `https://<project>.supabase.co/functions/v1/send-payment-receipt`

3. **Session reminder** — Schedule via `pg_cron` or external CRON (see function comments)

---

## Key Architecture Notes

### PDF Certificate — `generateCertPdf()`

```typescript
import { generateCertPdf } from '@/lib/generateCertPdf'

const { dataUrl, blob, filename } = await generateCertPdf({
  studentName:  'Jane Doe',
  courseTitle:  'Advanced Welding Safety',
  certNumber:   'KW-ABC123-L9FGH2K',
  issuedAt:     '2026-07-16T10:00:00Z',
  trainerName:  'Morney Deetlefs',   // optional
  download:     true,                 // triggers browser download
})

// dataUrl can be uploaded to Supabase Storage for persistent PDF URL:
// const { data } = await supabase.storage.from('certificates').upload(`${certNumber}.pdf`, blob)
```

### PayFast Worker — Signature Validation

The worker uses the same zero-dependency MD5 as the frontend hook (no npm imports at runtime). The `validateSignature()` function builds a sorted query-string from all parameters (excluding `signature`), appends the passphrase, and compares MD5 hashes. This matches PayFast's documented specification exactly.

### Whereby Room Expiry Fix

**Problem:** Rooms created >7 days before session are expired by Whereby's API.

**Fix (Session 8):**
- `createWherebyRoom()` now creates rooms with a 90-day expiry (floor: session date + 7 days)
- `room_expires_at` is stored in `live_sessions` (migration 002 adds this column)
- `startSession(sessionId, wherebyApiKey)` checks `wherebyRoomIsExpired(row.room_expires_at)` and recreates the room on-the-fly if needed

### Mobile AppShell

The `useIsMobile(768)` hook uses `window.matchMedia` with a change listener — no resize polling. The drawer:
- Slides in from left via CSS `transform: translateX`
- Closes on: backdrop tap, nav click, route change
- Locks `document.body.scroll` while open
- Uses `useRef` + `mousedown` outside-click detection

---

## Analytics Views (Migration 002)

Replace the sequential per-course JS loops in `useAnalytics.ts` with a single DB query:

```typescript
// Before (N+1 queries):
for (const course of courses) {
  const stats = await fetchCourseStats(course.id) // separate query per course
}

// After (single view query):
const { data } = await supabase
  .from('trainer_course_stats')
  .select('*')
  .eq('trainer_id', user.id)
```

Update `useAnalytics.fetchCourseBreakdown()` to use `trainer_course_stats` view in Session 9 for a significant performance uplift on trainers with many courses.

---

## What to Build Next — Session 9 (Finesse + Launch Prep)

### 1. Supabase Storage for PDF Certs
After generating the PDF, upload to `supabase.storage.from('certificates')` and store the public URL in `certificates.pdf_url`. Add `pdf_url TEXT` column to certificates table (migration 003).

### 2. useAnalytics Refactor to DB Views
Update `fetchCourseBreakdown()` and `fetchRevenueStats()` to query `trainer_course_stats` and `trainer_monthly_revenue` views directly instead of N+1 JS loops.

### 3. Enrol-from-Public-Page Flow
Add "Buy / Enrol" button to a public-facing course landing page (no auth required to view, auth required to enrol). Reduces friction for new students.

### 4. Supabase Auth Email Templates
Customise the Supabase confirm/reset emails in Auth → Email Templates to match the KlasWerk dark-gold aesthetic.

### 5. Error Boundary
Add a React `ErrorBoundary` component wrapping `<App>` to catch runtime errors gracefully instead of white-screening.

### 6. PWA Manifest + Service Worker
Add `manifest.json` and a minimal Workbox service worker for "Add to Home Screen" on mobile and offline lesson caching.

### 7. Rate Limiting on PayFast Worker
Add a KV-based rate limiter in the worker to prevent replay attacks (same `pf_payment_id` processed twice).

---

## How to Run

```bash
# From the project root:
npm install
# Edit public/config.js — Supabase keys, PayFast keys, Whereby API key
npm run dev
# → http://localhost:5173
```

Run migration 002 before testing analytics views or the Whereby expiry fix.

---

## Session 9 Starter Prompt

> *"I'm Morney Deetlefs (MD Works), South Africa. We're building KlasWerk — a zero-cost React + Supabase training platform. Sessions 3–8 are complete (courses, lessons, quizzes, live sessions, certificates + PDF, analytics, PayFast + webhook worker, mobile responsive, email notifications via Resend). Now building Session 9: Supabase Storage for PDF certs, analytics DB view refactor, public course landing page with enrol CTA, error boundary, PWA manifest, Auth email templates. Full handoff doc and scaffold zip attached. Apply MD Works brand (dark gold aesthetic). Build everything, zip and deliver before tokens run out."*

**Files to attach:**
1. `klaswerk-scaffold-s8.zip`
2. `klaswerk-session-08-handoff.md`
3. `md-works-brand-updated-color-modes.md`

---

*MD Works · Morney Deetlefs · South Africa*
*✦ Builder of useful things for real people ✦*
