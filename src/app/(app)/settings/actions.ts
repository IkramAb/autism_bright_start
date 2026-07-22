"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAdmin } from "@/lib/auth";
import {
  BRANDING_BUCKET,
  LOGO_ALLOWED_MIME_TYPES,
  LOGO_MAX_BYTES,
  LOGO_OBJECT_PATH,
  ensureBrandingBucket,
} from "@/lib/branding";
import {
  connectApiKeyIntegration,
  disconnectIntegration,
} from "@/lib/integrations/connect";
import { isGoogleService } from "@/lib/integrations/config";
import type {
  IntegrationService,
  IntervalUnit,
  RenewalDocType,
  StaffChecklistGroup,
} from "@/lib/types/settings";

export type ActionResult = { ok: boolean; error?: string; message?: string };

async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) return { admin: null, error: "Not authorized." as const };
  return { admin, error: null };
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function num(formData: FormData, key: string): number {
  return parseInt(String(formData.get(key) ?? "0"), 10);
}

export async function updateOrganization(formData: FormData): Promise<ActionResult> {
  const { error } = await requireAdmin();
  if (error) return { ok: false, error };

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("organization_settings")
    .update({
      practice_name: str(formData, "practice_name"),
      address: str(formData, "address") || null,
      phone: str(formData, "phone") || null,
      timezone: str(formData, "timezone") || "America/Chicago",
    })
    .eq("id", true);

  if (dbError) return { ok: false, error: dbError.message };
  revalidatePath("/settings");
  return { ok: true, message: "Organization settings saved." };
}

export async function updateAdminProfile(formData: FormData): Promise<ActionResult> {
  const { admin, error } = await requireAdmin();
  if (error || !admin) return { ok: false, error: error ?? "Not authorized." };

  const fullName = str(formData, "full_name");
  const roleLabel = str(formData, "sidebar_role_label");
  if (!fullName) return { ok: false, error: "Display name is required." };

  const initials = fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("admin_users")
    .update({
      full_name: fullName,
      sidebar_role_label: roleLabel || "Admin",
      avatar_initials: initials,
    })
    .eq("id", admin.id);

  if (dbError) return { ok: false, error: dbError.message };
  revalidatePath("/settings");
  return { ok: true, message: "Profile updated." };
}

export async function uploadOrganizationLogo(formData: FormData): Promise<ActionResult> {
  const { error } = await requireAdmin();
  if (error) return { ok: false, error };

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image file to upload." };
  }
  if (!LOGO_ALLOWED_MIME_TYPES.includes(file.type)) {
    return { ok: false, error: "Use a PNG, JPG, SVG, WEBP, or GIF image." };
  }
  if (file.size > LOGO_MAX_BYTES) {
    return { ok: false, error: "Logo must be under 2 MB." };
  }

  try {
    await ensureBrandingBucket();
    const admin = createAdminClient();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(BRANDING_BUCKET)
      .upload(LOGO_OBJECT_PATH, bytes, { contentType: file.type, upsert: true });
    if (uploadError) return { ok: false, error: uploadError.message };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Upload failed." };
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true, message: "Logo updated." };
}

export async function removeOrganizationLogo(): Promise<ActionResult> {
  const { error } = await requireAdmin();
  if (error) return { ok: false, error };

  try {
    const admin = createAdminClient();
    const { error: removeError } = await admin.storage
      .from(BRANDING_BUCKET)
      .remove([LOGO_OBJECT_PATH]);
    if (removeError) return { ok: false, error: removeError.message };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Remove failed." };
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true, message: "Logo removed." };
}

export async function updateRenewalRule(formData: FormData): Promise<ActionResult> {
  const { error } = await requireAdmin();
  if (error) return { ok: false, error };

  const documentType = str(formData, "document_type") as RenewalDocType;
  const intervalCount = num(formData, "interval_count");
  const intervalUnit = str(formData, "interval_unit") as IntervalUnit;
  const reminderLeadCount = num(formData, "reminder_lead_count");
  const reminderLeadUnit = str(formData, "reminder_lead_unit") as IntervalUnit;

  if (!documentType || intervalCount < 1 || reminderLeadCount < 1) {
    return { ok: false, error: "Invalid renewal rule values." };
  }

  const supabase = await createClient();
  const { error: dbError } = await supabase.from("renewal_rules").upsert(
    {
      document_type: documentType,
      interval_count: intervalCount,
      interval_unit: intervalUnit,
      reminder_lead_count: reminderLeadCount,
      reminder_lead_unit: reminderLeadUnit,
    },
    { onConflict: "document_type" },
  );

  if (dbError) return { ok: false, error: dbError.message };
  revalidatePath("/settings");
  revalidatePath("/documents");
  revalidatePath("/clients");
  return { ok: true, message: "Renewal rule saved." };
}

