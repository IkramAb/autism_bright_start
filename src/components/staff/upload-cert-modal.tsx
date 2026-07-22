"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TrainingFlatRow } from "@/lib/staff";
import { updateTraining } from "@/app/(app)/staff/actions";

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function UploadCertModal({
  rows,
  onClose,
}: {
  rows: TrainingFlatRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const incomplete = rows.filter((r) => r.status !== "complete");

  function submit(formData: FormData) {
    setError(null);
    const trainingId = String(formData.get("training_id") ?? "");
    const driveUrl = String(formData.get("drive_url") ?? "").trim();
    if (!trainingId) {
      setError("Select a training.");
      return;
    }

    startTransition(async () => {
      const res = await updateTraining(trainingId, {
        status: "complete",
        cert_drive_url: driveUrl || "https://drive.google.com/file/stub-cert",
      });
      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <i className="ti ti-certificate" style={{ color: "var(--color-blue)", fontSize: 18 }} />
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-ink)" }}>Upload certificate</h2>
      </div>
      <p style={{ fontSize: 12, color: "var(--color-ink3)", marginBottom: 16 }}>
        When Google Drive is connected, certificates upload directly to the staff member&apos;s Drive
        folder. For now, paste a Drive link or leave blank to use a stub link.
      </p>
      <form action={submit}>
        <div style={{ marginBottom: 12 }}>
          <label className="modal-label">Training</label>
          <select className="modal-select" name="training_id" required defaultValue="">
            <option value="" disabled>
              Select training…
            </option>
            {incomplete.map((r) => (
              <option key={r.id} value={r.id}>
                {r.staffName} — {r.trainingName}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label className="modal-label">Drive file link (optional)</label>
          <input className="modal-input" name="drive_url" placeholder="https://drive.google.com/file/…" />
        </div>
        {error && (
          <div style={{ fontSize: 12, color: "var(--color-coral-dark)", marginBottom: 12 }}>{error}</div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending || incomplete.length === 0}>
            {pending ? "Saving…" : "Mark complete"}
          </button>
        </div>
      </form>
    </Overlay>
  );
}
