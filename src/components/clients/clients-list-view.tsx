"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ClientListData, ClientListRow } from "@/lib/clients";
import { CATALYST_URL } from "@/lib/documents";
import { AddClientModal } from "@/components/pipeline/modals";

type Filter = "all" | "active" | "onboarding" | "inactive";

export function ClientsListView({ data }: { data: ClientListData }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    function onPrimary() {
      setShowAdd(true);
    }
    window.addEventListener("aba:primary-action", onPrimary as EventListener);
    return () => window.removeEventListener("aba:primary-action", onPrimary as EventListener);
  }, []);

  const rows = useMemo(() => {
    let list = data.rows;
    if (filter === "active") list = list.filter((r) => r.status === "active");
    else if (filter === "onboarding") list = list.filter((r) => r.status === "onboarding");
    else if (filter === "inactive")
      list = list.filter((r) => !["active", "onboarding"].includes(r.status));

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.refCode.includes(q) ||
          r.context.toLowerCase().includes(q) ||
          r.stageLabel.toLowerCase().includes(q),
      );
    }
    return list;
  }, [data.rows, filter, query]);

  const { counts } = data;

  return (
    <div>
      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p className="page-meta">
          {counts.all} total clients · {counts.active} active · {counts.onboarding} in onboarding
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="search">
            <i className="ti ti-search" />
            <input
              placeholder="Search clients…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>
          All clients ({counts.all})
        </FilterBtn>
        <FilterBtn active={filter === "active"} onClick={() => setFilter("active")}>
          Active ({counts.active})
        </FilterBtn>
        <FilterBtn active={filter === "onboarding"} onClick={() => setFilter("onboarding")}>
          In onboarding ({counts.onboarding})
        </FilterBtn>
        <FilterBtn active={filter === "inactive"} onClick={() => setFilter("inactive")}>
          Inactive ({counts.inactive})
        </FilterBtn>
      </div>

      <div className="full-card" style={{ padding: 0, overflow: "hidden", marginBottom: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Status</th>
              <th>MA</th>
              <th>Assigned BCBA/QSP</th>
              <th>Full record</th>
              <th>Next renewal</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ClientRow key={row.id} row={row} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--color-ink3)" }}>
                  No clients match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={`cr-filter-btn${active ? " active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

function ClientRow({ row }: { row: ClientListRow }) {
  const renewalColor =
    row.nextRenewalTone === "coral"
      ? "var(--color-coral)"
      : row.nextRenewalTone === "amber"
        ? "var(--color-amber)"
        : "var(--color-ink3)";

  return (
    <tr className="cr-row">
      <td>
        <Link href={`/clients/${row.id}`} style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div className="init" style={{ width: 28, height: 28, fontSize: 10, background: row.initBg, color: row.initColor }}>
              <i className="ti ti-user" style={{ fontSize: 10 }} />
            </div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>Client #{row.refCode}</div>
              <div style={{ fontSize: 10, color: "var(--color-ink3)" }}>
                {row.ageLabel ?? "Age —"} · {row.context}
              </div>
            </div>
          </div>
        </Link>
      </td>
      <td>
        <span className={`pill ${row.stagePillClass}`} style={{ fontSize: 10 }}>
          {row.stageLabel}
        </span>
      </td>
      <td>
        <span className={`pill ${row.maPillClass}`} style={{ fontSize: 10 }}>
          {row.maLabel}
        </span>
      </td>
      <td style={{ fontSize: 12, color: "var(--color-ink2)" }}>{row.bcbaName}</td>
      <td>
        <a
          href={CATALYST_URL}
          target="_blank"
          rel="noreferrer"
          className="btn btn-outline"
          style={{ fontSize: 10, padding: "3px 9px" }}
          onClick={(e) => e.stopPropagation()}
        >
          <i className="ti ti-external-link" style={{ fontSize: 11 }} /> Go to Catalyst
        </a>
      </td>
      <td style={{ fontSize: 11, color: renewalColor, fontWeight: row.nextRenewal ? 500 : 400 }}>
        {row.nextRenewal ?? "—"}
      </td>
      <td>
        <Link href={`/clients/${row.id}`} className="btn btn-outline" style={{ fontSize: 11, padding: "4px 10px" }}>
          View →
        </Link>
      </td>
    </tr>
  );
}
