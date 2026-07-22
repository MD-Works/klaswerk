# KlasWerk — Complete Project Handoff
**Project:** KlasWerk — Zero-Cost Training Platform
**Completed:** 2026-07-19
**Sessions:** 3 – 11b (template base deployed)
**Built by:** MD Works / Morney Deetlefs

---

## What KlasWerk Is

KlasWerk is a full-stack training platform for South African trainers and educators. It runs at zero monthly cost using Cloudflare Workers, Supabase (free tier), and Resend (free tier). Trainers create and sell courses, host live video classes, issue verified certificates, and track analytics. Students learn at their own pace, take quizzes, attend live sessions, and earn downloadable PDF certificates.

---

## Tech Stack

| Layer | Tool | Cost |
|-------|------|------|
| Frontend | React + Vite + TypeScript | Free |
| Styling | Tailwind CSS + custom CSS variables | Free |
| Database + Auth | Supabase (PostgreSQL + Row Level Security) | Free tier |
| File storage | Supabase Storage | Free tier |
| Edge functions | Supabase Edge Functions (Deno) | Free tier |
| Payment webhook | Cloudflare Workers | Free tier |
| Payments | PayFast (South Africa) | % per transaction |
| Live video | Whereby Embedded API | Per room/month |
| Email | Resend | Free tier |
| Hosting | Cloudflare Pages or Vercel | Free tier |

**Monthly fixed cost: R 0.** You only pay PayFast's transaction fee and Whereby's room fee when those features are actively used.

---

## Repository Structure

```
klaswerk/
├── index.html                          # PWA entry point — manifest + SW registration
├── public/
│   ├── config.js                       # Client config (Supabase keys, PayFast, Whereby)
│   ├── manifest.json                   # PWA manifest
│   ├── sw.js                           # Service worker (offline app shell)
│   ├── setup.html                      # MD Works Setup Wizard — first-time client deployment (DELETE after use)
│   ├── registry.html                   # MD Works Client Registry — password-protected, Morney-only admin view
│   └── icons/                          # ← ADD icon-192.png + icon-512.png here
├── src/
│   ├── App.tsx                         # Router — all routes defined here
│   ├── main.tsx                        # React root — ErrorBoundary wraps App
│   ├── config/                         # App config reads from window.KLASWERK_CONFIG
│   ├── stores/
│   │   └── authStore.ts                # Zustand auth state
│   ├── hooks/
│   │   ├── useAuth.ts                  # Login, register, logout, role check
│   │   ├── useCourse.ts                # CRUD courses, enrol, progress
│   │   ├── useLesson.ts                # CRUD lessons, completion marking
│   │   ├── useQuiz.ts                  # Build quizzes, submit attempts, scoring
│   │   ├── useSession.ts               # Schedule + join Whereby live sessions
│   │   ├── useCertificate.ts           # Issue, download, upload to Storage
│   │   ├── useAnalytics.ts             # Dashboard KPIs, DB view queries
│   │   ├── usePayment.ts               # PayFast initiate + verify on return
│   │   └── useToast.ts                 # Toast notifications
│   ├── lib/
│   │   ├── supabase.ts                 # Supabase client + typed db helper
│   │   └── generateCertPdf.ts          # jsPDF A4 landscape cert generator
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx            # Desktop sidebar + mobile drawer
│   │   │   └── ProtectedRoute.tsx      # Auth guard + role guard
│   │   └── ui/
│   │       └── ErrorBoundary.tsx       # Runtime error catch + recovery UI
│   ├── pages/
│   │   ├── Login.tsx / Register.tsx    # Auth pages — support ?next= redirect
│   │   ├── Dashboard.tsx               # Student or trainer dashboard
│   │   ├── Courses.tsx                 # Course list
│   │   ├── CourseDetail.tsx            # Course overview + lesson list + progress bar
│   │   ├── CourseLanding.tsx           # PUBLIC — /course/:id — enrol/pay CTA
│   │   ├── CreateCourse.tsx
│   │   ├── LessonEditor.tsx
│   │   ├── LessonViewer.tsx            # Auto-issues cert on last lesson complete
│   │   ├── QuizBuilder.tsx
│   │   ├── QuizTaker.tsx
│   │   ├── Sessions.tsx
│   │   ├── ScheduleSession.tsx
│   │   ├── LiveRoom.tsx                # Whereby embed
│   │   ├── Certificates.tsx            # Download PDF + cloud save
│   │   ├── CertificateVerify.tsx       # PUBLIC — /verify/:certNumber
│   │   ├── Analytics.tsx               # Trainer analytics dashboard
│   │   ├── TrainerProfile.tsx          # PUBLIC — /trainer/:id
│   │   ├── Profile.tsx
│   │   ├── PaymentReturn.tsx           # PayFast return URL handler
│   │   └── PaymentCancel.tsx
│   ├── styles/
│   │   └── index.css                   # MD Works design tokens + utility classes
│   └── types/
│       └── index.ts                    # Shared TypeScript types
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial.sql             # All tables + RLS policies
│   │   ├── 002_s8_analytics_views.sql  # trainer_course_stats, trainer_monthly_revenue, student_progress_summary views
│   │   ├── 003_s9_cert_storage_public_page.sql  # pdf_url column, storage bucket, public_courses view
│   │   └── 004_s10_trainer_profile_view.sql     # trainer_id on public_courses, indexes
│   ├── functions/
│   │   ├── send-certificate-email/     # Resend — cert issued notification
│   │   ├── send-session-reminder/      # Resend — 30min before session
│   │   └── send-payment-receipt/       # Resend — payment confirmed
│   └── email-templates/
│       ├── confirm-signup.html         # Dark-gold branded — paste into Supabase dashboard
│       ├── reset-password.html
│       └── magic-link.html
└── workers/
    └── payment-webhook/
        ├── index.ts                    # Cloudflare Worker — PayFast ITN handler + KV dedup
        └── wrangler.toml               # Requires SEEN_PAYMENTS KV namespace ID
```

