"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NewWeekModal } from "@/components/case-notes/new-week-modal";
import { PageHeader } from "@/components/shell/page-header";
import { ROUTE_META } from "@/lib/nav";

/** Shown when no compliance week exists yet — the entry point into tracking. */
export function NoWeeksView() {
  const router = useRouter();
  const meta = ROUTE_META["/case-notes"];
  const [show, setShow] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="page-stack">
      {show && (
        <NewWeekModal
          weeks={[]}
          onClose={() => setShow(false)}
          onCreated={(weekId) =>
            startTransition(() => router.push(`/case-notes?week=${weekId}`))
          }
        />
      )}
      <PageHeader title={meta.title} subtitle={meta.subtitle} />
      <div className="full-card" style={{ textAlign: "center", padding: 32 }}>
        <i
          className="ti ti-calendar-plus"
          style={{ fontSize: 28, color: "var(--color-ink3)" }}
          aria-hidden="true"
        />
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>No weeks tracked yet</div>
        <p className="page-meta" style={{ maxWidth: 420, margin: "6px auto 16px" }}>
          Create the first compliance week to start tracking the two-notes-per-day rule. Once it
          exists you can upload the weekly Catalyst export against it.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => setShow(true)}>
          <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" /> Create the first
          week
        </button>
      </div>
    </div>
  );
}
