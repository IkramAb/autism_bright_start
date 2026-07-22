-- ============================================================================
-- ABA Connect — replace coarse age with an operational service-start date
-- ----------------------------------------------------------------------------
-- age_label was a coarse, admin-entered display string. It is no longer used
-- by the application. service_start_on records the client's entry / start of
-- service date (operational, PHI-free — it is not a date of birth).
-- ============================================================================

alter table public.clients
  add column if not exists service_start_on date;

comment on column public.clients.service_start_on is
  'Entry / start-of-service date (operational, PHI-free). Not a date of birth.';
