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

-- Mark integrations connected for the demo environment.
update public.integrations
set status = 'connected',
    connected_account_email = 'admin@autismbrightstart.org',
    connected_at = now()
where service in ('drive','gmail_workspace','docseal','resend');

-- ── Staff (HR data) ─────────────────────────────────────────────────────────
insert into public.staff
  (id, full_name, role, role_type, email, phone, hired_on, status,
   background_study_number, bcba_cert_number, avatar_initials, avatar_bg, avatar_color, notes)
values
  ('5a000000-0000-0000-0000-000000000001'::uuid, 'Jordan Kim', 'RBT', 'rbt',
   'jordan.kim@abaconnect.org', '(612) 555-0701', '2026-05-12', 'onboarding',
   null, null, 'JK', 'teal-light', 'teal-dark',
   'May 12 — New hire. Background checks complete. Awaiting RBT 40hr training completion before client assignment.'),
  ('5a000000-0000-0000-0000-000000000002'::uuid, 'Tanya Williams', 'RBT', 'rbt',
   'tanya.williams@abaconnect.org', '(612) 555-0812', '2026-04-03', 'fully_onboarded',
   '#MN-2026-0389', null, 'TW', 'blue-light', 'blue-dark',
   'Apr 3 — Fully onboarded. All trainings complete. Assigned to active caseload.'),
  ('5a000000-0000-0000-0000-000000000003'::uuid, 'Rafael Nguyen', 'RBT', 'rbt',
   'rafael.nguyen@abaconnect.org', '(612) 555-0923', '2026-06-02', 'needs_action',
   null, null, 'RN', 'amber-light', 'amber-dark',
   'Jun 2 — Background check step 2 not completed on time. Follow up immediately. DHS enrollment deadline Jul 2.'),
  ('5a000000-0000-0000-0000-000000000004'::uuid, 'Kim Wallace', 'RBT', 'rbt',
   'kim.wallace@abaconnect.org', '(612) 555-0344', '2026-02-14', 'active',
   '#MN-2026-0217', null, 'KW', 'pink-light', 'pink-dark',
   'Feb 14 — Fully onboarded. Active caseload. RBT certification current.'),
  ('5a000000-0000-0000-0000-000000000005'::uuid, 'Raj Thompson', 'BCBA / QSP', 'bcba',
   'raj.thompson@abaconnect.org', '(612) 555-0556', '2025-01-06', 'active',
   '#MN-2025-0099', '#1-26-24391', 'RT', 'teal-light', 'teal-dark',
   'Jan 2025 — Senior BCBA. Supervises all RBTs. BCBA certification current through Dec 2027.')
on conflict (id) do nothing;

-- Onboarding checklist items: clone the template for every staff member.
insert into public.staff_onboarding_items
  (staff_id, template_item_id, label, checklist_group, sort_order)
select s.id, t.id, t.name, t.checklist_group, t.sort_order
from public.staff s
cross join public.staff_checklist_template t;

-- Fully-onboarded staff: mark everything done.
update public.staff_onboarding_items i
set done = true, completed_on = s.hired_on
from public.staff s
where i.staff_id = s.id
  and s.status in ('fully_onboarded', 'active');

-- Jordan (onboarding in progress): paperwork/background/access done; trainings pending.
update public.staff_onboarding_items
set done = true, completed_on = '2026-05-20'
where staff_id = '5a000000-0000-0000-0000-000000000001'::uuid
  and checklist_group in ('hiring_paperwork', 'background_study')
   or (staff_id = '5a000000-0000-0000-0000-000000000001'::uuid
       and label in ('DHS training','Gusto enrollment','Google Workspace account','Catalyst enrollment'));
