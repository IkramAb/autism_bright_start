# Build Prompt: ABA Connect — Autism Bright Start Internal Management System

## Context

You are building a real, production-grade web application called **ABA Connect** — an internal management system for an ABA (Applied Behavior Analysis) therapy practice called Autism Bright Start. This is not a demo or a toy app. It will be used daily by a real admin to track client onboarding, staff onboarding, document renewals, and case note compliance.

A complete Product Requirements Document is attached/referenced as `autism-center-prd.md` (Version 2.0). **Read it fully before writing any code.** It is the single source of truth for every business rule, data model decision, and compliance constraint in this system. Do not invent alternative behavior for anything the PRD already specifies — if something is ambiguous or missing, ask rather than guess.

A working interactive HTML/CSS/JS prototype already exists (`aba-connect-prototype.html`) and has been validated with the client across many iterations. Use it as the **visual and UX reference** for every screen — exact layout, copy, color usage, component patterns, and interaction states should match it closely unless the PRD explicitly calls for something different. Do not redesign anything. Your job is to turn this prototype into a real, working, data-backed application — not to reimagine it.

## The single most important constraint: PHI minimization

This system is deliberately designed to **never store or display Protected Health Information (PHI)**. Read PRD Section 2 ("Compliance Architecture") closely and enforce it at the database and API level, not just the UI level:

- Clients are referenced **only** by an internal reference code (e.g. `Client #0142`) — never store real names, dates of birth, guardian contact info, diagnosis, or any clinical content anywhere in this system's database.
- Case note tracking stores **only submission status** (confirmed / missing / overridden) — never note content.
- All documents (including CMDE, ITP, IEP) live in **Google Drive only**. This system stores Drive file/folder links and status metadata — never the file content itself, and files never pass through this system's backend (see PRD 4.2.4 — uploads go directly device-to-Drive).
- "Go to Catalyst" buttons link only to Catalyst's generic login URL (`https://secure.datafinch.com/`) — Catalyst has no API and no record-level deep-linking (confirmed directly with their support team; do not attempt to build any Catalyst integration beyond this static link).
- Staff data (names, training, background checks) is HR data, not patient PHI, and is shown with full detail — the reference-code treatment applies to clients only.

If you ever find yourself about to add a field like `client_full_name`, `guardian_phone`, or `diagnosis` to the database schema, stop — that's a compliance violation of this system's core design. Re-read PRD Section 2.

## Tech stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Auth + Storage), self-hosted per PRD Section 5.1 — do not provision Supabase's managed cloud tier
- **Email:** Resend — PHI-free content only (see PRD 4.2.6); never include client reference codes alongside identifying context in an email if it could be combined to re-identify someone; keep all email copy generic ("You have items needing attention — log in to view")
- **E-signatures:** DocSeal (stub/mock the integration if no API key is provided — do not skip building the UI flow)
- **File storage:** Google Drive API (OAuth2) — folder auto-creation, direct-to-Drive uploads, Drive "Watch" webhooks for change detection (see PRD 4.2.5)
- **Hosting target:** Vercel (or Railway/Render as a fallback — see PRD 5.1)
- **Auth:** Supabase Auth, **admin role only** — staff do NOT get accounts in this system (PRD 4.4.4, 5.4). Do not build a staff login flow. The admin role itself supports multiple users: any existing admin can invite additional admins via Settings → Users (see prototype). Do not hardcode a single-admin assumption anywhere — there is exactly one admin today (Amal Abdi) but the system must support adding more without a code change.

## Build order — follow this sequence, do not jump ahead

Build and get fully working end-to-end (UI + data + interactions) **in this order**, confirming each phase works before moving to the next:

