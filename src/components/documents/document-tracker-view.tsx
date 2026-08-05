"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DocTrackerData } from "@/lib/clients";
import type { DocFilterCategory } from "@/lib/documents";
import { filterDocs } from "@/lib/documents";
import { DocumentTable } from "@/components/documents/document-table";
import { UploadDocModal } from "@/components/documents/upload-doc-modal";

export function DocumentTrackerView({ data }: { data: DocTrackerData }) {
  const [filter, setFilter] = useState<DocFilterCategory>("all");
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const c of data.clients) {
      if (c.defaultOpen) initial.add(c.id);
    }
    return initial;
  });
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    function onPrimary() {
      setShowUpload(true);
    }
    window.addEventListener("aba:primary-action", onPrimary as EventListener);
    return () => window.removeEventListener("aba:primary-action", onPrimary as EventListener);
  }, []);

  const clients = useMemo(() => {
    if (filter === "all") return data.clients;
    return data.clients
      .map((c) => ({
        ...c,
        documents: filterDocs(c.documents, filter),
      }))
      .filter((c) => c.documents.length > 0);
  }, [data.clients, filter]);

  const { filterCounts } = data;

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      {showUpload && <UploadDocModal data={data} onClose={() => setShowUpload(false)} />}
      <p className="page-meta" style={{ marginBottom: 12 }}>
        All clients · all documents in one place
      </p>

      <div className="filter-tab-row">
        <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
          All documents ({filterCounts.all})
        </FilterTab>
        <FilterTab
          active={filter === "overdue"}
          onClick={() => setFilter("overdue")}
          overdue
        >
          ⚠ Overdue ({filterCounts.overdue})
        </FilterTab>
        <FilterTab active={filter === "expiring"} onClick={() => setFilter("expiring")}>
          Expiring soon ({filterCounts.expiring})
        </FilterTab>
        <FilterTab active={filter === "awaiting"} onClick={() => setFilter("awaiting")}>
          Awaiting signature ({filterCounts.awaiting})
        </FilterTab>
        <FilterTab active={filter === "uptodate"} onClick={() => setFilter("uptodate")}>
          Up to date ({filterCounts.uptodate})
        </FilterTab>
        <FilterTab active={filter === "missing"} onClick={() => setFilter("missing")}>
          Missing ({filterCounts.missing})
        </FilterTab>
      </div>

      <div className="doc-client-list">
        {clients.map((client) => {
          const isOpen = openIds.has(client.id);
          return (
            <div key={client.id} className="doc-client-card">
              <div className="doc-client-head" onClick={() => toggle(client.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    className="init"
                    style={{
                      width: 32,
                      height: 32,
                      fontSize: 11,
                      background: client.initBg,
                      color: client.initColor,
                    }}
                  >
                    <i className="ti ti-user" style={{ fontSize: 11 }} />
                  </div>
                  <div>
                    <Link
                      href={`/clients/${client.id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--color-ink)",
                        textDecoration: "none",
                      }}
                    >
                      Client #{client.refCode}
                    </Link>
                    <div style={{ fontSize: 11, color: "var(--color-ink3)", marginTop: 1 }}>
                      {client.context}
                    </div>
                  </div>
                </div>
                <div className="doc-client-pills">
                  {client.summaryPills.map((p) => (
                    <span key={p.label} className={`pill ${p.className}`}>
                      {p.label}
                    </span>
                  ))}
                  <i
                    className="ti ti-chevron-down"
                    style={{
                      fontSize: 16,
                      color: "var(--color-ink3)",
                      transition: "transform 0.2s",
                      transform: isOpen ? "rotate(180deg)" : undefined,
                    }}
                  />
                </div>
              </div>
              <div className={`doc-client-body${isOpen ? " open" : ""}`}>
                <DocumentTable documents={client.documents} showUploaded />
              </div>
            </div>
          );
        })}
        {clients.length === 0 && (
          <div className="full-card" style={{ textAlign: "center", color: "var(--color-ink3)", fontSize: 12 }}>
            No documents match this filter.
          </div>
        )}
      </div>
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  children,
  overdue,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  overdue?: boolean;
}) {
  return (
    <button
      type="button"
      className={`doc-filter-btn${active ? " active" : ""}${overdue && !active ? " overdue-tab" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
