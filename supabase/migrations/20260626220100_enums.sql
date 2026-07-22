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
