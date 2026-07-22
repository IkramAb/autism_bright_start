import { createClient } from "@/lib/supabase/server";
import type { CatalystMatchTarget } from "@/lib/catalyst-parser";
import {
  DEFAULT_WEEK_ID,
  overrideReasonLabel,
  staffShortName,
  type SessionPeriod,
  type ScheduleStatus,
  type CheckoffStatus,
  type OverrideReason,
  type ComplianceWeekOption,
  type ScheduleCell,
  type ScheduleClientRow,
  type CheckoffSlotView,
  type CheckoffRow,
  type ComplianceStats,
  type ComplianceDayCell,
  type ComplianceClientRow,
  type MissingNoteItem,
  type StaffOption,
  type CaseNotesData,
} from "@/lib/case-notes-shared";

export {
  DEFAULT_WEEK_ID,
  OVERRIDE_REASONS,
  overrideReasonLabel,
  staffShortName,
  type SessionPeriod,
  type ScheduleStatus,
  type CheckoffStatus,
  type OverrideReason,
  type ComplianceWeekOption,
  type ScheduleDayColumn,
  type ScheduleClientRow,
  type CheckoffSlotView,
  type CheckoffRow,
  type ComplianceStats,
  type ComplianceDayCell,
  type ComplianceClientRow,
  type MissingNoteItem,
  type StaffOption,
  type CaseNotesData,
} from "@/lib/case-notes-shared";

type WeekRow = {
  id: string;
  week_start: string;
  week_end: string;
  status: string;
};

type AssignmentRow = {
  id: string;
  week_id: string;
  client_id: string;
  session_date: string;
  session_period: SessionPeriod;
  assigned_staff_id: string | null;
  status: ScheduleStatus;
  covering_for_staff_id: string | null;
};

type CheckoffRowDb = {
  id: string;
  week_id: string;
  client_id: string;
  session_date: string;
  slot: number;
  session_period: SessionPeriod;
  assigned_staff_id: string | null;
  status: CheckoffStatus;
  session_time_range: string | null;
  confirmed_via: "manual" | "upload" | null;
};

type OverrideRowDb = {
  checkoff_id: string;
  reason_code: OverrideReason;
  reason_note: string | null;
};

type ClientRef = { id: string; ref_code: string };

function weekLabel(start: string, end: string): string {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `Week of ${fmt(s)} – ${fmt(e)}, ${s.getFullYear()}`;
}

function weekdayDates(weekStart: string): string[] {
  const dates: string[] = [];
  const d = new Date(weekStart + "T12:00:00");
  for (let i = 0; i < 5; i++) {
    const copy = new Date(d);
    copy.setDate(d.getDate() + i);
    dates.push(copy.toISOString().slice(0, 10));
  }
  return dates;
}

function dayHeaderLabel(date: string): string {
  const d = new Date(date + "T12:00:00");
  const wd = d.toLocaleDateString("en-US", { weekday: "short" });
  const md = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${wd} ${md}`;
}

function dayShortLabel(date: string): string {
  const d = new Date(date + "T12:00:00");
  const wd = d.toLocaleDateString("en-US", { weekday: "short" });
  const md = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${wd}, ${md}`;
}

function toWeekOption(row: WeekRow): ComplianceWeekOption {
  return {
    id: row.id,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    label: weekLabel(row.week_start, row.week_end),
    status: row.status,
  };
}

export async function getComplianceWeeks(): Promise<ComplianceWeekOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("compliance_weeks")
    .select("id, week_start, week_end, status")
    .order("week_start", { ascending: false });
  return ((data ?? []) as WeekRow[]).map(toWeekOption);
}

