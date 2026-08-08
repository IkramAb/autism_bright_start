"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DashboardData } from "@/lib/dashboard";
import { AddClientModal } from "@/components/pipeline/modals";
import { PageHeader } from "@/components/shell/page-header";
import { ROUTE_META } from "@/lib/nav";

/** Map any status class/label to the three allowed status pills (or neutral gray). */
function statusPillClass(raw: string, label = ""): string {
  const text = `${raw} ${label}`.toLowerCase();
  if (
    text.includes("coral") ||
    text.includes("red") ||
    text.includes("correction") ||
    text.includes("overdue") ||
    text.includes("missing")
  ) {
    return "pill-coral";
  }
  if (
    text.includes("amber") ||
    text.includes("warn") ||
    text.includes("requested") ||
    text.includes("due soon") ||
    text.includes("expir")
  ) {
    return "pill-amber";
  }
  if (
    text.includes("green") ||
    text.includes("teal") ||
    text.includes("active") ||
    text.includes("confirmed") ||
    text.includes("done")
  ) {
    return "pill-green";
  }
  return "pill-gray";
}

function trendColor(stat: DashboardData["stats"][number]): string {
  const sub = stat.sub.toLowerCase();
  if (
    sub.includes("no session") ||
    sub.includes("nothing urgent") ||
    (sub.includes("no ") && sub.includes("scheduled"))
  ) {
    return "#9498A3";
  }
  if (stat.subColor.includes("coral") || sub.includes("overdue") || sub.includes("missing")) {
    return "#E0524B";
  }
  if (stat.subColor.includes("amber") || sub.includes("need action")) {
    return "#EF9F27";
  }
  if (stat.subColor.includes("teal") || stat.subColor.includes("green")) {
    return "#1A9A6E";
  }
  return "#9498A3";
}

function caseBarColor(day: DashboardData["caseNoteDays"][number]): string {
  // Future / unscheduled
  if (day.countLabel === "—" || day.expected === 0) return "#E6E8EC";
  // Complete
  if (day.confirmed >= day.expected) return "#1A9A6E";
  // Missing notes
  return "#E0524B";
}

export function DashboardView({ data }: { data: DashboardData }) {
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    function onPrimary() {
      setShowAdd(true);
    }
    window.addEventListener("aba:primary-action", onPrimary as EventListener);
    return () => window.removeEventListener("aba:primary-action", onPrimary as EventListener);
  }, []);

  const meta = ROUTE_META["/dashboard"];

  return (
    <div className="page-stack">
      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} />}
      <PageHeader title={meta.title} subtitle={meta.subtitle} />
      <div className="stat-row">
        {data.stats.map((stat) => {
          const trend = trendColor(stat);
          const inner = (
            <>
              <div className="stat-card-hd">
                <span className="stat-lbl">{stat.label}</span>
                <span className="stat-badge" style={{ color: trend, borderColor: `${trend}44` }}>
                  {stat.sub}
                </span>
              </div>
              <div className="stat-val">
                {stat.value}
                {stat.label === "Case notes today" && data.todayExpected > 0 && (
                  <span className="stat-val-suffix">/{data.todayExpected}</span>
                )}
              </div>
              <div className="stat-card-ft">
                <div className="stat-change" style={{ color: trend }}>
                  {stat.sub}
                </div>
                <div className="mini-bar">
                  <div
                    className="mini-fill"
                    style={{
                      width: `${stat.barPct}%`,
                      background: trend === "#9498A3" ? "var(--color-line)" : trend,
                    }}
                  />
                </div>
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
            <h2 className="card-title">Onboarding pipeline</h2>
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
          <div className="pipe-clients">
            {data.pipelineHighlights.length === 0 ? (
              <div className="empty-hint">No clients in onboarding.</div>
            ) : (
              data.pipelineHighlights.map((row) => (
                <Link key={row.clientId} href={`/clients/${row.clientId}`} className="client-row">
                  <div className="client-row-icon">
                    <i className="ti ti-user" style={{ fontSize: 12 }} aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="c-name">Client #{row.refCode}</div>
                    <div className="c-sub">{row.sub}</div>
                  </div>
                  <span className={`pill ${statusPillClass(row.pillClass, row.pillLabel)}`}>
                    {row.pillLabel}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <h2 className="card-title">Document alerts</h2>
            <Link href="/documents" className="view-link">
              View all →
            </Link>
          </div>
          {data.docAlerts.length === 0 ? (
            <div className="empty-hint">No document alerts right now.</div>
          ) : (
            data.docAlerts.map((doc, i) => {
              const pill = statusPillClass(doc.pillClass, doc.pillLabel);
              return (
                <Link
                  key={`${doc.clientId}-${doc.docLabel}-${i}`}
                  href="/documents"
                  className="doc-item"
                >
                  <div className="doc-icon">
                    <i
                      className={
                        pill === "pill-coral"
                          ? "ti ti-file-x"
                          : pill === "pill-amber"
                            ? "ti ti-clock"
                            : "ti ti-file"
                      }
                      aria-hidden="true"
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="doc-name">{doc.docLabel}</div>
                    <div className="doc-meta">{doc.meta}</div>
                  </div>
                  <span className={`pill ${pill}`}>{doc.pillLabel}</span>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-hd">
            <h2 className="card-title">Staff onboarding</h2>
            <Link href="/onboarding" className="view-link">
              View all →
            </Link>
          </div>
          {data.staffOnboarding ? (
            <>
              <div className="staff-onb-hd">
                <span className="staff-onb-name">
                  {data.staffOnboarding.fullName} — {data.staffOnboarding.role}
                </span>
                <span className="staff-onb-pct">{data.staffOnboarding.progressPct}%</span>
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
                    <span
                      className={`pill ${
                        item.dueTone?.includes("coral")
                          ? "pill-coral"
                          : item.dueTone?.includes("amber")
                            ? "pill-amber"
                            : "pill-gray"
                      }`}
                    >
                      {item.due}
                    </span>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="empty-hint">No staff currently onboarding.</div>
          )}
        </div>

        <div className="card">
          <div className="card-hd">
            <h2 className="card-title">Case notes — this week</h2>
            <Link href="/case-notes" className="view-link">
              View all →
            </Link>
          </div>
          {data.caseNoteDays.map((day) => {
            const fill = caseBarColor(day);
            const isIdle = day.countLabel === "—" || day.expected === 0;
            return (
              <div key={day.name} className="case-day">
                <span className="case-day-name">{day.name}</span>
                <div className="case-bar-wrap">
                  <div
                    className="case-bar"
                    style={{
                      width: isIdle ? "0%" : `${Math.max(day.barPct, 8)}%`,
                      background: fill,
                    }}
                  />
                </div>
                <span
                  className="case-count"
                  style={{
                    color: isIdle
                      ? "var(--color-ink3)"
                      : fill === "#E0524B"
                        ? "var(--color-coral)"
                        : "var(--color-teal)",
                  }}
                >
                  {day.countLabel}
                </span>
              </div>
            );
          })}
          {data.missingCaseNoteSummary && (
            <div className="alert-row alert-row-coral case-missing-banner">
              <i className="ti ti-alert-triangle" aria-hidden="true" />
              <div className="alert-row-body">{data.missingCaseNoteSummary}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
