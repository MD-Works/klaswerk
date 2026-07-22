# KlasWerk — Session Handoff
**Session:** 10 — Paid Enrolment from Landing · PayFast KV Dedup · Trainer Profile · Progress Bar · Copy Link
**Date:** 2026-07-17
**Built by:** MD Works / Morney Deetlefs

---

## What Was Built This Session

### New Files (2)

| File | Purpose |
|------|---------|
| `src/pages/TrainerProfile.tsx` | Public trainer profile page at `/trainer/:trainerId` — no auth needed. Shows avatar, bio, aggregate stats (courses, students, lessons), grid of all published courses with links to their landing pages. "Copy Profile Link" button. |
| `supabase/migrations/004_s10_trainer_profile_view.sql` | Replaces `public_courses` view to expose `trainer_id`. Adds index on `courses.trainer_id` (published only) and `profiles.role`. |

### Modified Files (4)

| File | Change |
|------|--------|
| `src/pages/CourseLanding.tsx` | Paid courses now call `initiatePayment()` → PayFast instead of `enrollStudent()`. Free courses still enrol directly. CTA label changes to "Pay R X.XX" and shows "🔒 Secured by PayFast" badge. Trainer section now has "View all courses by this trainer →" link to `/trainer/:trainerId`. `trainer_id` added to `PublicCourse` interface. |
| `src/pages/CourseDetail.tsx` | `handleEnrol()` now calls `initiatePayment()` for paid courses. Button label shows "Pay R X.XX" vs "Enrol Now". Student progress bar shows lesson completion % with animated fill. Trainer view gets "⎘ Share Link" button (copies `/course/:courseId`) when course is published. |
| `workers/payment-webhook/index.ts` | Added `isNewPayment()` KV dedup function. Checks `SEEN_PAYMENTS` KV namespace before processing. Replays return `200 OK` immediately (stops PayFast retrying) without touching the DB. `Env` interface now declares `SEEN_PAYMENTS: KVNamespace`. |
| `workers/payment-webhook/wrangler.toml` | Added `[[kv_namespaces]]` block with `binding = "SEEN_PAYMENTS"`. Requires real KV namespace ID (see deploy steps). |
| `src/App.tsx` | Added `/trainer/:trainerId` public route (TrainerProfilePage). |

---

## Deploy Steps — Session 10

### 1. Run Migration 004

```bash
supabase db push
# OR paste: supabase/migrations/004_s10_trainer_profile_view.sql
```

This replaces the `public_courses` view to include `trainer_id` — needed by both the Trainer Profile page and the CourseLanding trainer link.

### 2. Create KV Namespace for PayFast Dedup

```bash
cd workers/payment-webhook

# Create the namespace
wrangler kv:namespace create SEEN_PAYMENTS
# Output: { binding: 'SEEN_PAYMENTS', id: 'abc123...' }

# Paste that id into wrangler.toml:
# [[kv_namespaces]]
# binding = "SEEN_PAYMENTS"
# id      = "abc123..."

# Optional: create preview namespace for local dev
wrangler kv:namespace create SEEN_PAYMENTS --preview
# Add preview_id to wrangler.toml

# Redeploy worker
wrangler deploy
```

### 3. PayFast Paid Enrolment — How It Works

```
Student lands on /course/:id
  → clicks "Pay R X.XX"
  → if not logged in: /login?next=/course/:id
  → after login: back to /course/:id → clicks "Pay R X.XX" again
  → initiatePayment(course) creates a payments row in Supabase
  → builds hidden PayFast form → auto-submits → browser navigates to PayFast
  → student pays on PayFast
  → PayFast sends ITN to Cloudflare Worker
  → Worker: KV dedup → sig validate → DB update → 200 OK
  → student lands on /payment/return
  → verifyPayment() checks payments.status → if 'complete' → auto-enrols
  → toast "Payment confirmed" → navigate to /courses/:courseId
```

---

## New Public URLs

| URL | Content |
|-----|---------|
| `/course/:courseId` | Public course landing (S9) |
| `/trainer/:trainerId` | Public trainer profile (S10) — lists all their published courses |
| `/verify/:certNumber` | Certificate verification (S7) |

All three work without login. All three are shareable via WhatsApp / social media.

---

## Progress Bar — How It Works

On `CourseDetail`, enrolled students see a progress bar pulled from `enrollments.progress` (0–100, integer). The bar uses a CSS transition for a smooth fill animation on load. At 100% it turns green and shows "🎓 Course complete — check your Certificates page."

`enrollments.progress` is updated in `LessonViewer` when a lesson is marked complete (existing logic from Session 4).

---

## Trainer Public Link — How to Share

On a published course's detail page (trainer view), the "⎘ Share Link" button copies:
```
https://klaswerk.co.za/course/{courseId}
```

On the trainer's own profile page, "⎘ Copy Profile Link" copies:
```
https://klaswerk.co.za/trainer/{trainerId}
```

Both links work without an account. The profile link lists all published courses.

---

## KV Dedup — Edge Cases

- **First ITN:** `isNewPayment` writes `pf:{pfPaymentId}` to KV with 30-day TTL → processes normally.
- **Replay/retry:** Key already exists → returns `200 OK` immediately, DB untouched.
- **PayFast legitimate retries** (e.g. if first ITN timed out): same dedup — idempotent. If the DB was already updated in the first call, a retry is harmless. If the first call failed silently and a replay arrives, the dedup stops it — but this is an edge case. For production, log failures to an alert channel.
- **KV unavailable:** `isNewPayment` catches errors and defaults to allowing the payment through (`return true`), so a KV outage doesn't block legitimate payments.

---

## What to Build Next — Session 11

1. **Lesson completion tracking per-lesson** — store which specific lessons a student completed (not just overall %). Allows the lesson list on CourseDetail to show ✓ ticks per row.

2. **Student dashboard improvements** — "Continue learning" CTA for in-progress courses, recent activity feed.

3. **Trainer bio on PDF certificate** — capture `trainer_name` at certificate issue time and populate the "Authorised by" field in `generateCertPdf`.

4. **Course search / filter on Courses page** — filter by category, level, price (free vs paid), search by title.

5. **Admin view** — super-admin role that can see all users, courses, and payments (Morney's own oversight view).

6. **Supabase Realtime** — live student count on the trainer analytics dashboard. Useful for seeing enrolments in real time.

---

## Session 11 Starter Prompt

> *"I'm Morney Deetlefs (MD Works), South Africa. We're building KlasWerk — a zero-cost React + Supabase training platform. Sessions 3–10 are complete. Now building Session 11: per-lesson completion ticks, student dashboard improvements, trainer name on PDF cert, course search/filter, admin view. Full handoff doc and scaffold zip attached. Apply MD Works brand. Build everything, zip and deliver."*

**Files to attach:**
1. `klaswerk-scaffold-s10.zip`
2. `klaswerk-session-10-handoff.md`
3. `md-works-brand-updated-color-modes.md`

---

*MD Works · Morney Deetlefs · South Africa*
*✦ Builder of useful things for real people ✦*
