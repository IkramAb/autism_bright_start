"use client";

import { useEffect, useState } from "react";
import type { CardView } from "@/lib/pipeline";
import { QuickAddModal, AddClientModal } from "./modals";
import { ClientDrawer } from "./client-drawer";
import { tagClass } from "./tag-styles";
import { PageHeader } from "@/components/shell/page-header";
import { ROUTE_META } from "@/lib/nav";

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
  const meta = ROUTE_META["/pipeline"];

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
        <PageHeader
          title={meta.title}
          subtitle={`${totalInProgress} clients in progress${
            needAction > 0 ? ` · ${needAction} need action` : ""
          }`}
          actions={
            <>
              <div className="view-toggle" role="group" aria-label="Board or list view">
                <button
                  type="button"
                  className={view === "board" ? "active" : undefined}
                  onClick={() => setView("board")}
                >
                  <i className="ti ti-layout-columns" aria-hidden="true" /> Board
                </button>
                <button
                  type="button"
                  className={view === "list" ? "active" : undefined}
                  onClick={() => setView("list")}
                >
                  <i className="ti ti-list" aria-hidden="true" /> List
                </button>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setModal("quick")}
                style={{ borderColor: "var(--color-blue)", color: "var(--color-blue)" }}
              >
                <i className="ti ti-bolt" style={{ fontSize: 13 }} aria-hidden="true" /> Quick add
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setModal("add")}>
                <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" /> Add client
              </button>
            </>
          }
        />
      </div>

      <p className="notice-inline" style={{ margin: "12px 16px 0", flexShrink: 0 }}>
        <i className="ti ti-shield-check" aria-hidden="true" />
        Clients are shown by reference code, not name. Full identity and case notes stay in
        Catalyst; all documents live in Google Drive.
      </p>

      {view === "board" ? (
        <div className="kb-board">
          {columns.map((col) => (
            <div key={col.key} className="kb-col">
              <div className="kb-col-head">
                <div className="kb-col-head-left">
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
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-ink3)",
                      textAlign: "center",
                      padding: "16px 0",
                    }}
                  >
                    No clients
                  </div>
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
    <button
      type="button"
      className={`kb-card${card.alert ? " kb-card-alert" : ""}`}
      onClick={onOpen}
    >
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
          <i className="ti ti-user" style={{ fontSize: 13 }} aria-hidden="true" />
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
          <span key={i} className={tagClass(t.tone)}>
            {t.label}
          </span>
        ))}
      </div>
      {card.due && (
        <div className="kb-due-row">
          <i className="ti ti-calendar" style={{ fontSize: 11, color: "var(--color-ink3)" }} aria-hidden="true" />
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
        <div
          className="kb-progress-bar"
          style={{ width: `${card.progressPct}%`, background: card.progressColor }}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
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
      <div className="full-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Stage</th>
              <th>MA</th>
              <th>Due / timer</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ card, col }) => (
              <tr key={card.id} className="cr-row" onClick={() => onOpen(card)}>
                <td>
                  <div style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                    Client #{card.refCode}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--color-ink3)" }}>
                    {card.serviceStartLabel ?? "Start —"}
                  </div>
                </td>
                <td>
                  <span className="icon-label">
                    <span className="kb-col-dot" style={{ background: col.dot }} />
                    {col.title}
                  </span>
                </td>
                <td>
                  <span className={tagClass(card.tags[0]?.tone ?? "gray")}>
                    {card.tags[0]?.label ?? "—"}
                  </span>
                </td>
                <td>
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
                <td>
                  {card.alert ? (
                    <span className="pill pill-coral">{card.alert}</span>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--color-ink3)" }}>{card.footer}</span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <span className="kb-action-btn">Open →</span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{ textAlign: "center", padding: 24, color: "var(--muted-foreground)" }}
                >
                  No clients in the pipeline.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