update public.staff_onboarding_items
set due_on = '2026-06-28'
where staff_id = '5a000000-0000-0000-0000-000000000001'::uuid and label = 'RBT 40-hour training';
update public.staff_onboarding_items
set due_on = '2026-07-01'
where staff_id = '5a000000-0000-0000-0000-000000000001'::uuid and label = 'DHS provider enrollment';
update public.staff_onboarding_items
set due_on = '2026-07-12'
where staff_id = '5a000000-0000-0000-0000-000000000001'::uuid and label = 'MPSE / UMPI enrollment (if applicable)';

-- Rafael (needs action): step 1 done, step 2 overdue, Catalyst locked.
update public.staff_onboarding_items
set done = true, completed_on = '2026-06-03'
where staff_id = '5a000000-0000-0000-0000-000000000003'::uuid
  and label in ('Background check step 1','DHS training','Gusto enrollment');
update public.staff_onboarding_items
set locked = true, lock_reason = 'Upload background check documents to Rafael''s Drive folder to unlock'
where staff_id = '5a000000-0000-0000-0000-000000000003'::uuid and label = 'Catalyst enrollment';
update public.staff_onboarding_items
set blocked = true
where staff_id = '5a000000-0000-0000-0000-000000000003'::uuid and label = 'Background check step 3';
update public.staff_onboarding_items
set due_on = '2026-07-02'
where staff_id = '5a000000-0000-0000-0000-000000000003'::uuid and label = 'DHS provider enrollment';

-- Background check steps per staff.
insert into public.staff_background_checks (staff_id, step, status, completed_on, note, sort_order) values
  ('5a000000-0000-0000-0000-000000000001'::uuid, 'step1_application',   'complete', '2026-05-13', null, 1),
  ('5a000000-0000-0000-0000-000000000001'::uuid, 'step2_fingerprinting','complete', '2026-05-16', null, 2),
  ('5a000000-0000-0000-0000-000000000001'::uuid, 'step3_approval',      'complete', '2026-05-20', null, 3),
  ('5a000000-0000-0000-0000-000000000001'::uuid, 'study_number',        'logged',   null, '#MN-2026-0442', 4),
  ('5a000000-0000-0000-0000-000000000003'::uuid, 'step1_application',   'complete', '2026-06-03', null, 1),
  ('5a000000-0000-0000-0000-000000000003'::uuid, 'step2_fingerprinting','overdue',  null, 'Due Jun 9 — not done', 2),
  ('5a000000-0000-0000-0000-000000000003'::uuid, 'step3_approval',      'blocked',  null, 'Awaiting step 2', 3),
  ('5a000000-0000-0000-0000-000000000003'::uuid, 'study_number',        'not_assigned', null, '—', 4),
  ('5a000000-0000-0000-0000-000000000002'::uuid, 'step3_approval',      'complete', '2026-04-10', null, 3),
  ('5a000000-0000-0000-0000-000000000002'::uuid, 'study_number',        'logged',   null, '#MN-2026-0389', 4),
  ('5a000000-0000-0000-0000-000000000004'::uuid, 'study_number',        'logged',   null, '#MN-2026-0217', 4),
  ('5a000000-0000-0000-0000-000000000005'::uuid, 'study_number',        'logged',   null, '#MN-2025-0099', 4)
on conflict (staff_id, step) do nothing;

-- Required trainings per staff (the 7), seeded from template.
insert into public.staff_trainings (staff_id, name, status)
select s.id, t.name, 'pending'
from public.staff s
cross join public.staff_checklist_template t
where t.checklist_group = 'required_training';

update public.staff_trainings st
set status = 'complete', completed_on = s.hired_on, due_on = s.hired_on + 30
from public.staff s
where st.staff_id = s.id and s.status in ('fully_onboarded','active');

update public.staff_trainings
set status = 'in_progress', due_on = '2026-06-28'
where staff_id = '5a000000-0000-0000-0000-000000000001'::uuid and name = 'RBT 40-hour training';

