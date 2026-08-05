"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReferral, createClientFull } from "@/app/(app)/pipeline/actions";

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

const SOURCE_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "provider", label: "Provider referral" },
  { value: "walk_in", label: "Walk-in" },
  { value: "other", label: "Other" },
];

export function QuickAddModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createReferral(formData);
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
        <i className="ti ti-bolt" style={{ color: "var(--color-blue)", fontSize: 18 }} />
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-ink)" }}>Quick add referral</h2>
      </div>
      <p style={{ fontSize: 12, color: "var(--color-ink3)", marginBottom: 16 }}>
        Creates a reference-coded client in <strong>New Referral</strong>. No names or
        contact details — those stay in Catalyst.
      </p>
      <form action={submit}>
        <div style={{ marginBottom: 12 }}>
          <label className="modal-label">Client ID (optional)</label>
          <input
            className="modal-input"
            name="ref_code"
            placeholder="Auto-assigned if left blank"
            maxLength={32}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="modal-label">Entry date / Start of service (optional)</label>
          <input className="modal-input" type="date" name="service_start_on" />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label className="modal-label">Referral source</label>
          <select className="modal-select" name="referral_source" defaultValue="website">
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {error && (
          <div className="alert-row alert-row-coral" style={{ marginBottom: 12 }}>
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            <div className="alert-row-body">{error}</div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Adding…" : "Add referral"}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

export function AddClientModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createClientFull(formData);
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
        <i className="ti ti-user-plus" style={{ color: "var(--color-blue)", fontSize: 18 }} />
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-ink)" }}>Add client</h2>
      </div>
      <p style={{ fontSize: 12, color: "var(--color-ink3)", marginBottom: 16 }}>
        Set a custom Client ID or leave it blank to auto-assign. Keep all entries PHI-free.
      </p>
      <form action={submit}>
        <div style={{ marginBottom: 12 }}>
          <label className="modal-label">Client ID (optional)</label>
          <input
            className="modal-input"
            name="ref_code"
            placeholder="Auto-assigned if left blank"
            maxLength={32}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label className="modal-label">Entry date / Start of service</label>
            <input className="modal-input" type="date" name="service_start_on" />
          </div>
          <div>
            <label className="modal-label">Phone screen due</label>
            <input className="modal-input" type="date" name="phone_screen_due_on" />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="modal-label">Referral source</label>
          <select className="modal-select" name="referral_source" defaultValue="website">
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
          <div>
            <label className="modal-label">New to ABA?</label>
            <select className="modal-select" name="aba_status" defaultValue="unknown">
              <option value="new">New to ABA</option>
              <option value="not_new">Not new</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <div>
            <label className="modal-label">MA status</label>
            <select className="modal-select" name="ma_status" defaultValue="unknown">
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
              <option value="none">None</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>
        {error && (
          <div className="alert-row alert-row-coral" style={{ marginBottom: 12 }}>
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            <div className="alert-row-body">{error}</div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Adding…" : "Add client"}
          </button>
        </div>
      </form>
    </Overlay>
  );
}
