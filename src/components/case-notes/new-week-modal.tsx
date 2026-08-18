"use client";

import { useState, useTransition } from "react";
import { createComplianceWeek } from "@/app/(app)/case-notes/actions";
import {
  addDaysIso,
  isMondayIso,
  mondayOfIso,
  weekEndFor,
  type ComplianceWeekOption,
} from "@/lib/case-notes-shared";

function fmt(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function NewWeekModal({
  weeks,
  onClose,
  onCreated,
}: {
  /** Newest first — `getCaseNotesData` orders by week_start desc. */
  weeks: ComplianceWeekOption[];
  onClose: () => void;
  onCreated: (weekId: string, message?: string) => void;
}) {
  const [weekStart, setWeekStart] = useState(
    weeks[0] ? addDaysIso(weeks[0].weekStart, 7) : mondayOfIso(),
  );
  const [copyFrom, setCopyFrom] = useState(weeks[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mondayOk = isMondayIso(weekStart);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createComplianceWeek({
        weekStart,
        copyFromWeekId: copyFrom || null,
      });
      if (res.ok && res.weekId) {
        onCreated(res.weekId, res.message);
      } else {
        setError(res.error ?? "Could not create the week.");
      }
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <i className="ti ti-calendar-plus" style={{ color: "var(--color-blue)", fontSize: 18 }} />
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-ink)" }}>
            Start a new week
          </h2>
        </div>
        <p style={{ fontSize: 12, color: "var(--color-ink3)", marginBottom: 16 }}>
          Creates the week and its check-off slots so you can upload the Catalyst export against
          it.
        </p>

        <label className="modal-label">Week starting (Monday)</label>
        <input
          className="modal-input"
          type="date"
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
        />
        <div
          style={{
            fontSize: 11,
            margin: "4px 0 12px",
            color: mondayOk ? "var(--color-ink3)" : "var(--color-coral-dark)",
          }}
        >
          {mondayOk
            ? `${fmt(weekStart)} – ${fmt(weekEndFor(weekStart))}`
            : "Weeks run Monday to Friday — pick a Monday."}
        </div>

        {weeks.length > 0 ? (
          <>
            <label className="modal-label">Carry the schedule forward from</label>
            <select
              className="modal-select"
              value={copyFrom}
              onChange={(e) => setCopyFrom(e.target.value)}
              style={{ marginBottom: 8 }}
            >
              <option value="">Start with an empty schedule</option>
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
            <p className="notice-inline" style={{ margin: "0 0 16px" }}>
              <i className="ti ti-info-circle" aria-hidden="true" />
              Copies each client&apos;s BT assignments onto the matching weekdays. One-off coverage
              swaps are reset back to the regular assignment.
            </p>
          </>
        ) : (
          <p className="notice-inline" style={{ margin: "0 0 16px" }}>
            <i className="ti ti-info-circle" aria-hidden="true" />
            This is your first week — build the schedule in the Weekly schedule tab once it&apos;s
            created.
          </p>
        )}

        {error && (
          <div className="alert-row alert-row-coral" style={{ marginBottom: 12 }}>
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            <div className="alert-row-body">{error}</div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!mondayOk || pending}
            onClick={submit}
          >
            {pending ? "Creating…" : "Create week"}
          </button>
        </div>
      </div>
    </div>
  );
}
