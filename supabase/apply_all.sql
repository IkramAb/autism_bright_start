-- ============================================================
-- ABA Connect — combined schema + seed (paste into Supabase SQL Editor)
-- Generated Fri Jun 26 22:48:00 EAT 2026. Runs all migrations in order, then demo seed.
-- ============================================================


-- >>>>>>>>>>>>>>>>>>>> migrations/20260626220000_extensions_and_helpers.sql <<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- ABA Connect — extensions & shared helpers
-- ----------------------------------------------------------------------------
-- COMPLIANCE NOTE (read before adding any column anywhere in this schema):
-- This system never stores Protected Health Information (PHI). Clients are
-- referenced only by an internal reference code (e.g. "0142"). Never add real
-- names, dates of birth, guardian contact info, diagnosis, or any clinical /
-- case-note content. Documents live in Google Drive only — store links + status
-- metadata, never file bytes. Staff records are HR data and may hold full
-- detail; the reference-code treatment applies to CLIENTS only.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Generic updated_at maintenance trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- NOTE: is_admin() is defined in the auth/org migration, AFTER admin_users
-- exists, because Postgres validates SQL function bodies at creation time.

-- >>>>>>>>>>>>>>>>>>>> migrations/20260626220100_enums.sql <<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- ABA Connect — enumerated types
-- All status vocabularies map to the prototype's three status colors
-- (teal=success, amber=warning, coral=danger) or neutral gray at the UI layer.
-- ============================================================================

-- Admin users -----------------------------------------------------------------
create type admin_user_status as enum ('active', 'invited', 'disabled');

-- Renewal / interval config ---------------------------------------------------
create type interval_unit as enum ('day', 'week', 'month', 'year');
create type renewal_doc_type as enum (
  'cmde', 'itp', 'iep', 'wellness_assessment', 'transport_agreement'
);

-- Clients (PHI-free) ----------------------------------------------------------
create type aba_status as enum ('new', 'not_new', 'unknown');
create type referral_source as enum (
  'website', 'phone', 'email', 'provider', 'walk_in', 'other'
);
create type ma_status as enum ('verified', 'unverified', 'none', 'unknown');
create type client_status as enum (
  'active', 'onboarding', 'inactive', 'referred_out', 'closed'
);

create type client_doc_type as enum (
  'medical_documentation',
  'insurance_card',
  'food_allergies',
  'student_questionnaire',
  'roi',
  'discharge_doc',
  'medication_questionnaire',
  'prev_diagnostic',
  'cmde',
  'itp',
  'iep',
  'wellness_assessment',
  'parent_handbook',
  'service_agreement',
  'transport_agreement'
);

create type client_doc_status as enum (
  'missing',
  'requested',
  'uploaded',
  'submitted',
  'pending_approval',
  'approved',
  'signed',
  'awaiting_esig',
  'not_sent',
  'not_yet_created'
);

-- E-signatures ----------------------------------------------------------------
create type esign_doc_type as enum (
  'parent_handbook', 'service_agreement', 'transport_agreement', 'roi'
);
create type esign_status as enum ('not_sent', 'sent', 'viewed', 'signed', 'declined');

-- Staff (HR data) -------------------------------------------------------------
create type staff_status as enum (
  'onboarding', 'active', 'needs_action', 'fully_onboarded', 'inactive'
);
create type staff_checklist_group as enum (
  'hiring_paperwork',
  'background_study',
  'required_training',
  'global_one_time',
  'program_onboarding',
  'locked_needs_bg_check'
);
create type training_status as enum (
  'pending', 'in_progress', 'complete', 'overdue', 'upcoming'
);
create type background_step as enum (
  'step1_application', 'step2_fingerprinting', 'step3_approval', 'study_number'
);
create type background_status as enum (
  'pending', 'in_progress', 'complete', 'overdue', 'blocked', 'logged', 'not_assigned'
);
create type staff_doc_status as enum ('missing', 'pending', 'uploaded');

