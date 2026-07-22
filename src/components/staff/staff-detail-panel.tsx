"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StaffDetail } from "@/lib/staff";
import { toggleChecklistItem, updateStaffNotes, fetchStaffDetail, uploadStaffDocument } from "@/app/(app)/staff/actions";
import { BG_STEP_LABELS, bgStatusPill, trainingStatusPill, fmtDate } from "@/lib/staff-utils";

function docStatusPill(status: string) {
  if (status === "uploaded") return { label: "Uploaded", className: "pill-green" };
  if (status === "pending") return { label: "Pending", className: "pill-amber" };
  return { label: "Missing", className: "pill-gray" };
}

export function StaffDetailPanel({
  staff: initial,
  onBack,
  backLabel,
}: {
  staff: StaffDetail;
  onBack: () => void;
  backLabel: string;
}) {
  const router = useRouter();
  const [staff, setStaff] = useState(initial);
  const [tab, setTab] = useState<"onboarding" | "trainings" | "documents" | "background">("onboarding");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [lockToast, setLockToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setStaff(initial);
    setNotes(initial.notes ?? "");
  }, [initial]);

  async function reload() {
    const updated = await fetchStaffDetail(staff.id);
    if (updated) setStaff(updated);
    router.refresh();
  }

  function toggleItem(itemId: string, done: boolean) {
    startTransition(async () => {
      await toggleChecklistItem(itemId, done);
      await reload();
    });
  }

  function saveNotes() {
    startTransition(async () => {
      await updateStaffNotes(staff.id, notes);
      await reload();
    });
  }

  function showLockReason(reason: string | null) {
    setLockToast(reason ?? "This item is locked until its prerequisite is complete.");
    setTimeout(() => setLockToast(null), 3200);
  }

  function uploadDoc(docId: string) {
    startTransition(async () => {
      await uploadStaffDocument(docId);
      await reload();
    });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <button type="button" className="btn btn-outline" style={{ fontSize: 11, padding: "4px 10px" }} onClick={onBack}>
          <i className="ti ti-arrow-left" style={{ fontSize: 12 }} /> {backLabel}
        </button>
        <span style={{ fontSize: 12, color: "var(--color-ink3)" }}>{staff.fullName}</span>
      </div>

      <div className="grid-2">
        <div>
          <div className="full-card">
            <div className="client-profile-hd">
              <div className="client-profile-init" style={{ background: staff.avatarBg, color: staff.avatarColor }}>
                {staff.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{staff.fullName}</div>
                <div style={{ fontSize: 12, color: "var(--color-ink3)" }}>{staff.role}</div>
                <span className={`pill ${staff.statusClass}`} style={{ fontSize: 10, marginTop: 6 }}>
                  {staff.statusLabel}
                </span>
              </div>
            </div>
            <div className="field-row"><span className="field-lbl">Email</span><span className="field-val">{staff.email ?? "—"}</span></div>
            <div className="field-row"><span className="field-lbl">Phone</span><span className="field-val">{staff.phone ?? "—"}</span></div>
            <div className="field-row"><span className="field-lbl">Hired</span><span className="field-val">{staff.hiredLabel}</span></div>
            {staff.bcbaCert && (
              <div className="field-row"><span className="field-lbl">BCBA cert #</span><span className="field-val">{staff.bcbaCert}</span></div>
            )}
          </div>

          <div className="full-card">
            <div className="section-title">Admin notes</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: "100%", minHeight: 80, fontSize: 12, border: "0.5px solid var(--color-line)", borderRadius: 8, padding: 8, fontFamily: "var(--font-sans)" }}
            />
            <button type="button" className="btn btn-outline" style={{ fontSize: 11, marginTop: 6 }} disabled={pending} onClick={saveNotes}>
              Save notes
            </button>
          </div>
        </div>

        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {(["onboarding", "trainings", "documents", "background"] as const).map((t) => (
              <button key={t} type="button" className={`cr-filter-btn${tab === t ? " active" : ""}`} onClick={() => setTab(t)} style={{ textTransform: "capitalize" }}>
                {t}
              </button>
            ))}
          </div>

          {staff.alert && (
            <div style={{ marginBottom: 12, padding: "10px 12px", background: "var(--color-coral-light)", borderRadius: 8, fontSize: 12, color: "var(--color-coral-dark)" }}>
              <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />{staff.alert}
            </div>
          )}

          {tab === "onboarding" && (
            <div className="full-card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span className="section-title" style={{ margin: 0 }}>Onboarding checklist</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-blue)" }}>{staff.progressPct}%</span>
              </div>
              <div className="mini-bar" style={{ marginBottom: 14 }}>
                <div className="mini-fill" style={{ width: `${staff.progressPct}%`, background: "var(--color-teal)" }} />
              </div>
              {staff.checklistGroups.map((g) => (
                <div key={g.group} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink2)", marginBottom: 6 }}>{g.label}</div>
                  {g.items.map((item) => (
                    <label
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "5px 0",
                        fontSize: 12,
                        opacity: item.locked ? 0.7 : 1,
                        cursor: item.locked ? "pointer" : "pointer",
                        background: item.locked ? "var(--color-coral-light)" : undefined,
                        borderRadius: item.locked ? 6 : undefined,
                        margin: item.locked ? "2px -6px" : undefined,
                        paddingLeft: item.locked ? 6 : undefined,
                        paddingRight: item.locked ? 6 : undefined,
                      }}
                      onClick={(e) => {
                        if (item.locked) {
                          e.preventDefault();
                          showLockReason(item.lock_reason);
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        disabled={item.locked || item.blocked || pending}
                        onChange={(e) => toggleItem(item.id, e.target.checked)}
                      />
                      <span style={{ flex: 1, fontStyle: item.locked ? "italic" : undefined, color: item.locked ? "var(--color-coral-dark)" : undefined }}>
                        {item.label}
                      </span>
                      {item.due_on && !item.done && !item.locked && (
                        <span style={{ fontSize: 10, color: "var(--color-amber)" }}>{fmtDate(item.due_on)}</span>
                      )}
                      {item.locked && <i className="ti ti-lock" style={{ fontSize: 12, color: "var(--color-coral-dark)" }} />}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}

          {tab === "trainings" && (
            <div className="full-card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="data-table">
                <thead><tr><th>Training</th><th>Status</th><th>Due</th><th>Completed</th></tr></thead>
                <tbody>
                  {staff.trainings.map((t) => {
                    const tp = trainingStatusPill(t.status);
                    return (
                      <tr key={t.id}>
                        <td>{t.name}</td>
                        <td><span className={`pill ${tp.className}`} style={{ fontSize: 10 }}>{tp.label}</span></td>
                        <td style={{ fontSize: 11, color: "var(--color-ink3)" }}>{fmtDate(t.due_on)}</td>
                        <td style={{ fontSize: 11, color: "var(--color-ink3)" }}>{fmtDate(t.completed_on)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === "documents" && (
            <div className="full-card">
              {staff.driveFolderUrl && (
                <div style={{ marginBottom: 12 }}>
                  <a href={staff.driveFolderUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: 11 }}>
                    <i className="ti ti-brand-google-drive" style={{ fontSize: 12 }} /> Open Drive folder
                  </a>
                </div>
              )}
              {staff.documents.length ? (
                staff.documents.map((d) => {
                  const dp = docStatusPill(d.status);
                  return (
                    <div key={d.id} className="field-row">
                      <span>{d.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className={`pill ${dp.className}`} style={{ fontSize: 10 }}>{dp.label}</span>
                        {d.drive_url ? (
                          <a href={d.drive_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: 10, padding: "3px 8px" }}>
                            View
                          </a>
                        ) : (
                          <button type="button" className="btn btn-outline" style={{ fontSize: 10, padding: "3px 8px" }} disabled={pending} onClick={() => uploadDoc(d.id)}>
                            Upload
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ fontSize: 12, color: "var(--color-ink3)" }}>HR documents live in Google Drive — upload when Drive is connected.</p>
              )}
            </div>
          )}

          {tab === "background" && (
            <div className="full-card">
              {staff.backgroundChecks.map((b) => {
                const bp = bgStatusPill(b.status);
                return (
                  <div key={b.id} className="field-row">
                    <span>{BG_STEP_LABELS[b.step] ?? b.step}</span>
                    <span className={`pill ${bp.className}`} style={{ fontSize: 10 }}>{b.note ?? bp.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {lockToast && <div className="settings-toast">{lockToast}</div>}
    </div>
  );
}
