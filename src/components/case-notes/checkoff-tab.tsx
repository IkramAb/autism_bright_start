"use client";

import { useRef, useState, useTransition } from "react";
import type { CaseNotesData, CheckoffSlotView, OverrideReason } from "@/lib/case-notes-shared";
import { OVERRIDE_REASONS } from "@/lib/case-notes-shared";
import {
  toggleCheckoff,
  overrideCheckoff,
  uploadCatalystExport,
} from "@/app/(app)/case-notes/actions";

export function CheckoffTab({ data }: { data: CaseNotesData }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploadResult, setUploadResult] = useState<string | null>(
    data.lastUpload
      ? `Last upload: ${data.lastUpload.fileName} — ${data.lastUpload.rowsMatched} of ${data.lastUpload.rowsTotal} rows matched.`
      : null,
  );
  const [overrideTarget, setOverrideTarget] = useState<CheckoffSlotView | null>(null);
  const [viewOverride, setViewOverride] = useState<CheckoffSlotView | null>(null);
  const [reasonCode, setReasonCode] = useState<OverrideReason>("cancelled_absent");
  const [reasonNote, setReasonNote] = useState("");

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const result = await uploadCatalystExport(data.week.id, fd);
      setUploadResult(
        result.ok
          ? result.message ?? "Upload processed."
          : `Error: ${result.error}`,
      );
      e.target.value = "";
    });
  }

  function handleToggle(checkoffId: string, checked: boolean) {
    startTransition(async () => {
      await toggleCheckoff(checkoffId, checked);
    });
  }

  function confirmOverride() {
    if (!overrideTarget) return;
    startTransition(async () => {
      await overrideCheckoff(overrideTarget.id, reasonCode, reasonNote);
      setOverrideTarget(null);
      setReasonNote("");
    });
  }

  return (
    <div className="cn-panel">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <p className="notice-inline" style={{ margin: 0, maxWidth: 640 }}>
          <i className="ti ti-info-circle" aria-hidden="true" />
          Every child needs 2 case notes a day. Upload this week&apos;s Catalyst export to
          auto-check against the schedule, or check boxes manually. If one&apos;s genuinely
          missing, use Override and log why.
        </p>
        <span style={{ fontSize: 11, color: "var(--color-ink3)", flexShrink: 0 }}>
          {data.checkoffSummary}
        </span>
      </div>

      <div className="action-card cn-upload-card" style={{ marginBottom: 16 }}>
        <div className="action-card-row">
          <div className="action-card-main">
            <div className="action-card-icon cn-upload-icon">
              <i className="ti ti-file-spreadsheet" style={{ fontSize: 19 }} aria-hidden="true" />
            </div>
            <div>
              <div className="action-card-title">Upload case notes report</div>
              <div className="action-card-sub">
                Export from Catalyst as CSV (Student, Service Date, Session Time, User) —
                we&apos;ll match it against this week&apos;s schedule and auto-check what lines up.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={handleUpload}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
            >
              <i className="ti ti-upload" style={{ fontSize: 13 }} aria-hidden="true" /> Upload report
            </button>
          </div>
        </div>
        {uploadResult && (
          <div className="cn-upload-result">{uploadResult}</div>
        )}
      </div>

      <div className="full-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Date</th>
              <th>Assigned BT</th>
              <th>Note 1 — session time</th>
              <th>Note 2 — session time</th>
            </tr>
          </thead>
          <tbody>
            {data.checkoffs.map((row) => (
              <tr key={`${row.clientId}-${row.sessionDate}`} className={row.rowClass || undefined}>
                <td>
                  <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="ti ti-user" style={{ fontSize: 11, color: "var(--color-ink3)" }} />
                    Client #{row.refCode}
                  </div>
                </td>
                <td style={{ fontSize: 12, color: "var(--color-ink2)" }}>{row.dateLabel}</td>
                <td style={{ fontSize: 12 }}>
                  {row.isUnassigned ? (
                    <span className="pill pill-coral">Unassigned</span>
                  ) : (
                    <>
                      {row.assignedStaffLabel}
                      {row.hasCovering && <span className="cn-covering-tag">covering</span>}
                    </>
                  )}
                </td>
                {row.isUnassigned ? (
                  <td colSpan={2}>
                    <span className="pill pill-coral">
                      <i
                        className="ti ti-alert-triangle"
                        style={{ fontSize: 12 }}
                        aria-hidden="true"
                      />
                      No BT assigned — fix in schedule
                    </span>
                  </td>
                ) : (
                  <>
                    <td>
                      {row.slot1 && (
                        <SlotCell
                          slot={row.slot1}
                          onToggle={handleToggle}
                          onOverride={() => {
                            setOverrideTarget(row.slot1);
                            setReasonCode("cancelled_absent");
                            setReasonNote("");
                          }}
                          onViewOverride={() => setViewOverride(row.slot1)}
                        />
                      )}
                    </td>
                    <td>
                      {row.slot2 && (
                        <SlotCell
                          slot={row.slot2}
                          onToggle={handleToggle}
                          onOverride={() => {
                            setOverrideTarget(row.slot2);
                            setReasonCode("cancelled_absent");
                            setReasonNote("");
                          }}
                          onViewOverride={() => setViewOverride(row.slot2)}
                        />
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 11,
          color: "var(--color-ink3)",
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span className="pill pill-gray">Overridden</span>
          <span>admin logged a reason instead of a checkmark</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span className="pill pill-coral">No BT assigned</span>
          <span>needs action in schedule tab</span>
        </span>
      </div>

      {overrideTarget && (
        <div className="modal-overlay" onClick={() => setOverrideTarget(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Override missing note</div>
            <div style={{ fontSize: 12, color: "var(--color-ink3)", marginBottom: 16 }}>
              Slot {overrideTarget.slot} · {overrideTarget.period.toUpperCase()} session
            </div>
            <label className="modal-label">Reason</label>
            <select
              className="modal-select"
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value as OverrideReason)}
              style={{ marginBottom: 12 }}
            >
              {OVERRIDE_REASONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
            <label className="modal-label">Notes (optional)</label>
            <textarea
              className="modal-input"
              style={{ minHeight: 70, resize: "none", marginBottom: 16 }}
              placeholder="Any additional context for this override…"
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-outline" onClick={() => setOverrideTarget(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmOverride} disabled={pending}>
                Save override
              </button>
            </div>
          </div>
        </div>
      )}

      {viewOverride?.override && (
        <div className="modal-overlay" onClick={() => setViewOverride(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Override note</div>
            <div style={{ fontSize: 13, color: "var(--color-ink2)", lineHeight: 1.6 }}>
              {viewOverride.override.reasonLabel}
              {viewOverride.override.reasonNote && (
                <>
                  <br />
                  <br />
                  {viewOverride.override.reasonNote}
                </>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setViewOverride(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SlotCell({
  slot,
  onToggle,
  onOverride,
  onViewOverride,
}: {
  slot: CheckoffSlotView;
  onToggle: (id: string, checked: boolean) => void;
  onOverride: () => void;
  onViewOverride: () => void;
}) {
  if (slot.status === "overridden") {
    return (
      <div className="cn-override-tag-wrap">
        <span className="cn-overridden-pill">
          <i className="ti ti-note" style={{ fontSize: 11 }} /> Overridden
        </span>
        <button type="button" className="cn-override-view-btn" onClick={onViewOverride}>
          View note
        </button>
      </div>
    );
  }

  if (slot.status === "not_applicable") {
    return <span className="cn-na">N/A</span>;
  }

  const checked = slot.status === "confirmed";
  const missing = slot.status === "missing" || slot.status === "pending";

  if (missing && !checked) {
    return (
      <div className="cn-missing-cell">
        <label className="cn-check">
          <input
            type="checkbox"
            checked={false}
            onChange={() => onToggle(slot.id, true)}
          />
          <span className="cn-check-box">
            <i className="ti ti-check" />
          </span>
        </label>
        <span className="cn-session-time cn-session-time-missing">
          No matching entry in Catalyst
        </span>
        <button type="button" className="cn-override-btn" onClick={onOverride}>
          Override
        </button>
      </div>
    );
  }

  return (
    <div className="cn-check-cell">
      <label className="cn-check">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(slot.id, e.target.checked)}
        />
        <span className="cn-check-box">
          <i className="ti ti-check" />
        </span>
      </label>
      <span className="cn-session-time">
        {slot.sessionTimeRange ?? (slot.confirmedVia === "upload" ? "Matched from upload" : "—")}
      </span>
    </div>
  );
}
