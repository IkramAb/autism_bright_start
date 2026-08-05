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
          iconBg="#EAF1FC"
          iconColor="#5889E0"
          label="Notes confirmed"
          value={String(stats.confirmed)}
          sub={`of ${stats.expected} expected`}
          subColor="#1A9A6E"
        />
        <StatCard
          icon="note"
          iconBg="#EAF1FC"
          iconColor="#5889E0"
          label="Overridden"
          value={String(stats.overridden)}
          sub="resolved with a reason logged"
          subColor="#5C6270"
        />
        <StatCard
          icon="circle-x"
          iconBg="#EAF1FC"
          iconColor="#5889E0"
          label="Still missing"
          value={String(stats.missing)}
          sub={`across ${stats.missingClientCount} client${stats.missingClientCount === 1 ? "" : "s"}`}
          subColor="#E0524B"
        />
        <StatCard
          icon="alert-triangle"
          iconBg="#EAF1FC"
          iconColor="#5889E0"
          label="Unassigned sessions"
          value={String(stats.unassignedSessions)}
          sub="needs a BT before it can be checked"
          subColor="#EF9F27"
        />
        <StatCard
          icon="chart-bar"
          iconBg="#EAF1FC"
          iconColor="#5889E0"
          label="Compliance rate"
          value={`${stats.complianceRate}%`}
          sub="confirmed + overridden"
          subColor="#1A9A6E"
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
        <div className="alert-row alert-row-coral" style={{ flexDirection: "column", alignItems: "stretch" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            <div className="alert-row-body">
              <div className="alert-row-title">Missing case notes — action needed</div>
              <div style={{ fontSize: 12, color: "#5c6270", lineHeight: 1.7 }}>
                {data.missingNotes.map((m) => (
                  <div key={m.clientId}>{m.line}</div>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 10, fontSize: 12 }}
                onClick={handleReminders}
                disabled={pending}
              >
                <i className="ti ti-mail" style={{ fontSize: 13 }} aria-hidden="true" /> Email BTs
                about missing notes
              </button>
              <div className="notice-inline" style={{ margin: "8px 0 0" }}>
                Sent to the assigned BT and their administrator — no client info in the email.
              </div>
            </div>
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
