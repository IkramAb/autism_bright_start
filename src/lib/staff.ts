import { createClient } from "@/lib/supabase/server";
import {
  avatarStyles,
  staffStatusPill,
  trainingSummary,
  certSummary,
  checklistProgress,
  trainingStatusPill,
  fmtDate,
  CHECKLIST_GROUP_LABELS,
} from "@/lib/staff-utils";
import type {
  StaffRow,
  OnboardingItemRow,
  TrainingRow,
  BackgroundCheckRow,
  StaffDocumentRow,
  StaffStatus,
} from "@/lib/types/staff";

export type StaffListRow = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  roleType: string | null;
  status: StaffStatus;
  statusLabel: string;
  statusClass: string;
  hiredLabel: string;
  trainingLabel: string;
  trainingClass: string;
  certLabel: string;
  certClass: string;
  initials: string;
  avatarBg: string;
  avatarColor: string;
};

export type StaffDetail = {
  id: string;
  fullName: string;
  role: string;
  roleType: string | null;
  email: string | null;
  phone: string | null;
  hiredLabel: string;
  hiredOn: string | null;
  status: StaffStatus;
  statusLabel: string;
  statusClass: string;
  initials: string;
  avatarBg: string;
  avatarColor: string;
  notes: string | null;
  driveFolderUrl: string | null;
  bcbaCert: string | null;
  bgStudyNumber: string | null;
  progressPct: number;
  checklistGroups: {
    group: string;
    label: string;
    items: OnboardingItemRow[];
  }[];
  trainings: TrainingRow[];
  backgroundChecks: BackgroundCheckRow[];
  documents: StaffDocumentRow[];
  alert: string | null;
};

export type OnboardingCard = {
  id: string;
  fullName: string;
  role: string;
  status: StaffStatus;
  statusLabel: string;
  statusClass: string;
  progressPct: number;
  previewItems: { label: string; done: boolean; due: string | null }[];
  alert: string | null;
  initials: string;
  avatarBg: string;
  avatarColor: string;
};

export type TrainingFlatRow = {
  id: string;
  staffId: string;
  staffName: string;
  trainingName: string;
  status: TrainingRow["status"];
  statusLabel: string;
  statusClass: string;
  dueLabel: string;
  completedLabel: string;
  certUrl: string | null;
};

async function loadStaffExtras(staffId: string) {
  const supabase = await createClient();
  const [checklist, trainings, bg, docs] = await Promise.all([
    supabase
      .from("staff_onboarding_items")
      .select("*")
      .eq("staff_id", staffId)
      .order("sort_order"),
    supabase.from("staff_trainings").select("*").eq("staff_id", staffId).order("name"),
    supabase
      .from("staff_background_checks")
      .select("*")
      .eq("staff_id", staffId)
      .order("sort_order"),
    supabase.from("staff_documents").select("*").eq("staff_id", staffId).order("name"),
  ]);
  return {
    checklist: (checklist.data ?? []) as OnboardingItemRow[],
    trainings: (trainings.data ?? []) as TrainingRow[],
    bg: (bg.data ?? []) as BackgroundCheckRow[],
    docs: (docs.data ?? []) as StaffDocumentRow[],
  };
}

function buildAlert(
  staff: StaffRow,
  checklist: OnboardingItemRow[],
  bg: BackgroundCheckRow[],
): string | null {
  const overdueBg = bg.find((b) => b.status === "overdue");
  if (overdueBg) return `${overdueBg.note ?? "Background check step overdue."}`;
  const locked = checklist.find((i) => i.locked);
  if (locked?.lock_reason) return locked.lock_reason;
  const blocked = checklist.find((i) => i.blocked && !i.done);
  if (blocked) return `${blocked.label} is blocked pending prior steps.`;
  if (staff.status === "needs_action") return "This employee needs immediate follow-up.";
  return null;
}

function groupChecklist(items: OnboardingItemRow[]) {
  const groups = new Map<string, OnboardingItemRow[]>();
  for (const item of items) {
    const arr = groups.get(item.checklist_group) ?? [];
    arr.push(item);
    groups.set(item.checklist_group, arr);
  }
  return [...groups.entries()].map(([group, groupItems]) => ({
    group,
    label: CHECKLIST_GROUP_LABELS[group] ?? group,
    items: groupItems,
  }));
}

