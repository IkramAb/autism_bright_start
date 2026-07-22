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

export function AddEmployeeModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        Creates a staff record with the full onboarding checklist, trainings, and HR document
        placeholders. A Drive folder will be created when Google Drive is connected.
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
          <div>
            <label className="modal-label">Email (optional)</label>
            <input className="modal-input" type="email" name="email" placeholder="name@autismbrightstart.org" />
          </div>
          <div>
            <label className="modal-label">Hire date</label>
            <input
              className="modal-input"
              type="date"
              name="hired_on"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </div>
        {error && (
          <div style={{ fontSize: 12, color: "var(--color-coral-dark)", marginBottom: 12 }}>{error}</div>
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
