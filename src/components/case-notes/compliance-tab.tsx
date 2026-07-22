"use client";

import { useTransition } from "react";
import type { CaseNotesData } from "@/lib/case-notes-shared";

export function ComplianceTab({ data }: { data: CaseNotesData }) {
  const [pending, startTransition] = useTransition();
  const { stats } = data;

  function handleReminders() {
    startTransition(async () => {
      // Stub — same pattern as sendWeeklyReport
      alert("Reminder emails queued (stub — no PHI in email).");
    });
  }

  const toneColor = {
    teal: "var(--color-teal)",
    amber: "var(--color-amber)",
    coral: "var(--color-coral)",
  };

  return (
    <div className="cn-panel">
      <div className="stat-row cn-stat-row">
        <StatCard
          icon="circle-check"
          iconBg="var(--color-teal-light)"
          iconColor="var(--color-teal-dark)"
          label="Notes confirmed"
          value={String(stats.confirmed)}
          sub={`of ${stats.expected} expected`}
          subColor="var(--color-teal)"
        />
        <StatCard
          icon="note"
          iconBg="var(--color-blue-light)"
          iconColor="var(--color-blue-dark)"
          label="Overridden"
          value={String(stats.overridden)}
          sub="resolved with a reason logged"
          subColor="var(--color-blue)"
        />
        <StatCard
          icon="circle-x"
          iconBg="var(--color-coral-light)"
          iconColor="var(--color-coral-dark)"
          label="Still missing"
          value={String(stats.missing)}
          sub={`across ${stats.missingClientCount} client${stats.missingClientCount === 1 ? "" : "s"}`}
          subColor="var(--color-coral)"
        />
        <StatCard
          icon="alert-triangle"
          iconBg="var(--color-amber-light)"
          iconColor="var(--color-amber-dark)"
          label="Unassigned sessions"
          value={String(stats.unassignedSessions)}
          sub="needs a BT before it can be checked"
          subColor="var(--color-amber)"
        />
        <StatCard
          icon="chart-bar"
          iconBg="var(--color-teal-light)"
          iconColor="var(--color-teal-dark)"
          label="Compliance rate"
          value={`${stats.complianceRate}%`}
          sub="confirmed + overridden"
          subColor="var(--color-teal)"
        />
      </div>

      <div className="full-card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              {data.schedule[0]?.days.map((d) => (
                <th key={d.date}>{d.headerLabel.split(" ")[0]}</th>
              ))}
              <th>This week</th>
            </tr>
          </thead>
          <tbody>
            {data.complianceGrid.map((row) => (
              <tr key={row.clientId}>
                <td>
                  <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="ti ti-user" style={{ fontSize: 11, color: "var(--color-ink3)" }} />
                    Client #{row.refCode}
                  </div>
                </td>
                {row.days.map((day, i) => (
                  <td key={i}>
                    {day.label === "—" ? (
                      <span style={{ fontSize: 11, color: "var(--color-ink3)" }}>—</span>
                    ) : (
                      <span className={`pill ${day.pillClass}`} title={day.overridden > 0 ? "Note overridden" : undefined}>
                        {day.label}
                      </span>
                    )}
                  </td>
                ))}
                <td>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: toneColor[row.weekTone],
                    }}
                  >
                    {row.weekLabel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 10, color: "var(--color-ink3)", margin: "-8px 0 14px 4px", lineHeight: 1.6 }}>
        <strong>ⓞ</strong> = note overridden by admin with a logged reason — counted as resolved,
        not flagged as missing
      </div>

      {data.missingNotes.length > 0 && (
        <div className="full-card cn-missing-banner">
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-coral-dark)", marginBottom: 8 }}>
            <i
              className="ti ti-alert-triangle"
              style={{ fontSize: 14, verticalAlign: -2, marginRight: 4 }}
            />
            Missing case notes — action needed
          </div>
          <div style={{ fontSize: 12, color: "var(--color-coral-dark)", lineHeight: 1.8 }}>
            {data.missingNotes.map((m) => (
              <div key={m.clientId}>{m.line}</div>
            ))}
          </div>
          <button
            type="button"
            className="btn"
            style={{ marginTop: 10, background: "var(--color-coral)", color: "#fff", fontSize: 12 }}
            onClick={handleReminders}
            disabled={pending}
          >
            <i className="ti ti-mail" style={{ fontSize: 13 }} /> Email BTs about missing notes
          </button>
          <div style={{ fontSize: 11, color: "var(--color-coral-dark)", marginTop: 6, opacity: 0.8 }}>
            Sent to the BT who was assigned that session, plus their administrator — no client info
            included in the email.
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
  subColor,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sub: string;
  subColor: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon-row">
        <div className="stat-icon" style={{ background: iconBg, color: iconColor }}>
          <i className={`ti ti-${icon}`} />
        </div>
        <span className="stat-lbl">{label}</span>
      </div>
      <div className="stat-val">{value}</div>
      <div className="stat-change" style={{ color: subColor }}>
        {sub}
      </div>
    </div>
  );
}
