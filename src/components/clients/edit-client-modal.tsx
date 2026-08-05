"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ClientDetail } from "@/lib/clients";
import { updateClient } from "@/app/(app)/pipeline/actions";

const SOURCE_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "provider", label: "Provider referral" },
  { value: "walk_in", label: "Walk-in" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "onboarding", label: "Onboarding" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "referred_out", label: "Referred out" },
  { value: "closed", label: "Closed" },
];

export function EditClientModal({
  client,
  onClose,
}: {
  client: ClientDetail;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateClient(client.id, formData);
      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <i className="ti ti-edit" style={{ color: "var(--color-blue)", fontSize: 18 }} />
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-ink)" }}>
            Edit Client #{client.refCode}
          </h2>
        </div>
        <p style={{ fontSize: 12, color: "var(--color-ink3)", marginBottom: 16 }}>
          Update intake details. Keep all entries PHI-free.
        </p>
        <form action={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label className="modal-label">Entry date / Start of service</label>
              <input
                className="modal-input"
                type="date"
                name="service_start_on"
                defaultValue={client.serviceStartOn ?? ""}
              />
            </div>
            <div>
              <label className="modal-label">Status</label>
              <select className="modal-select" name="status" defaultValue={client.status}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label className="modal-label">Referral source</label>
            <select
              className="modal-select"
              name="referral_source"
              defaultValue={client.referralSource ?? "other"}
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
            <div>
              <label className="modal-label">New to ABA?</label>
              <select className="modal-select" name="aba_status" defaultValue={client.abaStatus}>
                <option value="new">New to ABA</option>
                <option value="not_new">Not new</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div>
              <label className="modal-label">MA status</label>
              <select className="modal-select" name="ma_status" defaultValue={client.maStatus}>
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
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
