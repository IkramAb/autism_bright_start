import { createClient } from "@/lib/supabase/server";
import { serviceStartLabel } from "@/lib/clients";
import type {
  ClientRow,
  ClientDocumentRow,
  PipelineStage,
} from "@/lib/types/db";

// Kanban columns. Phone Screen is folded into the New Referral column (matching
// the prototype) — its work shows on New Referral cards.
export const PIPELINE_COLUMNS: {
  key: string;
  title: string;
  dot: string;
  stageKeys: string[];
}[] = [
  { key: "new_referral", title: "New Referral", dot: "#9CB9EC", stageKeys: ["new_referral", "phone_screen"] },
  { key: "docs_collection", title: "Docs Collection", dot: "#EF9F27", stageKeys: ["docs_collection"] },
  { key: "cmde_submitted", title: "CMDE Submitted", dot: "#5889E0", stageKeys: ["cmde_submitted"] },
  { key: "cmde_review", title: "CMDE Review", dot: "#2D5BB0", stageKeys: ["cmde_review"] },
  { key: "itp_creation", title: "ITP Creation", dot: "#FF737E", stageKeys: ["itp_creation"] },
  { key: "agreements", title: "Agreements", dot: "#1A9A6E", stageKeys: ["agreements"] },
  { key: "active", title: "Active", dot: "#0C6B4C", stageKeys: ["active"] },
];

import { stripIndexForStage } from "@/lib/pipeline-constants";

const AVATAR_PALETTE = [
  { bg: "var(--color-teal-light)", color: "var(--color-teal-dark)" },
  { bg: "var(--color-blue-light)", color: "var(--color-blue-dark)" },
  { bg: "var(--color-amber-light)", color: "var(--color-amber-dark)" },
  { bg: "var(--color-pink-light)", color: "var(--color-pink-dark)" },
  { bg: "var(--color-coral-light)", color: "var(--color-coral-dark)" },
];