-- ── Clients (PHI-free; ref code only) ───────────────────────────────────────
-- stage keys: new_referral, phone_screen, docs_collection, cmde_submitted,
--             cmde_review, itp_creation, agreements, active
insert into public.clients
  (id, ref_code, age_label, aba_status, referral_source, ma_status, status,
   current_stage_id, corrections_requested, cmde_submitted_on, itp_submitted_on,
   phone_screen_due_on)
values
  ('c0000000-0000-0000-0000-000000000142'::uuid, '0142', 'Age 8', 'not_new', 'website',  'verified', 'onboarding',
   (select id from public.pipeline_stages where key='itp_creation'),   true,  null, '2026-06-01', null),
  ('c0000000-0000-0000-0000-000000000155'::uuid, '0155', 'Age 8', 'not_new', 'provider', 'verified', 'onboarding',
   (select id from public.pipeline_stages where key='cmde_submitted'), false, '2026-06-10', null, null),
  ('c0000000-0000-0000-0000-000000000188'::uuid, '0188', 'Age 7', 'new',     'email',    'verified', 'onboarding',
   (select id from public.pipeline_stages where key='docs_collection'),false, null, null, null),
  ('c0000000-0000-0000-0000-000000000167'::uuid, '0167', 'Age 9', 'not_new', 'provider', 'verified', 'active',
   (select id from public.pipeline_stages where key='active'),         false, null, null, null),
  ('c0000000-0000-0000-0000-000000000192'::uuid, '0192', 'Age 9', 'unknown', 'website',  'unknown',  'onboarding',
   (select id from public.pipeline_stages where key='new_referral'),   false, null, null, '2026-06-15'),
  ('c0000000-0000-0000-0000-000000000193'::uuid, '0193', 'Age 6', 'unknown', 'phone',    'unknown',  'onboarding',
   (select id from public.pipeline_stages where key='new_referral'),   false, null, null, '2026-06-13'),
  ('c0000000-0000-0000-0000-000000000177'::uuid, '0177', 'Age 10','not_new', 'provider', 'verified', 'onboarding',
   (select id from public.pipeline_stages where key='agreements'),     false, null, '2026-06-09', null)
on conflict (id) do nothing;

insert into public.client_notes (client_id, body, created_by) values
  ('c0000000-0000-0000-0000-000000000142'::uuid, 'Jun 10 — ITP submitted to payer, awaiting approval. Prefers morning sessions.', 'a0000000-0000-0000-0000-0000000000a1'),
  ('c0000000-0000-0000-0000-000000000155'::uuid, 'Jun 10 — CMDE submitted to third party. Prefers afternoon sessions.', 'a0000000-0000-0000-0000-0000000000a1');

