"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CaseNotesData } from "@/lib/case-notes-shared";
import { sendWeeklyReport } from "@/app/(app)/case-notes/actions";
import { ScheduleTab } from "@/components/case-notes/schedule-tab";
import { CheckoffTab } from "@/components/case-notes/checkoff-tab";
import { ComplianceTab } from "@/components/case-notes/compliance-tab";

type Tab = "schedule" | "checkoff" | "compliance";

export function CaseNotesView({ data }: { data: CaseNotesData }) {
  const [tab, setTab] = useState<Tab>("schedule");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

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

  useEffect(() => {
    function onPrimary() {
      handleSendReport();
    }
    window.addEventListener("aba:primary-action", onPrimary as EventListener);
    return () => window.removeEventListener("aba:primary-action", onPrimary as EventListener);
  });

  return (
    <div className="page-full">
      <div className="page-toolbar">
        <div>
          <div className="page-toolbar-sub">
            {data.week.label} · Admin-tracked, updated weekly from Catalyst
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <select
            className="modal-select"
            style={{ width: "auto", fontSize: 12, padding: "7px 12px" }}
            value={data.week.id}
            onChange={(e) => onWeekChange(e.target.value)}
            disabled={pending}
          >
            {data.weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSendReport}
            disabled={pending}
          >
            <i className="ti ti-send" style={{ fontSize: 13 }} /> Send weekly report
          </button>
        </div>
      </div>

      <div className="page-body">
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
      <i className={`ti ti-${icon}`} style={{ fontSize: 13 }} />
      {children}
    </button>
  );
}