---

## Database Schema (Summary)

```
profiles           — user profile, role (trainer/student), bio, avatar
courses            — title, description, price, currency, status, trainer_id
lessons            — title, content, video_url, order_index, is_published, course_id
quizzes            — lesson_id, pass_percentage, time_limit
quiz_questions     — question text, type, options, correct_answer
quiz_attempts      — student_id, quiz_id, answers, score, percentage, passed
enrollments        — student_id, course_id, progress, status, payment_status
live_sessions      — course_id, title, scheduled_for, whereby_room_url, host_url
session_attendance — session_id, student_id, joined_at, duration
certificates       — student_id, course_id, cert_number, issued_at, pdf_url
payments           — student_id, course_id, amount, status, pf_payment_id

Views (no extra queries needed):
  trainer_course_stats       — per-course enrollment, completion, revenue
  trainer_monthly_revenue    — revenue by month
  student_progress_summary   — student-level completion stats
  public_courses             — published courses with trainer info (readable by anon)
```

---

## All Routes

### Public (no login needed)
| Route | Page |
|-------|------|
| `/course/:courseId` | Course landing page — view details, pay/enrol |
| `/trainer/:trainerId` | Trainer profile — bio + all their published courses |
| `/verify/:certNumber` | Certificate verification |
| `/login` | Sign in (supports `?next=` redirect) |
| `/register` | Register (supports `?next=` redirect) |

### Authenticated — any user
| Route | Page |
|-------|------|
| `/dashboard` | Student or trainer dashboard |
| `/courses` | Browse enrolled courses |
| `/courses/:courseId` | Course detail + lesson list |
| `/courses/:courseId/lessons/:lessonId` | Lesson viewer |
| `/quizzes/:quizId` | Take a quiz |
| `/quizzes` | All quizzes |
| `/live` | Session list |
| `/live/:sessionId` | Live video room |
| `/certificates` | My certificates |
| `/profile` | Edit profile |
| `/payment/return` | PayFast return handler |
| `/payment/cancel` | PayFast cancel handler |

### Trainer only
| Route | Page |
|-------|------|
| `/courses/new` | Create course |
| `/courses/:courseId/lessons/new` | Add lesson |
| `/courses/:courseId/lessons/:lessonId/edit` | Edit lesson |
| `/courses/:courseId/lessons/:lessonId/quiz` | Build quiz |
| `/live/new` | Schedule session |
| `/live/:sessionId/edit` | Edit session |
| `/analytics` | Analytics dashboard |

