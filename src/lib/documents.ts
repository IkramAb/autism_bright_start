import type { ClientDocStatus } from "@/lib/types/db";

export const CATALYST_URL = "https://secure.datafinch.com/";

export const DOC_TYPE_LABELS: Record<string, string> = {
  medical_documentation: "Medical documentation",
  insurance_card: "Insurance card",
  food_allergies: "Food allergies form",
  student_questionnaire: "Student questionnaire",
  roi: "ROI form",
  discharge_doc: "Discharge doc",
  medication_questionnaire: "Medication questionnaire",
  prev_diagnostic: "Previous diagnostic",
  cmde: "CMDE",
  itp: "ITP",
  iep: "IEP",
  wellness_assessment: "Wellness assessment",
  parent_handbook: "Parent handbook",
  service_agreement: "Service agreement",
  transport_agreement: "Transport agreement",
};

/** Maps client doc types that have renewal rules. */
export const RENEWAL_DOC_TYPES = new Set([
  "cmde",
  "itp",
  "iep",
  "wellness_assessment",
  "transport_agreement",
]);

export const ESIGN_DOC_TYPES = new Set([
  "parent_handbook",
  "service_agreement",
  "transport_agreement",
  "roi",
]);

const STATUS_LABELS: Record<ClientDocStatus, string> = {
  missing: "Missing",
  requested: "Requested",
  uploaded: "Uploaded",
  submitted: "Submitted",
  pending_approval: "Pending approval",
  approved: "Approved",
  signed: "Signed",
  awaiting_esig: "Awaiting e-sig",
  not_sent: "Not sent yet",
  not_yet_created: "Not yet created",
};

export type RenewalRule = {
  document_type: string;
  interval_count: number;
  interval_unit: string;
  reminder_lead_count: number;
  reminder_lead_unit: string;
};

export type DocRenewalState = "none" | "overdue" | "expiring_soon" | "up_to_date";

export type DocFilterCategory =
  | "all"
  | "overdue"
  | "expiring"
  | "awaiting"
  | "uptodate"
  | "missing";

export type DocDisplayCategory =
  | "overdue"
  | "expiring"
  | "awaiting"
  | "uptodate"
  | "missing";

