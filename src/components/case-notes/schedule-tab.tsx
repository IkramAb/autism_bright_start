"use client";

import { useState, useTransition } from "react";
import type { CaseNotesData, ScheduleCell } from "@/lib/case-notes-shared";
import { reassignSession } from "@/app/(app)/case-notes/actions";

export function ScheduleTab({ data }: { data: CaseNotesData }) {
  const [showModal, setShowModal] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [clientId, setClientId] = useState(data.schedule[0]?.clientId ?? "");
  const [sessionDate, setSessionDate] = useState(data.schedule[0]?.days[0]?.date ?? "");
  const [period, setPeriod] = useState<"am" | "pm">("am");
  const [staffId, setStaffId] = useState("");
  const [isCovering, setIsCovering] = useState(false);
  const [coveringForId, setCoveringForId] = useState("");

  const dateOptions = data.schedule.find((r) => r.clientId === clientId)?.days ?? [];

  function submitReassign() {
    startTransition(async () => {
      const status = !staffId
        ? "unassigned"
        : isCovering
          ? "covering"
          : "assigned";
      const result = await reassignSession({
        weekId: data.week.id,
        clientId,
        sessionDate,
        period,
        staffId: staffId || null,
        status,
        coveringForStaffId: isCovering && coveringForId ? coveringForId : null,
      });
      setMessage(result.ok ? result.message ?? "Session reassigned." : result.error ?? "Failed.");
      if (result.ok) setShowModal(false);
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
        <p className="notice-inline" style={{ margin: 0, maxWidth: 560 }}>
          <i className="ti ti-info-circle" aria-hidden="true" />
          This is the source of truth for who&apos;s assigned to who. Update it when a BT calls out
          or a session is reassigned — check-off and compliance read from this.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          style={{ fontSize: 12, flexShrink: 0 }}
          onClick={() => setShowModal(true)}
        >
          <i className="ti ti-replace" style={{ fontSize: 13 }} /> Reassign a session
        </button>
      </div>

      {message && (
        <div className="alert-row alert-row-teal" style={{ marginBottom: 10 }}>
          <i className="ti ti-check" aria-hidden="true" />
          <div className="alert-row-body">{message}</div>
        </div>
      )}

      <div className="full-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              {data.schedule[0]?.days.map((d) => (
                <th key={d.date}>{d.headerLabel}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.schedule.map((row) => (
              <tr key={row.clientId}>
                <td>
                  <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="ti ti-user" style={{ fontSize: 12, color: "var(--color-ink3)" }} />
                    Client #{row.refCode}
                  </div>
                </td>
                {row.days.map((day) => (
                  <td key={day.date}>
                    <ScheduleDayCells am={day.am} pm={day.pm} />
                  </td>
                ))}
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
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span className="pill pill-amber">Covering</span>
          <span>Reassigned / covering a sick BT</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span className="pill pill-coral">Unassigned</span>
          <span>No BT assigned yet — needs action</span>
        </span>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Reassign a session</div>
            <div style={{ fontSize: 12, color: "var(--color-ink3)", marginBottom: 16 }}>
              Pick the session and who&apos;s covering.
            </div>

            <label className="modal-label">Client</label>
            <select
              className="modal-select"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              style={{ marginBottom: 12 }}
            >
              {data.schedule.map((r) => (
                <option key={r.clientId} value={r.clientId}>
                  Client #{r.refCode}
                </option>
              ))}
            </select>

            <label className="modal-label">Date</label>
            <select
              className="modal-select"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              style={{ marginBottom: 12 }}
            >
              {dateOptions.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.headerLabel}
                </option>
              ))}
            </select>

            <label className="modal-label">Period</label>
            <select
              className="modal-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value as "am" | "pm")}
              style={{ marginBottom: 12 }}
            >
              <option value="am">AM</option>
              <option value="pm">PM</option>
            </select>

            <label className="modal-label">Assigned BT</label>
            <select
              className="modal-select"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              style={{ marginBottom: 12 }}
            >
              <option value="">Unassigned</option>
              {data.staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {staffId && (
              <>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 12 }}>
                  <input
                    type="checkbox"
                    checked={isCovering}
                    onChange={(e) => setIsCovering(e.target.checked)}
                  />
                  Covering for another BT
                </label>
                {isCovering && (
                  <>
                    <label className="modal-label">Covering for</label>
                    <select
                      className="modal-select"
                      value={coveringForId}
                      onChange={(e) => setCoveringForId(e.target.value)}
                      style={{ marginBottom: 12 }}
                    >
                      <option value="">Select BT…</option>
                      {data.staffOptions
                        .filter((s) => s.id !== staffId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </>
                )}
              </>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={submitReassign} disabled={pending}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleDayCells({ am, pm }: { am: ScheduleCell | null; pm: ScheduleCell | null }) {
  if (!am && !pm) return <span style={{ fontSize: 11, color: "var(--color-ink3)" }}>—</span>;
  return (
    <>
      {am && <ScheduleCellView cell={am} />}
      {pm && <ScheduleCellView cell={pm} />}
    </>
  );
}

function ScheduleCellView({ cell }: { cell: ScheduleCell }) {
  if (cell.status === "no_session") {
    return <div className="cn-sched-none">No session</div>;
  }
  if (cell.status === "unassigned") {
    return (
      <div className="cn-sched-unfilled">
        <i className="ti ti-alert-triangle" style={{ fontSize: 11 }} /> Unassigned
      </div>
    );
  }
  const swapped = cell.status === "covering";
  return (
    <div className={`cn-sched-cell${swapped ? " cn-sched-swapped" : ""}`}>
      <span className="cn-sched-bt">
        {cell.staffShort}
        {swapped && (
          <i className="ti ti-replace" style={{ fontSize: 10, marginLeft: 3, color: "var(--color-amber)" }} />
        )}
      </span>
      <span className="cn-sched-time">
        {cell.period.toUpperCase()}
        {swapped ? " · covering" : ""}
      </span>
    </div>
  );
}
