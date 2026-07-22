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
