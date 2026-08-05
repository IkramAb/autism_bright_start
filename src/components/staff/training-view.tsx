"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TrainingFlatRow } from "@/lib/staff";
import { updateTraining } from "@/app/(app)/staff/actions";
import { UploadCertModal } from "./upload-cert-modal";

type Filter = "all" | "overdue" | "pending" | "complete";

export function TrainingView({ rows }: { rows: TrainingFlatRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [showUpload, setShowUpload] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onPrimary() {
      setShowUpload(true);
    }
    window.addEventListener("aba:primary-action", onPrimary as EventListener);
    return () => window.removeEventListener("aba:primary-action", onPrimary as EventListener);
  }, []);

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
      <p className="page-meta">All staff · all required trainings</p>

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
                <td><span className={`pill ${row.statusClass}`} style={{ fontSize: 10 }}>{row.statusLabel}</span></td>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
