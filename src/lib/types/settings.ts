export type AdminUserStatus = "active" | "invited" | "disabled";

export type AdminUserRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  sidebar_role_label: string;
  avatar_initials: string | null;
  status: AdminUserStatus;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganizationSettingsRow = {
  id: boolean;
  practice_name: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  document_gate_enabled: boolean;
  itp_weekly_repeat_enabled: boolean;
  updated_at: string;
};

export type RenewalDocType =
  | "cmde"
  | "itp"
  | "iep"
  | "wellness_assessment"
  | "transport_agreement";

export type IntervalUnit = "day" | "week" | "month" | "year";

export type RenewalRuleRow = {
  id: string;
  document_type: RenewalDocType;
  interval_count: number;
  interval_unit: IntervalUnit;
  reminder_lead_count: number;
  reminder_lead_unit: IntervalUnit;
  updated_at: string;
};

export type StaffChecklistGroup =
  | "hiring_paperwork"
  | "background_study"
  | "required_training"
  | "global_one_time"
  | "program_onboarding"
  | "locked_needs_bg_check";

export type StaffChecklistTemplateRow = {
  id: string;
  name: string;
  checklist_group: StaffChecklistGroup;
  sort_order: number;
  is_training: boolean;
  is_global_one_time: boolean;
  default_due_offset_days: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type NotificationType =
  | "document_expiring"
  | "itp_drafting_reminder"
  | "missing_case_note"
  | "weekly_compliance_report"
  | "staff_training_uploaded"
  | "new_referral";

export type NotificationPreferenceRow = {
  id: string;
  notification_type: NotificationType;
  cadence_label: string;
  updated_at: string;
};

export type RecipientTarget = "admin_user" | "email" | "assigned_bt_plus_admin";

export type NotificationRecipientRow = {
  id: string;
  notification_preference_id: string;
  target_type: RecipientTarget;
  admin_user_id: string | null;
  email: string | null;
  created_at: string;
};

export type IntegrationService = "drive" | "gmail_workspace" | "docseal" | "resend";

export type IntegrationStatus = "connected" | "not_connected" | "error";

export type IntegrationRow = {
  id: string;
  service: IntegrationService;
  status: IntegrationStatus;
  connected_account_email: string | null;
  connected_at: string | null;
  updated_at: string;
};
