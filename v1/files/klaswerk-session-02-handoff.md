# KlasWerk — Session Handoff
**Session:** 2 — Project Scaffold & Config System
**Date:** 2026-07-12
**Built by:** MD Works / Morney Deetlefs

---

## What Was Built This Session

### Project scaffold (23 files, ready to `npm install`)

| File | Purpose |
|------|---------|
| `package.json` | Dependencies: React 18, Vite, Supabase JS v2, Zustand, React Router v6, Tailwind |
| `vite.config.ts` | `@/` alias to `src/`, port 5173 |
| `tsconfig.json` + `tsconfig.node.json` | Strict TypeScript, path aliases |
| `tailwind.config.js` | `kw-*` colour tokens wired to CSS vars, all 5 brand fonts |
| `postcss.config.js` | Tailwind + Autoprefixer |
| `.gitignore` | Blocks `public/config.js` and `.env*` from commits |
| `index.html` | Loads `public/config.js` **before** the React bundle |
| `public/config.js` | Dev placeholder — swapped per client from Setup Wizard output |
| `src/types/index.ts` | All shared TS types: Config, Profile, Course, Lesson, Quiz, Enrollment, Session, Payment, Certificate |
| `src/config/index.ts` | Reads `window.KLASWERK_CONFIG`, validates, applies brand CSS vars at runtime |
| `src/lib/supabase.ts` | Single typed Supabase client, keyed from config (not .env) |
| `src/stores/authStore.ts` | Zustand store: user, profile, role, loading, ready flags |
| `src/hooks/useAuth.ts` | Auth hook: signIn, signUp, signOut, updateProfile, session bootstrap |
| `src/styles/index.css` | Global styles, grain overlay, all `kw-*` component classes |
| `src/components/layout/AppShell.tsx` | Sidebar nav (role-aware, feature-flag filtered) + top bar |
| `src/components/layout/ProtectedRoute.tsx` | Auth guard + optional role guard, loading state |
| `src/pages/Login.tsx` | Sign in form, MD Works styling |
| `src/pages/Register.tsx` | Sign up with role selector (Student / Trainer) |
| `src/pages/CheckEmail.tsx` | Post-registration holding page |
| `src/pages/Dashboard.tsx` | Role-aware shell with stat card placeholders |
| `src/App.tsx` | Full route map — all future pages stubbed as Placeholder |
| `src/main.tsx` | React entry point |

---

## Key Architecture Decisions

### Config-first design
`public/config.js` is loaded as a plain `<script>` tag in `index.html` before the React bundle. This means:
- **Same build, any client** — swap `config.js`, no rebuild needed
- **No `.env` files required** — keys live in config, not environment
- `public/config.js` is in `.gitignore` — keys never go to GitHub
- The Setup Wizard (Session 1) generates the correct `config.js` per client

### Brand token injection
`src/config/index.ts` reads `config.brand` at startup and sets `--kw-primary`, `--kw-dark`, `--kw-surface`, etc. as CSS custom properties. Tailwind's `kw-*` colour classes consume these same variables. Every client gets their own colours with zero code changes.

### Feature flags
`config.features` controls which nav items and routes are active. A client without payments enabled won't see the PayFast flow at all. Flags are checked in `AppShell.tsx` for nav and can be checked anywhere via `import { features } from '@/config'`.

### Supabase auth flow
1. `main.tsx` → `App.tsx` → `useAuth()` bootstraps on mount
2. `getSession()` resolves from localStorage immediately (no flash)
3. `onAuthStateChange` handles login/logout/token refresh
4. Profile is fetched from `public.profiles` after session resolves
5. `ProtectedRoute` waits for `isReady` before redirecting — prevents spurious redirects to `/login`

---

## How to Run (First Time)

```bash
# 1. Unzip the scaffold
unzip klaswerk-scaffold.zip
cd klaswerk

# 2. Install dependencies
npm install

# 3. Fill in public/config.js with your Supabase keys
# (use the Setup Wizard HTML or edit manually)

# 4. Run the dev server
npm run dev
# Opens http://localhost:5173
```

---

## What to Build Next Session

### Priority order:

1. **Supabase migration** — run `supabase/migrations/001_initial.sql` (the full schema from the dev brief). Also needs a database trigger to auto-create a row in `public.profiles` when `auth.users` gets a new entry.

2. **Courses page** — list view for trainers (with create button) and students (browse published). Uses `src/pages/Courses.tsx`.

3. **Course detail page** — lessons list, enrolment CTA, PayFast trigger if paid course.

4. **Dashboard stat cards** — wire the placeholder `—` values to real Supabase queries.

5. **Toast notification system** — global `useToast` hook + `<ToastContainer />` component placed in `AppShell`. Referenced in `src/types/index.ts` as `ToastMessage` but not yet implemented.

---

## Stub Pages (all return Placeholder)

These routes exist in `App.tsx` and need real page components:

- `/courses` — Courses list
- `/courses/:courseId` — Course detail
- `/courses/new` — Create course (trainer only)
- `/live` — Live sessions list
- `/live/:sessionId` — Session room (Whereby embed + chat)
- `/quizzes` — Quiz list
- `/quizzes/:quizId` — Quiz taking flow
- `/certificates` — Student certificate list
- `/analytics` — Trainer analytics (trainer only)
- `/profile` — Profile edit
- `/payment/return` — PayFast return handler
- `/payment/cancel` — PayFast cancel handler
- `/verify/:certificateNumber` — Public certificate verification

---

## Files Still Needed (future sessions)

| File | Session |
|------|---------|
| `supabase/migrations/001_initial.sql` | Next |
| `src/lib/payfast.ts` | PayFast session |
| `src/lib/r2.ts` | File upload session |
| `src/hooks/useCourse.ts` | Courses session |
| `src/hooks/useSession.ts` | Live session |
| `src/hooks/useChat.ts` | Live session |
| `src/hooks/useQuiz.ts` | Quiz session |
| `workers/payment-webhook/index.ts` | PayFast session |
| `workers/pptx-converter/index.ts` | Content session |

---

## Gotchas & Notes

- **Supabase profile trigger** — without a DB trigger, `public.profiles` won't auto-populate on sign-up. The `useAuth` hook's `fetchProfile` will return null. Add this trigger in the migration: `CREATE FUNCTION handle_new_user()` that inserts into `profiles` on `auth.users` insert.
- **Whereby embed URL** — the free plan gives one room. For multi-session support you'll need the Whereby API to create rooms programmatically (the `wherebyApiKey` in config supports this).
- **PayFast test mode** — `config.payfast.testMode: true` in the dev placeholder. The Setup Wizard defaults new clients to test mode. Don't forget to toggle before go-live.
- **`public/config.js` on Vercel/Netlify** — place the generated `config.js` in the `/public` folder before deploying. It serves as a static file. Do not commit it to the repo — set it via the host's file manager or deployment pipeline.
- **`@/` alias** — all imports use `@/` (e.g. `import { supabase } from '@/lib/supabase'`). VS Code resolves this via `tsconfig.json` paths. If IntelliSense breaks, restart the TS server.

---

## Session Deliverables

- `klaswerk-scaffold.zip` — full project scaffold, unzip and `npm install` to run
- `klaswerk-setup-wizard.html` — client config generator (Session 1)

---

*MD Works · Morney Deetlefs · South Africa*
*✦ Builder of useful things for real people ✦*
