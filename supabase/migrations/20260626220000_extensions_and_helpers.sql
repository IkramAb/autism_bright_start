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
