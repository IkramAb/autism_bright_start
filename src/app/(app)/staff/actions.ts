"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdmin } from "@/lib/auth";
import type { Database } from "@/lib/supabase/types";
import { provisionOnboarding, type ProvisionCounts } from "@/lib/staff-provisioning";

export type ActionResult = { ok: boolean; error?: string; message?: string };

type StaffStatus = Database["public"]["Enums"]["staff_status"];

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

  // Whitelist rather than cast — an unrecognised value would fail the enum at the
  // DB with an opaque error. The other three statuses stay in the Edit modal.
  const status: StaffStatus =
    String(formData.get("status") ?? "active") === "onboarding" ? "onboarding" : "active";

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
      status,
      avatar_initials: initials,
      avatar_bg: "blue-light",
      avatar_color: "blue-dark",
    })
    .select("id")
    .single();

  if (error || !inserted) return { ok: false, error: error?.message ?? "Could not add employee." };

  const staffId = inserted.id as string;

  // Existing employees are just records — the checklist, trainings, background
  // steps and HR documents only exist for people actually being onboarded.
  let counts: ProvisionCounts | null = null;
  if (status === "onboarding") {
    const res = await provisionOnboarding(supabase, staffId, hiredOn);
    if (!res.ok) {
      // The staff row is already committed, so this is a partial success.
      revalidateStaff(staffId);
      return {
        ok: true,
        message: `${fullName} added, but the onboarding checklist could not be created: ${res.error}`,
      };
    }
    counts = res.counts;
  }

  await supabase
    .from("staff")
    .update({
      drive_folder_url: `https://drive.google.com/drive/folders/stub-${staffId.slice(0, 8)}`,
    })
    .eq("id", staffId);

  revalidateStaff(staffId);
  return {
    ok: true,
    message: counts
      ? `${fullName} added — ${counts.checklist} checklist items, ${counts.trainings} trainings, and ${counts.documents} HR documents created.`
      : `${fullName} added to the staff directory.`,
  };
}

/**
 * Provisions the onboarding checklist for someone who was added as existing
 * staff, so an Active hire isn't permanently un-trackable. Also moves them onto
 * the onboarding board — `getOnboardingListData()` filters on status, so without
 * the flip the checklist would exist but never surface anywhere.
 */
export async function setUpOnboarding(staffId: string): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, hired_on, status")
    .eq("id", staffId)
    .maybeSingle();
  if (!staff) return { ok: false, error: "Staff member not found." };

  const res = await provisionOnboarding(
    supabase,
    staffId,
    staff.hired_on ?? new Date().toISOString().slice(0, 10),
  );
  if (!res.ok) return { ok: false, error: res.error };

  if (staff.status === "active") {
    await supabase.from("staff").update({ status: "onboarding" }).eq("id", staffId);
  }

  revalidateStaff(staffId);
  return {
    ok: true,
    message: `Onboarding set up — ${res.counts.checklist} checklist items, ${res.counts.trainings} trainings, and ${res.counts.documents} HR documents.`,
  };
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
