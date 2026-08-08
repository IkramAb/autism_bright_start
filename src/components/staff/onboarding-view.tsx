"use client";

import { useState, useTransition } from "react";
import type { OnboardingCard } from "@/lib/staff";
import { fetchStaffDetail } from "@/app/(app)/staff/actions";
import { StaffDetailPanel } from "./staff-detail-panel";
import { AddEmployeeModal } from "./add-employee-modal";
import type { StaffDetail } from "@/lib/staff";
import { PageHeader } from "@/components/shell/page-header";
import { ROUTE_META } from "@/lib/nav";

export function OnboardingView({ cards }: { cards: OnboardingCard[] }) {
  const meta = ROUTE_META["/onboarding"];
  const [detail, setDetail] = useState<StaffDetail | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [, startTransition] = useTransition();

  function openDetail(id: string) {
    startTransition(async () => {
      setDetail(await fetchStaffDetail(id));
    });
  }

  if (detail) {
    return <StaffDetailPanel staff={detail} onBack={() => setDetail(null)} backLabel="All onboarding" />;
  }

  return (
    <div>
      {showAdd && <AddEmployeeModal onClose={() => setShowAdd(false)} />}
      <PageHeader
        title={meta.title}
        subtitle={`${cards.length} employees in onboarding · ${meta.subtitle}`}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" /> Add employee
          </button>
        }
      />

      <div className="page-stack">
        {cards.map((card) => (
          <div
            key={card.id}
            className="emp-card"
            style={{ cursor: "pointer" }}
            onClick={() => openDetail(card.id)}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  className="init"
                  style={{
                    width: 36,
                    height: 36,
                    background: card.avatarBg,
                    color: card.avatarColor,
                  }}
                >
                  {card.initials}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{card.fullName}</div>
                  <div style={{ marginTop: 4 }}>
                    <span className="pill pill-outline">{card.role}</span>
                  </div>
                </div>
              </div>
              <span className={`pill ${card.statusClass}`}>{card.statusLabel}</span>
            </div>
            {card.alert && (
              <div style={{ marginBottom: 8 }}>
                <span className="pill pill-coral">{card.alert}</span>
              </div>
            )}
            <div className="mini-bar" style={{ marginBottom: 8 }}>
              <div
                className="mini-fill"
                style={{ width: `${card.progressPct}%`, background: "var(--color-teal)" }}
              />
            </div>
            <div style={{ fontSize: 11, color: "var(--color-ink3)" }}>
              {card.progressPct}% complete
            </div>
            <div style={{ marginTop: 8 }}>
              {card.previewItems.map((item, i) => (
                <div key={i} style={{ fontSize: 11, color: "var(--color-ink2)", padding: "2px 0" }}>
                  {item.done ? "✓" : "○"} {item.label}
                  {item.due ? ` · ${item.due}` : ""}
                </div>
              ))}
            </div>
          </div>
        ))}

        {cards.length === 0 && (
          <div
            className="full-card"
            style={{ textAlign: "center", color: "var(--color-ink3)", fontSize: 12 }}
          >
            No staff currently in onboarding.
          </div>
        )}
      </div>
    </div>
  );
}