---

## First-Time Setup (new client deployment)

### 1. Supabase project

```bash
# Create project at supabase.com
# Run all 4 migrations in order in the SQL editor:
supabase/migrations/001_initial.sql
supabase/migrations/002_s8_analytics_views.sql
supabase/migrations/003_s9_cert_storage_public_page.sql
supabase/migrations/004_s10_trainer_profile_view.sql
```

### 2. Supabase Storage

The `certificates` bucket is created by migration 003. No manual setup needed.

### 3. Supabase Auth email templates

Dashboard → Authentication → Email Templates. Paste each file from `supabase/email-templates/`:
- **Confirm signup** → `confirm-signup.html`
- **Reset password** → `reset-password.html`
- **Magic link** → `magic-link.html`

### 4. Supabase Edge Functions

```bash
# Set secrets once
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
supabase secrets set APP_URL=https://klaswerk.co.za
supabase secrets set FROM_EMAIL=noreply@klaswerk.co.za

# Deploy
supabase functions deploy send-certificate-email
supabase functions deploy send-session-reminder
supabase functions deploy send-payment-receipt
```

Wire DB webhooks in Dashboard → Database → Webhooks:
- `certificates` INSERT → `send-certificate-email`
- `payments` UPDATE (status=eq.complete) → `send-payment-receipt`
- Session reminder: schedule via `pg_cron` (see function comments)

### 5. PayFast Worker

```bash
cd workers/payment-webhook

# Create KV namespace for replay protection
wrangler kv:namespace create SEEN_PAYMENTS
# Copy the id from the output into wrangler.toml under [[kv_namespaces]]

# Deploy
wrangler deploy

# Set secrets
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put PAYFAST_PASSPHRASE
wrangler secret put PAYFAST_MERCHANT_ID
wrangler secret put TEST_MODE             # 'false' for production
```

Then in `public/config.js` set:
```js
notifyUrl: 'https://klaswerk-payment-webhook.<your-subdomain>.workers.dev/payfast-webhook'
```

### 6. public/config.js

```js
window.KLASWERK_CONFIG = {
  supabase: {
    url:    'https://xxxx.supabase.co',
    anonKey: 'eyJ...',
  },
  payfast: {
    merchantId:  '12345678',
    merchantKey: 'xxxxxxxxxxxxxxxx',
    passphrase:  'your-passphrase',
    testMode:    false,
    notifyUrl:   'https://klaswerk-payment-webhook.xxx.workers.dev/payfast-webhook',
    returnUrl:   'https://klaswerk.co.za/payment/return',
    cancelUrl:   'https://klaswerk.co.za/payment/cancel',
  },
  whereby: {
    apiKey: 'your-whereby-api-key',
  },
  brand: {
    name:      'KlasWerk',
    logoUrl:   null,
    faviconUrl: null,
  },
}
```

### 7. PWA Icons (two files to create)

Add to `/public/icons/`:
- `icon-192.png` — 192×192px
- `icon-512.png` — 512×512px

Suggested design: dark background `#110e09`, gold "KW" monogram or ✦ mark in `#c9943c`.

### 8. Deploy frontend

```bash
npm install
npm run build
# Deploy /dist to Cloudflare Pages or Vercel
```

---

## Environment Variables / Secrets Reference

| Where | Key | Description |
|-------|-----|-------------|
| `public/config.js` | `supabase.url` | Your Supabase project URL |
| `public/config.js` | `supabase.anonKey` | Supabase anon/public key |
| `public/config.js` | `payfast.*` | PayFast merchant credentials |
| `public/config.js` | `whereby.apiKey` | Whereby API key |
| Wrangler secrets | `SUPABASE_URL` | Same as above — for the worker |
| Wrangler secrets | `SUPABASE_SERVICE_KEY` | Supabase service_role key (not anon) |
| Wrangler secrets | `PAYFAST_PASSPHRASE` | PayFast passphrase |
| Wrangler secrets | `PAYFAST_MERCHANT_ID` | PayFast merchant ID |
| Wrangler secrets | `TEST_MODE` | `'true'` or `'false'` |
| Supabase secrets | `RESEND_API_KEY` | Resend API key |
| Supabase secrets | `APP_URL` | Your production URL |
| Supabase secrets | `FROM_EMAIL` | Sender email address |

