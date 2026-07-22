import { createClient } from "@/lib/supabase/server";
import { getCurrentAdmin } from "@/lib/auth";
import { DOC_TYPE_LABELS } from "@/lib/documents";
import { CHECKLIST_GROUP_LABELS } from "@/lib/staff-utils";
import type { PipelineStage } from "@/lib/types/db";
import type {
  AdminUserRow,
  IntegrationRow,
  NotificationPreferenceRow,
  NotificationRecipientRow,
  OrganizationSettingsRow,
  RenewalRuleRow,
  StaffChecklistTemplateRow,
} from "@/lib/types/settings";
import {
  RENEWAL_DOC_ORDER,
  RENEWAL_INTERVAL_PRESETS,
  NOTIFICATION_TYPE_LABELS,
  INTEGRATION_META,
  type SettingsData,
  type RenewalRuleView,
  type ChecklistItemView,
  type PipelineStageView,
  type NotificationPrefView,
  type IntegrationView,
  type AdminUserView,
} from "@/lib/settings-shared";

export {
  RENEWAL_DOC_ORDER,
  RENEWAL_INTERVAL_PRESETS,
  REMINDER_LEAD_PRESETS,
  NOTIFICATION_TYPE_LABELS,
  TIMEZONE_OPTIONS,
  CHECKLIST_GROUP_OPTIONS,
  INTEGRATION_META,
  matchIntervalPreset,
  type IntervalPreset,
  type RenewalRuleView,
  type ChecklistItemView,
  type PipelineStageView,
  type NotificationPrefView,
  type AdminUserView,
  type IntegrationView,
  type SettingsData,
} from "@/lib/settings-shared";

function groupPillClass(group: StaffChecklistTemplateRow["checklist_group"]): string {
  switch (group) {
    case "background_study":
      return "pill-amber";
    case "required_training":
      return "pill-blue";
    case "global_one_time":
      return "pill-green";
    case "locked_needs_bg_check":
      return "pill-coral";
    case "program_onboarding":
      return "pill-gray";
    default:
      return "pill-gray";
  }
}

function adminStatusPill(status: AdminUserRow["status"]): { label: string; className: string } {
  switch (status) {
    case "active":
      return { label: "Active", className: "pill-green" };
    case "invited":
      return { label: "Invited", className: "pill-amber" };
    default:
      return { label: "Disabled", className: "pill-gray" };
  }
}

function formatRecipientsSummary(
  recipients: NotificationRecipientRow[],
  adminById: Map<string, AdminUserRow>,
): string {
  if (!recipients.length) return "None configured";
  const parts: string[] = [];
  for (const r of recipients) {
    if (r.target_type === "assigned_bt_plus_admin") {
      parts.push("Assigned BT + their admin");
    } else if (r.target_type === "admin_user" && r.admin_user_id) {
      const admin = adminById.get(r.admin_user_id);
      parts.push(admin?.full_name ?? "Admin user");
    } else if (r.target_type === "email" && r.email) {
      parts.push(r.email);
    }
  }
  return parts.join(", ");
}

