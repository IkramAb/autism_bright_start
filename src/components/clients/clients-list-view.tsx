"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ClientListData, ClientListRow } from "@/lib/clients";
import { CATALYST_URL } from "@/lib/documents";
import { AddClientModal } from "@/components/pipeline/modals";
import { PageHeader } from "@/components/shell/page-header";
import { ROUTE_META } from "@/lib/nav";

type Filter = "all" | "active" | "onboarding" | "inactive";
type SortKey = "client" | "status" | "renewal";
type SortDir = "asc" | "desc";

export function ClientsListView({ data }: { data: ClientListData }) {
  const meta = ROUTE_META["/clients"];
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("client");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
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
          r.refCode.toLowerCase().includes(q) ||
          r.context.toLowerCase().includes(q) ||
          r.stageLabel.toLowerCase().includes(q),
      );
    }

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "client") cmp = a.refCode.localeCompare(b.refCode);
      else if (sortKey === "status") cmp = a.stageLabel.localeCompare(b.stageLabel);
      else {
        const aKey = a.nextRenewal ?? "";
        const bKey = b.nextRenewal ?? "";
        cmp = aKey.localeCompare(bKey);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [data.rows, filter, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return "ti-selector";
    return sortDir === "asc" ? "ti-sort-ascending" : "ti-sort-descending";
  }

  const { counts } = data;

  return (
    <div>
      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} />}

      <PageHeader
        title={meta.title}
        subtitle={`${counts.all} total · ${counts.active} active · ${counts.onboarding} in onboarding`}
        actions={
          <div className="search">
            <i className="ti ti-search" aria-hidden="true" />
            <input
              placeholder="Search by client code…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search clients by code"
            />
          </div>
        }
      />

      <div className="filter-tab-row">
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
              <th>
                <button
                  type="button"
                  className="th-sort"
                  data-sorted={sortKey === "client" ? "true" : "false"}
                  onClick={() => toggleSort("client")}
                >
                  Client
                  <i className={`ti ${sortIcon("client")}`} aria-hidden="true" />
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="th-sort"
                  data-sorted={sortKey === "status" ? "true" : "false"}
                  onClick={() => toggleSort("status")}
                >
                  Status
                  <i className={`ti ${sortIcon("status")}`} aria-hidden="true" />
                </button>
              </th>
              <th>MA</th>
              <th>Assigned BCBA/QSP</th>
              <th>Full record</th>
              <th>
                <button
                  type="button"
                  className="th-sort"
                  data-sorted={sortKey === "renewal" ? "true" : "false"}
                  onClick={() => toggleSort("renewal")}
                >
                  Next renewal
                  <i className={`ti ${sortIcon("renewal")}`} aria-hidden="true" />
                </button>
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ClientRow key={row.id} row={row} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{ textAlign: "center", padding: 24, color: "var(--muted-foreground)" }}
                >
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

function pillIcon(className: string, label: string): string {
  const text = `${className} ${label}`.toLowerCase();
  if (
    text.includes("pill-green") ||
    text.includes("verified") ||
    text.includes("active")
  ) {
    return "ti-circle-check";
  }
  if (
    text.includes("pill-coral") ||
    text.includes("none") ||
    text.includes("inactive")
  ) {
    return "ti-circle-x";
  }
  if (
    text.includes("pill-amber") ||
    text.includes("pending") ||
    text.includes("unverified") ||
    text.includes("expir")
  ) {
    return "ti-clock";
  }
  return "ti-circle-dot";
}

function ClientRow({ row }: { row: ClientListRow }) {
  const renewalColor =
    row.nextRenewalTone === "coral"
      ? "var(--color-coral)"
      : row.nextRenewalTone === "amber"
        ? "var(--color-amber)"
        : "var(--muted-foreground)";

  return (
    <tr className="cr-row">
      <td>
        <Link href={`/clients/${row.id}`} style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div
              className="init"
              style={{
                width: 28,
                height: 28,
                fontSize: 10,
                background: row.initBg,
                color: row.initColor,
              }}
            >
              <i className="ti ti-user" style={{ fontSize: 10 }} aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Client #{row.refCode}</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                {row.serviceStartLabel ?? "Start —"} · {row.context}
              </div>
            </div>
          </div>
        </Link>
      </td>
      <td>
        <span className={`pill pill-icon ${row.stagePillClass}`}>
          <i
            className={`ti ${pillIcon(row.stagePillClass, row.stageLabel)}`}
            aria-hidden="true"
          />
          {row.stageLabel}
        </span>
      </td>
      <td>
        <span className={`pill pill-icon ${row.maPillClass}`}>
          <i className={`ti ${pillIcon(row.maPillClass, row.maLabel)}`} aria-hidden="true" />
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
          <i className="ti ti-external-link" style={{ fontSize: 11 }} aria-hidden="true" /> Go to
          Catalyst
        </a>
      </td>
      <td style={{ fontSize: 11, color: renewalColor, fontWeight: row.nextRenewal ? 500 : 400 }}>
        {row.nextRenewal ?? "—"}
      </td>
      <td>
        <Link
          href={`/clients/${row.id}`}
          className="btn btn-outline"
          style={{ fontSize: 11, padding: "4px 10px" }}
        >
          View →
        </Link>
      </td>
    </tr>
  );
}
