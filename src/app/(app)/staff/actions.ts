"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdmin } from "@/lib/auth";
import type { Database } from "@/lib/supabase/types";

export type ActionResult = { ok: boolean; error?: string; message?: string };

const DEFAULT_TRAININGS = [
  "RBT 40-hour training",
  "EIDBI 101",
  "Cultural Responsiveness in ASD Services",
  "Vulnerable adults training",
  "Mandated reporter training",
  "ADS strategy training",
  "Company orientation",
];

const BG_STEPS = [
  { step: "step1_application", sort: 1 },
  { step: "step2_fingerprinting", sort: 2 },
  { step: "step3_approval", sort: 3 },
  { step: "study_number", sort: 4 },
] as const;

const DEFAULT_STAFF_DOCS = [
  "Signed offer letter",
  "I-9 employment verification",
  "W-4 tax form",
  "RBT 40hr training cert",
  "DHS provider enrollment form",
  "Background check documents",
];

export async function toggleChecklistItem(itemId: string, done: boolean): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  const patch: Database["public"]["Tables"]["staff_onboarding_items"]["Update"] = {
    done,
    completed_on: done ? new Date().toISOString().slice(0, 10) : null,
  };

  const { data: item } = await supabase
    .from("staff_onboarding_items")
    .select("staff_id, locked, blocked")
    .eq("id", itemId)
    .single();

  if (item?.locked) return { ok: false, error: "This item is locked." };
  if (item?.blocked && done) return { ok: false, error: "This item is blocked pending prior steps." };

  const { error } = await supabase.from("staff_onboarding_items").update(patch).eq("id", itemId);
  if (error) return { ok: false, error: error.message };

  revalidateStaff(item?.staff_id as string);
  return { ok: true };
}

export async function updateStaffNotes(staffId: string, notes: string): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  const { error } = await supabase.from("staff").update({ notes: notes.trim() }).eq("id", staffId);
  if (error) return { ok: false, error: error.message };

  revalidateStaff(staffId);
  return { ok: true };
}

export async function updateTraining(
  trainingId: string,
  patch: Database["public"]["Tables"]["staff_trainings"]["Update"],
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  const update: Database["public"]["Tables"]["staff_trainings"]["Update"] = { ...patch };
  if (patch.status === "complete") {
    update.completed_on = new Date().toISOString().slice(0, 10);
  }

  const { data } = await supabase
    .from("staff_trainings")
    .update(update)
    .eq("id", trainingId)
    .select("staff_id")
    .single();

  if (!data) return { ok: false, error: "Training not found." };

  revalidateStaff(data.staff_id as string);
  revalidatePath("/training");
  return { ok: true };
}

export async function addEmployee(formData: FormData): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "RBT").trim();
  const roleType = String(formData.get("role_type") ?? "rbt");
  const email = String(formData.get("email") ?? "").trim() || null;
  const hiredOn = String(formData.get("hired_on") ?? "") || new Date().toISOString().slice(0, 10);

  if (!fullName) return { ok: false, error: "Enter a full name." };

  const initials = fullName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("staff")
    .insert({
      full_name: fullName,
      role,
      role_type: roleType,
      email,
      hired_on: hiredOn,
      status: "onboarding",
      avatar_initials: initials,
      avatar_bg: "blue-light",
      avatar_color: "blue-dark",
    })
    .select("id")
    .single();

  if (error || !inserted) return { ok: false, error: error?.message ?? "Could not add employee." };

  const staffId = inserted.id as string;

  const { data: template } = await supabase.from("staff_checklist_template").select("*").order("sort_order");
  if (template?.length) {
    await supabase.from("staff_onboarding_items").insert(
      template.map((t) => ({
        staff_id: staffId,
        template_item_id: t.id,
        label: t.name,
        checklist_group: t.checklist_group,
        sort_order: t.sort_order,
        due_on:
          t.default_due_offset_days && hiredOn
            ? offsetDate(hiredOn, t.default_due_offset_days)
            : null,
      })),
    );
  }

  await supabase.from("staff_trainings").insert(
    DEFAULT_TRAININGS.map((name) => ({
      staff_id: staffId,
      name,
      status: "pending" as const,
      due_on: name === "RBT 40-hour training" ? offsetDate(hiredOn, 60) : null,
    })),
  );

  await supabase.from("staff_background_checks").insert(
    BG_STEPS.map((s) => ({
      staff_id: staffId,
      step: s.step,
      sort_order: s.sort,
      status: s.step === "study_number" ? ("not_assigned" as const) : ("pending" as const),
    })),
  );

  await supabase.from("staff_documents").insert(
    DEFAULT_STAFF_DOCS.map((name) => ({
      staff_id: staffId,
      name,
      status: "missing" as const,
    })),
  );

  await supabase
    .from("staff")
    .update({
      drive_folder_url: `https://drive.google.com/drive/folders/stub-${staffId.slice(0, 8)}`,
    })
    .eq("id", staffId);

  revalidateStaff(staffId);
  revalidatePath("/training");
  return { ok: true, message: `${fullName} added to staff.` };
}