-- Case note compliance --------------------------------------------------------
create type session_period as enum ('am', 'pm');
create type schedule_status as enum ('assigned', 'covering', 'unassigned', 'no_session');
create type checkoff_status as enum (
  'pending', 'confirmed', 'missing', 'overridden', 'not_applicable'
);
create type checkoff_source as enum ('manual', 'upload');
create type override_reason as enum (
  'cancelled_absent',
  'bt_sick_no_coverage',
  'pending_bcba_review',
  'clinic_closure',
  'other'
);
create type compliance_week_status as enum ('open', 'finalized');

-- Integrations & notifications ------------------------------------------------
create type integration_service as enum ('drive', 'gmail_workspace', 'docseal', 'resend');
create type integration_status as enum ('connected', 'not_connected', 'error');
create type notification_type as enum (
  'document_expiring',
  'itp_drafting_reminder',
  'missing_case_note',
  'weekly_compliance_report',
  'staff_training_uploaded',
  'new_referral'
);
create type recipient_target as enum ('admin_user', 'email', 'assigned_bt_plus_admin');

-- >>>>>>>>>>>>>>>>>>>> migrations/20260626220200_auth_org_config.sql <<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- ABA Connect — admin users, organization profile, and configuration tables
-- ============================================================================

-- Admin users -----------------------------------------------------------------
-- The ONLY accounts in this system. Multiple admins are supported from day one;
-- never hardcode a single-admin assumption. Linked 1:1 to Supabase auth.users.
create table public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null default 'admin',
  sidebar_role_label text not null default 'Admin',
  avatar_initials text,
  status admin_user_status not null default 'active',
  invited_by uuid references public.admin_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_admin_users_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

-- True when the current authenticated user is an active admin. This is the ONLY
-- role that can access the system (staff do not get accounts). Used by RLS.
-- Defined here (not in the first migration) so admin_users already exists.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.id = auth.uid()
      and a.status = 'active'
  );
$$;

-- Organization profile (singleton) -------------------------------------------
-- Includes org-level toggles surfaced in Settings:
--   document_gate_enabled   — block Agreements stage until supporting docs confirmed
--   itp_weekly_repeat_enabled — keep reminding weekly after the 2nd ITP notice
create table public.organization_settings (
  id boolean primary key default true,
  practice_name text not null default 'Autism Bright Start',
  address text,
  phone text,
  timezone text not null default 'America/Chicago',
  document_gate_enabled boolean not null default true,
  itp_weekly_repeat_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint organization_settings_singleton check (id)
);
create trigger trg_org_settings_updated_at
  before update on public.organization_settings
  for each row execute function public.set_updated_at();

-- Pipeline stage definitions (config) ----------------------------------------
create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  advance_trigger text,
  sort_order int not null,
  is_terminal boolean not null default false,
  created_at timestamptz not null default now()
);

-- Document renewal rules (config) --------------------------------------------
-- Supports preset and custom intervals plus a reminder lead time per document.
create table public.renewal_rules (
  id uuid primary key default gen_random_uuid(),
  document_type renewal_doc_type not null unique,
  interval_count int not null,
  interval_unit interval_unit not null,
  reminder_lead_count int not null,
  reminder_lead_unit interval_unit not null,
  updated_at timestamptz not null default now()
);
create trigger trg_renewal_rules_updated_at
  before update on public.renewal_rules
  for each row execute function public.set_updated_at();

-- Staff onboarding checklist template (config) -------------------------------
create table public.staff_checklist_template (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  checklist_group staff_checklist_group not null,
  sort_order int not null,
  is_training boolean not null default false,
  is_global_one_time boolean not null default false,
  default_due_offset_days int,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_staff_template_updated_at
  before update on public.staff_checklist_template
  for each row execute function public.set_updated_at();

-- Notification preferences + recipients (config) ------------------------------
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  notification_type notification_type not null unique,
  cadence_label text not null,
  updated_at timestamptz not null default now()
);
create trigger trg_notif_prefs_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

create table public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  notification_preference_id uuid not null
    references public.notification_preferences (id) on delete cascade,
  target_type recipient_target not null,
  admin_user_id uuid references public.admin_users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  constraint recipient_shape check (
    (target_type = 'admin_user' and admin_user_id is not null and email is null)
    or (target_type = 'email' and email is not null and admin_user_id is null)
    or (target_type = 'assigned_bt_plus_admin' and admin_user_id is null and email is null)
  )
);

