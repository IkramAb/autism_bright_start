"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CardView } from "@/lib/pipeline";
import { advanceStage, setCorrections } from "@/app/(app)/pipeline/actions";
import { tagStyle, dueColor } from "./tag-styles";

const STRIP = ["Referral", "Phone screen", "Docs", "CMDE", "ITP", "Agreements", "Active"];

export function ClientDrawer({ card, onClose }: { card: CardView; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function runAdvance() {
    setError(null);
    startTransition(async () => {
      const res = await advanceStage(card.id);
      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        setError(res.error ?? "Could not advance stage.");
      }
    });
  }

  function toggleCorrections() {
    setError(null);
    startTransition(async () => {
      const res = await setCorrections(card.id, !card.correctionsRequested);
      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        setError(res.error ?? "Could not update.");
      }
    });
  }

  const atActive = card.stageKey === "active";

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer-panel">
        <div style={{ padding: "18px 20px", borderBottom: "0.5px solid var(--color-line)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div className="kb-init" style={{ width: 40, height: 40, fontSize: 13, background: card.initBg, color: card.initColor }}>
              <i className="ti ti-user" style={{ fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--color-ink)" }}>Client #{card.refCode}</div>
              <div style={{ fontSize: 12, color: "var(--color-ink3)" }}>
                {card.ageLabel ? `${card.ageLabel} · ` : ""}{card.abaContext}
              </div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-ink3)", fontSize: 20, lineHeight: 1 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="pill pill-blue" style={{ fontSize: 11 }}>{card.stageLabel}</span>
            {card.correctionsRequested && (
              <span className="pill pill-coral" style={{ fontSize: 11 }}>Corrections requested</span>
            )}
          </div>

          {/* Pipeline strip */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>Pipeline progress</div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              {STRIP.map((label, i) => {
                const state = i < card.stripIndex ? "done" : i === card.stripIndex ? "active" : "";
                return (
                  <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 5 }}>
                    <div className={`stage-circle ${state}`}>
                      {state === "done" ? <i className="ti ti-check" style={{ fontSize: 11 }} /> : i + 1}
                    </div>
                    <span style={{ fontSize: 8.5, color: "var(--color-ink3)", textAlign: "center", lineHeight: 1.2 }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div className="kb-tags" style={{ marginBottom: 0 }}>
            {card.tags.map((t, i) => (
              <span key={i} className="kb-tag" style={tagStyle(t.tone)}>{t.label}</span>
            ))}
          </div>

          {/* Timer / due */}
          {card.due && (
            <div style={{ background: "var(--color-app)", borderRadius: 10, padding: "10px 12px" }}>
              <div className="kb-due-row" style={{ marginBottom: 6 }}>
                <i className="ti ti-clock" style={{ fontSize: 12, color: dueColor(card.due.tone) }} />
                <span className="kb-due-label">{card.due.label}</span>
                <span className="kb-due-date" style={{ color: dueColor(card.due.tone) }}>{card.due.date}</span>
              </div>
              <div className="kb-progress-wrap">
                <div className="kb-progress-bar" style={{ width: `${card.progressPct}%`, background: card.progressColor }} />
              </div>
            </div>
          )}

          <div style={{ fontSize: 12, color: "var(--color-ink2)" }}>{card.footer}</div>

          {card.alert && (
            <div style={{ background: "var(--color-coral-light)", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "var(--color-coral-dark)", display: "flex", alignItems: "center", gap: 6 }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 13 }} />
              {card.alert}
            </div>
          )}

          {/* External links */}
          <div style={{ display: "flex", gap: 8 }}>
            {card.driveUrl ? (
              <a href={card.driveUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }}>
                <i className="ti ti-brand-google-drive" style={{ fontSize: 13 }} /> Drive folder
              </a>
            ) : (
              <span className="btn btn-outline" style={{ flex: 1, justifyContent: "center", opacity: 0.5 }}>No Drive folder</span>
            )}
            <a href="https://catalyst.therapybrands.com" target="_blank" rel="noreferrer" className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }}>
              <i className="ti ti-external-link" style={{ fontSize: 13 }} /> Catalyst
            </a>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: "var(--color-coral-dark)", background: "var(--color-coral-light)", borderRadius: 8, padding: "8px 10px" }}>{error}</div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "0.5px solid var(--color-line)", paddingTop: 16 }}>
            {!atActive && (
              <button className="btn btn-primary" style={{ justifyContent: "center" }} disabled={pending} onClick={runAdvance}>
                <i className="ti ti-arrow-right" style={{ fontSize: 13 }} />
                {pending ? "Working…" : "Advance to next stage"}
              </button>
            )}
            <button className="btn btn-outline" style={{ justifyContent: "center", borderColor: card.correctionsRequested ? "var(--color-teal)" : "var(--color-coral)", color: card.correctionsRequested ? "var(--color-teal-dark)" : "var(--color-coral-dark)" }} disabled={pending} onClick={toggleCorrections}>
              <i className={`ti ${card.correctionsRequested ? "ti-check" : "ti-alert-triangle"}`} style={{ fontSize: 13 }} />
              {card.correctionsRequested ? "Clear corrections flag" : "Mark corrections requested"}
            </button>
          </div>

          <p style={{ fontSize: 10.5, color: "var(--color-ink3)", lineHeight: 1.5 }}>
            Reference code only. Keep names, contact details, and clinical content in Catalyst and Drive — never in ABA Connect.
          </p>
        </div>
      </aside>
    </>
  );
}
