"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdmin } from "@/lib/auth";
import { parseAndMatchCatalystExport } from "@/lib/catalyst-parser";
import {
  type OverrideReason,
  type SessionPeriod,
  type ScheduleStatus,
} from "@/lib/case-notes-shared";
import { getCaseNotesData } from "@/lib/case-notes";
import type { Database } from "@/lib/supabase/types";

type CheckoffStatus = Database["public"]["Enums"]["checkoff_status"];

export type ActionResult = { ok: boolean; error?: string; message?: string };

function revalidateCaseNotes() {
  revalidatePath("/case-notes");
}

export async function ensureCheckoffsForWeek(weekId: string): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  const [{ data: assignments }, { data: existing }] = await Promise.all([
    supabase.from("bt_schedule_assignments").select("*").eq("week_id", weekId),
    supabase
      .from("case_note_checkoffs")
      .select("id, client_id, session_date, slot, status")
      .eq("week_id", weekId),
  ]);

  if (!assignments?.length) return { ok: true };

  const existingByKey = new Map(
    (existing ?? []).map((c) => [
      `${c.client_id}|${c.session_date}|${c.slot}`,
      c as { id: string; status: CheckoffStatus },
    ]),
  );

  const inserts: Database["public"]["Tables"]["case_note_checkoffs"]["Insert"][] = [];
  const updates: { id: string; patch: Database["public"]["Tables"]["case_note_checkoffs"]["Update"] }[] =
    [];

  for (const a of assignments) {
    const slot = a.session_period === "am" ? 1 : 2;
    const key = `${a.client_id}|${a.session_date}|${slot}`;
    const status: CheckoffStatus =
      a.status === "unassigned" || a.status === "no_session"
        ? "not_applicable"
        : "pending";
    const timeRange =
      a.session_period === "am" ? "07:30 AM – 12:30 PM" : "12:31 PM – 03:30 PM";
    const found = existingByKey.get(key);

    if (found) {
      const patch: Database["public"]["Tables"]["case_note_checkoffs"]["Update"] = {
        assigned_staff_id: a.assigned_staff_id,
        session_period: a.session_period,
      };
      if (found.status === "pending" && status === "not_applicable") {
        patch.status = "not_applicable";
      }
      updates.push({ id: found.id, patch });
    } else {
      inserts.push({
        week_id: weekId,
        client_id: a.client_id,
        session_date: a.session_date,
        slot,
        session_period: a.session_period,
        assigned_staff_id: a.assigned_staff_id,
        status,
        session_time_range: status === "not_applicable" ? null : timeRange,
      });
    }
  }

  if (inserts.length) {
    const { error } = await supabase.from("case_note_checkoffs").insert(inserts);
    if (error) return { ok: false, error: error.message };
  }

  await Promise.all(
    updates.map(({ id, patch }) =>
      supabase.from("case_note_checkoffs").update(patch).eq("id", id),
    ),
  );

  return { ok: true };
}

export async function reassignSession(input: {
  weekId: string;
  clientId: string;
  sessionDate: string;
  period: SessionPeriod;
  staffId: string | null;
  status: ScheduleStatus;
  coveringForStaffId?: string | null;
}): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  const slot = input.period === "am" ? 1 : 2;

  const { data: assignment } = await supabase
    .from("bt_schedule_assignments")
    .select("id")
    .eq("week_id", input.weekId)
    .eq("client_id", input.clientId)
    .eq("session_date", input.sessionDate)
    .eq("session_period", input.period)
    .maybeSingle();

  const patch = {
    assigned_staff_id: input.staffId,
    status: input.status,
    covering_for_staff_id: input.coveringForStaffId ?? null,
    updated_by: admin.id,
  };

  if (assignment?.id) {
    const { error } = await supabase
      .from("bt_schedule_assignments")
      .update(patch)
      .eq("id", assignment.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("bt_schedule_assignments").insert({
      week_id: input.weekId,
      client_id: input.clientId,
      session_date: input.sessionDate,
      session_period: input.period,
      ...patch,
    });
    if (error) return { ok: false, error: error.message };
  }

  const checkoffStatus: CheckoffStatus =
    input.status === "unassigned" || input.status === "no_session"
      ? "not_applicable"
      : "pending";

  const { data: checkoff } = await supabase
    .from("case_note_checkoffs")
    .select("id")
    .eq("week_id", input.weekId)
    .eq("client_id", input.clientId)
    .eq("session_date", input.sessionDate)
    .eq("slot", slot)
    .maybeSingle();

  const checkoffPatch = {
    assigned_staff_id: input.staffId,
    session_period: input.period,
    status: checkoffStatus,
    confirmed_via: null as null,
  };

  if (checkoff?.id) {
    await supabase.from("case_note_checkoffs").update(checkoffPatch).eq("id", checkoff.id);
  } else {
    await supabase.from("case_note_checkoffs").insert({
      week_id: input.weekId,
      client_id: input.clientId,
      session_date: input.sessionDate,
      slot,
      ...checkoffPatch,
      session_time_range:
        checkoffStatus === "not_applicable"
          ? null
          : input.period === "am"
            ? "07:30 AM – 12:30 PM"
            : "12:31 PM – 03:30 PM",
    });
  }

  revalidateCaseNotes();
  return { ok: true, message: "Session reassigned." };
}