---

## Feature Checklist

### Core platform
- [x] Supabase Auth (email/password, role-based: trainer / student)
- [x] Course creation and management (draft / published / archived)
- [x] Lesson editor (rich content, video URL, file attachments, order)
- [x] Lesson viewer with completion tracking
- [x] Student progress bar on course detail
- [x] Quizzes — builder (trainer), taker (student), scoring, pass/fail, attempts log
- [x] Certificate auto-issue on course completion
- [x] Certificate PDF generation (jsPDF, A4 landscape, dark-gold branded)
- [x] Certificate cloud storage (Supabase Storage, persistent URL on cert row)
- [x] Certificate public verification page (`/verify/:certNumber`)

### Live sessions
- [x] Schedule live sessions linked to courses
- [x] Whereby embedded video room
- [x] 90-day room expiry with auto-recreate on session start
- [x] Session attendance tracking
- [x] 30-minute reminder email via Resend

### Payments
- [x] PayFast integration (ZAR, production-ready)
- [x] Paid enrolment from course detail page
- [x] Paid enrolment from public course landing page
- [x] Cloudflare Worker ITN webhook handler
- [x] KV-based replay protection (prevents double-processing)
- [x] Payment receipt email via Resend

### Analytics (trainer)
- [x] Dashboard KPIs (students, revenue, completion rate, quiz scores)
- [x] Per-course breakdown via `trainer_course_stats` DB view
- [x] Monthly revenue chart via `trainer_monthly_revenue` DB view
- [x] Session attendance log

### Public-facing
- [x] Public course landing page (`/course/:courseId`) — shareable, no login to view
- [x] Public trainer profile page (`/trainer/:trainerId`) — all their published courses
- [x] Certificate verification page — no login required

### Email (Resend)
- [x] Certificate issued notification
- [x] Payment receipt
- [x] Session reminder (30 min before)
- [x] Supabase Auth emails (confirm signup, reset password, magic link) — branded templates

### Mobile + PWA
- [x] Fully mobile-responsive (off-canvas drawer, touch targets, safe-area insets)
- [x] iOS zoom prevention (16px form font size)
- [x] PWA manifest (installable, dark-gold theme)
- [x] Service worker (app shell cached, APIs always network-first)
- [ ] PWA icons — needs `icon-192.png` + `icon-512.png`

### Deployment tooling
- [x] Setup Wizard (`public/setup.html`) — 6-step guided client deployment, generates config.js, saves client record
- [x] MD Works Client Registry (`public/registry.html`) — password-protected, search/filter/edit/delete, config reference modal

### Code quality
- [x] TypeScript throughout
- [x] React ErrorBoundary (no white screens)
- [x] All DB queries typed via Supabase client
- [x] Row Level Security on all tables
- [x] Analytics refactored to DB views (no N+1 queries)

---

## Known Remaining Items (non-blocking)

These are improvements, not blockers. The platform is fully usable without them.

| Item | Notes |
|------|-------|
| PWA icons | Two PNG files needed in `/public/icons/` |
| Per-lesson completion ticks | Show ✓ on each lesson row the student has completed. Needs a `lesson_completions` junction table. |
| Course search + filter | Filter by category, level, free/paid on the Courses page |
| Trainer name on PDF cert | Capture trainer name at cert issue time and populate the "Authorised by" field |
| Student dashboard "Continue learning" | CTA to resume the most recently accessed in-progress course |
| Admin oversight view | Super-admin role to view all users, courses, payments |
| PayFast reminder logging | Alert channel (Slack/email) when an ITN fails silently |
| Supabase Realtime | Live enrolment count on trainer analytics |

---

## Design System

The platform uses the **MD Works dark-gold aesthetic**:

| Token | Value | Use |
|-------|-------|-----|
| `--kw-dark` | `#0a0906` | Page background |
| `--kw-surface` | `#110e09` | Card background |
| `--kw-panel` | `#1a1610` | Elevated panel |
| `--kw-primary` | `#c9943c` | Gold accent |
| `--kw-primary-lt` | `#e8c87a` | Light gold — headings |
| `--kw-primary-dk` | `#7a5815` | Dark gold — eyebrows |
| `--kw-cream` | `#f0e6ce` | Body text |
| `--kw-muted` | `#7a6d58` | Secondary text |
| `--kw-success` | `#4caf7a` | Success states |
| `--kw-danger` | `#c94c4c` | Error / danger |
| `--kw-border` | `#2c2619` | Borders |