export async function getStaffDirectoryData(): Promise<StaffListRow[]> {
  const supabase = await createClient();
  const { data: staff } = await supabase.from("staff").select("*").order("full_name");
  const { data: trainings } = await supabase.from("staff_trainings").select("staff_id, status");

  const trainingsByStaff = new Map<string, TrainingRow["status"][]>();
  for (const t of trainings ?? []) {
    const arr = trainingsByStaff.get(t.staff_id as string) ?? [];
    arr.push(t.status as TrainingRow["status"]);
    trainingsByStaff.set(t.staff_id as string, arr);
  }

  return ((staff ?? []) as StaffRow[]).map((s) => {
    const sp = staffStatusPill(s.status);
    const av = avatarStyles(s.avatar_bg, s.avatar_color);
    const ts = trainingSummary(
      (trainingsByStaff.get(s.id) ?? []).map((status) => ({ status })),
    );
    const cs = certSummary(s);
    return {
      id: s.id,
      fullName: s.full_name,
      email: s.email,
      phone: s.phone ?? null,
      role: s.role,
      roleType: s.role_type,
      status: s.status,
      statusLabel: sp.label,
      statusClass: sp.className,
      hiredLabel: fmtDate(s.hired_on),
      trainingLabel: ts.label,
      trainingClass: ts.className,
      certLabel: cs.label,
      certClass: cs.className,
      initials: s.avatar_initials ?? s.full_name.split(" ").map((p) => p[0]).join("").slice(0, 2),
      avatarBg: av.background,
      avatarColor: av.color,
    };
  });
}

export async function getStaffDetail(id: string): Promise<StaffDetail | null> {
  const supabase = await createClient();
  const { data: staff } = await supabase.from("staff").select("*").eq("id", id).maybeSingle();
  if (!staff) return null;
  const s = staff as StaffRow;
  const { checklist, trainings, bg, docs } = await loadStaffExtras(id);
  const sp = staffStatusPill(s.status);
  const av = avatarStyles(s.avatar_bg, s.avatar_color);

  return {
    id: s.id,
    fullName: s.full_name,
    role: s.role,
    roleType: s.role_type,
    email: s.email,
    phone: s.phone,
    hiredLabel: fmtDate(s.hired_on),
    hiredOn: s.hired_on,
    status: s.status,
    statusLabel: sp.label,
    statusClass: sp.className,
    initials: s.avatar_initials ?? "??",
    avatarBg: av.background,
    avatarColor: av.color,
    notes: s.notes,
    driveFolderUrl: s.drive_folder_url,
    bcbaCert: s.bcba_cert_number,
    bgStudyNumber: s.background_study_number,
    progressPct: checklistProgress(checklist),
    checklistGroups: groupChecklist(checklist),
    trainings,
    backgroundChecks: bg,
    documents: docs,
    alert: buildAlert(s, checklist, bg),
  };
}

export async function getOnboardingListData(): Promise<OnboardingCard[]> {
  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("staff")
    .select("*")
    .in("status", ["onboarding", "needs_action"])
    .order("full_name");

  const cards: OnboardingCard[] = [];
  for (const row of (staff ?? []) as StaffRow[]) {
    const { checklist, bg } = await loadStaffExtras(row.id);
    const sp = staffStatusPill(row.status);
    const av = avatarStyles(row.avatar_bg, row.avatar_color);
    const pending = checklist.filter((i) => !i.done).slice(0, 4);
    cards.push({
      id: row.id,
      fullName: row.full_name,
      role: row.role,
      status: row.status,
      statusLabel: sp.label,
      statusClass: sp.className,
      progressPct: checklistProgress(checklist),
      previewItems: pending.map((i) => ({
        label: i.label,
        done: i.done,
        due: i.due_on ? fmtDate(i.due_on) : null,
      })),
      alert: buildAlert(row, checklist, bg),
      initials: row.avatar_initials ?? "??",
      avatarBg: av.background,
      avatarColor: av.color,
    });
  }
  return cards;
}

export async function getTrainingTrackerData(): Promise<TrainingFlatRow[]> {
  const supabase = await createClient();
  const [{ data: trainings }, { data: staff }] = await Promise.all([
    supabase.from("staff_trainings").select("*").order("name"),
    supabase.from("staff").select("id, full_name"),
  ]);

  const staffById = new Map((staff ?? []).map((s) => [s.id as string, s.full_name as string]));

  return ((trainings ?? []) as TrainingRow[]).map((row) => {
    const tp = trainingStatusPill(row.status);
    return {
      id: row.id,
      staffId: row.staff_id,
      staffName: staffById.get(row.staff_id) ?? "Unknown",
      trainingName: row.name,
      status: row.status,
      statusLabel: tp.label,
      statusClass: tp.className,
      dueLabel: fmtDate(row.due_on),
      completedLabel: fmtDate(row.completed_on),
      certUrl: row.cert_drive_url,
    };
  });
}
