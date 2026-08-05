"use client";

import { useEffect, useState } from "react";
import type { CardView } from "@/lib/pipeline";
import { QuickAddModal, AddClientModal } from "./modals";
import { ClientDrawer } from "./client-drawer";
import { tagStyle } from "./tag-styles";

type Column = { key: string; title: string; dot: string; cards: CardView[] };

export function PipelineView({
  columns,
  totalInProgress,
  needAction,
}: {
  columns: Column[];
  totalInProgress: number;
  needAction: number;
}) {
  const [view, setView] = useState<"board" | "list">("board");
  const [selected, setSelected] = useState<CardView | null>(null);
  const [modal, setModal] = useState<null | "quick" | "add">(null);

  useEffect(() => {
    function onPrimary() {
      setModal("add");
    }
    window.addEventListener("aba:primary-action", onPrimary as EventListener);
    return () =>
      window.removeEventListener("aba:primary-action", onPrimary as EventListener);
  }, []);

  const allCards = columns.flatMap((c) => c.cards.map((card) => ({ card, col: c })));

  return (
    <div className="page-full">
      <div className="page-toolbar">
        <div>
          <div className="page-toolbar-sub">
            {totalInProgress} clients in progress
            {needAction > 0 && (
              <>
                {" · "}
                <span className="pill pill-coral">{needAction} need action</span>
              </>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", border: "0.5px solid var(--color-line)", borderRadius: 8, overflow: "hidden", background: "var(--color-app)" }}>
            <button onClick={() => setView("board")} style={{ padding: "6px 12px", fontSize: 11, fontWeight: 500, border: "none", background: view === "board" ? "var(--color-blue)" : "transparent", color: view === "board" ? "#fff" : "var(--color-ink2)", cursor: "pointer", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 4 }}>
              <i className="ti ti-layout-columns" style={{ fontSize: 13 }} /> Board
            </button>
            <button onClick={() => setView("list")} style={{ padding: "6px 12px", fontSize: 11, fontWeight: 500, border: "none", background: view === "list" ? "var(--color-blue)" : "transparent", color: view === "list" ? "#fff" : "var(--color-ink2)", cursor: "pointer", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 4 }}>
              <i className="ti ti-list" style={{ fontSize: 13 }} /> List
            </button>
          </div>
          <button className="btn btn-outline" onClick={() => setModal("quick")} style={{ borderColor: "var(--color-blue)", color: "var(--color-blue)" }}>
            <i className="ti ti-bolt" style={{ fontSize: 13 }} /> Quick add
          </button>
          <button className="btn btn-primary" onClick={() => setModal("add")}>
            <i className="ti ti-plus" style={{ fontSize: 13 }} /> Add client
          </button>
        </div>
      </div>

      <p className="notice-inline" style={{ margin: "12px 16px 0", flexShrink: 0 }}>
        <i className="ti ti-shield-check" aria-hidden="true" />
        Clients are shown by reference code, not name. Full identity and case notes stay in
        Catalyst; all documents live in Google Drive.
      </p>

      {view === "board" ? (
        <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden", padding: 16, display: "flex", gap: 12, alignItems: "flex-start", minHeight: 0 }}>
          {columns.map((col) => (
            <div key={col.key} className="kb-col">
              <div className="kb-col-head">
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div className="kb-col-dot" style={{ background: col.dot }} />
                  <span className="kb-col-title">{col.title}</span>
                  <span className="kb-col-count">{col.cards.length}</span>
                </div>
              </div>
              <div className="kb-col-body">
                {col.cards.map((card) => (
                  <KanbanCard key={card.id} card={card} onOpen={() => setSelected(card)} />
                ))}
                {col.cards.length === 0 && (
                  <div style={{ fontSize: 11, color: "var(--color-ink3)", textAlign: "center", padding: "16px 0" }}>No clients</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ListView rows={allCards} onOpen={setSelected} />
      )}

      {modal === "quick" && <QuickAddModal onClose={() => setModal(null)} />}
      {modal === "add" && <AddClientModal onClose={() => setModal(null)} />}
      {selected && <ClientDrawer card={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function KanbanCard({ card, onOpen }: { card: CardView; onOpen: () => void }) {
  return (
    <button className={`kb-card${card.alert ? " kb-card-alert" : ""}`} onClick={onOpen}>
      {card.alert && (
        <div style={{ marginBottom: 8 }}>
          <span className="pill pill-coral">
            <i className="ti ti-alert-triangle" style={{ fontSize: 11 }} aria-hidden="true" />
            {card.alert}
          </span>
        </div>
      )}
      <div className="kb-card-top">
        <div className="kb-init" style={{ background: card.initBg, color: card.initColor }}>
          <i className="ti ti-user" style={{ fontSize: 13 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="kb-name">Client #{card.refCode}</div>
          <div className="kb-meta">
            {card.serviceStartLabel ?? "Start —"} · {card.abaContext}
          </div>
        </div>
      </div>
      <div className="kb-tags">
        {card.tags.map((t, i) => (
          <span key={i} className="kb-tag" style={tagStyle(t.tone)}>{t.label}</span>
        ))}
      </div>
      {card.due && (
        <div className="kb-due-row">
          <i className="ti ti-calendar" style={{ fontSize: 11, color: "var(--color-ink3)" }} />
          <span className="kb-due-label">{card.due.label}</span>
          <span
            className={`pill ${
              card.due.tone === "coral"
                ? "pill-coral"
                : card.due.tone === "amber"
                  ? "pill-amber"
                  : card.due.tone === "teal"
                    ? "pill-green"
                    : "pill-gray"
            }`}
          >
            {card.due.date}
          </span>
        </div>
      )}
      <div className="kb-progress-wrap">
        <div className="kb-progress-bar" style={{ width: `${card.progressPct}%`, background: card.progressColor }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontSize: 10, color: "var(--color-ink3)" }}>{card.footer}</span>
        <span className="kb-action-btn">Open →</span>
      </div>
    </button>
  );
}

function ListView({
  rows,
  onOpen,
}: {
  rows: { card: CardView; col: Column }[];
  onOpen: (c: CardView) => void;
}) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--color-app)", textAlign: "left", color: "var(--color-ink2)" }}>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>Client</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>Stage</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>MA</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>Due / timer</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>Status</th>
              <th style={{ padding: "10px 14px" }} />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ card, col }) => (
              <tr key={card.id} style={{ borderTop: "0.5px solid var(--color-line)", cursor: "pointer" }} onClick={() => onOpen(card)}>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ fontWeight: 600, color: "var(--color-ink)" }}>Client #{card.refCode}</div>
                  <div style={{ fontSize: 10.5, color: "var(--color-ink3)" }}>{card.serviceStartLabel ?? "Start —"}</div>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span className="kb-col-dot" style={{ background: col.dot }} />
                    {col.title}
                  </span>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span className="kb-tag" style={tagStyle(card.tags[0]?.tone ?? "gray")}>{card.tags[0]?.label}</span>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  {card.due ? (
                    <span
                      className={`pill ${
                        card.due.tone === "coral"
                          ? "pill-coral"
                          : card.due.tone === "amber"
                            ? "pill-amber"
                            : card.due.tone === "teal"
                              ? "pill-green"
                              : "pill-gray"
                      }`}
                    >
                      {card.due.label} · {card.due.date}
                    </span>
                  ) : (
                    <span className="pill pill-gray">—</span>
                  )}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  {card.alert ? (
                    <span className="pill pill-coral">{card.alert}</span>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--color-ink3)" }}>{card.footer}</span>
                  )}
                </td>
                <td style={{ padding: "10px 14px", textAlign: "right" }}>
                  <span className="kb-action-btn">Open →</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
