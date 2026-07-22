import { CHECKLIST_GROUP_LABELS } from "@/lib/staff-utils";
import type {
  AdminUserRow,
  IntegrationRow,
  IntervalUnit,
  NotificationRecipientRow,
  NotificationType,
  OrganizationSettingsRow,
  RenewalDocType,
  RenewalRuleRow,
  StaffChecklistTemplateRow,
} from "@/lib/types/settings";

export type IntervalPreset = {
  label: string;
  interval_count: number;
  interval_unit: IntervalUnit;
  reminder_lead_count: number;
  reminder_lead_unit: IntervalUnit;
};

export const RENEWAL_DOC_ORDER: RenewalDocType[] = [
  "cmde",
  "itp",
  "iep",
  "wellness_assessment",
  "transport_agreement",
];

export const RENEWAL_INTERVAL_PRESETS: Record<RenewalDocType, IntervalPreset[]> = {
  cmde: [
    { label: "Every 3 years", interval_count: 3, interval_unit: "year", reminder_lead_count: 1, reminder_lead_unit: "month" },
    { label: "Every 1 year", interval_count: 1, interval_unit: "year", reminder_lead_count: 1, reminder_lead_unit: "month" },
    { label: "Every 2 years", interval_count: 2, interval_unit: "year", reminder_lead_count: 1, reminder_lead_unit: "month" },
  ],
  itp: [
    { label: "Every 6 months", interval_count: 6, interval_unit: "month", reminder_lead_count: 1, reminder_lead_unit: "month" },
    { label: "Every 12 months", interval_count: 12, interval_unit: "month", reminder_lead_count: 1, reminder_lead_unit: "month" },
  ],
  iep: [
    { label: "Every 6 months", interval_count: 6, interval_unit: "month", reminder_lead_count: 1, reminder_lead_unit: "month" },
    { label: "Every 12 months", interval_count: 12, interval_unit: "month", reminder_lead_count: 1, reminder_lead_unit: "month" },
  ],
  wellness_assessment: [
    { label: "Every 1 year", interval_count: 1, interval_unit: "year", reminder_lead_count: 1, reminder_lead_unit: "month" },
    { label: "Every 6 months", interval_count: 6, interval_unit: "month", reminder_lead_count: 1, reminder_lead_unit: "month" },
  ],
  transport_agreement: [
    { label: "Every 1 year", interval_count: 1, interval_unit: "year", reminder_lead_count: 2, reminder_lead_unit: "week" },
    { label: "Every 6 months", interval_count: 6, interval_unit: "month", reminder_lead_count: 1, reminder_lead_unit: "month" },
  ],
};

export const REMINDER_LEAD_PRESETS: { label: string; count: number; unit: IntervalUnit }[] = [
  { label: "1 month before", count: 1, unit: "month" },
  { label: "2 weeks before", count: 2, unit: "week" },
  { label: "2 months before", count: 2, unit: "month" },
];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  document_expiring: "Document expiring / expired",
  itp_drafting_reminder: "ITP drafting reminder",
  missing_case_note: "Missing case note alert",
  weekly_compliance_report: "Weekly case note compliance report",
  staff_training_uploaded: "Staff training doc uploaded",
  new_referral: "New referral received",
};

export const TIMEZONE_OPTIONS = [
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
];

export const CHECKLIST_GROUP_OPTIONS = Object.entries(CHECKLIST_GROUP_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export const INTEGRATION_META: Record<
  IntegrationRow["service"],
  { name: string; description: string; icon: string; iconBg: string; iconColor: string }
> = {
  drive: {
    name: "Google Drive",
    description:
      "All documents (including CMDE, ITP, IEP) live here · folder auto-creation on connect",
    icon: "ti-brand-google-drive",
    iconBg: "var(--color-teal-light)",
    iconColor: "var(--color-teal-dark)",
  },
  gmail_workspace: {
    name: "Google Workspace (Gmail)",
    description: "Used for monitoring the email-referral inbox",
    icon: "ti-mail",
    iconBg: "var(--color-blue-light)",
    iconColor: "var(--color-blue-dark)",
  },
  docseal: {
    name: "DocSeal",
    description:
      "E-signatures for parent handbook, service agreement, transportation agreement, ROI",
    icon: "ti-signature",
    iconBg: "var(--color-teal-light)",
    iconColor: "var(--color-teal-dark)",
  },
  resend: {
    name: "Resend",
    description: "Transactional email — PHI-free content only, by design",
    icon: "ti-send",
    iconBg: "var(--color-blue-light)",
    iconColor: "var(--color-blue-dark)",
  },
};

export type RenewalRuleView = {
  id: string;
  documentType: RenewalDocType;
  label: string;
  intervalCount: number;
  intervalUnit: IntervalUnit;
  reminderLeadCount: number;
  reminderLeadUnit: IntervalUnit;
  presets: IntervalPreset[];
};

export type ChecklistItemView = {
  id: string;
  name: string;
  group: StaffChecklistTemplateRow["checklist_group"];
  groupLabel: string;
  groupPillClass: string;
  sortOrder: number;
  active: boolean;
};

export type PipelineStageView = {
  id: string;
  key: string;
  name: string;
  advanceTrigger: string | null;
  sortOrder: number;
  isTerminal: boolean;
};

export type NotificationPrefView = {
  id: string;
  type: NotificationType;
  label: string;
  cadenceLabel: string;
  recipientsSummary: string;
  recipients: NotificationRecipientRow[];
  adminUsers: { id: string; name: string; role: string }[];
};

export type AdminUserView = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: AdminUserRow["status"];
  statusLabel: string;
  statusClass: string;
  initials: string;
};

export type IntegrationView = {
  id: string;
  service: IntegrationRow["service"];
  status: IntegrationRow["status"];
  connectedEmail: string | null;
  connectedAt: string | null;
  meta: (typeof INTEGRATION_META)[IntegrationRow["service"]];
};

export type SettingsData = {
  organization: OrganizationSettingsRow;
  logoUrl: string | null;
  currentAdmin: {
    id: string;
    fullName: string;
    email: string;
    roleLabel: string;
    initials: string;
  };
  renewalRules: RenewalRuleView[];
  itpWeeklyRepeatEnabled: boolean;
  checklistItems: ChecklistItemView[];
  pipelineStages: PipelineStageView[];
  documentGateEnabled: boolean;
  notifications: NotificationPrefView[];
  integrations: IntegrationView[];
  adminUsers: AdminUserView[];
};

export function matchIntervalPreset(
  rule: Pick<RenewalRuleRow, "interval_count" | "interval_unit" | "reminder_lead_count" | "reminder_lead_unit">,
  presets: IntervalPreset[],
): IntervalPreset | null {
  return (
    presets.find(
      (p) =>
        p.interval_count === rule.interval_count &&
        p.interval_unit === rule.interval_unit &&
        p.reminder_lead_count === rule.reminder_lead_count &&
        p.reminder_lead_unit === rule.reminder_lead_unit,
    ) ?? null
  );
}