export async function toggleCheckoff(
  checkoffId: string,
  checked: boolean,
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  const { data: co } = await supabase
    .from("case_note_checkoffs")
    .select("status")
    .eq("id", checkoffId)
    .maybeSingle();

  if (!co) return { ok: false, error: "Check-off not found." };
  if (co.status === "not_applicable")
    return { ok: false, error: "Cannot check an unassigned session." };
  if (co.status === "overridden")
    return { ok: false, error: "Clear the override first." };

  const { error } = await supabase
    .from("case_note_checkoffs")
    .update({
      status: checked ? "confirmed" : "missing",
      confirmed_via: checked ? "manual" : null,
    })
    .eq("id", checkoffId);

  if (error) return { ok: false, error: error.message };

  revalidateCaseNotes();
  return { ok: true };
}

export async function overrideCheckoff(
  checkoffId: string,
  reasonCode: OverrideReason,
  reasonNote?: string,
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();

  const { error: coError } = await supabase
    .from("case_note_checkoffs")
    .update({ status: "overridden", confirmed_via: null })
    .eq("id", checkoffId);

  if (coError) return { ok: false, error: coError.message };

  const { data: existing } = await supabase
    .from("case_note_overrides")
    .select("id")
    .eq("checkoff_id", checkoffId)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("case_note_overrides")
      .update({
        reason_code: reasonCode,
        reason_note: reasonNote?.trim() || null,
        logged_by: admin.id,
        logged_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("case_note_overrides").insert({
      checkoff_id: checkoffId,
      reason_code: reasonCode,
      reason_note: reasonNote?.trim() || null,
      logged_by: admin.id,
    });
  }

  revalidateCaseNotes();
  return { ok: true, message: "Override saved." };
}

export async function uploadCatalystExport(
  weekId: string,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };

  const name = file.name.toLowerCase();
  if (!name.endsWith(".csv")) {
    return {
      ok: false,
      error: "Only CSV exports are supported. Export from Catalyst as CSV.",
    };
  }

  const csvText = await file.text();
  const data = await getCaseNotesData(weekId);
  if (!data) return { ok: false, error: "Week not found." };

  const result = parseAndMatchCatalystExport(csvText, data.catalystTargets);
  if (result.rowsTotal === 0) {
    return {
      ok: false,
      error: "Could not parse the file. Expected columns: Student, Service Date, Session Time, User.",
    };
  }

  const supabase = await createClient();

  const { data: upload, error: uploadError } = await supabase
    .from("catalyst_uploads")
    .insert({
      week_id: weekId,
      file_name: file.name,
      uploaded_by: admin.id,
      rows_total: result.rowsTotal,
      rows_matched: result.rowsMatched,
    })
    .select("id")
    .single();

  if (uploadError) return { ok: false, error: uploadError.message };

  for (const key of result.matchedKeys) {
    const { data: co } = await supabase
      .from("case_note_checkoffs")
      .select("id, status")
      .eq("week_id", weekId)
      .eq("client_id", key.clientId)
      .eq("session_date", key.sessionDate)
      .eq("slot", key.slot)
      .maybeSingle();

    if (!co || co.status === "not_applicable" || co.status === "overridden") continue;

    await supabase
      .from("case_note_checkoffs")
      .update({
        status: "confirmed",
        confirmed_via: "upload",
        matched_upload_id: upload.id,
      })
      .eq("id", co.id);
  }

  revalidateCaseNotes();
  return {
    ok: true,
    message: `${file.name} matched — ${result.rowsMatched} note${result.rowsMatched === 1 ? "" : "s"} auto-checked against this week's schedule.`,
  };
}

export async function sendWeeklyReport(weekId: string): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  revalidateCaseNotes();
  return {
    ok: true,
    message: "Weekly compliance report queued (Resend stub — no PHI in email).",
  };
}
