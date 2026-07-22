# ABA Connect — Autism Bright Start Internal Management System

Internal admin tool for an ABA therapy practice: client onboarding pipeline,
client document tracking, staff onboarding, training, and case-note compliance.

> Built from the validated prototype at `reference/aba-connect-prototype.html`.
> The build plan lives in `reference/cursor-claude-code-build-prompt.md`.

## ⚠️ Compliance: PHI minimization (read first)

This system **never stores Protected Health Information**. This is a hard
constraint enforced at the database and API level, not just the UI:

- **Clients** are referenced only by an internal `ref_code` (e.g. `Client #0142`).
  No names, DOB, guardian contact, diagnosis, or clinical content — ever.
  `age_label` is a coarse display string only (e.g. "Age 8"), never a DOB.
- **Documents** (CMDE, ITP, IEP, etc.) live in **Google Drive only**. This system
  stores Drive links + status metadata; file bytes never touch this backend.
- **Case notes** store submission *status only* (confirmed / missing / overridden),
  never note content. The Catalyst weekly export is matched on
  `Student / Service Date / Session Time / User` and note-content columns are
  discarded on parse and never persisted.
- **Catalyst** has no API: "Go to Catalyst" links to `https://secure.datafinch.com/`.
- **Staff** data is HR data (full detail allowed); the ref-code rule is clients-only.
- **Auth**: admins only. Staff do not get accounts. Multiple admins are supported.

If you are about to add a column like `client_full_name`, `guardian_phone`, or
`diagnosis` — stop. See the comment headers in the migration files.

## Tech stack

- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4
- Supabase (PostgreSQL + Auth + RLS) — self-hostable
- Resend (email, PHI-free), DocSeal (e-sign, stubbed), Google Drive API

## Project layout

```
src/
  app/                 # App Router pages (shell + modules — built phase by phase)
  lib/supabase/        # browser / server / service-role clients + generated types
  proxy.ts             # Supabase session refresh (Next 16 "proxy" convention)
supabase/
  migrations/          # full schema (PHI-safe) + RLS + config seed
  seed.sql             # LOCAL DEV demo data mirroring the prototype
reference/             # the validated prototype, build prompt, and (stale) v1 PRD
```

## Getting started

```bash
npm install
cp .env.example .env.local      # fill in values

# Database — requires a Docker-compatible runtime (Docker Desktop or Colima):
npm run db:start                # supabase start (prints local keys → put in .env.local)
npm run db:reset                # apply migrations + seed.sql
npm run db:types                # regenerate src/lib/supabase/types.ts from schema

npm run dev                     # http://localhost:3000
```

Local admin login (from `supabase/seed.sql`):
`amal@autismbrightstart.org` / `password123`

### No Docker runtime?

`supabase start` needs a container runtime. On macOS without Docker Desktop:
`brew install colima docker && colima start`, then `npm run db:start`.
Alternatively the migrations can be pushed to a hosted Supabase project with
`supabase link` + `supabase db push`.

## Build status

- [x] **Phase 1** — Scaffold + full Supabase schema (all entities, RLS, config + demo seed)
- [ ] Phase 2 — Auth + app shell
- [ ] Phase 3 — Client onboarding pipeline
- [ ] Phase 4 — Client records + document tracker
- [ ] Phase 5 — Staff directory + onboarding
- [ ] Phase 6 — Training tracker
- [ ] Phase 7 — Case note compliance
- [ ] Phase 8 — Settings
- [ ] Phase 9 — Dashboard
