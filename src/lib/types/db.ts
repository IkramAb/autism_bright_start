// Hand-maintained domain row types for the tables this app reads/writes.
// (The Supabase client generic stays permissive; these give us typing in code.)

export type AbaStatus = "new" | "not_new" | "unknown";
export type ReferralSource =
  | "website"
  | "phone"
  | "email"
  | "provider"
  | "walk_in"
  | "other";
export type MaStatus = "verified" | "unverified" | "none" | "unknown";
export type ClientStatus =
  | "active"
  | "onboarding"
  | "inactive"
  | "referred_out"
  | "closed";

export type ClientDocStatus =
  | "missing"
  | "requested"
  | "uploaded"
  | "submitted"
  | "pending_approval"
  | "approved"
  | "signed"
  | "awaiting_esig"
  | "not_sent"
  | "not_yet_created";

export type PipelineStage = {
  id: string;
  key: string;
  name: string;
  advance_trigger: string | null;
  sort_order: number;
  is_terminal: boolean;
};

export type ClientRow = {
  id: string;
  ref_code: string;
  age_label: string | null;
  aba_status: AbaStatus;
  referral_source: ReferralSource | null;
  ma_status: MaStatus;
  assigned_bcba_id: string | null;
  current_stage_id: string | null;
  status: ClientStatus;
  corrections_requested: boolean;
  phone_screen_due_on: string | null;
  cmde_submitted_on: string | null;
  itp_submitted_on: string | null;
  itp_drafting_started_on: string | null;
  drive_folder_url: string | null;
  created_at: string;
};

export type ClientDocumentRow = {
  id: string;
  client_id: string;
  doc_type: string;
  status: ClientDocStatus;
  uploaded_on: string | null;
  expires_on: string | null;
  drive_url: string | null;
};
