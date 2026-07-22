-- ============================================================================
-- ABA Connect — LOCAL DEV seed data.
-- This file runs only on `supabase db reset` for local development. It is NOT
-- production data. Sample staff/clients/schedule/case-note data has been
-- removed: the system starts empty except for the admin login below. Required
-- config (pipeline stages, document types, renewal rules, notification
-- preferences) is seeded by the migrations, not here.
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
