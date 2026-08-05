"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StaffListRow, StaffDetail } from "@/lib/staff";
import { fetchStaffDetail, deleteStaff } from "@/app/(app)/staff/actions";
import { StaffDetailPanel } from "./staff-detail-panel";
import { AddEmployeeModal } from "./add-employee-modal";
import { EditStaffModal } from "./edit-staff-modal";

type Filter = "all" | "rbt" | "bcba";

export function StaffDirectoryView({ rows }: { rows: StaffListRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<StaffDetail | null>(null);
  const [editDetail, setEditDetail] = useState<StaffDetail | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    function onPrimary() {
      setShowAdd(true);
    }
    window.addEventListener("aba:primary-action", onPrimary as EventListener);
    return () => window.removeEventListener("aba:primary-action", onPrimary as EventListener);
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter === "rbt") list = list.filter((r) => r.roleType === "rbt");
    if (filter === "bcba") list = list.filter((r) => r.roleType === "bcba");
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.fullName.toLowerCase().includes(q) ||
          (r.email ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, filter, query]);

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p className="page-meta">{rows.length} staff members</p>
        <div className="search">
          <i className="ti ti-search" />
          <input placeholder="Search staff…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="filter-tab-row">
        <button type="button" className={`cr-filter-btn${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>
          All staff ({rows.length})
        </button>
        <button type="button" className={`cr-filter-btn${filter === "rbt" ? " active" : ""}`} onClick={() => setFilter("rbt")}>
          RBT ({rows.filter((r) => r.roleType === "rbt").length})
        </button>
        <button type="button" className={`cr-filter-btn${filter === "bcba" ? " active" : ""}`} onClick={() => setFilter("bcba")}>
          BCBA/QSP ({rows.filter((r) => r.roleType === "bcba").length})
        </button>
      </div>

      <div className="full-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Hired</th>
              <th>Trainings</th>
              <th>Certifications</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="cr-row" onClick={() => openDetail(row.id)}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div className="init" style={{ background: row.avatarBg, color: row.avatarColor }}>
                      {row.initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{row.fullName}</div>
                      <div style={{ fontSize: 10, color: "var(--color-ink3)" }}>{row.email ?? "—"}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: 12 }}>{row.role}</td>
                <td>
                  <span className={`pill ${row.statusClass}`} style={{ fontSize: 10 }}>{row.statusLabel}</span>
                </td>
                <td style={{ fontSize: 12, color: "var(--color-ink2)" }}>{row.hiredLabel}</td>
                <td>
                  <span className={`pill ${row.trainingClass}`} style={{ fontSize: 10 }}>{row.trainingLabel}</span>
                </td>
                <td>
                  <span className={`pill ${row.certClass}`} style={{ fontSize: 10 }}>{row.certLabel}</span>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(row.id);
                      }}
                      disabled={pending && busyId === row.id}
                    >
                      <i className="ti ti-edit" style={{ fontSize: 12 }} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ fontSize: 11, padding: "4px 8px", color: "var(--color-coral-dark)", borderColor: "var(--color-coral)" }}
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(row);
                      }}
                      disabled={pending && busyId === row.id}
                    >
                      <i className="ti ti-trash" style={{ fontSize: 12 }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
