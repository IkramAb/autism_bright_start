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
