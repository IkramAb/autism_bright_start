export type StaffStatus =
  | "onboarding"
  | "active"
  | "needs_action"
  | "fully_onboarded"
  | "inactive";

export type TrainingStatus =
  | "pending"
  | "in_progress"
  | "complete"
  | "overdue"
  | "upcoming";

export type BackgroundStatus =
  | "pending"
  | "in_progress"
  | "complete"
  | "overdue"
  | "blocked"
  | "logged"
  | "not_assigned";

export type StaffRow = {
  id: string;
  full_name: string;
  role: string;
  role_type: string | null;
  email: string | null;
  phone: string | null;
  hired_on: string | null;
  status: StaffStatus;
  background_study_number: string | null;
  bcba_cert_number: string | null;
  avatar_initials: string | null;
  avatar_bg: string | null;
  avatar_color: string | null;
  notes: string | null;
  drive_folder_url: string | null;
};

export type OnboardingItemRow = {
  id: string;
  staff_id: string;
  label: string;
  checklist_group: string;
  sort_order: number;
  done: boolean;
  completed_on: string | null;
  due_on: string | null;
  locked: boolean;
  lock_reason: string | null;
  blocked: boolean;
};

export type TrainingRow = {
  id: string;
  staff_id: string;
  name: string;
  status: TrainingStatus;
  due_on: string | null;
  completed_on: string | null;
  cert_drive_url: string | null;
};

export type BackgroundCheckRow = {
  id: string;
  staff_id: string;
  step: string;
  status: BackgroundStatus;
  completed_on: string | null;
  note: string | null;
  sort_order: number;
};

export type StaffDocumentRow = {
  id: string;
  staff_id: string;
  name: string;
  status: string;
  submitted_on: string | null;
  drive_url: string | null;
};