-- Integrations (config) -------------------------------------------------------
-- Catalyst is intentionally NOT represented here as a connectable integration:
-- it has no API and is shown as informational-only in the UI.
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  service integration_service not null unique,
  status integration_status not null default 'not_connected',
  connected_account_email text,
  connected_at timestamptz,
  updated_at timestamptz not null default now()
);
create trigger trg_integrations_updated_at
  before update on public.integrations
  for each row execute function public.set_updated_at();

-- OAuth / API credentials kept separate from the display row above. Service-role
-- only (no admin RLS policy is granted) so secrets never reach the browser.
create table public.integration_credentials (
  service integration_service primary key
    references public.integrations (service) on delete cascade,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scope text,
  updated_at timestamptz not null default now()
);
create trigger trg_integration_creds_updated_at
  before update on public.integration_credentials
  for each row execute function public.set_updated_at();

-- >>>>>>>>>>>>>>>>>>>> migrations/20260626220300_staff.sql <<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- ABA Connect — staff directory & onboarding (HR data, full detail allowed)
-- Staff do NOT get system accounts. These rows are managed by admins only.
-- File uploads (certs, HR docs) live in Google Drive — store links, never bytes.
-- ============================================================================

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text not null,                 -- display role, e.g. "RBT", "BCBA / QSP"
  role_type text,                     -- coarse grouping, e.g. "rbt", "bcba"
  email text,
  phone text,
  hired_on date,
  status staff_status not null default 'onboarding',
  background_study_number text,
  bcba_cert_number text,
  avatar_initials text,
  avatar_bg text,                     -- token name for initials chip background
  avatar_color text,
  notes text,
  drive_folder_id text,
  drive_folder_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_staff_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();