export async function getSettingsData(): Promise<SettingsData> {
  const supabase = await createClient();
  const currentAdmin = await getCurrentAdmin();

  const [
    { data: org },
    { data: rules },
    { data: checklist },
    { data: stages },
    { data: notifPrefs },
    { data: recipients },
    { data: integrations },
    { data: adminUsers },
  ] = await Promise.all([
    supabase.from("organization_settings").select("*").single(),
    supabase.from("renewal_rules").select("*").order("document_type"),
    supabase.from("staff_checklist_template").select("*").order("sort_order"),
    supabase.from("pipeline_stages").select("*").order("sort_order"),
    supabase.from("notification_preferences").select("*").order("notification_type"),
    supabase.from("notification_recipients").select("*"),
    supabase.from("integrations").select("*").order("service"),
    supabase.from("admin_users").select("*").order("full_name"),
  ]);

  const organization = (org ?? {
    id: true,
    practice_name: "Autism Bright Start",
    address: null,
    phone: null,
    timezone: "America/Chicago",
    document_gate_enabled: true,
    itp_weekly_repeat_enabled: true,
    updated_at: new Date().toISOString(),
  }) as OrganizationSettingsRow;

  const adminList = (adminUsers ?? []) as AdminUserRow[];
  const adminById = new Map(adminList.map((a) => [a.id, a]));
  const recipientsByPref = new Map<string, NotificationRecipientRow[]>();
  for (const r of (recipients ?? []) as NotificationRecipientRow[]) {
    const arr = recipientsByPref.get(r.notification_preference_id) ?? [];
    arr.push(r);
    recipientsByPref.set(r.notification_preference_id, arr);
  }

  const renewalRules: RenewalRuleView[] = RENEWAL_DOC_ORDER.map((docType) => {
    const row = ((rules ?? []) as RenewalRuleRow[]).find((r) => r.document_type === docType);
    const presets = RENEWAL_INTERVAL_PRESETS[docType];
    const fallback = presets[0];
    return {
      id: row?.id ?? "",
      documentType: docType,
      label: DOC_TYPE_LABELS[docType] ?? docType,
      intervalCount: row?.interval_count ?? fallback.interval_count,
      intervalUnit: row?.interval_unit ?? fallback.interval_unit,
      reminderLeadCount: row?.reminder_lead_count ?? fallback.reminder_lead_count,
      reminderLeadUnit: row?.reminder_lead_unit ?? fallback.reminder_lead_unit,
      presets,
    };
  });

  const checklistItems: ChecklistItemView[] = ((checklist ?? []) as StaffChecklistTemplateRow[])
    .filter((item) => item.active)
    .map((item) => ({
      id: item.id,
      name: item.name,
      group: item.checklist_group,
      groupLabel: CHECKLIST_GROUP_LABELS[item.checklist_group] ?? item.checklist_group,
      groupPillClass: groupPillClass(item.checklist_group),
      sortOrder: item.sort_order,
      active: item.active,
    }));

  const pipelineStages: PipelineStageView[] = ((stages ?? []) as PipelineStage[]).map((s) => ({
    id: s.id,
    key: s.key,
    name: s.name,
    advanceTrigger: s.advance_trigger,
    sortOrder: s.sort_order,
    isTerminal: s.is_terminal,
  }));

  const notifications: NotificationPrefView[] = ((notifPrefs ?? []) as NotificationPreferenceRow[]).map(
    (pref) => {
      const prefRecipients = recipientsByPref.get(pref.id) ?? [];
      return {
        id: pref.id,
        type: pref.notification_type,
        label: NOTIFICATION_TYPE_LABELS[pref.notification_type],
        cadenceLabel: pref.cadence_label,
        recipientsSummary: formatRecipientsSummary(prefRecipients, adminById),
        recipients: prefRecipients,
        adminUsers: adminList
          .filter((a) => a.status === "active")
          .map((a) => ({ id: a.id, name: a.full_name, role: a.sidebar_role_label })),
      };
    },
  );

  const integrationViews: IntegrationView[] = ((integrations ?? []) as IntegrationRow[]).map((row) => ({
    id: row.id,
    service: row.service,
    status: row.status,
    connectedEmail: row.connected_account_email,
    connectedAt: row.connected_at,
    meta: INTEGRATION_META[row.service],
  }));

  const adminUserViews: AdminUserView[] = adminList.map((a) => {
    const sp = adminStatusPill(a.status);
    return {
      id: a.id,
      fullName: a.full_name,
      email: a.email,
      role: a.sidebar_role_label,
      status: a.status,
      statusLabel: sp.label,
      statusClass: sp.className,
      initials:
        a.avatar_initials ??
        a.full_name
          .split(" ")
          .map((p) => p[0])
          .slice(0, 2)
          .join("")
          .toUpperCase(),
    };
  });

  return {
    organization,
    currentAdmin: currentAdmin ?? {
      id: "",
      fullName: "Admin",
      email: "",
      roleLabel: "Admin",
      initials: "AD",
    },
    renewalRules,
    itpWeeklyRepeatEnabled: organization.itp_weekly_repeat_enabled,
    checklistItems,
    pipelineStages,
    documentGateEnabled: organization.document_gate_enabled,
    notifications,
    integrations: integrationViews,
    adminUsers: adminUserViews,
  };
}