export async function updateItpWeeklyRepeat(enabled: boolean): Promise<ActionResult> {
  const { error } = await requireAdmin();
  if (error) return { ok: false, error };

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("organization_settings")
    .update({ itp_weekly_repeat_enabled: enabled })
    .eq("id", true);

  if (dbError) return { ok: false, error: dbError.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateDocumentGate(enabled: boolean): Promise<ActionResult> {
  const { error } = await requireAdmin();
  if (error) return { ok: false, error };

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("organization_settings")
    .update({ document_gate_enabled: enabled })
    .eq("id", true);

  if (dbError) return { ok: false, error: dbError.message };
  revalidatePath("/settings");
  revalidatePath("/pipeline");
  return { ok: true };
}

export async function createChecklistItem(formData: FormData): Promise<ActionResult> {
  const { error } = await requireAdmin();
  if (error) return { ok: false, error };

  const name = str(formData, "name");
  const group = str(formData, "checklist_group") as StaffChecklistGroup;
  if (!name || !group) return { ok: false, error: "Name and group are required." };

  const supabase = await createClient();
  const { data: maxRow } = await supabase
    .from("staff_checklist_template")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = ((maxRow?.sort_order as number | undefined) ?? 0) + 10;
  const isTraining = group === "required_training";
  const isGlobalOneTime = group === "global_one_time";

  const { error: dbError } = await supabase.from("staff_checklist_template").insert({
    name,
    checklist_group: group,
    sort_order: sortOrder,
    is_training: isTraining,
    is_global_one_time: isGlobalOneTime,
    active: true,
  });

  if (dbError) return { ok: false, error: dbError.message };
  revalidatePath("/settings");
  revalidatePath("/onboarding");
  return { ok: true, message: "Checklist item added." };
}

export async function updateChecklistItem(formData: FormData): Promise<ActionResult> {
  const { error } = await requireAdmin();
  if (error) return { ok: false, error };

  const id = str(formData, "id");
  const name = str(formData, "name");
  const group = str(formData, "checklist_group") as StaffChecklistGroup;
  if (!id || !name) return { ok: false, error: "Invalid checklist item." };

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("staff_checklist_template")
    .update({
      name,
      checklist_group: group,
      is_training: group === "required_training",
      is_global_one_time: group === "global_one_time",
    })
    .eq("id", id);

  if (dbError) return { ok: false, error: dbError.message };
  revalidatePath("/settings");
  revalidatePath("/onboarding");
  return { ok: true, message: "Checklist item updated." };
}

export async function deleteChecklistItem(id: string): Promise<ActionResult> {
  const { error } = await requireAdmin();
  if (error) return { ok: false, error };

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("staff_checklist_template")
    .update({ active: false })
    .eq("id", id);

  if (dbError) return { ok: false, error: dbError.message };
  revalidatePath("/settings");
  revalidatePath("/onboarding");
  return { ok: true, message: "Checklist item removed." };
}

export async function updatePipelineStage(formData: FormData): Promise<ActionResult> {
  const { error } = await requireAdmin();
  if (error) return { ok: false, error };

  const id = str(formData, "id");
  const name = str(formData, "name");
  const advanceTrigger = str(formData, "advance_trigger") || null;
  if (!id || !name) return { ok: false, error: "Stage name is required." };

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("pipeline_stages")
    .update({ name, advance_trigger: advanceTrigger })
    .eq("id", id);

  if (dbError) return { ok: false, error: dbError.message };
  revalidatePath("/settings");
  revalidatePath("/pipeline");
  return { ok: true, message: "Pipeline stage updated." };
}

export async function updateNotificationCadence(formData: FormData): Promise<ActionResult> {
  const { error } = await requireAdmin();
  if (error) return { ok: false, error };

  const id = str(formData, "id");
  const cadenceLabel = str(formData, "cadence_label");
  if (!id || !cadenceLabel) return { ok: false, error: "Cadence label is required." };

  const supabase = await createClient();
  const { error: dbError } = await supabase
    .from("notification_preferences")
    .update({ cadence_label: cadenceLabel })
    .eq("id", id);

  if (dbError) return { ok: false, error: dbError.message };
  revalidatePath("/settings");
  return { ok: true, message: "Cadence updated." };
}

export async function saveNotificationRecipients(formData: FormData): Promise<ActionResult> {
  const { error } = await requireAdmin();
  if (error) return { ok: false, error };

  const prefId = str(formData, "preference_id");
  const adminIds = formData.getAll("admin_user_id").map(String);
  const emails = formData.getAll("email").map((e) => String(e).trim()).filter(Boolean);
  const includeAssigned = formData.get("include_assigned_bt") === "on";

  if (!prefId) return { ok: false, error: "Invalid notification preference." };

  const supabase = await createClient();
  const { error: delError } = await supabase
    .from("notification_recipients")
    .delete()
    .eq("notification_preference_id", prefId);

  if (delError) return { ok: false, error: delError.message };

  const rows: {
    notification_preference_id: string;
    target_type: "admin_user" | "email" | "assigned_bt_plus_admin";
    admin_user_id?: string;
    email?: string;
  }[] = [];

  for (const adminId of adminIds) {
    if (adminId) rows.push({ notification_preference_id: prefId, target_type: "admin_user", admin_user_id: adminId });
  }
  for (const email of emails) {
    rows.push({ notification_preference_id: prefId, target_type: "email", email });
  }
  if (includeAssigned) {
    rows.push({ notification_preference_id: prefId, target_type: "assigned_bt_plus_admin" });
  }

  if (rows.length) {
    const { error: insError } = await supabase.from("notification_recipients").insert(rows);
    if (insError) return { ok: false, error: insError.message };
  }

  revalidatePath("/settings");
  return { ok: true, message: "Recipients saved." };
}

export async function connectIntegration(
  service: IntegrationService,
): Promise<ActionResult & { redirectUrl?: string }> {
  const { error } = await requireAdmin();
  if (error) return { ok: false, error };

  if (isGoogleService(service)) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return {
        ok: false,
        error:
          "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment.",
      };
    }
    return {
      ok: true,
      redirectUrl: `/api/integrations/google/authorize?service=${service}`,
    };
  }

  if (service === "resend" || service === "docseal") {
    try {
      const result = await connectApiKeyIntegration(service);
      if (!result.ok) return { ok: false, error: result.error };
      revalidatePath("/settings");
      revalidatePath("/documents");
      return { ok: true, message: result.message };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Connection failed.",
      };
    }
  }

  return { ok: false, error: "Unknown integration." };
}

export async function disconnectIntegrationAction(
  service: IntegrationService,
): Promise<ActionResult> {
  const { error } = await requireAdmin();
  if (error) return { ok: false, error };

  try {
    const result = await disconnectIntegration(service);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/settings");
    revalidatePath("/documents");
    return { ok: true, message: result.message };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Disconnect failed.",
    };
  }
}

/** @deprecated Use connectIntegration / disconnectIntegrationAction */
export async function toggleIntegration(
  service: IntegrationService,
  connect: boolean,
): Promise<ActionResult> {
  if (connect) return connectIntegration(service);
  return disconnectIntegrationAction(service);
}

export async function inviteAdminUser(formData: FormData): Promise<ActionResult> {
  const { error } = await requireAdmin();
  if (error) return { ok: false, error };

  const email = str(formData, "email");
  const fullName = str(formData, "full_name");
  if (!email || !email.includes("@")) return { ok: false, error: "Valid email is required." };
  if (!fullName) return { ok: false, error: "Name is required." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) return { ok: false, error: "An admin with that email already exists." };

  return {
    ok: true,
    message: `Invite queued for ${fullName} (${email}). Email delivery will be wired in a later phase.`,
  };
}