1. **Project scaffolding + Supabase schema.** Set up the Next.js project, connect Supabase, and create the full database schema reflecting every entity in PRD Section 4 (clients, client_documents, staff, staff_onboarding_items, pipeline_stages, case_note_schedule, case_note_checkoff, case_note_overrides, settings/config tables for renewal rules and notification preferences). Use the prototype's data shapes (visible in its embedded JS objects like `clientData`, `staffData`) as your field-naming reference.
2. **Auth + shell.** Admin login via Supabase Auth. Build the persistent sidebar/topbar shell matching the prototype exactly (nav groups: Overview, Clients, Staff, Settings — see prototype for exact item list and icons).
3. **Client Onboarding Pipeline** (PRD 4.1) — the kanban board, all 9 stages including CMDE Review, the Quick-Add referral modal, the escalating ITP reminder logic, the Corrections Requested flag, the Supporting Documents gate (with the Settings toggle to disable it).
4. **Client Records + Document Tracker** (PRD 4.2) — the client list/detail views, document status grid, Drive folder auto-creation on client creation, Drive webhook-based status detection, renewal reminder scheduling per PRD 4.2.6's table.
5. **Staff Directory + Staff Onboarding** (PRD 4.4) — the full expanded checklist (hiring paperwork, background study, Gusto setup, Google Workspace setup, all 7 required trainings, pairing training as global/one-time, Catalyst enrollment with the Drive-upload-triggered lock per PRD 4.4.3, MPSE/UMPI with its own timer).
6. **Training Tracker** (PRD Module 5) — flat all-staff view.
7. **Case Note Compliance** (PRD Module 6) — this is the most complex module. Build all three tabs: Weekly Schedule (with quick single-cell reassignment), Note Check-off (fixed 2-notes-per-day rule, the Override flow with reason logging, and the file-upload-based auto-check feature per PRD 4.6.5 — the upload parser should match columns `Student`, `Service Date`, `Session Time`, `User` and must discard any note-content columns immediately on parse, never persisting them), and Compliance View (the three-state grid: confirmed/missing/overridden).
8. **Settings** — all 7 sections per the prototype: Organization, Renewal rules (with custom interval support), Onboarding checklists (working add/edit/delete), Document gate toggle, Notifications (working recipient management), Integrations (real OAuth connect/disconnect for Drive/Workspace/DocSeal/Resend; Catalyst shown as informational-only, no connect button), Users.
9. **Dashboard** — build last, since it aggregates data from every other module. Match the prototype's stat cards, pipeline summary, document alerts, staff onboarding summary, and case notes weekly view exactly.

## Design system — match the prototype's tokens exactly

Pull the CSS custom properties directly from the prototype's `:root` block and translate them into a Tailwind theme config — do not invent new colors. Key discipline to preserve:

- **Brand color:** blue `#5889E0` — used only for primary actions, active nav state, links, brand mark. Never used as a "status."
- **Secondary accent:** pink `#FF737E` — used sparingly, not as a default decoration.
- **Status colors — exactly three, no more:** teal/green (success), amber (warning), coral/red (danger). Every status pill in the system maps to one of these three or to neutral gray — never invent a fourth status color.
- **Backgrounds:** light gray app background (`#F4F5F7`), white cards, white sidebar with a light-blue highlight (not solid fill) for the active nav item.
- Stat card numbers are always plain dark text — color lives only in the small sub-label and the thin progress bar beneath, never in the big number itself.
- Reference the prototype file directly for exact spacing, border-radius, font sizes (it uses DM Sans), and pill/badge component shapes.

## What NOT to build

- No client/family-facing portal (explicitly Phase 3 / undecided per PRD 6)
- No staff login flow or staff-facing dashboard — staff don't get accounts in this system at all (only admin authenticates, see Auth section above). This does **not** mean skip authentication — the system must require admin login to access anything; it means don't build a second, separate auth flow or UI surface for staff users.
- No Catalyst API integration of any kind — there is no API
- No storage of case note content — status only
- No storing of document files in this system's own database/storage — Drive only
- No SMS reminders (Phase 3)
- No payroll processing — Gusto stays external; this system only tracks *that* Gusto setup happened

## Before you start

1. Read `autism-center-prd.md` in full.
2. Open `aba-connect-prototype.html` and click through every page and interaction — this is your UX spec.
3. Confirm you understand the PHI-minimization constraint before writing the database schema — this is the one mistake that's expensive to unwind later.
4. List out the full database schema you intend to create and confirm it before generating migrations, so it can be reviewed against PRD Section 2 before any tables are created.

Ask clarifying questions about anything in the PRD's "Open Questions for Client" section (PRD 7) rather than guessing a default — those are genuinely unresolved with the client, not gaps in your context.
