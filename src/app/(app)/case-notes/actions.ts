"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdmin } from "@/lib/auth";
import { parseAndMatchCatalystExport } from "@/lib/catalyst-parser";
import {
  type OverrideReason,
  type SessionPeriod,
  type ScheduleStatus,
  addDaysIso,
  daysBetweenIso,
  isMondayIso,
  weekEndFor,
} from "@/lib/case-notes-shared";
import { getCaseNotesData } from "@/lib/case-notes";
import type { Database } from "@/lib/supabase/types";

type CheckoffStatus = Database["public"]["Enums"]["checkoff_status"];

export type ActionResult = { ok: boolean; error?: string; message?: string };

function revalidateCaseNotes() {
  revalidatePath("/case-notes");
}

type Supa = Awaited<ReturnType<typeof createClient>>;

/**
 * Materializes the week's check-off slots from its schedule assignments. Takes
 * the client so callers that already authenticated don't pay for a second
 * getCurrentAdmin() (an auth.getUser() plus an admin_users query).
 */
async function materializeCheckoffs(supabase: Supa, weekId: string): Promise<ActionResult> {
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

/** Rebuilds the week's check-off slots from its schedule — repairs drift. */
export async function ensureCheckoffsForWeek(weekId: string): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  const result = await materializeCheckoffs(supabase, weekId);
  if (result.ok) revalidateCaseNotes();
  return result;
}

export type CreateWeekResult = ActionResult & { weekId?: string };

function weekRangeLabel(weekStart: string): string {
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(weekStart)} – ${fmt(weekEndFor(weekStart))}`;
}

/**
 * Creates a compliance week and, optionally, carries the recurring schedule
 * forward from an earlier week — then materializes the check-off slots so the
 * Catalyst export can be uploaded against it straight away.
 */
export async function createComplianceWeek(input: {
  /** ISO "YYYY-MM-DD"; must be a Monday. */
  weekStart: string;
  /** Week to copy the schedule from. Null/empty starts with an empty schedule. */
  copyFromWeekId?: string | null;
}): Promise<CreateWeekResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const { weekStart } = input;
  if (!isMondayIso(weekStart)) {
    return {
      ok: false,
      error: "Weeks run Monday to Friday — pick the Monday of the week you want to track.",
    };
  }

  const supabase = await createClient();

  const { data: created, error: insertError } = await supabase
    .from("compliance_weeks")
    .insert({ week_start: weekStart, week_end: weekEndFor(weekStart), status: "open" })
    .select("id")
    .single();

  if (insertError || !created) {
    const duplicate =
      insertError?.code === "23505" || /duplicate key/i.test(insertError?.message ?? "");
    return {
      ok: false,
      error: duplicate
        ? `A week starting ${weekRangeLabel(weekStart).split(" – ")[0]} already exists — pick it from the week selector instead.`
        : (insertError?.message ?? "Could not create the week."),
    };
  }

  const weekId = created.id as string;
  let copied = 0;

  if (input.copyFromWeekId) {
    const { data: source } = await supabase
      .from("compliance_weeks")
      .select("id, week_start")
      .eq("id", input.copyFromWeekId)
      .maybeSingle();

    if (source) {
      // Shift by the real delta, not a hardcoded +7 — skipping a holiday week
      // must still land sessions on the matching weekdays.
      const shift = daysBetweenIso(String(source.week_start), weekStart);

      const { data: assignments } = await supabase
        .from("bt_schedule_assignments")
        .select("client_id, session_date, session_period, assigned_staff_id, status")
        .eq("week_id", input.copyFromWeekId);

      if (assignments?.length) {
        const clientIds = [...new Set(assignments.map((a) => a.client_id))];
        const { data: clientRows } = await supabase
          .from("clients")
          .select("id, status")
          .in("id", clientIds);
        const inactive = new Set(
          (clientRows ?? []).filter((c) => c.status === "inactive").map((c) => c.id),
        );

        const rows = assignments
          .filter((a) => !inactive.has(a.client_id))
          .map((a) => ({
            week_id: weekId,
            client_id: a.client_id,
            session_date: addDaysIso(String(a.session_date), shift),
            session_period: a.session_period,
            assigned_staff_id: a.assigned_staff_id,
            // "covering" is a one-week exception; carrying it forward would
            // permanently mislabel the base schedule.
            status: a.status === "covering" ? ("assigned" as const) : a.status,
            covering_for_staff_id: null,
            updated_by: admin.id,
          }));

        if (rows.length) {
          const { error } = await supabase.from("bt_schedule_assignments").insert(rows);
          if (error) return { ok: false, error: error.message, weekId };
          copied = rows.length;
        }
      }
    }
  }

  const materialized = await materializeCheckoffs(supabase, weekId);
  if (!materialized.ok) return { ok: false, error: materialized.error, weekId };

  revalidateCaseNotes();
  revalidatePath("/dashboard");

  return {
    ok: true,
    weekId,
    message: copied
      ? `Week of ${weekRangeLabel(weekStart)} created — ${copied} sessions carried forward.`
      : `Week of ${weekRangeLabel(weekStart)} created — no schedule to carry forward. Build it in the Weekly schedule tab.`,
  };
}

/**
 * Opens or finalizes a week. Finalizing never blocks on unresolved notes — a
 * week with missing notes is exactly the one you want to close out and report
 * on. Its purpose is retiring a week that should stop driving the dashboard.
 */
export async function setWeekStatus(
  weekId: string,
  status: "open" | "finalized",
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };
  if (status !== "open" && status !== "finalized") {
    return { ok: false, error: "Invalid week status." };
  }

  const supabase = await createClient();

  let unresolved = 0;
  if (status === "finalized") {
    const { data } = await supabase
      .from("case_note_checkoffs")
      .select("status")
      .eq("week_id", weekId);
    unresolved = (data ?? []).filter(
      (r) => r.status === "missing" || r.status === "pending",
    ).length;
  }

  const { error } = await supabase
    .from("compliance_weeks")
    .update({ status })
    .eq("id", weekId);
  if (error) return { ok: false, error: error.message };

  revalidateCaseNotes();
  revalidatePath("/dashboard");

  return {
    ok: true,
    message:
      status === "open"
        ? "Week reopened."
        : unresolved > 0
          ? `Week finalized — ${unresolved} notes still unresolved.`
          : "Week finalized.",
  };
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