-- Per-staff onboarding checklist items (snapshot of template at assignment time).
create table public.staff_onboarding_items (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  template_item_id uuid references public.staff_checklist_template (id) on delete set null,
  label text not null,
  checklist_group staff_checklist_group not null,
  sort_order int not null default 0,
  done boolean not null default false,
  completed_on date,
  due_on date,
  locked boolean not null default false,
  lock_reason text,
  blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_staff_onboarding_updated_at
  before update on public.staff_onboarding_items
  for each row execute function public.set_updated_at();
create index idx_staff_onboarding_staff on public.staff_onboarding_items (staff_id);

-- The 7 required trainings tracked per staff (Training Tracker = flat all-staff view).
create table public.staff_trainings (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  name text not null,
  status training_status not null default 'pending',
  due_on date,
  completed_on date,
  cert_drive_file_id text,
  cert_drive_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_staff_trainings_updated_at
  before update on public.staff_trainings
  for each row execute function public.set_updated_at();
create index idx_staff_trainings_staff on public.staff_trainings (staff_id);

-- Pairing training is global/one-time for the whole org (not per staff).
create table public.global_training_status (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,           -- e.g. 'pairing_training'
  name text not null,
  completed boolean not null default false,
  completed_on date,
  completed_by uuid references public.admin_users (id),
  updated_at timestamptz not null default now()
);
create trigger trg_global_training_updated_at
  before update on public.global_training_status
  for each row execute function public.set_updated_at();

-- Background study steps (3 steps + the logged study number).
create table public.staff_background_checks (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  step background_step not null,
  status background_status not null default 'pending',
  completed_on date,
  note text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, step)
);
create trigger trg_staff_bg_updated_at
  before update on public.staff_background_checks
  for each row execute function public.set_updated_at();

-- HR documents (offer letter, I-9, W-4, certs). Drive links + status only.
create table public.staff_documents (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  name text not null,
  status staff_doc_status not null default 'missing',
  submitted_on date,
  drive_file_id text,
  drive_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_staff_documents_updated_at
  before update on public.staff_documents
  for each row execute function public.set_updated_at();
create index idx_staff_documents_staff on public.staff_documents (staff_id);

-- >>>>>>>>>>>>>>>>>>>> migrations/20260626220400_clients.sql <<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- ABA Connect — clients, pipeline history, documents, e-signatures
-- ----------------------------------------------------------------------------
-- PHI MINIMIZATION IS ENFORCED HERE. A client is identified ONLY by ref_code.
-- age_label is a coarse, admin-entered display string (e.g. "Age 8") — never a
-- date of birth. There is intentionally no column for client name, DOB, guardian
-- contact, diagnosis, or any clinical content. Documents store Drive links +
-- status metadata only. If you are tempted to add such a column: stop.
-- ============================================================================

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  ref_code text not null unique,          -- e.g. "0142" (rendered as "Client #0142")
  age_label text,                         -- deprecated; kept for back-compat, unused by the app
  service_start_on date,                  -- entry / start-of-service date (PHI-free; not a DOB)
  aba_status aba_status not null default 'unknown',
  referral_source referral_source,
  ma_status ma_status not null default 'unknown',
  assigned_bcba_id uuid references public.staff (id) on delete set null,
  current_stage_id uuid references public.pipeline_stages (id),
  status client_status not null default 'onboarding',
  corrections_requested boolean not null default false,

  -- Pipeline timer anchors (dates only; turnaround windows are computed in app).
  phone_screen_due_on date,
  cmde_submitted_on date,                 -- starts the 5-day CMDE window
  itp_submitted_on date,                  -- starts the 14-day ITP approval window
  itp_drafting_started_on date,           -- drives escalating ITP drafting reminders

  -- Referral auto-assignment: the admin who worked the referral is logged here.
  handled_by_admin_id uuid references public.admin_users (id) on delete set null,

  -- Google Drive folder for this client (links only; no files in this system).
  drive_folder_id text,
  drive_folder_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();
create index idx_clients_stage on public.clients (current_stage_id);
create index idx_clients_status on public.clients (status);

-- Stage history log with timestamps.
create table public.client_stage_history (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  stage_id uuid not null references public.pipeline_stages (id),
  entered_at timestamptz not null default now(),
  changed_by uuid references public.admin_users (id) on delete set null,
  note text
);
create index idx_stage_history_client on public.client_stage_history (client_id);

-- Operational, PHI-free admin notes. The UI must remind admins to keep these
-- free of any identifying or clinical information.
create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  body text not null,
  created_by uuid references public.admin_users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_client_notes_client on public.client_notes (client_id);

-- Per-client document tracker. Status + Drive links + expiry only.
-- "Expiring soon" / "Up to date" / "Overdue" are DERIVED from expires_on and the
-- matching renewal_rule at read time — they are not stored as status values.
create table public.client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  doc_type client_doc_type not null,
  status client_doc_status not null default 'missing',
  uploaded_on date,
  expires_on date,
  drive_file_id text,
  drive_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, doc_type)
);
create trigger trg_client_documents_updated_at
  before update on public.client_documents
  for each row execute function public.set_updated_at();
create index idx_client_documents_client on public.client_documents (client_id);
create index idx_client_documents_expires on public.client_documents (expires_on);

-- E-signature requests (DocSeal). The recipient's email is supplied at send-time
-- and passed straight to the provider — it is intentionally NOT persisted here,
-- because guardian contact info is PHI.
create table public.esign_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  document_type esign_doc_type not null,
  provider text not null default 'docseal',
  external_id text,
  status esign_status not null default 'not_sent',
  sent_at timestamptz,
  signed_at timestamptz,
  signed_drive_file_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_esign_requests_updated_at
  before update on public.esign_requests
  for each row execute function public.set_updated_at();
create index idx_esign_client on public.esign_requests (client_id);

-- Google Drive "Watch" channels for folder change detection (status sync).
create table public.drive_watch_channels (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  channel_id text not null unique,
  resource_id text not null,
  resource_uri text,
  expiration timestamptz,
  created_at timestamptz not null default now()
);

-- >>>>>>>>>>>>>>>>>>>> migrations/20260626220500_casenotes.sql <<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- ABA Connect — case note compliance (status only, NEVER note content)
-- ----------------------------------------------------------------------------
-- This module records ONLY whether a note was submitted in Catalyst — never what
-- it said. The weekly Catalyst export is matched on Student / Service Date /
-- Session Time / User and any note-content columns are discarded on parse and
-- never persisted. Only match counts are kept for audit.
-- ============================================================================

