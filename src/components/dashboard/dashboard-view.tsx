"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DashboardData } from "@/lib/dashboard";
import { AddClientModal } from "@/components/pipeline/modals";

export function DashboardView({ data }: { data: DashboardData }) {
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    function onPrimary() {
      setShowAdd(true);
    }
    window.addEventListener("aba:primary-action", onPrimary as EventListener);
    return () => window.removeEventListener("aba:primary-action", onPrimary as EventListener);
  }, []);

  return (
    <div className="page-stack">
      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} />}
      <div className="stat-row">
        {data.stats.map((stat) => {
          const inner = (
            <>
              <div className="stat-icon-row">
                <div
                  className="stat-icon"
                  style={{ background: "var(--color-blue-light)", color: "var(--color-blue-dark)" }}
                >
                  <i
                    className={
                      stat.label === "Active clients"
                        ? "ti ti-users"
                        : stat.label === "In pipeline"
                          ? "ti ti-git-merge"
                          : stat.label === "Docs expiring"
                            ? "ti ti-alert-triangle"
                            : "ti ti-writing"
                    }
                    aria-hidden="true"
                  />
                </div>
                <span className="stat-lbl">{stat.label}</span>
              </div>
              <div className="stat-val">
                {stat.value}
                {stat.label === "Case notes today" && data.todayExpected > 0 && (
                  <span style={{ fontSize: 13, color: "var(--color-ink3)", fontWeight: 400 }}>
                    /{data.todayExpected}
                  </span>
                )}
              </div>
              <div className="stat-change" style={{ color: stat.subColor }}>
                {stat.sub}
              </div>
              <div className="mini-bar">
                <div className="mini-fill" style={{ width: `${stat.barPct}%`, background: stat.barColor }} />
              </div>
            </>
          );

          if (stat.href) {
            return (
              <Link key={stat.label} href={stat.href} className="stat-card stat-card-link">
                {inner}
              </Link>
            );
          }
          return (
            <div key={stat.label} className="stat-card">
              {inner}
            </div>
          );
        })}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-hd">
            <span className="card-title">
              <i className="ti ti-git-merge" style={{ color: "var(--color-blue)" }} aria-hidden="true" />
              Onboarding pipeline
            </span>
            <Link href="/pipeline" className="view-link">
              View all →
            </Link>
          </div>
          <div className="pipe-row">
            {data.pipelineSegments.map((seg) => (
              <Link key={seg.label} href={seg.href} className="pipe-seg">
                <div className="pipe-num">{seg.count}</div>
                <div className="pipe-lbl">{seg.label}</div>
              </Link>
            ))}
          </div>
          <div style={{ marginTop: 12, borderTop: "0.5px solid var(--color-line)", paddingTop: 10 }}>
            {data.pipelineHighlights.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--color-ink3)" }}>No clients in onboarding.</div>
            ) : (
              data.pipelineHighlights.map((row) => (
                <Link key={row.clientId} href={`/clients/${row.clientId}`} className="client-row">
                  <div
                    className="init"
                    style={{ background: "var(--color-app)", color: "var(--color-ink2)" }}
                  >
                    <i className="ti ti-user" style={{ fontSize: 12 }} aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="c-name">Client #{row.refCode}</div>
                    <div className="c-sub">{row.sub}</div>
                  </div>
                  <span className={`pill ${row.pillClass}`}>{row.pillLabel}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <span className="card-title">
              <i className="ti ti-alert-circle" style={{ color: "var(--color-blue)" }} aria-hidden="true" />
              Document alerts
            </span>
            <Link href="/documents" className="view-link">
              View all →
            </Link>
          </div>
          {data.docAlerts.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--color-ink3)" }}>No document alerts right now.</div>
          ) : (
            data.docAlerts.map((doc, i) => (
              <Link
                key={`${doc.clientId}-${doc.docLabel}-${i}`}
                href="/documents"
                className="doc-item"
                style={
                  doc.tone === "coral"
                    ? { background: "var(--color-coral-light)", borderColor: "#F0B3AF" }
                    : doc.tone === "amber"
                      ? { background: "var(--color-amber-light)", borderColor: "#F0CE94" }
                      : undefined
                }
              >
                <div
                  className="doc-icon"
                  style={
                    doc.tone === "coral"
                      ? { background: "var(--color-coral)", color: "#fff" }
                      : doc.tone === "amber"
                        ? { background: "var(--color-amber)", color: "#fff" }
                        : { background: "var(--color-teal-light)", color: "var(--color-teal-dark)" }
                  }
                >
                  <i
                    className={
                      doc.tone === "coral"
                        ? "ti ti-file-x"
                        : doc.tone === "amber"
                          ? "ti ti-clock"
                          : "ti ti-file-check"
                    }
                    aria-hidden="true"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="doc-name">{doc.docLabel}</div>
                  <div className="doc-meta" style={doc.metaColor ? { color: doc.metaColor } : undefined}>
                    {doc.meta}
                  </div>
                </div>
                <span className={`pill ${doc.pillClass}`}>{doc.pillLabel}</span>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-hd">
            <span className="card-title">
              <i className="ti ti-checklist" style={{ color: "var(--color-blue)" }} aria-hidden="true" />
              Staff onboarding
            </span>
            <Link href="/onboarding" className="view-link">
              View all →
            </Link>
          </div>
          {data.staffOnboarding ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 500 }}>
                  {data.staffOnboarding.fullName} — {data.staffOnboarding.role}
                </span>
                <span style={{ fontSize: 11, color: "var(--color-teal)", fontWeight: 600 }}>
                  {data.staffOnboarding.progressPct}%
                </span>
              </div>
              <div className="progress-wrap" style={{ marginBottom: 12 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${data.staffOnboarding.progressPct}%`,
                    background: "var(--color-teal)",
                  }}
                />
              </div>
              {data.staffOnboarding.items.map((item) => (
                <div key={item.label} className="check-item">
                  <div className={`check-box${item.done ? " done" : ""}`}>
                    {item.done && <i className="ti ti-check" style={{ fontSize: 10 }} aria-hidden="true" />}
                  </div>
                  <span className={`check-text${item.done ? " done" : ""}`}>{item.label}</span>
                  {item.due && !item.done && (
                    <span className="check-due" style={{ color: item.dueTone, fontWeight: 600 }}>
                      {item.due}
                    </span>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div style={{ fontSize: 12, color: "var(--color-ink3)" }}>No staff currently onboarding.</div>
          )}
        </div>

        <div className="card">
          <div className="card-hd">
            <span className="card-title">
              <i className="ti ti-writing" style={{ color: "var(--color-blue)" }} aria-hidden="true" />
              Case notes — this week
            </span>
            <Link href="/case-notes" className="view-link">
              View all →
            </Link>
          </div>
          {data.caseNoteDays.map((day) => (
            <div key={day.name} className="case-day">
              <span className="case-day-name">{day.name}</span>
              <div className="case-bar-wrap">
                <div
                  className="case-bar"
                  style={{ width: `${day.barPct}%`, background: day.barColor }}
                />
              </div>
              <span className="case-count" style={{ color: day.countColor }}>
                {day.countLabel}
              </span>
            </div>
          ))}
          {data.missingCaseNoteSummary && (
            <div
              style={{
                marginTop: 8,
                padding: "8px 10px",
                borderRadius: 8,
                background: "var(--color-coral-light)",
                border: "0.5px solid #F0B3AF",
                fontSize: 11,
                color: "var(--color-coral-dark)",
              }}
            >
              <i className="ti ti-alert-triangle" style={{ fontSize: 12, marginRight: 4 }} aria-hidden="true" />
              {data.missingCaseNoteSummary}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