**Typography:**
- Display / headings: `Cinzel` (serif, ceremonial)
- Body italic / pull quotes: `Cormorant Garamond`
- UI labels / nav: `Raleway` or `Syne`
- Monospace / codes / metadata: `Syne Mono`

---

## Running Locally

```bash
# Install dependencies
npm install

# Configure local environment
# Edit public/config.js with your Supabase project URL and anon key
# Set TEST_MODE: true for PayFast sandbox

# Start dev server
npm run dev
# → http://localhost:5173

# Run migrations (one time)
# Paste each SQL file into Supabase SQL editor, in order 001–004
```

---

## Session History

| Session | What was built |
|---------|---------------|
| 3 | Project scaffold, Supabase client, auth, course CRUD, enrollment |
| 4 | Lesson editor + viewer, completion tracking, file attachments |
| 5 | Quiz builder + taker, scoring, pass/fail, attempts |
| 6 | Live sessions (Whereby), scheduling, attendance, live room UI |
| 7 | Certificates, PDF generation, verification page, analytics dashboard, PayFast frontend, payment return/cancel pages |
| 8 | PayFast Cloudflare Worker (ITN), analytics DB views, Whereby room expiry fix, mobile AppShell overhaul, Resend email functions |
| 9 | Supabase Storage for PDF certs, analytics refactor to DB views, public course landing page, ErrorBoundary, PWA manifest + service worker, Auth email templates |
| 10 | Paid enrolment from landing + course detail, PayFast KV replay protection, public trainer profile page, student progress bar, trainer "Share Link" button |
| 11 | Setup Wizard (`public/setup.html`) — 6-step guided first-time deployment; MD Works Client Registry (`public/registry.html`) — password-protected client management dashboard; handoff doc updated |
| 11b | Template base deployed — Supabase project created (Frankfurt), all 4 migrations run (with column/table patches), GitHub repo created (MD-Works/klaswerk-template-base, private), Cloudflare Pages live at klaswerk-template-base.pages.dev; TS build errors fixed (noUnusedLocals/Params false, type casts in CourseDetail + ScheduleSession); config.js → window.KLASWERK_CONFIG; .gitignore updated to allow config.js commit for template base |

---

## Setup Wizard (`public/setup.html`)

A fully standalone, no-build HTML file that walks Morney (or any MD Works deployer) through setting up a new KlasWerk instance from scratch. Delete or rename after use — it exposes config values.

### What it does (6 steps)

| Step | Name | What happens |
|------|------|-------------|
| 1 | Welcome | Prerequisites checklist — Supabase, PayFast, Whereby, Resend, Cloudflare, Node.js |
| 2 | Supabase | Create project, run all 4 migrations, set Auth email templates, live connection test |
| 3 | PayFast | Merchant setup guide, Cloudflare Worker deploy commands (Windows PowerShell + Mac/Linux), notify URL + sandbox/live toggle |
| 4 | Whereby + Brand | Whereby Embedded API key, Resend Edge Function deploy commands, PWA icon guide, brand name + logo URL |
| 5 | Generate config.js | Auto-generates complete `public/config.js` from all entered values — copy-paste ready + deployment checklist |
| 6 | Client Record | Saves client metadata to Morney's personal `mdworks-registry` Supabase project |

### Features
- Windows PowerShell AND Mac/Linux commands for every terminal step
- Live Supabase connection test (fetches `/rest/v1/` with the entered keys)
- PayFast sandbox/live toggle reflected in generated config
- config.js auto-generated with security comment header and date stamp
- 10-item deployment checklist in Step 5
- Security warning banner reminding to delete the file post-setup

### Security
This file is in `public/` and therefore publicly accessible if deployed. It must be **deleted from the server** after setup is complete. The security warning banner is displayed on every step as a reminder.

---

## MD Works Client Registry (`public/registry.html`)

A password-protected single-file admin dashboard where Morney can view, search, and manage all KlasWerk client records saved from the Setup Wizard.