export function fmtDate(date: string | null): string {
  if (!date) return "—";
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtShort(date: string | null): string {
  if (!date) return "—";
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function addInterval(
  date: Date,
  count: number,
  unit: string,
): Date {
  const d = new Date(date);
  switch (unit) {
    case "day":
      d.setDate(d.getDate() + count);
      break;
    case "week":
      d.setDate(d.getDate() + count * 7);
      break;
    case "month":
      d.setMonth(d.getMonth() + count);
      break;
    case "year":
      d.setFullYear(d.getFullYear() + count);
      break;
  }
  return d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function computeRenewalState(
  expiresOn: string | null,
  rule: RenewalRule | null,
  today = new Date(),
): DocRenewalState {
  if (!expiresOn) return "none";
  const exp = new Date(expiresOn + "T00:00:00");
  today.setHours(0, 0, 0, 0);
  if (exp < today) return "overdue";
  if (!rule) return "up_to_date";
  const leadStart = addInterval(
    exp,
    -rule.reminder_lead_count,
    rule.reminder_lead_unit,
  );
  if (today >= leadStart) return "expiring_soon";
  return "up_to_date";
}

export type DocAction = {
  key: string;
  label: string;
  variant: "primary" | "outline";
  coral?: boolean;
};

export type DocView = {
  id: string;
  clientId: string;
  docType: string;
  label: string;
  storedStatus: ClientDocStatus;
  displayLabel: string;
  pillClass: string;
  category: DocDisplayCategory;
  renewalState: DocRenewalState;
  uploadedOn: string | null;
  uploadedLabel: string;
  expiresOn: string | null;
  expiresLabel: string;
  expiresTone: "coral" | "amber" | "neutral";
  driveUrl: string | null;
  action: DocAction;
};

function isMissingStatus(s: ClientDocStatus): boolean {
  return s === "missing" || s === "not_yet_created" || s === "not_sent";
}

export function buildDocView(
  doc: {
    id: string;
    client_id: string;
    doc_type: string;
    status: ClientDocStatus;
    uploaded_on: string | null;
    expires_on: string | null;
    drive_url: string | null;
  },
  rulesByType: Map<string, RenewalRule>,
  today = new Date(),
): DocView {
  const rule = rulesByType.get(doc.doc_type) ?? null;
  const renewalState = computeRenewalState(doc.expires_on, rule, new Date(today));
  const label = DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type;

  let displayLabel = STATUS_LABELS[doc.status];
  let pillClass = "pill-gray";
  let category: DocDisplayCategory = "uptodate";

  if (renewalState === "overdue") {
    displayLabel = "Overdue";
    pillClass = "pill-coral";
    category = "overdue";
  } else if (renewalState === "expiring_soon" && !isMissingStatus(doc.status)) {
    displayLabel = "Expiring soon";
    pillClass = "pill-amber";
    category = "expiring";
  } else if (doc.status === "awaiting_esig") {
    displayLabel = "Awaiting e-sig";
    pillClass = "pill-blue";
    category = "awaiting";
  } else if (isMissingStatus(doc.status)) {
    displayLabel = STATUS_LABELS[doc.status];
    pillClass = "pill-gray";
    category = "missing";
  } else if (
    renewalState === "up_to_date" &&
    RENEWAL_DOC_TYPES.has(doc.doc_type) &&
    doc.expires_on
  ) {
    displayLabel = "Up to date";
    pillClass = "pill-green";
    category = "uptodate";
  } else if (["uploaded", "approved", "signed", "submitted"].includes(doc.status)) {
    pillClass = "pill-green";
    category = "uptodate";
  } else if (doc.status === "requested") {
    pillClass = "pill-amber";
    category = "expiring";
  } else if (doc.status === "pending_approval") {
    pillClass = "pill-amber";
    category = "uptodate";
  }

  const expiresTone: DocView["expiresTone"] =
    renewalState === "overdue"
      ? "coral"
      : renewalState === "expiring_soon"
        ? "amber"
        : "neutral";

  let action: DocAction;
  if (category === "overdue") {
    action = { key: "schedule_renewal", label: "Schedule renewal", variant: "primary", coral: true };
  } else if (category === "expiring") {
    action = { key: "send_reminder", label: "Send reminder", variant: "outline" };
  } else if (doc.status === "awaiting_esig") {
    action = { key: "resend_esign", label: "Resend link", variant: "primary" };
  } else if (doc.status === "not_sent" && ESIGN_DOC_TYPES.has(doc.doc_type)) {
    action = { key: "send_esign", label: "Send for signing", variant: "outline" };
  } else if (isMissingStatus(doc.status)) {
    action = { key: "request_doc", label: "Request doc", variant: "outline" };
  } else if (doc.drive_url) {
    action = { key: "open_drive", label: "Open in Drive", variant: "outline" };
  } else if (doc.status === "not_yet_created") {
    action = { key: "schedule_bcba", label: "Schedule with BCBA", variant: "outline" };
  } else {
    action = { key: "open_drive", label: "Open in Drive", variant: "outline" };
  }

  const uploadedLabel =
    doc.status === "awaiting_esig" && !doc.uploaded_on
      ? "Not signed"
      : fmtDate(doc.uploaded_on);

  return {
    id: doc.id,
    clientId: doc.client_id,
    docType: doc.doc_type,
    label,
    storedStatus: doc.status,
    displayLabel,
    pillClass,
    category,
    renewalState,
    uploadedOn: doc.uploaded_on,
    uploadedLabel,
    expiresOn: doc.expires_on,
    expiresLabel: fmtDate(doc.expires_on),
    expiresTone,
    driveUrl: doc.drive_url,
    action,
  };
}

export function nextRenewalLabel(docs: DocView[]): string | null {
  const candidates = docs.filter(
    (d) =>
      d.expiresOn &&
      (d.renewalState === "overdue" || d.renewalState === "expiring_soon"),
  );
  if (!candidates.length) {
    const withExpiry = docs
      .filter((d) => d.expiresOn && d.renewalState !== "none")
      .sort((a, b) => a.expiresOn!.localeCompare(b.expiresOn!));
    if (!withExpiry.length) return null;
    const d = withExpiry[0];
    return `${d.label.split(" ")[0]} · ${fmtShort(d.expiresOn)}`;
  }
  candidates.sort((a, b) => a.expiresOn!.localeCompare(b.expiresOn!));
  const d = candidates[0];
  const tone = d.renewalState === "overdue";
  return `${d.label.split(" ")[0]} · ${fmtShort(d.expiresOn)}${tone ? " ⚠" : ""}`;
}

export function nextRenewalTone(docs: DocView[]): "coral" | "amber" | "neutral" {
  const candidates = docs.filter(
    (d) =>
      d.expiresOn &&
      (d.renewalState === "overdue" || d.renewalState === "expiring_soon"),
  );
  if (!candidates.length) return "neutral";
  if (candidates.some((d) => d.renewalState === "overdue")) return "coral";
  return "amber";
}

export function countByCategory(docs: DocView[]): Record<DocDisplayCategory, number> {
  const counts: Record<DocDisplayCategory, number> = {
    overdue: 0,
    expiring: 0,
    awaiting: 0,
    uptodate: 0,
    missing: 0,
  };
  for (const d of docs) counts[d.category] += 1;
  return counts;
}

export function filterDocs(docs: DocView[], filter: DocFilterCategory): DocView[] {
  if (filter === "all") return docs;
  return docs.filter((d) => d.category === filter);
}