create table public.compliance_weeks (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,     -- Monday
  week_end date not null,              -- Friday
  status compliance_week_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_compliance_weeks_updated_at
  before update on public.compliance_weeks
  for each row execute function public.set_updated_at();

-- Weekly schedule = the source of truth for who is assigned to whom. Everything
-- downstream (check-off + compliance) reads from this. One row per session slot.
create table public.bt_schedule_assignments (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.compliance_weeks (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  session_date date not null,
  session_period session_period not null,
  assigned_staff_id uuid references public.staff (id) on delete set null,
  status schedule_status not null default 'assigned',
  covering_for_staff_id uuid references public.staff (id) on delete set null,
  updated_by uuid references public.admin_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_id, client_id, session_date, session_period)
);
create trigger trg_schedule_updated_at
  before update on public.bt_schedule_assignments
  for each row execute function public.set_updated_at();
create index idx_schedule_week on public.bt_schedule_assignments (week_id);

-- Catalyst export uploads. Filename + counts only — no parsed rows, no content.
create table public.catalyst_uploads (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.compliance_weeks (id) on delete cascade,
  file_name text not null,
  uploaded_by uuid references public.admin_users (id) on delete set null,
  uploaded_at timestamptz not null default now(),
  rows_total int not null default 0,
  rows_matched int not null default 0
);
create index idx_catalyst_uploads_week on public.catalyst_uploads (week_id);

-- One row per required note: every client needs 2 notes/day when sessions exist
-- (slot 1 = AM, slot 2 = PM). status is the three-state model plus pending/n-a.
create table public.case_note_checkoffs (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.compliance_weeks (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  session_date date not null,
  slot smallint not null check (slot in (1, 2)),
  session_period session_period not null,
  assigned_staff_id uuid references public.staff (id) on delete set null,
  status checkoff_status not null default 'pending',
  session_time_range text,             -- e.g. "07:30 AM – 12:30 PM" (times only)
  confirmed_via checkoff_source,
  matched_upload_id uuid references public.catalyst_uploads (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (week_id, client_id, session_date, slot)
);
create trigger trg_checkoffs_updated_at
  before update on public.case_note_checkoffs
  for each row execute function public.set_updated_at();
create index idx_checkoffs_week on public.case_note_checkoffs (week_id);

-- Override = admin logged a reason instead of a checkmark. Counts as resolved.
create table public.case_note_overrides (
  id uuid primary key default gen_random_uuid(),
  checkoff_id uuid not null references public.case_note_checkoffs (id) on delete cascade,
  reason_code override_reason not null,
  reason_note text,
  logged_by uuid references public.admin_users (id) on delete set null,
  logged_at timestamptz not null default now()
);
create index idx_overrides_checkoff on public.case_note_overrides (checkoff_id);

-- Optional PHI-free audit of outbound notifications (Resend) + dashboard alerts.
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  notification_type notification_type not null,
  status text not null default 'sent',
  detail text,
  sent_at timestamptz not null default now()
);

-- >>>>>>>>>>>>>>>>>>>> migrations/20260626220600_rls.sql <<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- ABA Connect — Row Level Security
-- Only active admins (is_admin()) may touch application data. Staff have no
-- accounts. Secrets (integration_credentials) get RLS with NO policy, so they
-- are reachable by the service role only and never by the browser.
-- ============================================================================

do $$
declare
  t text;
  admin_tables text[] := array[
    'admin_users',
    'organization_settings',
    'pipeline_stages',
    'renewal_rules',
    'staff_checklist_template',
    'notification_preferences',
    'notification_recipients',
    'integrations',
    'staff',
    'staff_onboarding_items',
    'staff_trainings',
    'global_training_status',
    'staff_background_checks',
    'staff_documents',
    'clients',
    'client_stage_history',
    'client_notes',
    'client_documents',
    'esign_requests',
    'drive_watch_channels',
    'compliance_weeks',
    'bt_schedule_assignments',
    'catalyst_uploads',
    'case_note_checkoffs',
    'case_note_overrides',
    'notification_log'
  ];
begin
  foreach t in array admin_tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      t
    );
  end loop;
end
$$;

-- Secrets: RLS on, no policy. Service role bypasses RLS; nobody else gets in.
alter table public.integration_credentials enable row level security;

-- >>>>>>>>>>>>>>>>>>>> migrations/20260626220700_seed_config.sql <<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- ABA Connect — configuration / reference data (required in every environment)
-- This is NOT demo data. Demo clients/staff/case notes live in supabase/seed.sql
-- (local dev only). Everything here is structural defaults the app relies on.
-- ============================================================================

-- Organization singleton -----------------------------------------------------
insert into public.organization_settings (id, practice_name, address, phone, timezone)
values (
  true,
  'Autism Bright Start',
  '321 Wilson St NE, Ste 200, Minneapolis, MN 55413',
  '(612) 555-0100',
  'America/Chicago'
)
on conflict (id) do nothing;

-- Pipeline stages (8 canonical) ----------------------------------------------
insert into public.pipeline_stages (key, name, advance_trigger, sort_order, is_terminal) values
  ('new_referral',   'New Referral',    'Phone screen completed + MA verified',          1, false),
  ('phone_screen',   'Phone Screen',    'New vs. not new ABA determined',                2, false),
  ('docs_collection','Docs Collection', 'All required intake documents uploaded',        3, false),
  ('cmde_submitted', 'CMDE Submitted',  'CMDE approval received (5-day window)',          4, false),
  ('cmde_review',    'CMDE Review',      'Admin/BCBA reviewed recommended services',      5, false),
  ('itp_creation',   'ITP Creation',    'ITP drafted and submitted',                     6, false),
  ('agreements',     'Agreements',      'Parent handbook + service agreement signed',    7, false),
  ('active',         'Active',          'Terminal stage — receiving services',           8, true)
on conflict (key) do nothing;

-- Renewal rules --------------------------------------------------------------
insert into public.renewal_rules
  (document_type, interval_count, interval_unit, reminder_lead_count, reminder_lead_unit) values
  ('cmde',                3, 'year',  1, 'month'),
  ('itp',                 6, 'month', 1, 'month'),
  ('iep',                 6, 'month', 1, 'month'),
  ('wellness_assessment', 1, 'year',  1, 'month'),
  ('transport_agreement', 1, 'year',  2, 'week')
on conflict (document_type) do nothing;

-- Staff onboarding checklist template ----------------------------------------
insert into public.staff_checklist_template
  (name, checklist_group, sort_order, is_training, is_global_one_time, default_due_offset_days) values
  -- Hiring paperwork
  ('Signed offer letter',                    'hiring_paperwork', 10, false, false, null),
  ('I-9 employment verification',            'hiring_paperwork', 20, false, false, null),
  ('W-4 tax withholding form',               'hiring_paperwork', 30, false, false, null),
  ('Direct deposit info',                    'hiring_paperwork', 40, false, false, null),
  ('Employee handbook acknowledgement',      'hiring_paperwork', 50, false, false, null),
  ('Confidentiality / policy agreements',    'hiring_paperwork', 60, false, false, null),
  -- Background study
  ('Background check step 1',                'background_study', 70, false, false, null),
  ('Background check step 2',                'background_study', 80, false, false, null),
  ('Background check step 3',                'background_study', 90, false, false, null),
  -- Program onboarding / access
  ('DHS training',                           'program_onboarding', 100, false, false, null),
  ('Gusto enrollment',                       'program_onboarding', 110, false, false, null),
  ('Google Workspace account',               'program_onboarding', 120, false, false, null),
  ('DHS provider enrollment',                'program_onboarding', 130, false, false, 30),
  ('Service authorization',                  'program_onboarding', 140, false, false, null),
  ('MPSE / UMPI enrollment (if applicable)', 'program_onboarding', 150, false, false, 30),
  -- Required training (the 7)
  ('RBT 40-hour training',                       'required_training', 160, true, false, 60),
  ('EIDBI 101',                                  'required_training', 170, true, false, null),
  ('Cultural Responsiveness in ASD Services',    'required_training', 180, true, false, null),
  ('Vulnerable adults training',                 'required_training', 190, true, false, null),
  ('Mandated reporter training',                 'required_training', 200, true, false, null),
  ('ADS strategy training',                      'required_training', 210, true, false, null),
  ('Company orientation',                        'required_training', 220, true, false, null),
  -- Global, one-time
  ('Pairing training',                       'global_one_time', 230, true, true, null),
  -- Locked until background check complete
  ('Catalyst enrollment',                    'locked_needs_bg_check', 240, false, false, null);

-- Global one-time training status --------------------------------------------
insert into public.global_training_status (key, name, completed) values
  ('pairing_training', 'Pairing training', false)
on conflict (key) do nothing;

-- Notification types ---------------------------------------------------------
insert into public.notification_preferences (notification_type, cadence_label) values
  ('document_expiring',        'Per renewal schedule'),
  ('itp_drafting_reminder',    '1wk, 2wk, then weekly'),
  ('missing_case_note',        'After weekly check-off'),
  ('weekly_compliance_report', 'Every Monday, 8am'),
  ('staff_training_uploaded',  'Immediate'),
  ('new_referral',             'Immediate')
on conflict (notification_type) do nothing;

-- Missing case-note alerts always include the assigned BT + their admin.
insert into public.notification_recipients (notification_preference_id, target_type)
select id, 'assigned_bt_plus_admin'
from public.notification_preferences
where notification_type = 'missing_case_note';

-- Integrations (connectable services; Catalyst is intentionally excluded) -----
insert into public.integrations (service, status) values
  ('drive',           'not_connected'),
  ('gmail_workspace', 'not_connected'),
  ('docseal',         'not_connected'),
  ('resend',          'not_connected')
on conflict (service) do nothing;

insert into public.integration_credentials (service) values
  ('drive'), ('gmail_workspace'), ('docseal'), ('resend')
on conflict (service) do nothing;

-- >>>>>>>>>>>>>>>>>>>> seed.sql <<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- ABA Connect — LOCAL DEV seed data (mirrors the validated prototype).
-- This file runs only on `supabase db reset` for local development. It is NOT
-- production data. It still respects PHI minimization: clients are ref-code only.
-- Local admin login:  amal@autismbrightstart.org  /  password123
-- ============================================================================

-- ── Admin user (local auth) ─────────────────────────────────────────────────
-- Token columns must be '' (not NULL): GoTrue scans them into Go strings and
-- NULLs cause "Database error querying schema" on login.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-0000000000a1',
  'authenticated', 'authenticated',
  'amal@autismbrightstart.org',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Amal Abdi"}',
  now(), now(),
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  'a0000000-0000-0000-0000-0000000000a1',
  jsonb_build_object('sub','a0000000-0000-0000-0000-0000000000a1','email','amal@autismbrightstart.org'),
  'email',
  'a0000000-0000-0000-0000-0000000000a1',
  now(), now(), now()
) on conflict do nothing;

