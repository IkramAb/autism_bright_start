"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StaffDetail } from "@/lib/staff";
import { updateStaff } from "@/app/(app)/staff/actions";

const STATUS_OPTIONS = [
  { value: "onboarding", label: "Onboarding" },
  { value: "active", label: "Active" },
  { value: "needs_action", label: "Needs action" },
  { value: "fully_onboarded", label: "Fully onboarded" },
  { value: "inactive", label: "Inactive" },
];

export function EditStaffModal({
  staff,
  onClose,
  onSaved,
}: {
  staff: StaffDetail;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateStaff(staff.id, formData);
      if (res.ok) {
        router.refresh();
        onSaved?.();
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
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-ink)" }}>Edit employee</h2>
        </div>
        <p style={{ fontSize: 12, color: "var(--color-ink3)", marginBottom: 16 }}>
          Update the staff member&apos;s profile details.
        </p>
        <form action={submit}>
          <div style={{ marginBottom: 12 }}>
            <label className="modal-label">Full name</label>
            <input
              className="modal-input"
              name="full_name"
              required
              defaultValue={staff.fullName}
              placeholder="e.g. Jordan Kim"
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label className="modal-label">Role</label>
              <select className="modal-select" name="role" defaultValue={staff.role}>
                <option value="RBT">RBT</option>
                <option value="BCBA">BCBA</option>
                <option value="QSP">QSP</option>
                <option value="BCBA / QSP">BCBA / QSP</option>
                <option value="Office admin">Office admin</option>
              </select>
            </div>
            <div>
              <label className="modal-label">Role type</label>
              <select className="modal-select" name="role_type" defaultValue={staff.roleType ?? "rbt"}>
                <option value="rbt">RBT</option>
                <option value="bcba">BCBA / QSP</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label className="modal-label">Email</label>
              <input
                className="modal-input"
                type="email"
                name="email"
                defaultValue={staff.email ?? ""}
                placeholder="name@autismbrightstart.org"
              />
            </div>
            <div>
              <label className="modal-label">Phone</label>
              <input
                className="modal-input"
                name="phone"
                defaultValue={staff.phone ?? ""}
                placeholder="(555) 555-5555"
              />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label className="modal-label">Hire date</label>
              <input
                className="modal-input"
                type="date"
                name="hired_on"
                defaultValue={staff.hiredOn ?? ""}
              />
            </div>
            <div>
              <label className="modal-label">Status</label>
              <select className="modal-select" name="status" defaultValue={staff.status}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
            <div>
              <label className="modal-label">BCBA cert # (optional)</label>
              <input
                className="modal-input"
                name="bcba_cert_number"
                defaultValue={staff.bcbaCert ?? ""}
              />
            </div>
            <div>
              <label className="modal-label">Background study # (optional)</label>
              <input
                className="modal-input"
                name="background_study_number"
                defaultValue={staff.bgStudyNumber ?? ""}
              />
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
