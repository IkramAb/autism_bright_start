import { createClient } from "@/lib/supabase/server";
import {
  buildDocView,
  nextRenewalLabel,
  nextRenewalTone,
  countByCategory,
  type DocView,
  type RenewalRule,
  type DocFilterCategory,
} from "@/lib/documents";
import { stripIndexForStage } from "@/lib/pipeline-constants";
import type {
  ClientRow,
  ClientDocumentRow,
  PipelineStage,
  AbaStatus,
  ReferralSource,
  MaStatus,
  ClientStatus,
} from "@/lib/types/db";

const AVATAR_PALETTE = [
  { bg: "var(--color-teal-light)", color: "var(--color-teal-dark)" },
  { bg: "var(--color-blue-light)", color: "var(--color-blue-dark)" },
  { bg: "var(--color-amber-light)", color: "var(--color-amber-dark)" },
  { bg: "var(--color-pink-light)", color: "var(--color-pink-dark)" },
  { bg: "var(--color-coral-light)", color: "var(--color-coral-dark)" },
];

export function avatarFor(refCode: string) {
  let h = 0;
  for (const ch of refCode) h = (h + ch.charCodeAt(0)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[h];
}

// Formats the entry / start-of-service date for display (PHI-free, not a DOB).
export function serviceStartLabel(date: string | null): string | null {
  if (!date) return null;
  const d = new Date(date + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function abaContext(aba: AbaStatus, source: ReferralSource | null): string {
  if (aba === "new") return "New to ABA";
  if (aba === "not_new") return "Not new to ABA";
  if (source === "website") return "Referred via website";
  if (source === "phone") return "Referred via phone";
  return "ABA status unknown";
}

function referralLabel(source: ReferralSource | null): string {
  const map: Record<string, string> = {
    website: "Website form",
    phone: "Phone",
    email: "Email",
    provider: "Provider referral",
    walk_in: "Walk-in",
    other: "Other",
  };
  return source ? (map[source] ?? source) : "—";
}

function maPill(ma: MaStatus): { label: string; className: string } {
  switch (ma) {
    case "verified":
      return { label: "Verified", className: "pill-green" };
    case "unverified":
      return { label: "Unverified", className: "pill-amber" };
    case "none":
      return { label: "None", className: "pill-coral" };
    default:
      return { label: "Unknown", className: "pill-gray" };
  }
}

function stagePill(stage: PipelineStage | undefined, client: ClientRow): {
  label: string;
  className: string;
} {
  if (!stage) return { label: "Unknown", className: "pill-gray" };
  if (client.status === "active" || stage.key === "active")
    return { label: "Active", className: "pill-green" };
  if (stage.key === "itp_creation" && client.corrections_requested)
    return { label: "ITP pending", className: "pill-amber" };
  if (stage.key === "itp_creation")
    return { label: "ITP approval pending", className: "pill-amber" };
  if (stage.key === "cmde_submitted")
    return { label: "CMDE submitted", className: "pill-blue" };
  if (stage.key === "docs_collection")
    return { label: "Docs collection", className: "pill-amber" };
  if (stage.key === "new_referral" || stage.key === "phone_screen")
    return { label: "New referral", className: "pill-gray" };
  return { label: stage.name, className: "pill-blue" };
}

async function loadRules(): Promise<Map<string, RenewalRule>> {
  const supabase = await createClient();
  const { data } = await supabase.from("renewal_rules").select("*");
  return new Map((data ?? []).map((r) => [r.document_type as string, r as RenewalRule]));
}

export type ClientListRow = {
  id: string;
  refCode: string;
  serviceStartLabel: string | null;
  context: string;
  status: ClientStatus;
  stageLabel: string;
  stagePillClass: string;
  maLabel: string;
  maPillClass: string;
  bcbaName: string;
  nextRenewal: string | null;
  nextRenewalTone: "coral" | "amber" | "neutral";
  initBg: string;
  initColor: string;
};

export type ClientListData = {
  rows: ClientListRow[];
  counts: { all: number; active: number; onboarding: number; inactive: number };
};

export async function getClientListData(): Promise<ClientListData> {
  const supabase = await createClient();
  const rules = await loadRules();

  const [{ data: clients }, { data: stages }, { data: docs }, { data: staff }] =
    await Promise.all([
      supabase.from("clients").select("*").order("ref_code"),
      supabase.from("pipeline_stages").select("*"),
      supabase.from("client_documents").select("*"),
      supabase.from("staff").select("id, full_name"),
    ]);

  const stageById = new Map((stages ?? []).map((s) => [s.id, s as PipelineStage]));
  const staffById = new Map(
    (staff ?? []).map((s) => [s.id as string, s.full_name as string]),
  );
  const docsByClient = new Map<string, DocView[]>();
  for (const d of (docs ?? []) as ClientDocumentRow[]) {
    const view = buildDocView(d, rules);
    const arr = docsByClient.get(d.client_id) ?? [];
    arr.push(view);
    docsByClient.set(d.client_id, arr);
  }

  const rows: ClientListRow[] = [];
  const counts = { all: 0, active: 0, onboarding: 0, inactive: 0 };

  for (const c of (clients ?? []) as ClientRow[]) {
    counts.all += 1;
    if (c.status === "active") counts.active += 1;
    else if (c.status === "onboarding") counts.onboarding += 1;
    else counts.inactive += 1;

    const stage = c.current_stage_id ? stageById.get(c.current_stage_id) : undefined;
    const sp = stagePill(stage, c);
    const ma = maPill(c.ma_status);
    const av = avatarFor(c.ref_code);
    const clientDocs = docsByClient.get(c.id) ?? [];

    rows.push({
      id: c.id,
      refCode: c.ref_code,
      serviceStartLabel: serviceStartLabel(c.service_start_on),
      context: abaContext(c.aba_status, c.referral_source),
      status: c.status,
      stageLabel: sp.label,
      stagePillClass: sp.className,
      maLabel: ma.label,
      maPillClass: ma.className,
      bcbaName: c.assigned_bcba_id
        ? (staffById.get(c.assigned_bcba_id) ?? "Assigned")
        : "Unassigned",
      nextRenewal: nextRenewalLabel(clientDocs),
      nextRenewalTone: nextRenewalTone(clientDocs),
      initBg: av.bg,
      initColor: av.color,
    });
  }

  return { rows, counts };
}

export type ClientNote = {
  id: string;
  body: string;
  createdAt: string;
};

export type ClientDetail = {
  id: string;
  refCode: string;
  serviceStartLabel: string | null;
  serviceStartOn: string | null;
  context: string;
  abaStatus: AbaStatus;
  referralSource: ReferralSource | null;
  maStatus: MaStatus;
  status: ClientStatus;
  correctionsRequested: boolean;
  stage: PipelineStage | null;
  stageLabel: string;
  stagePillClass: string;
  stripIndex: number;
  bcbaName: string;
  driveFolderUrl: string | null;
  initBg: string;
  initColor: string;
  pipelineAlert: string | null;
  notes: ClientNote[];
  documents: DocView[];
  fields: { label: string; value: string; pill?: string }[];
};

function buildPipelineAlert(client: ClientRow, stage: PipelineStage | null): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (client.corrections_requested)
    return "Corrections requested by payer on the current ITP submission.";

  if (stage?.key === "cmde_submitted" && client.cmde_submitted_on) {
    const submitted = new Date(client.cmde_submitted_on + "T00:00:00");
    const day = Math.min(
      5,
      Math.max(1, Math.round((today.getTime() - submitted.getTime()) / 86_400_000) + 1),
    );
    const due = new Date(submitted);
    due.setDate(due.getDate() + 5);
    return `CMDE submitted — day ${day} of 5. Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`;
  }

  if (stage?.key === "itp_creation" && client.itp_submitted_on) {
    const submitted = new Date(client.itp_submitted_on + "T00:00:00");
    const day = Math.min(
      14,
      Math.max(1, Math.round((today.getTime() - submitted.getTime()) / 86_400_000) + 1),
    );
    const due = new Date(submitted);
    due.setDate(due.getDate() + 14);
    return `ITP submitted — day ${day} of 14. Approval due by ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`;
  }

  if (stage?.key === "new_referral" && client.phone_screen_due_on) {
    return `Phone screen due ${client.phone_screen_due_on}. MA verification may still be pending.`;
  }

  return null;
}

export async function getClientDetail(id: string): Promise<ClientDetail | null> {
  const supabase = await createClient();
  const rules = await loadRules();

  const { data: client } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (!client) return null;

  const c = client as ClientRow;

  const [{ data: stage }, { data: notes }, { data: docs }, { data: staff }] =
    await Promise.all([
      c.current_stage_id
        ? supabase.from("pipeline_stages").select("*").eq("id", c.current_stage_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("client_notes")
        .select("id, body, created_at")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("client_documents").select("*").eq("client_id", id),
      c.assigned_bcba_id
        ? supabase.from("staff").select("full_name").eq("id", c.assigned_bcba_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const st = stage as PipelineStage | null;
  const sp = stagePill(st ?? undefined, c);
  const ma = maPill(c.ma_status);
  const av = avatarFor(c.ref_code);
  const docViews = ((docs ?? []) as ClientDocumentRow[]).map((d) =>
    buildDocView(d, rules),
  );

  docViews.sort((a, b) => a.label.localeCompare(b.label));

  return {
    id: c.id,
    refCode: c.ref_code,
    serviceStartLabel: serviceStartLabel(c.service_start_on),
    serviceStartOn: c.service_start_on,
    context: abaContext(c.aba_status, c.referral_source),
    abaStatus: c.aba_status,
    referralSource: c.referral_source,
    maStatus: c.ma_status,
    status: c.status,
    correctionsRequested: c.corrections_requested,
    stage: st,
    stageLabel: sp.label,
    stagePillClass: sp.className,
    stripIndex: stripIndexForStage(st?.key),
    bcbaName: (staff?.full_name as string | undefined) ?? "Unassigned",
    driveFolderUrl: c.drive_folder_url,
    initBg: av.bg,
    initColor: av.color,
    pipelineAlert: buildPipelineAlert(c, st),
    notes: (notes ?? []).map((n) => ({
      id: n.id as string,
      body: n.body as string,
      createdAt: n.created_at as string,
    })),
    documents: docViews,
    fields: [
      { label: "Referral source", value: referralLabel(c.referral_source) },
      { label: "MA status", value: ma.label, pill: ma.className },
      {
        label: "New to ABA",
        value: c.aba_status === "new" ? "Yes" : c.aba_status === "not_new" ? "No" : "Unknown",
      },
      { label: "Assigned BCBA/QSP", value: (staff?.full_name as string | undefined) ?? "Unassigned" },
    ],
  };
}

export type DocTrackerClient = {
  id: string;
  refCode: string;
  context: string;
  stageLabel: string;
  initBg: string;
  initColor: string;
  documents: DocView[];
  summaryPills: { label: string; className: string }[];
  defaultOpen: boolean;
};

export type DocTrackerData = {
  clients: DocTrackerClient[];
  filterCounts: Record<DocFilterCategory, number>;
};

export async function getDocumentTrackerData(): Promise<DocTrackerData> {
  const supabase = await createClient();
  const rules = await loadRules();

  const [{ data: clients }, { data: stages }, { data: docs }] = await Promise.all([
    supabase.from("clients").select("*").order("ref_code"),
    supabase.from("pipeline_stages").select("*"),
    supabase.from("client_documents").select("*"),
  ]);

  const stageById = new Map((stages ?? []).map((s) => [s.id, s as PipelineStage]));
  const docsByClient = new Map<string, DocView[]>();
  const allDocs: DocView[] = [];

  for (const d of (docs ?? []) as ClientDocumentRow[]) {
    const view = buildDocView(d, rules);
    allDocs.push(view);
    const arr = docsByClient.get(d.client_id) ?? [];
    arr.push(view);
    docsByClient.set(d.client_id, arr);
  }

  const filterCounts: Record<DocFilterCategory, number> = {
    all: allDocs.length,
    overdue: 0,
    expiring: 0,
    awaiting: 0,
    uptodate: 0,
    missing: 0,
  };
  for (const d of allDocs) filterCounts[d.category] += 1;

  const trackerClients: DocTrackerClient[] = [];

  for (const c of (clients ?? []) as ClientRow[]) {
    const clientDocs = docsByClient.get(c.id) ?? [];
    if (!clientDocs.length) continue;

    const stage = c.current_stage_id ? stageById.get(c.current_stage_id) : undefined;
    const counts = countByCategory(clientDocs);
    const av = avatarFor(c.ref_code);
    const summaryPills: DocTrackerClient["summaryPills"] = [];

    if (counts.overdue)
      summaryPills.push({ label: `${counts.overdue} overdue`, className: "pill-coral" });
    if (counts.expiring)
      summaryPills.push({ label: `${counts.expiring} expiring`, className: "pill-amber" });
    if (counts.awaiting)
      summaryPills.push({ label: `${counts.awaiting} awaiting sig`, className: "pill-blue" });
    if (counts.missing)
      summaryPills.push({ label: `${counts.missing} missing`, className: "pill-gray" });
    if (counts.uptodate && !counts.overdue && !counts.expiring)
      summaryPills.push({ label: `${counts.uptodate} up to date`, className: "pill-green" });

    trackerClients.push({
      id: c.id,
      refCode: c.ref_code,
      context: `${serviceStartLabel(c.service_start_on) ?? "Start —"} · ${stage?.name ?? c.status}`,
      stageLabel: stage?.name ?? c.status,
      initBg: av.bg,
      initColor: av.color,
      documents: clientDocs.sort((a, b) => a.label.localeCompare(b.label)),
      summaryPills,
      defaultOpen: counts.overdue > 0,
    });
  }

  trackerClients.sort((a, b) => {
    const aOver = a.summaryPills.some((p) => p.className === "pill-coral") ? 0 : 1;
    const bOver = b.summaryPills.some((p) => p.className === "pill-coral") ? 0 : 1;
    return aOver - bOver || a.refCode.localeCompare(b.refCode);
  });

  return { clients: trackerClients, filterCounts };
}
