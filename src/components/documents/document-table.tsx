"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DocView } from "@/lib/documents";
import { runDocumentAction } from "@/app/(app)/documents/actions";

export function DocActionButton({
  doc,
  driveFolderUrl,
  compact = false,
}: {
  doc: DocView;
  driveFolderUrl?: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState(doc.driveUrl ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);

  function run(key: string, url?: string) {
    setFeedback(null);
    startTransition(async () => {
      const res = await runDocumentAction(doc.id, key, url);
      if (res.message) setFeedback(res.message);
      if (!res.ok && res.error) setFeedback(res.error);
      router.refresh();
    });
  }

  if (doc.action.key === "open_drive") {
    const href = doc.driveUrl ?? driveFolderUrl;
    if (href) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="btn btn-outline"
          style={{ fontSize: compact ? 11 : 12, padding: compact ? "4px 10px" : undefined }}
        >
          <i className="ti ti-external-link" style={{ fontSize: 11 }} /> Open in Drive
        </a>
      );
    }
    return (
      <button
        type="button"
        className="btn btn-outline"
        style={{ fontSize: compact ? 11 : 12, padding: compact ? "4px 10px" : undefined }}
        onClick={() => setShowLink(true)}
      >
        Add Drive link
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <button
        type="button"
        disabled={pending}
        className={`btn ${doc.action.variant === "primary" ? "btn-primary" : "btn-outline"}`}
        style={{
          fontSize: compact ? 11 : 12,
          padding: compact ? "4px 10px" : undefined,
          ...(doc.action.coral ? { background: "var(--color-coral)" } : {}),
        }}
        onClick={() => {
          if (doc.action.key === "set_drive_link" || showLink) {
            run("set_drive_link", link);
            setShowLink(false);
          } else {
            run(doc.action.key);
          }
        }}
      >
        {pending ? "…" : doc.action.label}
      </button>
      {showLink && (
        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="modal-input"
            style={{ fontSize: 11, padding: "4px 8px", width: 180 }}
          />
          <button type="button" className="btn btn-primary" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => run("set_drive_link", link)}>
            Save
          </button>
        </div>
      )}
      {feedback && (
        <span style={{ fontSize: 10, color: "var(--color-teal-dark)", maxWidth: 160, lineHeight: 1.3 }}>
          {feedback}
        </span>
      )}
    </div>
  );
}

export function DocumentTable({
  documents,
  driveFolderUrl,
  showUploaded = false,
}: {
  documents: DocView[];
  driveFolderUrl?: string | null;
  showUploaded?: boolean;
}) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Document</th>
          <th>Status</th>
          {showUploaded && <th>Uploaded</th>}
          <th>{showUploaded ? "Expires" : "Expires"}</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => (
          <tr key={doc.id}>
            <td style={{ fontSize: 12, fontWeight: 500 }}>{doc.label}</td>
            <td>
              <span className={`pill ${doc.pillClass}`} style={{ fontSize: 10 }}>
                {doc.displayLabel}
              </span>
            </td>
            {showUploaded && (
              <td style={{ fontSize: 11, color: "var(--color-ink3)" }}>{doc.uploadedLabel}</td>
            )}
            <td
              style={{
                fontSize: 11,
                fontWeight: doc.expiresTone !== "neutral" ? 600 : 400,
                color:
                  doc.expiresTone === "coral"
                    ? "var(--color-coral)"
                    : doc.expiresTone === "amber"
                      ? "var(--color-amber)"
                      : "var(--color-ink3)",
              }}
            >
              {doc.expiresLabel}
            </td>
            <td>
              <DocActionButton doc={doc} driveFolderUrl={driveFolderUrl} compact />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
