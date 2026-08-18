import type { CatalystMatchTarget } from "@/lib/catalyst-parser";

export const DEFAULT_WEEK_ID = "11110000-0000-0000-0000-000000000615";

export type SessionPeriod = "am" | "pm";
export type ScheduleStatus = "assigned" | "covering" | "unassigned" | "no_session";
export type CheckoffStatus =
  | "pending"
  | "confirmed"
  | "missing"
  | "overridden"
  | "not_applicable";
export type OverrideReason =
  | "cancelled_absent"
  | "bt_sick_no_coverage"
  | "pending_bcba_review"
  | "clinic_closure"
  | "other";

export const OVERRIDE_REASONS: { code: OverrideReason; label: string }[] = [
  { code: "cancelled_absent", label: "Session was cancelled / client absent" },
  { code: "bt_sick_no_coverage", label: "BT called in sick, no coverage found" },
  { code: "pending_bcba_review", label: "Note pending BCBA review in Catalyst" },
  { code: "clinic_closure", label: "Clinic closure / holiday" },
  { code: "other", label: "Other (explain below)" },
];

export function overrideReasonLabel(code: OverrideReason): string {
  return OVERRIDE_REASONS.find((r) => r.code === code)?.label ?? code;
}

export function staffShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export type ComplianceWeekOption = {
  id: string;
  weekStart: string;
  weekEnd: string;
  label: string;
  status: string;
};

export type ScheduleCell = {
  assignmentId: string | null;
  period: SessionPeriod;
  status: ScheduleStatus;
  staffId: string | null;
  staffName: string | null;
  staffShort: string | null;
  coveringForStaffId: string | null;
  coveringForName: string | null;
};

export type ScheduleDayColumn = {
  date: string;
  headerLabel: string;
  am: ScheduleCell | null;
  pm: ScheduleCell | null;
};

export type ScheduleClientRow = {
  clientId: string;
  refCode: string;
  days: ScheduleDayColumn[];
};

export type CheckoffSlotView = {
  id: string;
  slot: 1 | 2;
  period: SessionPeriod;
  status: CheckoffStatus;
  sessionTimeRange: string | null;
  confirmedVia: "manual" | "upload" | null;
  override: {
    reasonCode: OverrideReason;
    reasonLabel: string;
    reasonNote: string | null;
  } | null;
};

export type CheckoffRow = {
  clientId: string;
  refCode: string;
  sessionDate: string;
  dateLabel: string;
  assignedStaffLabel: string;
  hasCovering: boolean;
  isUnassigned: boolean;
  slot1: CheckoffSlotView | null;
  slot2: CheckoffSlotView | null;
  rowClass: "" | "cn-row-flag" | "cn-row-unfilled" | "cn-row-override";
};

export type ComplianceStats = {
  confirmed: number;
  expected: number;
  overridden: number;
  missing: number;
  missingClientCount: number;
  unassignedSessions: number;
  complianceRate: number;
};

export type ComplianceDayCell = {
  confirmed: number;
  total: number;
  overridden: number;
  hasUnassigned: boolean;
  pillClass: string;
  label: string;
};

export type ComplianceClientRow = {
  clientId: string;
  refCode: string;
  days: ComplianceDayCell[];
  weekLabel: string;
  weekTone: "teal" | "amber" | "coral";
};

export type MissingNoteItem = {
  refCode: string;
  clientId: string;
  line: string;
  staffNames: string[];
};

export type StaffOption = {
  id: string;
  name: string;
  shortName: string;
};

export type CaseNotesData = {
  week: ComplianceWeekOption;
  weeks: ComplianceWeekOption[];
  schedule: ScheduleClientRow[];
  checkoffs: CheckoffRow[];
  checkoffSummary: string;
  stats: ComplianceStats;
  complianceGrid: ComplianceClientRow[];
  missingNotes: MissingNoteItem[];
  staffOptions: StaffOption[];
  catalystTargets: CatalystMatchTarget[];
  lastUpload: {
    fileName: string;
    rowsTotal: number;
    rowsMatched: number;
    uploadedAt: string;
  } | null;
};

/* --- ISO week-date helpers -------------------------------------------------
   All UTC-based: the existing weekdayDates()/weekLabel() in case-notes.ts parse
   at local noon, which is fine for display but unsafe for the arithmetic below.
   --------------------------------------------------------------------------- */

/** Shift an ISO date by whole days. */
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isMondayIso(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(iso + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.getUTCDay() === 1;
}

/** Monday of the ISO week containing `iso` (defaults to today). */
export function mondayOfIso(iso?: string): string {
  const base = iso ?? new Date().toISOString().slice(0, 10);
  const d = new Date(base + "T00:00:00Z");
  const shift = (d.getUTCDay() + 6) % 7; // Mon→0, Tue→1, … Sun→6
  return addDaysIso(base, -shift);
}

/** Friday of the week starting at `weekStart`. */
export function weekEndFor(weekStart: string): string {
  return addDaysIso(weekStart, 4);
}

/** Whole days between two ISO dates (b − a). */
export function daysBetweenIso(a: string, b: string): number {
  return Math.round(
    (Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000,
  );
}
