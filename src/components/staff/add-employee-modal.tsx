"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addEmployee } from "@/app/(app)/staff/actions";

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export type NewStaffStatus = "active" | "onboarding";

export function AddEmployeeModal({
  onClose,
  defaultStatus = "active",
}: {
  onClose: () => void;
  defaultStatus?: NewStaffStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<NewStaffStatus>(defaultStatus);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await addEmployee(formData);
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
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-ink)" }}>Add employee</h2>
      </div>
      <p style={{ fontSize: 12, color: "var(--color-ink3)", marginBottom: 16 }}>
        {status === "onboarding"
          ? "Creates a staff record with the full onboarding checklist, trainings, background-check steps, and HR document placeholders. A Drive folder will be created when Google Drive is connected."
          : "Creates the staff record only — no onboarding checklist, trainings, or HR documents. You can set those up later from the employee's profile."}
      </p>
      <form action={submit}>
        <div style={{ marginBottom: 12 }}>
          <label className="modal-label">Full name</label>
          <input className="modal-input" name="full_name" required placeholder="e.g. Jordan Kim" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label className="modal-label">Role</label>
            <select className="modal-select" name="role" defaultValue="RBT">
              <option value="RBT">RBT</option>
              <option value="BCBA">BCBA</option>
              <option value="QSP">QSP</option>
              <option value="Office admin">Office admin</option>
            </select>
          </div>
          <div>
            <label className="modal-label">Role type</label>
            <select className="modal-select" name="role_type" defaultValue="rbt">
              <option value="rbt">RBT</option>
              <option value="bcba">BCBA / QSP</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="modal-label">Email (optional)</label>
          <input className="modal-input" type="email" name="email" placeholder="name@autismbrightstart.org" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
          <div>
            <label className="modal-label">Hire date</label>
            <input
              className="modal-input"
              type="date"
              name="hired_on"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div>
            <label className="modal-label">Status</label>
            <select
              className="modal-select"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as NewStaffStatus)}
            >
              <option value="active">Active — existing staff</option>
              <option value="onboarding">Onboarding — new hire</option>
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
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Adding…" : "Add employee"}
          </button>
        </div>
      </form>
    </Overlay>
  );
}
