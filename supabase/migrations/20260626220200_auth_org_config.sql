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
