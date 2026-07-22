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
