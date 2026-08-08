"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StaffListRow, StaffDetail } from "@/lib/staff";
import { fetchStaffDetail, deleteStaff } from "@/app/(app)/staff/actions";
import { StaffDetailPanel } from "./staff-detail-panel";
import { AddEmployeeModal } from "./add-employee-modal";
import { EditStaffModal } from "./edit-staff-modal";
import { PageHeader } from "@/components/shell/page-header";
import { ROUTE_META } from "@/lib/nav";

type Filter = "all" | "rbt" | "bcba";
type SortKey = "name" | null;
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export function StaffDirectoryView({ rows }: { rows: StaffListRow[] }) {
  const router = useRouter();
  const meta = ROUTE_META["/staff"];
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [detail, setDetail] = useState<StaffDetail | null>(null);
  const [editDetail, setEditDetail] = useState<StaffDetail | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter === "rbt") list = list.filter((r) => r.roleType === "rbt");
    if (filter === "bcba") list = list.filter((r) => r.roleType === "bcba");
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.fullName.toLowerCase().includes(q) ||
          (r.email ?? "").toLowerCase().includes(q) ||
          (r.phone ?? "").toLowerCase().includes(q),
      );
    }
    if (sortKey === "name") {
      list = [...list].sort((a, b) => {
        const cmp = a.fullName.localeCompare(b.fullName);
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [rows, filter, query, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [filter, query, pageSize]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function openDetail(id: string) {
    startTransition(async () => {
      const d = await fetchStaffDetail(id);
      setDetail(d);
      router.refresh();
    });
  }

  function openEdit(id: string) {
    setBusyId(id);
    startTransition(async () => {
      const d = await fetchStaffDetail(id);
      setBusyId(null);
      if (d) setEditDetail(d);
    });
  }

  function handleDelete(row: StaffListRow) {
    const confirmed = window.confirm(
      `Delete ${row.fullName}? This permanently removes the staff member and all their onboarding items, trainings, documents, and background checks. This cannot be undone.`,
    );
    if (!confirmed) return;
    setBusyId(row.id);
    startTransition(async () => {
      await deleteStaff(row.id);
      setBusyId(null);
      router.refresh();
    });
  }

  if (detail) {
    return (
      <StaffDetailPanel
        staff={detail}
        onBack={() => setDetail(null)}
        backLabel="All staff"
      />
    );
  }

  return (
    <div>
      {showAdd && <AddEmployeeModal onClose={() => setShowAdd(false)} />}
      {editDetail && (
        <EditStaffModal staff={editDetail} onClose={() => setEditDetail(null)} />
      )}

      <PageHeader
        title={meta.title}
        subtitle={`${rows.length} staff members · ${meta.subtitle}`}
        actions={
          <>
            <div className="search">
              <i className="ti ti-search" aria-hidden="true" />
              <input
                placeholder="Search by name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search staff by name"
              />
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" /> Add employee
            </button>
          </>
        }
      />

      <div className="filter-tab-row">
        <button
          type="button"
          className={`cr-filter-btn${filter === "all" ? " active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All staff ({rows.length})
        </button>
        <button
          type="button"
          className={`cr-filter-btn${filter === "rbt" ? " active" : ""}`}
          onClick={() => setFilter("rbt")}
        >
          RBT ({rows.filter((r) => r.roleType === "rbt").length})
        </button>
        <button
          type="button"
          className={`cr-filter-btn${filter === "bcba" ? " active" : ""}`}
          onClick={() => setFilter("bcba")}
        >
          BCBA/QSP ({rows.filter((r) => r.roleType === "bcba").length})
        </button>
      </div>

      <div className="full-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <button
                  type="button"
                  className="th-sort"
                  data-sorted={sortKey === "name" ? "true" : "false"}
                  onClick={() => toggleSort("name")}
                >
                  Name
                  <i
                    className={`ti ${
                      sortKey === "name"
                        ? sortDir === "asc"
                          ? "ti-sort-ascending"
                          : "ti-sort-descending"
                        : "ti-selector"
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Hired</th>
              <th>Trainings</th>
              <th>Certifications</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.id} className="cr-row" onClick={() => openDetail(row.id)}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div
                      className="init"
                      style={{ background: row.avatarBg, color: row.avatarColor }}
                    >
                      {row.initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{row.fullName}</div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                        {row.email ?? "—"}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: 12, color: "var(--color-ink2)" }}>{row.phone ?? "—"}</td>
                <td>
                  <span className="pill pill-outline">{row.role}</span>
                </td>
                <td>
                  <span className={`pill ${row.statusClass}`}>{row.statusLabel}</span>
                </td>
                <td style={{ fontSize: 12, color: "var(--color-ink2)" }}>{row.hiredLabel}</td>
                <td>
                  <span className={`pill ${row.trainingClass}`}>{row.trainingLabel}</span>
                </td>
                <td>
                  <span className={`pill ${row.certClass}`}>{row.certLabel}</span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ fontSize: 11, padding: "4px 10px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(row.id);
                      }}
                      disabled={pending}
                    >
                      View →
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ fontSize: 11, padding: "4px 8px" }}
                      title="Edit"
                      aria-label={`Edit ${row.fullName}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(row.id);
                      }}
                      disabled={pending && busyId === row.id}
                    >
                      <i className="ti ti-edit" style={{ fontSize: 12 }} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{
                        fontSize: 11,
                        padding: "4px 8px",
                        color: "var(--color-coral-dark)",
                        borderColor: "var(--color-coral)",
                      }}
                      title="Delete"
                      aria-label={`Delete ${row.fullName}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(row);
                      }}
                      disabled={pending && busyId === row.id}
                    >
                      <i className="ti ti-trash" style={{ fontSize: 12 }} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: "center", padding: 24, color: "var(--muted-foreground)" }}
                >
                  No staff match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="table-footer">
          <span>
            {filtered.length} row{filtered.length === 1 ? "" : "s"} total
          </span>
          <div className="table-footer-right">
            <label className="icon-label">
              Rows per page
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as typeof pageSize)}
                aria-label="Rows per page"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <span>
              Page {safePage} of {pageCount}
            </span>
            <div className="table-page-btns">
              <button
                type="button"
                aria-label="Previous page"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <i className="ti ti-chevron-left" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Next page"
                disabled={safePage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                <i className="ti ti-chevron-right" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
