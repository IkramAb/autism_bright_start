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