function avatarFor(refCode: string) {
  let h = 0;
  for (const ch of refCode) h = (h + ch.charCodeAt(0)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[h];
}

export function fmtShort(date: string | null): string | null {
  if (!date) return null;
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

type Tag = { label: string; tone: "teal" | "amber" | "coral" | "blue" | "gray" };
type Tone = "teal" | "amber" | "coral" | "neutral";

export type CardView = {
  id: string;
  refCode: string;
  serviceStartLabel: string | null;
  abaContext: string;
  initBg: string;
  initColor: string;
  columnKey: string;
  stageKey: string;
  stageLabel: string;
  stripIndex: number;
  correctionsRequested: boolean;
  driveUrl: string | null;
  tags: Tag[];
  due: { label: string; date: string; tone: Tone } | null;
  progressPct: number;
  progressColor: string;
  footer: string;
  alert: string | null;
};

const UPLOADED_STATUSES = new Set([
  "uploaded",
  "submitted",
  "pending_approval",
  "approved",
  "signed",
]);

function maTag(ma: ClientRow["ma_status"]): Tag {
  switch (ma) {
    case "verified":
      return { label: "MA: Verified", tone: "teal" };
    case "none":
      return { label: "MA: None", tone: "coral" };
    case "unverified":
      return { label: "MA: Unverified", tone: "amber" };
    default:
      return { label: "MA: Unknown", tone: "gray" };
  }
}

function sourceTag(src: ClientRow["referral_source"]): Tag | null {
  if (!src) return null;
  const map: Record<string, { label: string; tone: Tag["tone"] }> = {
    website: { label: "Website", tone: "blue" },
    phone: { label: "Phone", tone: "teal" },
    email: { label: "Email", tone: "amber" },
    provider: { label: "Provider", tone: "blue" },
    walk_in: { label: "Walk-in", tone: "gray" },
    other: { label: "Other", tone: "gray" },
  };
  return map[src] ?? null;
}

function abaTag(aba: ClientRow["aba_status"]): Tag | null {
  if (aba === "new") return { label: "New to ABA", tone: "amber" };
  if (aba === "not_new") return { label: "Not New", tone: "gray" };
  return null;
}

function dueTone(date: string): Tone {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date + "T00:00:00");
  const diff = daysBetween(today, d);
  if (diff < 0) return "coral";
  if (diff <= 2) return "amber";
  return "neutral";
}

function buildCard(
  client: ClientRow,
  stage: PipelineStage,
  docs: ClientDocumentRow[],
): CardView {
  const av = avatarFor(client.ref_code);
  const column =
    PIPELINE_COLUMNS.find((c) => c.stageKeys.includes(stage.key)) ??
    PIPELINE_COLUMNS[0];

  const tags: Tag[] = [maTag(client.ma_status)];
  const st = sourceTag(client.referral_source);
  const at = abaTag(client.aba_status);
  if (column.key === "new_referral") {
    if (st) tags.push(st);
  } else if (at) {
    tags.push(at);
  }

  const totalDocs = docs.length;
  const uploaded = docs.filter((d) => UPLOADED_STATUSES.has(d.status)).length;
  const overdueDoc = docs.some(
    (d) => d.expires_on && new Date(d.expires_on + "T00:00:00") < new Date(),
  );

  let due: CardView["due"] = null;
  let progressPct = 0;
  let progressColor = "var(--color-blue-mid)";
  let footer = "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (stage.key) {
    case "new_referral":
    case "phone_screen": {
      if (client.phone_screen_due_on) {
        const date = fmtShort(client.phone_screen_due_on)!;
        const tone = dueTone(client.phone_screen_due_on);
        due = {
          label: "Phone screen due",
          date: tone === "coral" ? `${date} · overdue` : date,
          tone,
        };
      }
      footer = "Phone screen pending";
      progressColor = "var(--color-blue-mid)";
      break;
    }
    case "docs_collection": {
      progressPct = totalDocs ? Math.round((uploaded / totalDocs) * 100) : 0;
      progressColor = "var(--color-amber)";
      footer = `${uploaded} of ${totalDocs} docs uploaded`;
      break;
    }
    case "cmde_submitted": {
      if (client.cmde_submitted_on) {
        const day = Math.min(
          5,
          Math.max(1, daysBetween(new Date(client.cmde_submitted_on + "T00:00:00"), today)),
        );
        const dueDate = new Date(client.cmde_submitted_on + "T00:00:00");
        dueDate.setDate(dueDate.getDate() + 5);
        due = {
          label: `Day ${day} of 5`,
          date: `Due ${dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          tone: day >= 4 ? "coral" : "neutral",
        };
        progressPct = (day / 5) * 100;
      }
      progressColor = "var(--color-blue)";
      footer = "Awaiting approval";
      break;
    }
    case "cmde_review": {
      progressPct = 70;
      progressColor = "var(--color-blue-dark)";
      footer = "Ready for ITP once reviewed";
      break;
    }
    case "itp_creation": {
      if (client.itp_submitted_on) {
        const day = Math.max(1, daysBetween(new Date(client.itp_submitted_on + "T00:00:00"), today));
        const dueDate = new Date(client.itp_submitted_on + "T00:00:00");
        dueDate.setDate(dueDate.getDate() + 14);
        due = {
          label: `Day ${Math.min(14, day)} of 14`,
          date: `Due ${dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          tone: day >= 12 ? "coral" : "amber",
        };
        progressPct = Math.min(100, (day / 14) * 100);
        footer = "Awaiting payer approval";
      } else {
        due = { label: "Drafting reminder", date: "in progress", tone: "amber" };
        progressPct = 50;
        footer = "ITP being drafted";
      }
      progressColor = client.corrections_requested
        ? "var(--color-coral)"
        : "var(--color-pink)";
      break;
    }
    case "agreements": {
      const signable = docs.filter((d) =>
        ["parent_handbook", "service_agreement"].includes(d.doc_type),
      );
      const signed = signable.filter((d) => d.status === "signed").length;
      progressPct = signable.length ? (signed / signable.length) * 100 : 0;
      progressColor = "var(--color-teal)";
      footer = `${signed} of ${signable.length || 2} signed`;
      break;
    }
    case "active": {
      progressPct = 100;
      progressColor = "var(--color-teal)";
      footer = "Receiving services";
      break;
    }
  }

  let alert: string | null = null;
  if (client.corrections_requested) alert = "Corrections requested by payer";
  else if (overdueDoc) alert = "A document is overdue";

  return {
    id: client.id,
    refCode: client.ref_code,
    serviceStartLabel: serviceStartLabel(client.service_start_on),
    abaContext:
      client.aba_status === "new"
        ? "New to ABA"
        : client.aba_status === "not_new"
          ? "Not new to ABA"
          : "ABA status unknown",
    initBg: av.bg,
    initColor: av.color,
    columnKey: column.key,
    stageKey: stage.key,
    stageLabel: stage.name,
    stripIndex: stripIndexForStage(stage.key),
    correctionsRequested: client.corrections_requested,
    driveUrl: client.drive_folder_url,
    tags,
    due,
    progressPct,
    progressColor,
    footer,
    alert,
  };
}

export type PipelineData = {
  stages: PipelineStage[];
  columns: {
    key: string;
    title: string;
    dot: string;
    cards: CardView[];
  }[];
  totalInProgress: number;
  needAction: number;
};

export async function getPipelineData(): Promise<PipelineData> {
  const supabase = await createClient();

  const [{ data: stages }, { data: clients }, { data: docs }] = await Promise.all([
    supabase.from("pipeline_stages").select("*").order("sort_order"),
    supabase.from("clients").select("*"),
    supabase.from("client_documents").select("id, client_id, doc_type, status, uploaded_on, expires_on, drive_url"),
  ]);

  const stageList = (stages ?? []) as PipelineStage[];
  const stageById = new Map(stageList.map((s) => [s.id, s]));
  const docsByClient = new Map<string, ClientDocumentRow[]>();
  for (const d of (docs ?? []) as ClientDocumentRow[]) {
    const arr = docsByClient.get(d.client_id) ?? [];
    arr.push(d);
    docsByClient.set(d.client_id, arr);
  }

  const columns = PIPELINE_COLUMNS.map((c) => ({
    key: c.key,
    title: c.title,
    dot: c.dot,
    cards: [] as CardView[],
  }));
  const colByKey = new Map(columns.map((c) => [c.key, c]));

  let totalInProgress = 0;
  let needAction = 0;

  for (const client of (clients ?? []) as ClientRow[]) {
    const stage = client.current_stage_id
      ? stageById.get(client.current_stage_id)
      : undefined;
    if (!stage) continue;
    const card = buildCard(client, stage, docsByClient.get(client.id) ?? []);
    colByKey.get(card.columnKey)?.cards.push(card);
    if (stage.key !== "active") totalInProgress += 1;
    if (card.alert || card.due?.tone === "coral") needAction += 1;
  }

  return { stages: stageList, columns, totalInProgress, needAction };
}
