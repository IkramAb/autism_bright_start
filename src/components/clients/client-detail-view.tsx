"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClientDetail } from "@/lib/clients";
import { PIPELINE_STRIP } from "@/lib/pipeline-constants";
import { CATALYST_URL } from "@/lib/documents";
import { DocumentTable } from "@/components/documents/document-table";
import { saveClientNote } from "@/app/(app)/documents/actions";
import { updateClientRefCode } from "@/app/(app)/pipeline/actions";

export function ClientDetailView({ client }: { client: ClientDetail }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [noteError, setNoteError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState(false);
  const [refValue, setRefValue] = useState(client.refCode);
  const [refError, setRefError] = useState<string | null>(null);
  const [savingId, startIdTransition] = useTransition();

  function startEditId() {
    setRefValue(client.refCode);
    setRefError(null);
    setEditingId(true);
  }

  function cancelEditId() {
    setEditingId(false);
    setRefError(null);
  }

  function submitRefCode() {
    setRefError(null);
    startIdTransition(async () => {
      const res = await updateClientRefCode(client.id, refValue);
      if (res.ok) {
        setEditingId(false);
        router.refresh();
      } else {
        setRefError(res.error ?? "Could not update Client ID.");
      }
    });
  }

  function submitNote() {
    setNoteError(null);
    startTransition(async () => {
      const res = await saveClientNote(client.id, note);
      if (res.ok) {
        setNote("");
        router.refresh();
      } else {
        setNoteError(res.error ?? "Could not save note.");
      }
    });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Link href="/clients" className="btn btn-outline" style={{ fontSize: 11, padding: "4px 10px" }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 12 }} /> All clients
        </Link>
        <span style={{ fontSize: 12, color: "var(--color-ink3)" }}>Client records</span>
        <span style={{ fontSize: 12, color: "var(--color-ink3)" }}>/</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-ink)" }}>
          Client #{client.refCode}
        </span>
      </div>

      <div className="grid-2">
        <div>
          <div className="full-card">
            <div className="client-profile-hd">
              <div className="client-profile-init" style={{ background: client.initBg, color: client.initColor }}>
                <i className="ti ti-user" style={{ fontSize: 20 }} />
              </div>
              <div style={{ flex: 1 }}>
                {editingId ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: "var(--color-ink)" }}>
                        Client #
                      </span>
                      <input
                        autoFocus
                        value={refValue}
                        onChange={(e) => setRefValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitRefCode();
                          if (e.key === "Escape") cancelEditId();
                        }}
                        maxLength={32}
                        disabled={savingId}
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: "var(--color-ink)",
                          border: "0.5px solid var(--color-line)",
                          borderRadius: 6,
                          padding: "3px 8px",
                          width: 140,
                          outline: "none",
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: 11, padding: "5px 10px" }}
                        disabled={savingId || !refValue.trim()}
                        onClick={submitRefCode}
                      >
                        {savingId ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: 11, padding: "5px 10px" }}
                        disabled={savingId}
                        onClick={cancelEditId}
                      >
                        Cancel
                      </button>
                    </div>
                    {refError && (
                      <div style={{ fontSize: 11, color: "var(--color-coral-dark)", marginTop: 4 }}>
                        {refError}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: "var(--color-ink)" }}>
                      Client #{client.refCode}
                    </span>
                    <button
                      type="button"
                      onClick={startEditId}
                      title="Edit Client ID"
                      aria-label="Edit Client ID"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        border: "0.5px solid var(--color-line)",
                        background: "transparent",
                        borderRadius: 6,
                        padding: "3px 8px",
                        fontSize: 11,
                        color: "var(--color-ink3)",
                        cursor: "pointer",
                      }}
                    >
                      <i className="ti ti-pencil" style={{ fontSize: 12 }} /> Edit
                    </button>
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--color-ink3)", marginTop: 2 }}>
                  {client.serviceStartLabel ?? "Start —"} · {client.context}
                </div>
                <div style={{ marginTop: 6 }}>
                  <span className={`pill ${client.stagePillClass}`} style={{ fontSize: 11 }}>
                    {client.stageLabel}
                  </span>
                </div>
              </div>
              {client.driveFolderUrl && (
                <a
                  href={client.driveFolderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline"
                  style={{ fontSize: 11, padding: "5px 12px", alignSelf: "flex-start" }}
                >
                  <i className="ti ti-brand-google-drive" style={{ fontSize: 12 }} /> Drive
                </a>
              )}
            </div>
            <div>
              {client.fields.map((f) => (
                <div key={f.label} className="field-row">
                  <span className="field-lbl">{f.label}</span>
                  <span className="field-val">
                    {f.pill ? (
                      <span className={`pill ${f.pill}`} style={{ fontSize: 10 }}>{f.value}</span>
                    ) : (
                      f.value
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <a
                href={CATALYST_URL}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline"
                style={{ fontSize: 11 }}
              >
                <i className="ti ti-external-link" style={{ fontSize: 12 }} /> Go to Catalyst
              </a>
            </div>
          </div>

          <div className="full-card">
            <div className="section-title" style={{ marginBottom: 12 }}>Intake pipeline stage</div>
            <PipelineStrip activeIndex={client.stripIndex} />
            {client.pipelineAlert && (
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 10px",
                  background: "var(--color-amber-light)",
                  borderRadius: 8,
                  border: "0.5px solid #fac775",
                  fontSize: 12,
                  color: "var(--color-amber-dark)",
                }}
              >
                <i className="ti ti-clock" style={{ fontSize: 13, marginRight: 4 }} />
                {client.pipelineAlert}
              </div>
            )}
          </div>

          <div className="full-card" style={{ marginBottom: 0 }}>
            <div className="section-title" style={{ marginBottom: 10 }}>Internal notes</div>
            <p style={{ fontSize: 10.5, color: "var(--color-ink3)", marginBottom: 8, lineHeight: 1.4 }}>
              Operational notes only — no names, contact details, or clinical content.
            </p>
            {client.notes.length > 0 ? (
              <div style={{ fontSize: 12, color: "var(--color-ink2)", lineHeight: 1.6, padding: 8, background: "var(--color-app)", borderRadius: 8 }}>
                {client.notes.map((n) => (
                  <div key={n.id} style={{ marginBottom: 8 }}>
                    {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {n.body}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--color-ink3)", padding: 8, background: "var(--color-app)", borderRadius: 8 }}>
                No notes yet.
              </div>
            )}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note…"
              style={{
                width: "100%",
                marginTop: 10,
                border: "0.5px solid var(--color-line)",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 12,
                fontFamily: "var(--font-sans)",
                resize: "none",
                minHeight: 60,
                outline: "none",
              }}
            />
            {noteError && (
              <div style={{ fontSize: 11, color: "var(--color-coral-dark)", marginTop: 6 }}>{noteError}</div>
            )}
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: 11, marginTop: 6, padding: "5px 12px" }}
              disabled={pending || !note.trim()}
              onClick={submitNote}
            >
              {pending ? "Saving…" : "Save note"}
            </button>
          </div>
        </div>

        <div>
          <div className="full-card" style={{ padding: 0, overflow: "hidden", marginBottom: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderBottom: "0.5px solid var(--color-line)",
              }}
            >
              <span className="section-title" style={{ margin: 0 }}>Documents</span>
              <span style={{ fontSize: 10, color: "var(--color-ink3)" }}>All files live in Google Drive</span>
            </div>
            {client.documents.length > 0 ? (
              <DocumentTable
                documents={client.documents}
                driveFolderUrl={client.driveFolderUrl}
              />
            ) : (
              <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--color-ink3)" }}>
                No documents tracked yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineStrip({ activeIndex }: { activeIndex: number }) {
  return (
    <div style={{ display: "flex", gap: 0, overflowX: "auto", paddingBottom: 6 }}>
      {PIPELINE_STRIP.map((label, i) => {
        const isDone = i < activeIndex;
        const isActive = i === activeIndex;
        const circle = isDone ? (
          <div className="stage-circle done">
            <i className="ti ti-check" style={{ fontSize: 11 }} />
          </div>
        ) : isActive ? (
          <div className="stage-circle active">{i + 1}</div>
        ) : (
          <div className="stage-circle">{i + 1}</div>
        );
        const line =
          i < PIPELINE_STRIP.length - 1 ? (
            <div
              style={{
                width: 18,
                height: 2,
                background: i < activeIndex ? "var(--color-teal)" : i === activeIndex ? "var(--color-amber)" : "var(--color-line)",
                marginTop: 12,
                flexShrink: 0,
              }}
            />
          ) : null;
        return (
          <div key={label} style={{ display: "flex", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              {circle}
              <div className={`stage-name${isDone ? " done" : isActive ? " active" : ""}`}>{label}</div>
            </div>
            {line}
          </div>
        );
      })}
    </div>
  );
}