-- Client documents (status + Drive metadata only).
insert into public.client_documents (client_id, doc_type, status, uploaded_on, expires_on) values
  -- 0142
  ('c0000000-0000-0000-0000-000000000142'::uuid, 'medical_documentation', 'uploaded', '2026-06-01', null),
  ('c0000000-0000-0000-0000-000000000142'::uuid, 'insurance_card',        'uploaded', '2026-06-01', null),
  ('c0000000-0000-0000-0000-000000000142'::uuid, 'food_allergies',        'uploaded', '2026-06-01', null),
  ('c0000000-0000-0000-0000-000000000142'::uuid, 'student_questionnaire', 'uploaded', '2026-06-02', null),
  ('c0000000-0000-0000-0000-000000000142'::uuid, 'roi',                   'signed',   '2026-06-03', null),
  ('c0000000-0000-0000-0000-000000000142'::uuid, 'discharge_doc',         'uploaded', '2026-06-04', null),
  ('c0000000-0000-0000-0000-000000000142'::uuid, 'cmde',                  'approved', '2026-06-05', '2029-06-05'),
  ('c0000000-0000-0000-0000-000000000142'::uuid, 'itp',                   'pending_approval', '2026-06-01', '2026-12-01'),
  ('c0000000-0000-0000-0000-000000000142'::uuid, 'iep',                   'uploaded', '2026-05-28', '2026-11-28'),
  ('c0000000-0000-0000-0000-000000000142'::uuid, 'parent_handbook',       'not_sent', null, null),
  ('c0000000-0000-0000-0000-000000000142'::uuid, 'service_agreement',     'awaiting_esig', null, null),
  ('c0000000-0000-0000-0000-000000000142'::uuid, 'transport_agreement',   'not_sent', null, null),
  -- 0155
  ('c0000000-0000-0000-0000-000000000155'::uuid, 'medical_documentation', 'uploaded', '2026-05-20', null),
  ('c0000000-0000-0000-0000-000000000155'::uuid, 'insurance_card',        'uploaded', '2026-05-20', null),
  ('c0000000-0000-0000-0000-000000000155'::uuid, 'cmde',                  'submitted','2026-06-10', null),
  ('c0000000-0000-0000-0000-000000000155'::uuid, 'transport_agreement',   'signed',   '2026-06-11', '2027-06-11'),
  ('c0000000-0000-0000-0000-000000000155'::uuid, 'service_agreement',     'awaiting_esig', null, null),
  ('c0000000-0000-0000-0000-000000000155'::uuid, 'itp',                   'not_yet_created', null, null),
  -- 0188
  ('c0000000-0000-0000-0000-000000000188'::uuid, 'medical_documentation', 'missing', null, null),
  ('c0000000-0000-0000-0000-000000000188'::uuid, 'insurance_card',        'missing', null, null),
  ('c0000000-0000-0000-0000-000000000188'::uuid, 'food_allergies',        'uploaded', '2026-06-02', null),
  ('c0000000-0000-0000-0000-000000000188'::uuid, 'student_questionnaire', 'uploaded', '2026-06-02', null),
  ('c0000000-0000-0000-0000-000000000188'::uuid, 'roi',                   'missing', null, null),
  ('c0000000-0000-0000-0000-000000000188'::uuid, 'itp',                   'approved', '2025-12-01', '2026-06-08'),
  -- 0167 (active)
  ('c0000000-0000-0000-0000-000000000167'::uuid, 'cmde',                  'approved', '2025-01-15', '2028-01-15'),
  ('c0000000-0000-0000-0000-000000000167'::uuid, 'itp',                   'approved', '2026-04-01', '2026-10-01'),
  ('c0000000-0000-0000-0000-000000000167'::uuid, 'iep',                   'uploaded', '2026-03-20', '2026-09-20'),
  ('c0000000-0000-0000-0000-000000000167'::uuid, 'wellness_assessment',   'uploaded', '2025-07-03', '2026-07-03'),
  ('c0000000-0000-0000-0000-000000000167'::uuid, 'service_agreement',     'signed',   '2026-01-20', '2027-01-20'),
  ('c0000000-0000-0000-0000-000000000167'::uuid, 'transport_agreement',   'signed',   '2026-01-20', '2027-01-20'),
  -- 0192
  ('c0000000-0000-0000-0000-000000000192'::uuid, 'cmde',                  'approved', '2023-07-09', '2026-07-09'),
  ('c0000000-0000-0000-0000-000000000192'::uuid, 'itp',                   'missing', null, null),
  ('c0000000-0000-0000-0000-000000000192'::uuid, 'medical_documentation', 'missing', null, null),
  -- 0193
  ('c0000000-0000-0000-0000-000000000193'::uuid, 'medical_documentation', 'missing', null, null),
  ('c0000000-0000-0000-0000-000000000193'::uuid, 'insurance_card',        'missing', null, null),
  -- 0177
  ('c0000000-0000-0000-0000-000000000177'::uuid, 'medical_documentation', 'uploaded', '2026-05-15', null),
  ('c0000000-0000-0000-0000-000000000177'::uuid, 'insurance_card',        'uploaded', '2026-05-15', null),
  ('c0000000-0000-0000-0000-000000000177'::uuid, 'cmde',                  'approved', '2026-05-20', '2029-05-20'),
  ('c0000000-0000-0000-0000-000000000177'::uuid, 'itp',                   'approved', '2026-06-09', '2026-12-09'),
  ('c0000000-0000-0000-0000-000000000177'::uuid, 'parent_handbook',       'signed',   '2026-06-09', null),
  ('c0000000-0000-0000-0000-000000000177'::uuid, 'service_agreement',     'awaiting_esig', null, null)
