import type {
  StaffStatus,
  TrainingStatus,
  BackgroundStatus,
} from "@/lib/types/staff";

export const CHECKLIST_GROUP_LABELS: Record<string, string> = {
  hiring_paperwork: "Hiring paperwork",
  background_study: "Background study",
  required_training: "Required training",
  global_one_time: "Global one-time",
  program_onboarding: "Program onboarding",
  locked_needs_bg_check: "Locked until background check",
};

export const BG_STEP_LABELS: Record<string, string> = {
  step1_application: "Step 1 — Application",
  step2_fingerprinting: "Step 2 — Fingerprinting",
  step3_approval: "Step 3 — Approval",
  study_number: "Study number",
};

export function staffStatusPill(status: StaffStatus): { label: string; className: string } {
  switch (status) {
    case "onboarding":
      return { label: "Onboarding", className: "pill-amber" };
    case "active":
      return { label: "Active", className: "pill-green" };
    case "needs_action":
      return { label: "Needs action", className: "pill-coral" };
    case "fully_onboarded":
      return { label: "Fully onboarded", className: "pill-green" };
    default:
      return { label: "Inactive", className: "pill-gray" };
  }
}

export function trainingStatusPill(status: TrainingStatus): { label: string; className: string } {
  switch (status) {
    case "complete":
      return { label: "Complete", className: "pill-green" };
    case "in_progress":
      return { label: "In progress", className: "pill-amber" };
    case "overdue":
      return { label: "Overdue", className: "pill-coral" };
    case "upcoming":
      return { label: "Upcoming", className: "pill-blue" };
    default:
      return { label: "Pending", className: "pill-gray" };
  }
}

export function bgStatusPill(status: BackgroundStatus): { label: string; className: string } {
  switch (status) {
    case "complete":
    case "logged":
      return { label: status === "logged" ? "Logged" : "Complete", className: "pill-green" };
    case "in_progress":
      return { label: "In progress", className: "pill-amber" };
    case "overdue":
      return { label: "Overdue", className: "pill-coral" };
    case "blocked":
      return { label: "Blocked", className: "pill-gray" };
    default:
      return { label: "Pending", className: "pill-gray" };
  }
}

export function avatarStyles(bg: string | null, color: string | null) {
  const bgMap: Record<string, string> = {
    "teal-light": "var(--color-teal-light)",
    "blue-light": "var(--color-blue-light)",
    "amber-light": "var(--color-amber-light)",
    "pink-light": "var(--color-pink-light)",
    "coral-light": "var(--color-coral-light)",
  };
  const colorMap: Record<string, string> = {
    "teal-dark": "var(--color-teal-dark)",
    "blue-dark": "var(--color-blue-dark)",
    "amber-dark": "var(--color-amber-dark)",
    "pink-dark": "var(--color-pink-dark)",
    "coral-dark": "var(--color-coral-dark)",
  };
  return {
    background: bgMap[bg ?? ""] ?? "var(--color-blue-light)",
    color: colorMap[color ?? ""] ?? "var(--color-blue-dark)",
  };
}

export function fmtDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function checklistProgress(items: { done: boolean }[]): number {
  if (!items.length) return 0;
  return Math.round((items.filter((i) => i.done).length / items.length) * 100);
}

export function trainingSummary(
  trainings: { status: TrainingStatus }[],
): { label: string; className: string } {
  // Without this, zero trainings reads as a green "All complete" — a reassuring
  // wrong answer for staff added without an onboarding checklist.
  if (!trainings.length) return { label: "No trainings tracked", className: "pill-gray" };
  const pending = trainings.filter((t) => t.status === "pending" || t.status === "in_progress").length;
  const overdue = trainings.filter((t) => t.status === "overdue").length;
  if (overdue) return { label: "BG check overdue", className: "pill-coral" };
  if (pending) return { label: `${pending} pending`, className: "pill-amber" };
  return { label: "All complete", className: "pill-green" };
}

export function certSummary(staff: {
  role_type: string | null;
  bcba_cert_number: string | null;
  status: StaffStatus;
}): { label: string; className: string } {
  if (staff.role_type === "bcba" && staff.bcba_cert_number)
    return { label: "BCBA certified", className: "pill-green" };
  if (staff.role_type === "bcba")
    return { label: "BCBA cert on file", className: "pill-green" };
  if (staff.status === "fully_onboarded" || staff.status === "active")
    return { label: "RBT certified", className: "pill-green" };
  return { label: "RBT — in progress", className: "pill-gray" };
}
