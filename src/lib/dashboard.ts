import { getClientListData } from "@/lib/clients";
import { getDocumentTrackerData } from "@/lib/clients";
import { getOnboardingListData } from "@/lib/staff";
import { getPipelineData, type CardView } from "@/lib/pipeline";
import { createClient } from "@/lib/supabase/server";

export type DashboardStat = {
  label: string;
  value: string;
  sub: string;
  subColor: string;
  barPct: number;
  barColor: string;
  href?: string;
};

export type PipelineSegment = {
  label: string;
  count: number;
  href: string;
};

export type PipelineHighlight = {
  clientId: string;
  refCode: string;
  sub: string;
  pillLabel: string;
  pillClass: string;
};

export type DocAlert = {
  clientId: string;
  refCode: string;
  docLabel: string;
  meta: string;
  metaColor?: string;
  pillLabel: string;
  pillClass: string;
  tone: "coral" | "amber" | "teal" | "neutral";
};

export type StaffOnboardingSummary = {
  staffId: string;
  fullName: string;
  role: string;
  progressPct: number;
  items: { label: string; done: boolean; due: string | null; dueTone?: string }[];
} | null;

export type CaseNoteDay = {
  name: string;
  confirmed: number;
  expected: number;
  barPct: number;
  barColor: string;
  countLabel: string;
  countColor: string;
};

export type DashboardData = {
  stats: DashboardStat[];
  pipelineSegments: PipelineSegment[];
  pipelineHighlights: PipelineHighlight[];
  docAlerts: DocAlert[];
  staffOnboarding: StaffOnboardingSummary;
  caseNoteDays: CaseNoteDay[];
  todayExpected: number;
  missingCaseNoteSummary: string | null;
};

const PIPELINE_BUCKETS: { label: string; stageKeys: string[] }[] = [
  { label: "New referrals", stageKeys: ["new_referral", "phone_screen"] },
  { label: "Docs pending", stageKeys: ["docs_collection"] },
  { label: "CMDE / ITP", stageKeys: ["cmde_submitted", "cmde_review", "itp_creation"] },
  { label: "Active", stageKeys: ["active"] },
];

function pillForCard(card: CardView): { label: string; className: string } {
  if (card.alert) return { label: card.alert.slice(0, 30), className: "pill-coral" };
  if (card.due?.tone === "coral") return { label: "Due soon", className: "pill-coral" };
  if (card.due?.tone === "amber") return { label: "On track", className: "pill-amber" };
  if (card.columnKey === "new_referral") return { label: "New", className: "pill-gray" };
  return { label: "On track", className: "pill-green" };
}