**This file is for Morney's personal use only.** It should be served locally or from a private URL — never from a client's public deployment.

### First-time setup

**1. Set the password**

Open `registry.html` in a browser, then open the browser console and run:
```javascript
setPassword('your-chosen-password')
```
Copy the printed hash. Open `registry.html` in a text editor and replace `{{PASSWORD_HASH}}` (near the top of the `<script>` tag) with that hash. Save the file. The password is now baked in as a SHA-256 hash.

**2. Connect the registry on first load**

After unlocking, if no Supabase credentials are saved you'll see a connection form. Enter:
- **Registry Supabase URL** — your `mdworks-registry` project URL
- **Service Role Key** — the `service_role` key from that project's Settings → API

Credentials are saved to `sessionStorage` for the browser session only (cleared when the tab closes).

**3. Create the `kw_clients` table** (one time — if not already done via the Setup Wizard instructions)

In your `mdworks-registry` Supabase SQL Editor:
```sql
CREATE TABLE public.kw_clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  client_name     TEXT NOT NULL,
  trading_name    TEXT,
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  domain          TEXT,
  supabase_url    TEXT,
  deploy_date     DATE DEFAULT CURRENT_DATE,
  payfast_live    BOOLEAN DEFAULT FALSE,
  whereby_active  BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  features        JSONB DEFAULT '{}'
);

ALTER TABLE public.kw_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access"
  ON public.kw_clients
  USING (TRUE)
  WITH CHECK (TRUE);
```

### Features

| Feature | Detail |
|---------|--------|
| Password protection | SHA-256 hash baked into the HTML; session-only unlock (sessionStorage) |
| Stats bar | Total clients, PayFast Live count, Whereby Active count, deployments this year |
| Search | Real-time across client name, trading name, contact, email, phone, domain, notes |
| Filters | By PayFast mode (live / sandbox) and Whereby status (active / inactive) |
| Sort | Click any column header (name, contact, domain, date) — toggles asc/desc |
| Client detail | Modal with all fields, clickable domain + email links |
| Edit | In-modal form to update any field including feature toggles |
| Delete | Two-click safety confirmation before permanent deletion |
| Config reference | Generates a skeleton `config.js` for the selected client (domain, Supabase URL, PayFast mode pre-filled; secrets shown as comments — they're not stored in the registry) |
| Lock button | Ends session immediately |

### What the registry stores vs. what it doesn't

| Stored ✓ | Not stored ✗ |
|----------|--------------|
| Client name, trading name | PayFast passphrase |
| Contact name, email, phone | Supabase service_role key |
| Domain | Whereby API key |
| Supabase project URL | Resend API key |
| Deploy date | Any student or course data |
| PayFast live/test flag | |
| Whereby active flag | |
| Notes | |

Secrets live in Cloudflare Worker secrets and Supabase Edge Function secrets, never in this registry.

---

*MD Works · Morney Deetlefs · South Africa*
*✦ Builder of useful things for real people ✦*

---

## Session 12 — Starting Point

### Next Priority: Role-Based Trainer Access Control

**Problem:** Currently anyone can self-register and become a trainer. This must be locked down before any real client deployment.

**Agreed model:**
- `owner` — one per deployment, set manually in Supabase after first deploy
- `trainer` — invited by owner via email invite link with token, cannot self-register
- `student` — anyone can self-register (current behaviour, keep as-is)

**Implementation plan:**
1. Confirm `role` column exists on `profiles` table (check DB first)
2. Add `trainer_invites` table — stores invite tokens, email, expiry, used flag
3. Lock Register page — self-registration always creates `student` role
4. Add Owner dashboard — "Invite Co-Trainer" button → sends email with token link
5. Add invite acceptance page — `/invite?token=xxx` → validates token, creates trainer account
6. Update Route guards — trainer/owner routes check role from profiles

**Check profiles schema first (run in Supabase SQL Editor):**
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

### Also Remaining
- Cloudflare Worker (PayFast webhook)
- Supabase Auth email templates
- Supabase Edge Functions (Resend)
- PWA icons (icon-192.png + icon-512.png in public/icons/)
- DB Webhooks (certificates + payments → edge functions)

---

*MD Works · Morney Deetlefs · South Africa*
*✦ Builder of useful things for real people ✦*