export async function updateStaff(staffId: string, formData: FormData): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { ok: false, error: "Enter a full name." };

  const role = String(formData.get("role") ?? "RBT").trim();
  const roleType = String(formData.get("role_type") ?? "rbt");
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const hiredOn = String(formData.get("hired_on") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "onboarding") as
    Database["public"]["Tables"]["staff"]["Row"]["status"];
  const bcbaCert = String(formData.get("bcba_cert_number") ?? "").trim() || null;
  const bgStudyNumber = String(formData.get("background_study_number") ?? "").trim() || null;

  const initials = fullName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const supabase = await createClient();
  const { error } = await supabase
    .from("staff")
    .update({
      full_name: fullName,
      role,
      role_type: roleType,
      email,
      phone,
      hired_on: hiredOn,
      status,
      bcba_cert_number: bcbaCert,
      background_study_number: bgStudyNumber,
      avatar_initials: initials,
    })
    .eq("id", staffId);

  if (error) return { ok: false, error: error.message };

  revalidateStaff(staffId);
  return { ok: true, message: `${fullName} updated.` };
}

export async function deleteStaff(staffId: string): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  const { error } = await supabase.from("staff").delete().eq("id", staffId);
  if (error) return { ok: false, error: error.message };

  revalidateStaff(staffId);
  return { ok: true, message: "Staff member removed." };
}

function offsetDate(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function revalidateStaff(staffId?: string) {
  revalidatePath("/staff");
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/training");
  void staffId;
}

export async function fetchStaffDetail(id: string) {
  const { getStaffDetail } = await import("@/lib/staff");
  return getStaffDetail(id);
}

/** Stub: simulates a Drive upload — saves link and unlocks Catalyst when BG docs are uploaded. */
export async function uploadStaffDocument(
  documentId: string,
  driveUrl?: string,
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("staff_documents")
    .select("staff_id, name")
    .eq("id", documentId)
    .single();

  if (!doc) return { ok: false, error: "Document not found." };

  const url =
    driveUrl?.trim() ||
    `https://drive.google.com/file/stub-${documentId.slice(0, 8)}`;
  if (!url.startsWith("http")) return { ok: false, error: "Enter a valid Drive URL." };

  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("staff_documents")
    .update({ status: "uploaded", drive_url: url, submitted_on: today })
    .eq("id", documentId);

  if (error) return { ok: false, error: error.message };

  const staffId = doc.staff_id as string;
  const name = (doc.name as string).toLowerCase();
  if (name.includes("background check")) {
    await supabase
      .from("staff_onboarding_items")
      .update({ locked: false, lock_reason: null })
      .eq("staff_id", staffId)
      .eq("locked", true);

    await supabase
      .from("staff_onboarding_items")
      .update({ blocked: false })
      .eq("staff_id", staffId)
      .eq("blocked", true);
  }

  revalidateStaff(staffId);
  return {
    ok: true,
    message: name.includes("background check")
      ? "Document uploaded — Catalyst enrollment unlocked."
      : "Document link saved.",
  };
}