async function loadCaseNoteWeek(): Promise<{
  days: CaseNoteDay[];
  todayConfirmed: number;
  todayExpected: number;
  todayMissing: number;
  missingSummary: string | null;
}> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: week } = await supabase
    .from("compliance_weeks")
    .select("id, week_start, week_end")
    .eq("status", "open")
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!week) {
    return { days: [], todayConfirmed: 0, todayExpected: 0, todayMissing: 0, missingSummary: null };
  }

  const { data: checkoffs } = await supabase
    .from("case_note_checkoffs")
    .select("session_date, status, assigned_staff_id, staff:assigned_staff_id(full_name)")
    .eq("week_id", week.id);

  const rows = checkoffs ?? [];
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const start = new Date(String(week.week_start) + "T00:00:00");

  const days: CaseNoteDay[] = dayNames.map((name, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayRows = rows.filter(
      (r) => r.session_date === dateStr && r.status !== "not_applicable",
    );
    const expected = dayRows.length;
    const confirmed = dayRows.filter(
      (r) => r.status === "confirmed" || r.status === "overridden",
    ).length;
    const isFuture = dateStr > today;
    const barPct = expected ? Math.round((confirmed / expected) * 100) : 0;
    const complete = expected > 0 && confirmed === expected;

    return {
      name,
      confirmed,
      expected,
      barPct: isFuture ? 0 : barPct,
      barColor: isFuture
        ? "var(--color-line)"
        : complete
          ? "var(--color-teal)"
          : confirmed / Math.max(expected, 1) >= 0.85
            ? "var(--color-teal)"
            : "var(--color-coral)",
      countLabel: isFuture ? "—" : expected ? `${confirmed}/${expected}` : "—",
      countColor: isFuture
        ? "var(--color-ink3)"
        : complete
          ? "var(--color-teal)"
          : "var(--color-coral)",
    };
  });

  const todayRows = rows.filter(
    (r) => r.session_date === today && r.status !== "not_applicable",
  );
  const todayExpected = todayRows.length;
  const todayConfirmed = todayRows.filter(
    (r) => r.status === "confirmed" || r.status === "overridden",
  ).length;
  const todayMissing = todayRows.filter((r) => r.status === "missing" || r.status === "pending").length;

  const missingStaff = new Set<string>();
  for (const r of rows) {
    if (r.status === "missing" || r.status === "pending") {
      const name = (r.staff as { full_name?: string } | null)?.full_name;
      if (name) missingStaff.add(name);
    }
  }

  return {
    days,
    todayConfirmed,
    todayExpected,
    todayMissing,
    missingSummary:
      missingStaff.size > 0
        ? `Missing notes for: ${[...missingStaff].slice(0, 5).join(", ")}`
        : null,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const [clients, pipeline, docs, onboarding, caseNotes] = await Promise.all([
    getClientListData(),
    getPipelineData(),
    getDocumentTrackerData(),
    getOnboardingListData(),
    loadCaseNoteWeek(),
  ]);

  const expiringCount = docs.filterCounts.expiring + docs.filterCounts.overdue;
  const expiringThisWeek = docs.clients.reduce((n, c) => {
    return (
      n +
      c.documents.filter((d) => d.category === "expiring" || d.category === "overdue").length
    );
  }, 0);

  const stats: DashboardStat[] = [
    {
      label: "Active clients",
      value: String(clients.counts.active),
      sub: `${clients.counts.onboarding} in onboarding`,
      subColor: "var(--color-teal)",
      barPct: clients.counts.all ? Math.round((clients.counts.active / clients.counts.all) * 100) : 0,
      barColor: "var(--color-blue)",
    },
    {
      label: "In pipeline",
      value: String(pipeline.totalInProgress),
      sub: pipeline.needAction > 0 ? `${pipeline.needAction} need action ↗` : "All on track",
      subColor: pipeline.needAction > 0 ? "var(--color-amber-dark)" : "var(--color-teal)",
      barPct: pipeline.totalInProgress
        ? Math.min(100, Math.round((pipeline.needAction / pipeline.totalInProgress) * 100) + 20)
        : 0,
      barColor: "var(--color-amber)",
      href: "/pipeline",
    },
    {
      label: "Docs expiring",
      value: String(expiringCount),
      sub:
        expiringThisWeek > 0
          ? `${expiringThisWeek} expiring or overdue ↗`
          : "Nothing urgent",
      subColor: expiringCount > 0 ? "var(--color-coral)" : "var(--color-teal)",
      barPct: docs.filterCounts.all
        ? Math.min(100, Math.round((expiringCount / docs.filterCounts.all) * 100) + 10)
        : 0,
      barColor: "var(--color-coral)",
      href: "/documents",
    },
    {
      label: "Case notes today",
      value:
        caseNotes.todayExpected > 0
          ? `${caseNotes.todayConfirmed}`
          : "0",
      sub:
        caseNotes.todayMissing > 0
          ? `${caseNotes.todayMissing} missing ↗`
          : caseNotes.todayExpected > 0
            ? "All confirmed"
            : "No sessions scheduled",
      subColor:
        caseNotes.todayMissing > 0 ? "var(--color-coral)" : "var(--color-teal)",
      barPct: caseNotes.todayExpected
        ? Math.round((caseNotes.todayConfirmed / caseNotes.todayExpected) * 100)
        : 0,
      barColor: "var(--color-teal)",
      href: "/case-notes",
    },
  ];

  const allCards = pipeline.columns.flatMap((c) => c.cards);
  const stageCounts = new Map<string, number>();
  for (const card of allCards) {
    stageCounts.set(card.stageKey, (stageCounts.get(card.stageKey) ?? 0) + 1);
  }

  const pipelineSegments: PipelineSegment[] = PIPELINE_BUCKETS.map((bucket) => ({
    label: bucket.label,
    count: bucket.stageKeys.reduce((n, key) => n + (stageCounts.get(key) ?? 0), 0),
    href: "/pipeline",
  }));

  const highlightCards = allCards
    .filter((c) => c.stageKey !== "active")
    .sort((a, b) => {
      const aScore = a.alert ? 0 : a.due?.tone === "coral" ? 1 : 2;
      const bScore = b.alert ? 0 : b.due?.tone === "coral" ? 1 : 2;
      return aScore - bScore || a.refCode.localeCompare(b.refCode);
    })
    .slice(0, 4);

  const pipelineHighlights: PipelineHighlight[] = highlightCards.map((card) => {
    const pill = pillForCard(card);
    return {
      clientId: card.id,
      refCode: card.refCode,
      sub: card.stageLabel + (card.due ? ` · ${card.due.label}` : ""),
      pillLabel: pill.label,
      pillClass: pill.className,
    };
  });

  const docAlerts: DocAlert[] = [];
  for (const client of docs.clients) {
    for (const doc of client.documents) {
      if (doc.category !== "overdue" && doc.category !== "expiring" && doc.category !== "awaiting") {
        continue;
      }
      const tone =
        doc.category === "overdue"
          ? "coral"
          : doc.category === "expiring"
            ? "amber"
            : "neutral";
      docAlerts.push({
        clientId: client.id,
        refCode: client.refCode,
        docLabel: `${doc.label} — Client #${client.refCode}`,
        meta:
          doc.category === "overdue"
            ? "Renewal overdue"
            : doc.category === "expiring"
              ? doc.expiresLabel
              : doc.displayLabel,
        metaColor: doc.category === "overdue" ? "var(--color-coral-dark)" : undefined,
        pillLabel: doc.displayLabel,
        pillClass:
          doc.category === "overdue"
            ? "pill-coral"
            : doc.category === "expiring"
              ? "pill-amber"
              : "pill-blue",
        tone,
      });
    }
  }
  docAlerts.sort((a, b) => {
    const order = { coral: 0, amber: 1, teal: 2, neutral: 3 };
    return order[a.tone] - order[b.tone];
  });

  const topStaff = onboarding[0] ?? null;
  const staffOnboarding: StaffOnboardingSummary = topStaff
    ? {
        staffId: topStaff.id,
        fullName: topStaff.fullName,
        role: topStaff.role,
        progressPct: topStaff.progressPct,
        items: topStaff.previewItems.slice(0, 5).map((item) => ({
          label: item.label,
          done: item.done,
          due: item.due,
          dueTone: item.due && !item.done ? "var(--color-amber-dark)" : "var(--color-ink3)",
        })),
      }
    : null;

  return {
    stats,
    pipelineSegments,
    pipelineHighlights,
    docAlerts: docAlerts.slice(0, 5),
    staffOnboarding,
    caseNoteDays: caseNotes.days,
    todayExpected: caseNotes.todayExpected,
    missingCaseNoteSummary: caseNotes.missingSummary,
  };
}
