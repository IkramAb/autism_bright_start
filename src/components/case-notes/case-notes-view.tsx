"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CaseNotesData } from "@/lib/case-notes-shared";
import { sendWeeklyReport, setWeekStatus } from "@/app/(app)/case-notes/actions";
import { NewWeekModal } from "@/components/case-notes/new-week-modal";
import { ScheduleTab } from "@/components/case-notes/schedule-tab";
import { CheckoffTab } from "@/components/case-notes/checkoff-tab";
import { ComplianceTab } from "@/components/case-notes/compliance-tab";
import { PageHeader } from "@/components/shell/page-header";
import { ROUTE_META } from "@/lib/nav";

type Tab = "schedule" | "checkoff" | "compliance";

export function CaseNotesView({ data }: { data: CaseNotesData }) {
  const meta = ROUTE_META["/case-notes"];
  const [tab, setTab] = useState<Tab>("schedule");
  const [pending, startTransition] = useTransition();
  const [showNewWeek, setShowNewWeek] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  const finalized = data.week.status === "finalized";

  function onWeekChange(weekId: string) {
    startTransition(() => {
      router.push(`/case-notes?week=${weekId}`);
    });
  }

  function handleSendReport() {
    startTransition(async () => {
      await sendWeeklyReport(data.week.id);
    });
  }

  function handleCreated(weekId: string, message?: string) {
    setShowNewWeek(false);
    if (message) setToast(message);
    startTransition(() => {
      router.push(`/case-notes?week=${weekId}`);
    });
  }

  function toggleFinalize() {
    const next = finalized ? "open" : "finalized";
    if (
      next === "finalized" &&
      !window.confirm(
        `Finalize ${data.week.label}? It stops driving the dashboard's weekly numbers. You can reopen it later.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await setWeekStatus(data.week.id, next);
      setToast(res.ok ? (res.message ?? "Week updated.") : (res.error ?? "Could not update the week."));
    });
  }

  return (
    <div className="page-full">
      <div className="page-toolbar">
        <PageHeader
          title={meta.title}
          subtitle={`${data.week.label} · ${meta.subtitle}`}
          actions={
            <>
          <select
            className="modal-select"
            style={{ width: "auto", fontSize: 12, padding: "7px 12px" }}
            value={data.week.id}
            onChange={(e) => onWeekChange(e.target.value)}
            disabled={pending}
            aria-label="Select week"
          >
            {data.weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
          {finalized && <span className="pill pill-gray">Finalized</span>}
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowNewWeek(true)}
            disabled={pending}
          >
            <i className="ti ti-calendar-plus" style={{ fontSize: 13 }} aria-hidden="true" /> New
            week
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={toggleFinalize}
            disabled={pending}
          >
            <i
              className={`ti ti-${finalized ? "lock-open" : "lock"}`}
              style={{ fontSize: 13 }}
              aria-hidden="true"
            />
            {finalized ? "Reopen week" : "Finalize week"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSendReport}
            disabled={pending}
          >
            <i className="ti ti-send" style={{ fontSize: 13 }} aria-hidden="true" /> Send weekly
            report
          </button>
            </>
          }
        />
      </div>

      {showNewWeek && (
        <NewWeekModal
          weeks={data.weeks}
          onClose={() => setShowNewWeek(false)}
          onCreated={handleCreated}
        />
      )}

      <div className="page-body">
        {toast && (
          <div className="alert-row alert-row-teal" style={{ marginBottom: 12 }}>
            <i className="ti ti-check" aria-hidden="true" />
            <div className="alert-row-body">{toast}</div>
          </div>
        )}
        <p className="notice-inline">
          <i className="ti ti-shield-check" aria-hidden="true" />
          No note content is stored here — this only tracks whether a note was submitted in
          Catalyst, never what it said. Every child needs 2 notes/day; upload the weekly Catalyst
          export to auto-check most of it, then resolve leftovers manually or with a logged
          override.
        </p>

        <div className="cn-tab-row">
          <TabBtn active={tab === "schedule"} onClick={() => setTab("schedule")} icon="calendar-event">
            Weekly schedule
          </TabBtn>
          <TabBtn active={tab === "checkoff"} onClick={() => setTab("checkoff")} icon="checklist">
            Note check-off
          </TabBtn>
          <TabBtn active={tab === "compliance"} onClick={() => setTab("compliance")} icon="chart-bar">
            Compliance view
          </TabBtn>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          {tab === "schedule" && <ScheduleTab data={data} />}
          {tab === "checkoff" && <CheckoffTab data={data} />}
          {tab === "compliance" && <ComplianceTab data={data} />}
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={`cn-tab${active ? " active" : ""}`} onClick={onClick}>
      <i className={`ti ti-${icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
      {children}
    </button>
  );
}
