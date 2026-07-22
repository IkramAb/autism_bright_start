"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DocTrackerData } from "@/lib/clients";
import { setDriveLink } from "@/app/(app)/documents/actions";

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

type MissingDoc = {
  id: string;
  label: string;
  clientRef: string;
};

function collectMissing(data: DocTrackerData): MissingDoc[] {
  const out: MissingDoc[] = [];
  for (const client of data.clients) {
    for (const doc of client.documents) {
      if (doc.storedStatus === "missing" || doc.storedStatus === "requested") {
        out.push({
          id: doc.id,
          label: doc.label,
          clientRef: client.refCode,
        });
      }
    }
  }
  return out;
}

export function UploadDocModal({
  data,
  onClose,
}: {
  data: DocTrackerData;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const missing = collectMissing(data);

  function submit(formData: FormData) {
    setError(null);
    const documentId = String(formData.get("document_id") ?? "");
    const driveUrl = String(formData.get("drive_url") ?? "").trim();
    if (!documentId) {
      setError("Select a document.");
      return;
    }
    if (!driveUrl.startsWith("http")) {
      setError("Enter a valid Drive URL.");
      return;
    }

    startTransition(async () => {
      const res = await setDriveLink(documentId, driveUrl);
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
        <i className="ti ti-upload" style={{ color: "var(--color-blue)", fontSize: 18 }} />
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-ink)" }}>Upload document</h2>
      </div>
      <p style={{ fontSize: 12, color: "var(--color-ink3)", marginBottom: 16 }}>
        Files upload directly to Google Drive when connected. Paste the Drive link for a missing or
        requested document below.
      </p>
      <form action={submit}>
        <div style={{ marginBottom: 12 }}>
          <label className="modal-label">Document</label>
          <select className="modal-select" name="document_id" required defaultValue="">
            <option value="" disabled>
              Select document…
            </option>
            {missing.map((d) => (
              <option key={d.id} value={d.id}>
                Client #{d.clientRef} — {d.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label className="modal-label">Drive file link</label>
          <input className="modal-input" name="drive_url" required placeholder="https://drive.google.com/file/…" />
        </div>
        {missing.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--color-teal-dark)", marginBottom: 12 }}>
            No missing documents — all tracked files are uploaded or in progress.
          </div>
        )}
        {error && (
          <div style={{ fontSize: 12, color: "var(--color-coral-dark)", marginBottom: 12 }}>{error}</div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending || missing.length === 0}>
            {pending ? "Saving…" : "Save link"}
          </button>
        </div>
      </form>
    </Overlay>
  );
}
