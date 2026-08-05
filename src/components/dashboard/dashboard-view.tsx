"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DashboardData } from "@/lib/dashboard";
import { AddClientModal } from "@/components/pipeline/modals";

/** Map any status class to the three allowed status pills (or neutral gray). */
function statusPillClass(raw: string): string {
  if (raw.includes("coral") || raw.includes("red")) return "pill-coral";
  if (raw.includes("amber") || raw.includes("warn")) return "pill-amber";
  if (raw.includes("green") || raw.includes("teal")) return "pill-green";
  return "pill-gray";
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

  return (
    <div className="page-stack">
      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} />}
      <div className="stat-row">
        {data.stats.map((stat) => {
          const inner = (
            <>
              <div className="stat-icon-row">
                <div className="stat-icon">
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
                  <span className="stat-val-suffix">/{data.todayExpected}</span>
                )}
              </div>
              <div className="stat-change" style={{ color: stat.subColor }}>
                {stat.sub}
              </div>
              <div className="mini-bar">
                <div
                  className="mini-fill"
                  style={{
                    width: `${stat.barPct}%`,
                    background:
                      stat.barColor.includes("blue") ? "var(--color-teal)" : stat.barColor,
                  }}
                />
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
            <span className="card-title">Onboarding pipeline</span>
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
                  <span className={`pill ${statusPillClass(row.pillClass)}`}>{row.pillLabel}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <span className="card-title">Document alerts</span>
            <Link href="/documents" className="view-link">
              View all →
            </Link>
          </div>
          {data.docAlerts.length === 0 ? (
            <div className="empty-hint">No document alerts right now.</div>
          ) : (
            data.docAlerts.map((doc, i) => {
              const pill =
                doc.tone === "coral"
                  ? "pill-coral"
                  : doc.tone === "amber"
                    ? "pill-amber"
                    : doc.tone === "teal"
                      ? "pill-green"
                      : "pill-gray";
              return (
                <Link
                  key={`${doc.clientId}-${doc.docLabel}-${i}`}
                  href="/documents"
                  className="doc-item"
                >
                  <div className="doc-icon">
                    <i
                      className={
                        doc.tone === "coral"
                          ? "ti ti-file-x"
                          : doc.tone === "amber"
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
            <span className="card-title">Staff onboarding</span>
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
            <span className="card-title">Case notes — this week</span>
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
            <div className="case-missing-banner">
              <i className="ti ti-alert-triangle" style={{ fontSize: 12, marginRight: 4 }} aria-hidden="true" />
              {data.missingCaseNoteSummary}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