insert into public.admin_users (id, full_name, email, role, sidebar_role_label, avatar_initials, status)
values (
  'a0000000-0000-0000-0000-0000000000a1',
  'Amal Abdi', 'amal@autismbrightstart.org', 'admin', 'Admin / BCBA', 'AA', 'active'
) on conflict (id) do nothing;

-- Default notification recipient = Amal for the admin-targeted notifications.
insert into public.notification_recipients (notification_preference_id, target_type, admin_user_id)
select p.id, 'admin_user', 'a0000000-0000-0000-0000-0000000000a1'
from public.notification_preferences p
where p.notification_type in (
  'document_expiring','itp_drafting_reminder','weekly_compliance_report',
  'staff_training_uploaded','new_referral'
);

-- Sample/demo data (staff, clients, schedule, case notes) intentionally omitted.
-- The system starts empty except for the admin login and required config above.


-- >>>>>>>>>>>>>>>>>>>> migrations/20260722190000_branding_logo.sql <<<<<<<<<<<<<<<<<<<<

-- Practice branding (logo) — public Storage bucket + policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding',
  'branding',
  true,
  2097152, -- 2 MB
  array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists branding_public_read on storage.objects;
create policy branding_public_read on storage.objects
  for select
  using (bucket_id = 'branding');

drop policy if exists branding_admin_write on storage.objects;
create policy branding_admin_write on storage.objects
  for all
  to authenticated
  using (bucket_id = 'branding' and public.is_admin())
  with check (bucket_id = 'branding' and public.is_admin());
