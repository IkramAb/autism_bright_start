"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TrainingFlatRow } from "@/lib/staff";
import { updateTraining } from "@/app/(app)/staff/actions";
import { UploadCertModal } from "./upload-cert-modal";
import { PageHeader } from "@/components/shell/page-header";
import { ROUTE_META } from "@/lib/nav";

type Filter = "all" | "overdue" | "pending" | "complete";

export function TrainingView({ rows }: { rows: TrainingFlatRow[] }) {
  const meta = ROUTE_META["/training"];
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [showUpload, setShowUpload] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "overdue") return rows.filter((r) => r.status === "overdue");
    if (filter === "complete") return rows.filter((r) => r.status === "complete");
    return rows.filter((r) => r.status === "pending" || r.status === "in_progress");
  }, [rows, filter]);

  function markComplete(id: string) {
    startTransition(async () => {
      await updateTraining(id, { status: "complete" });
      router.refresh();
    });
  }

  const counts = {
    all: rows.length,
    overdue: rows.filter((r) => r.status === "overdue").length,
    pending: rows.filter((r) => r.status === "pending" || r.status === "in_progress").length,
    complete: rows.filter((r) => r.status === "complete").length,
  };

  return (
    <div>
      {showUpload && <UploadCertModal rows={rows} onClose={() => setShowUpload(false)} />}
      <PageHeader
        title={meta.title}
        subtitle={meta.subtitle}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setShowUpload(true)}>
            <i className="ti ti-upload" style={{ fontSize: 13 }} aria-hidden="true" /> Upload cert
          </button>
        }
      />

      <div className="filter-tab-row">
        {(["all", "overdue", "pending", "complete"] as const).map((f) => (
          <button key={f} type="button" className={`cr-filter-btn${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? `All (${counts.all})` : f === "overdue" ? `Overdue (${counts.overdue})` : f === "pending" ? `Pending (${counts.pending})` : `Completed (${counts.complete})`}
          </button>
        ))}
      </div>

      <div className="full-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Training</th>
              <th>Status</th>
              <th>Due</th>
              <th>Completed</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td style={{ fontWeight: 500 }}>{row.staffName}</td>
                <td>{row.trainingName}</td>
                <td><span className={`pill ${row.statusClass}`}>{row.statusLabel}</span></td>
                <td style={{ fontSize: 11, color: "var(--color-ink3)" }}>{row.dueLabel}</td>
                <td style={{ fontSize: 11, color: "var(--color-ink3)" }}>{row.completedLabel}</td>
                <td>
                  {row.status === "complete" && row.certUrl ? (
                    <a href={row.certUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: 11, padding: "4px 10px" }}>View cert</a>
                  ) : row.status !== "complete" ? (
                    <button type="button" className="btn btn-outline" style={{ fontSize: 11, padding: "4px 10px" }} disabled={pending} onClick={() => markComplete(row.id)}>
                      Mark complete
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--color-ink3)" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--muted-foreground)" }}>
                  No trainings match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