on conflict (client_id, doc_type) do nothing;

-- ── Case note compliance: week of Jun 15–19, 2026 ───────────────────────────
insert into public.compliance_weeks (id, week_start, week_end, status)
values ('11110000-0000-0000-0000-000000000615'::uuid, '2026-06-15', '2026-06-19', 'open')
on conflict (week_start) do nothing;

-- Schedule (subset mirroring the prototype's grid for Mon–Wed).
insert into public.bt_schedule_assignments
  (week_id, client_id, session_date, session_period, assigned_staff_id, status, covering_for_staff_id)
values
  ('11110000-0000-0000-0000-000000000615'::uuid, 'c0000000-0000-0000-0000-000000000142'::uuid, '2026-06-15', 'am', '5a000000-0000-0000-0000-000000000001'::uuid, 'assigned', null),
  ('11110000-0000-0000-0000-000000000615'::uuid, 'c0000000-0000-0000-0000-000000000142'::uuid, '2026-06-15', 'pm', '5a000000-0000-0000-0000-000000000002'::uuid, 'assigned', null),
  ('11110000-0000-0000-0000-000000000615'::uuid, 'c0000000-0000-0000-0000-000000000142'::uuid, '2026-06-16', 'am', '5a000000-0000-0000-0000-000000000001'::uuid, 'assigned', null),
  ('11110000-0000-0000-0000-000000000615'::uuid, 'c0000000-0000-0000-0000-000000000142'::uuid, '2026-06-16', 'pm', '5a000000-0000-0000-0000-000000000001'::uuid, 'assigned', null),
  ('11110000-0000-0000-0000-000000000615'::uuid, 'c0000000-0000-0000-0000-000000000142'::uuid, '2026-06-17', 'am', '5a000000-0000-0000-0000-000000000002'::uuid, 'covering', '5a000000-0000-0000-0000-000000000001'::uuid),
  ('11110000-0000-0000-0000-000000000615'::uuid, 'c0000000-0000-0000-0000-000000000142'::uuid, '2026-06-17', 'pm', '5a000000-0000-0000-0000-000000000002'::uuid, 'covering', '5a000000-0000-0000-0000-000000000001'::uuid),
  ('11110000-0000-0000-0000-000000000615'::uuid, 'c0000000-0000-0000-0000-000000000155'::uuid, '2026-06-15', 'am', '5a000000-0000-0000-0000-000000000002'::uuid, 'assigned', null),
  ('11110000-0000-0000-0000-000000000615'::uuid, 'c0000000-0000-0000-0000-000000000155'::uuid, '2026-06-15', 'pm', '5a000000-0000-0000-0000-000000000002'::uuid, 'assigned', null),
  ('11110000-0000-0000-0000-000000000615'::uuid, 'c0000000-0000-0000-0000-000000000155'::uuid, '2026-06-16', 'am', '5a000000-0000-0000-0000-000000000002'::uuid, 'assigned', null),
  ('11110000-0000-0000-0000-000000000615'::uuid, 'c0000000-0000-0000-0000-000000000155'::uuid, '2026-06-16', 'pm', '5a000000-0000-0000-0000-000000000002'::uuid, 'assigned', null),
  ('11110000-0000-0000-0000-000000000615'::uuid, 'c0000000-0000-0000-0000-000000000188'::uuid, '2026-06-15', 'am', '5a000000-0000-0000-0000-000000000001'::uuid, 'assigned', null),
  ('11110000-0000-0000-0000-000000000615'::uuid, 'c0000000-0000-0000-0000-000000000188'::uuid, '2026-06-15', 'pm', '5a000000-0000-0000-0000-000000000001'::uuid, 'assigned', null),
  ('11110000-0000-0000-0000-000000000615'::uuid, 'c0000000-0000-0000-0000-000000000188'::uuid, '2026-06-16', 'am', null, 'unassigned', null),
  ('11110000-0000-0000-0000-000000000615'::uuid, 'c0000000-0000-0000-0000-000000000188'::uuid, '2026-06-16', 'pm', null, 'unassigned', null),
  ('11110000-0000-0000-0000-000000000615'::uuid, 'c0000000-0000-0000-0000-000000000167'::uuid, '2026-06-15', 'am', '5a000000-0000-0000-0000-000000000004'::uuid, 'assigned', null),
  ('11110000-0000-0000-0000-000000000615'::uuid, 'c0000000-0000-0000-0000-000000000167'::uuid, '2026-06-15', 'pm', '5a000000-0000-0000-0000-000000000004'::uuid, 'assigned', null),
  ('11110000-0000-0000-0000-000000000615'::uuid, 'c0000000-0000-0000-0000-000000000167'::uuid, '2026-06-16', 'am', '5a000000-0000-0000-0000-000000000004'::uuid, 'assigned', null),
  ('11110000-0000-0000-0000-000000000615'::uuid, 'c0000000-0000-0000-0000-000000000167'::uuid, '2026-06-16', 'pm', '5a000000-0000-0000-0000-000000000004'::uuid, 'assigned', null)
on conflict (week_id, client_id, session_date, session_period) do nothing;

-- Check-offs derived from the schedule: confirmed unless noted.
insert into public.case_note_checkoffs
  (week_id, client_id, session_date, slot, session_period, assigned_staff_id, status, session_time_range, confirmed_via)
select
  a.week_id, a.client_id, a.session_date,
  case a.session_period when 'am' then 1 else 2 end,
  a.session_period, a.assigned_staff_id,
  case when a.status = 'unassigned' then 'not_applicable'::checkoff_status
       else 'confirmed'::checkoff_status end,
  case a.session_period when 'am' then '07:30 AM – 12:30 PM' else '12:31 PM – 03:30 PM' end,
  case when a.status = 'unassigned' then null else 'manual'::checkoff_source end
from public.bt_schedule_assignments a
where a.week_id = '11110000-0000-0000-0000-000000000615'::uuid
on conflict (week_id, client_id, session_date, slot) do nothing;

-- Mark the prototype's specific gaps: missing PM notes + two 0142 overrides.
update public.case_note_checkoffs
set status = 'missing', confirmed_via = null
where week_id = '11110000-0000-0000-0000-000000000615'::uuid
  and client_id in (
    'c0000000-0000-0000-0000-000000000155'::uuid,
    'c0000000-0000-0000-0000-000000000167'::uuid
  )
  and session_date = '2026-06-16' and slot = 2;

update public.case_note_checkoffs
set status = 'missing', confirmed_via = null
where week_id = '11110000-0000-0000-0000-000000000615'::uuid
  and client_id = 'c0000000-0000-0000-0000-000000000155'::uuid
  and session_date = '2026-06-16' and slot = 1;

update public.case_note_checkoffs
set status = 'overridden', confirmed_via = null
where week_id = '11110000-0000-0000-0000-000000000615'::uuid
  and client_id = 'c0000000-0000-0000-0000-000000000142'::uuid
  and session_date = '2026-06-17';

insert into public.case_note_overrides (checkoff_id, reason_code, reason_note, logged_by)
select id, 'cancelled_absent', 'Session was cancelled / client absent.', 'a0000000-0000-0000-0000-0000000000a1'
from public.case_note_checkoffs
where week_id = '11110000-0000-0000-0000-000000000615'::uuid
  and client_id = 'c0000000-0000-0000-0000-000000000142'::uuid
  and session_date = '2026-06-17';