export async function getCaseNotesData(weekId?: string): Promise<CaseNotesData | null> {
  const supabase = await createClient();

  const [{ data: weeksRaw }, { data: staffRaw }] = await Promise.all([
    supabase.from("compliance_weeks").select("id, week_start, week_end, status").order("week_start", { ascending: false }),
    supabase.from("staff").select("id, full_name").eq("role_type", "rbt").order("full_name"),
  ]);

  const weeks = ((weeksRaw ?? []) as WeekRow[]).map(toWeekOption);
  if (!weeks.length) return null;

  const week =
    weeks.find((w) => w.id === (weekId ?? DEFAULT_WEEK_ID)) ?? weeks[0];

  const staffById = new Map(
    ((staffRaw ?? []) as { id: string; full_name: string }[]).map((s) => [
      s.id,
      s.full_name,
    ]),
  );
  const staffOptions: StaffOption[] = ((staffRaw ?? []) as { id: string; full_name: string }[]).map(
    (s) => ({
      id: s.id,
      name: s.full_name,
      shortName: staffShortName(s.full_name),
    }),
  );

  const [{ data: assignmentsRaw }, { data: checkoffsRaw }, { data: uploadsRaw }] =
    await Promise.all([
      supabase
        .from("bt_schedule_assignments")
        .select("*")
        .eq("week_id", week.id)
        .order("session_date"),
      supabase.from("case_note_checkoffs").select("*").eq("week_id", week.id),
      supabase
        .from("catalyst_uploads")
        .select("file_name, rows_total, rows_matched, uploaded_at")
        .eq("week_id", week.id)
        .order("uploaded_at", { ascending: false })
        .limit(1),
    ]);

  const assignments = (assignmentsRaw ?? []) as AssignmentRow[];
  const checkoffs = (checkoffsRaw ?? []) as CheckoffRowDb[];

  const checkoffIds = checkoffs.map((c) => c.id);
  const { data: overridesRaw } = checkoffIds.length
    ? await supabase
        .from("case_note_overrides")
        .select("checkoff_id, reason_code, reason_note")
        .in("checkoff_id", checkoffIds)
    : { data: [] };
  const overrides = (overridesRaw ?? []) as OverrideRowDb[];
  const overrideByCheckoff = new Map(overrides.map((o) => [o.checkoff_id, o]));

  const clientIds = [...new Set(assignments.map((a) => a.client_id))];
  let clients: ClientRef[] = [];
  if (clientIds.length) {
    const { data: clientsRaw } = await supabase
      .from("clients")
      .select("id, ref_code")
      .in("id", clientIds);
    clients = (clientsRaw ?? []) as ClientRef[];
  }
  const refByClient = new Map(clients.map((c) => [c.id, c.ref_code]));
  clients.sort((a, b) => a.ref_code.localeCompare(b.ref_code));

  const dates = weekdayDates(week.weekStart);
  const assignKey = (clientId: string, date: string, period: SessionPeriod) =>
    `${clientId}|${date}|${period}`;
  const assignMap = new Map(
    assignments.map((a) => [assignKey(a.client_id, a.session_date, a.session_period), a]),
  );

  const checkoffKey = (clientId: string, date: string, slot: number) =>
    `${clientId}|${date}|${slot}`;
  const checkoffMap = new Map(
    checkoffs.map((c) => [checkoffKey(c.client_id, c.session_date, c.slot), c]),
  );

  function buildScheduleCell(
    clientId: string,
    date: string,
    period: SessionPeriod,
  ): ScheduleCell | null {
    const a = assignMap.get(assignKey(clientId, date, period));
    if (!a) return null;
    const staffName = a.assigned_staff_id ? staffById.get(a.assigned_staff_id) ?? null : null;
    const coveringName = a.covering_for_staff_id
      ? staffById.get(a.covering_for_staff_id) ?? null
      : null;
    return {
      assignmentId: a.id,
      period,
      status: a.status,
      staffId: a.assigned_staff_id,
      staffName,
      staffShort: staffName ? staffShortName(staffName) : null,
      coveringForStaffId: a.covering_for_staff_id,
      coveringForName: coveringName,
    };
  }

  const schedule: ScheduleClientRow[] = clients.map((c) => ({
    clientId: c.id,
    refCode: c.ref_code,
    days: dates.map((date) => ({
      date,
      headerLabel: dayHeaderLabel(date),
      am: buildScheduleCell(c.id, date, "am"),
      pm: buildScheduleCell(c.id, date, "pm"),
    })),
  }));

  const catalystTargets: CatalystMatchTarget[] = [];
  for (const a of assignments) {
    if (!a.assigned_staff_id || a.status === "unassigned" || a.status === "no_session") continue;
    const staffName = staffById.get(a.assigned_staff_id);
    if (!staffName) continue;
    catalystTargets.push({
      clientId: a.client_id,
      refCode: refByClient.get(a.client_id) ?? "",
      sessionDate: a.session_date,
      period: a.session_period,
      assignedStaffId: a.assigned_staff_id,
      staffFullName: staffName,
      slot: a.session_period === "am" ? 1 : 2,
    });
  }

  const checkoffRows: CheckoffRow[] = [];
  const datesWithAssignments = new Set(assignments.map((a) => `${a.client_id}|${a.session_date}`));

  for (const c of clients) {
    for (const date of dates) {
      if (!datesWithAssignments.has(`${c.id}|${date}`)) continue;

      const dayAssigns = assignments.filter(
        (a) => a.client_id === c.id && a.session_date === date,
      );
      const isUnassigned = dayAssigns.some((a) => a.status === "unassigned");
      const hasCovering = dayAssigns.some((a) => a.status === "covering");

      const staffNames = dayAssigns
        .filter((a) => a.assigned_staff_id)
        .map((a) => staffById.get(a.assigned_staff_id!) ?? "")
        .filter(Boolean);
      const uniqueStaff = [...new Set(staffNames)];
      let assignedStaffLabel = uniqueStaff.join(" / ");
      if (isUnassigned) assignedStaffLabel = "Unassigned";

      function slotView(slot: 1 | 2): CheckoffSlotView | null {
        const co = checkoffMap.get(checkoffKey(c.id, date, slot));
        if (!co) return null;
        const ov = overrideByCheckoff.get(co.id);
        return {
          id: co.id,
          slot,
          period: co.session_period,
          status: co.status,
          sessionTimeRange: co.session_time_range,
          confirmedVia: co.confirmed_via,
          override: ov
            ? {
                reasonCode: ov.reason_code,
                reasonLabel: overrideReasonLabel(ov.reason_code),
                reasonNote: ov.reason_note,
              }
            : null,
        };
      }

      const slot1 = slotView(1);
      const slot2 = slotView(2);

      let rowClass: CheckoffRow["rowClass"] = "";
      if (isUnassigned) rowClass = "cn-row-unfilled";
      else if (slot1?.status === "overridden" || slot2?.status === "overridden")
        rowClass = "cn-row-override";
      else if (slot1?.status === "missing" || slot2?.status === "missing") rowClass = "cn-row-flag";

      checkoffRows.push({
        clientId: c.id,
        refCode: c.ref_code,
        sessionDate: date,
        dateLabel: dayShortLabel(date),
        assignedStaffLabel,
        hasCovering,
        isUnassigned,
        slot1,
        slot2,
        rowClass,
      });
    }
  }

  checkoffRows.sort(
    (a, b) =>
      a.refCode.localeCompare(b.refCode) ||
      a.sessionDate.localeCompare(b.sessionDate),
  );

  let confirmedCount = 0;
  let overriddenCount = 0;
  let missingCount = 0;
  let expectedCount = 0;
  let unassignedSessions = 0;

  for (const co of checkoffs) {
    if (co.status === "not_applicable") {
      unassignedSessions += 1;
      continue;
    }
    expectedCount += 1;
    if (co.status === "confirmed") confirmedCount += 1;
    else if (co.status === "overridden") overriddenCount += 1;
    else if (co.status === "missing" || co.status === "pending") missingCount += 1;
  }

  const missingClientIds = new Set<string>();
  for (const co of checkoffs) {
    if (co.status === "missing") missingClientIds.add(co.client_id);
  }

  const stats: ComplianceStats = {
    confirmed: confirmedCount,
    expected: expectedCount,
    overridden: overriddenCount,
    missing: missingCount,
    missingClientCount: missingClientIds.size,
    unassignedSessions,
    complianceRate:
      expectedCount > 0
        ? Math.round(((confirmedCount + overriddenCount) / expectedCount) * 100)
        : 100,
  };

  const complianceGrid: ComplianceClientRow[] = clients.map((c) => {
    let weekConfirmed = 0;
    let weekExpected = 0;
    let weekOverridden = 0;

    const days: ComplianceDayCell[] = dates.map((date) => {
      const dayCheckoffs = checkoffs.filter(
        (co) => co.client_id === c.id && co.session_date === date,
      );
      if (!dayCheckoffs.length) {
        return {
          confirmed: 0,
          total: 0,
          overridden: 0,
          hasUnassigned: false,
          pillClass: "pill-gray",
          label: "—",
        };
      }

      const hasUnassigned = dayCheckoffs.some((co) => co.status === "not_applicable");
      const applicable = dayCheckoffs.filter((co) => co.status !== "not_applicable");
      const confirmed = applicable.filter((co) => co.status === "confirmed").length;
      const overridden = applicable.filter((co) => co.status === "overridden").length;
      const total = applicable.length;

      weekConfirmed += confirmed + overridden;
      weekExpected += total;
      weekOverridden += overridden;

      if (hasUnassigned && applicable.length === 0) {
        return {
          confirmed: 0,
          total: 0,
          overridden: 0,
          hasUnassigned: true,
          pillClass: "pill-amber",
          label: "unassigned",
        };
      }

      const resolved = confirmed + overridden;
      let pillClass = "pill-green";
      if (hasUnassigned && resolved < total) pillClass = "pill-amber";
      else if (resolved < total) pillClass = "pill-coral";
      else if (overridden > 0) pillClass = "cn-pill-overridden";

      const label =
        total > 0
          ? `${resolved}/${total}${overridden > 0 ? " ⓞ" : ""}`
          : "—";

      return {
        confirmed,
        total,
        overridden,
        hasUnassigned,
        pillClass,
        label,
      };
    });

    let weekTone: "teal" | "amber" | "coral" = "teal";
    if (weekExpected > 0 && weekConfirmed < weekExpected) {
      const hasUnassignedDay = days.some((d) => d.hasUnassigned);
      weekTone = hasUnassignedDay ? "amber" : "coral";
    }

    return {
      clientId: c.id,
      refCode: c.ref_code,
      days,
      weekLabel: `${weekConfirmed}/${weekExpected}${weekOverridden > 0 ? "*" : ""}`,
      weekTone,
    };
  });

  const missingNotes: MissingNoteItem[] = [];
  const missingByClient = new Map<string, { slots: string[]; staff: Set<string> }>();

  for (const co of checkoffs.filter((c) => c.status === "missing")) {
    const ref = refByClient.get(co.client_id) ?? "????";
    const entry = missingByClient.get(co.client_id) ?? { slots: [], staff: new Set<string>() };
    const periodLabel = co.session_period === "am" ? "AM" : "PM";
    entry.slots.push(`${dayShortLabel(co.session_date)} ${periodLabel}`);
    if (co.assigned_staff_id) {
      const n = staffById.get(co.assigned_staff_id);
      if (n) entry.staff.add(n);
    }
    missingByClient.set(co.client_id, entry);
  }

  for (const [clientId, info] of missingByClient) {
    const ref = refByClient.get(clientId) ?? "????";
    const staffList = [...info.staff];
    missingNotes.push({
      refCode: ref,
      clientId,
      line: `Client #${ref} — missing ${info.slots.length} note${info.slots.length === 1 ? "" : "s"} (${info.slots.join(", ")}${staffList.length ? ` · assigned: ${staffList.join(", ")}` : ""})`,
      staffNames: staffList,
    });
  }

  const checkedCount = checkoffs.filter(
    (c) => c.status === "confirmed" || c.status === "overridden",
  ).length;
  const applicableTotal = checkoffs.filter((c) => c.status !== "not_applicable").length;
  const checkoffSummary = `${checkedCount} of ${applicableTotal} notes checked · ${overriddenCount} overridden`;

  const upload = uploadsRaw?.[0] as
    | { file_name: string; rows_total: number; rows_matched: number; uploaded_at: string }
    | undefined;

  return {
    week,
    weeks,
    schedule,
    checkoffs: checkoffRows,
    checkoffSummary,
    stats,
    complianceGrid,
    missingNotes,
    staffOptions,
    catalystTargets,
    lastUpload: upload
      ? {
          fileName: upload.file_name,
          rowsTotal: upload.rows_total,
          rowsMatched: upload.rows_matched,
          uploadedAt: upload.uploaded_at,
        }
      : null,
  };
}
