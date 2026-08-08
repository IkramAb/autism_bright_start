"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import type { SettingsData, NotificationPrefView } from "@/lib/settings-shared";
import {
  CHECKLIST_GROUP_OPTIONS,
  REMINDER_LEAD_PRESETS,
  TIMEZONE_OPTIONS,
  matchIntervalPreset,
} from "@/lib/settings-shared";
import type { IntegrationService, IntervalUnit } from "@/lib/types/settings";
import {
  createChecklistItem,
  deleteChecklistItem,
  inviteAdminUser,
  saveNotificationRecipients,
  connectIntegration,
  disconnectIntegrationAction,
  updateAdminProfile,
  updateChecklistItem,
  updateDocumentGate,
  updateItpWeeklyRepeat,
  updateOrganization,
  updatePipelineStage,
  updateRenewalRule,
} from "@/app/(app)/settings/actions";
import { PageHeader } from "@/components/shell/page-header";
import { ROUTE_META } from "@/lib/nav";

type Tab =
  | "organization"
  | "renewals"
  | "checklists"
  | "gate"
  | "notifications"
  | "integrations"
  | "users";

const TABS: { id: Tab; label: string }[] = [
  { id: "organization", label: "Organization" },
  { id: "renewals", label: "Renewal rules" },
  { id: "checklists", label: "Onboarding checklists" },
  { id: "gate", label: "Document gate" },
  { id: "notifications", label: "Notifications" },
  { id: "integrations", label: "Integrations" },
  { id: "users", label: "Users" },
];

type ItemModalState = {
  mode: "add" | "edit";
  kind: "staff" | "client";
  id?: string;
  name?: string;
  group?: string;
  trigger?: string;
};

export function SettingsView({ data }: { data: SettingsData }) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("organization");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setTab(tabParam as Tab);
    }

    const connected = searchParams.get("connected");
    if (connected) {
      const labels: Record<string, string> = {
        drive: "Google Drive",
        gmail: "Google Workspace",
      };
      notify(`${labels[connected] ?? connected} connected successfully.`);
      window.history.replaceState({}, "", "/settings?tab=integrations");
    }

    const error = searchParams.get("error");
    if (error) {
      const messages: Record<string, string> = {
        google_not_configured:
          "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        google_denied: "Google authorization was cancelled.",
        invalid_state: "OAuth session expired. Please try connecting again.",
        missing_code: "Google did not return an authorization code.",
        invalid_service: "Unknown integration service.",
      };
      notify(messages[error] ?? decodeURIComponent(error));
      window.history.replaceState({}, "", "/settings?tab=integrations");
    }
  }, [searchParams]);

  useEffect(() => {
    function onPrimary() {
      setTab("users");
      setInviteOpen(true);
    }
    window.addEventListener("aba:primary-action", onPrimary as EventListener);
    return () => window.removeEventListener("aba:primary-action", onPrimary as EventListener);
  }, []);

  function notify(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3200);
  }

  function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) notify(result.message ?? "Saved.");
      else notify(result.error ?? "Something went wrong.");
    });
  }

  function handleIntegration(service: IntegrationService, connect: boolean) {
    if (!connect) {
      run(() => disconnectIntegrationAction(service));
      return;
    }
    startTransition(async () => {
      const result = await connectIntegration(service);
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      if (result.ok) notify(result.message ?? "Connected.");
      else notify(result.error ?? "Connection failed.");
    });
  }

  const [checklistView, setChecklistView] = useState<"staff" | "client">("staff");
  const [itemModal, setItemModal] = useState<ItemModalState | null>(null);
  const [recipientsModal, setRecipientsModal] = useState<NotificationPrefView | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const meta = ROUTE_META["/settings"];

  return (
    <div className="settings-shell">
      <nav className="settings-nav">
        <div className="nav-label">Settings</div>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`st-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="settings-content">
        <PageHeader title={meta.title} subtitle={meta.subtitle} />
        {tab === "organization" && (
          <OrganizationPanel
            data={data}
            pending={pending}
            onSaveOrg={(fd) => run(() => updateOrganization(fd))}
            onSaveProfile={(fd) => run(() => updateAdminProfile(fd))}
          />
        )}

        {tab === "renewals" && (
          <RenewalsPanel
            data={data}
            pending={pending}
            onSaveRule={(fd) => run(() => updateRenewalRule(fd))}
            onToggleRepeat={(enabled) => run(() => updateItpWeeklyRepeat(enabled))}
          />
        )}

        {tab === "checklists" && (
          <ChecklistsPanel
            data={data}
            view={checklistView}
            onViewChange={setChecklistView}
            onEditStaff={(item) =>
              setItemModal({ mode: "edit", kind: "staff", id: item.id, name: item.name, group: item.group })
            }
            onEditStage={(stage) =>
              setItemModal({
                mode: "edit",
                kind: "client",
                id: stage.id,
                name: stage.name,
                trigger: stage.advanceTrigger ?? "",
              })
            }
            onAdd={() =>
              setItemModal({ mode: "add", kind: checklistView === "staff" ? "staff" : "client" })
            }
          />
        )}

        {tab === "gate" && (
          <GatePanel
            enabled={data.documentGateEnabled}
            pending={pending}
            onToggle={(enabled) => run(() => updateDocumentGate(enabled))}
          />
        )}

        {tab === "notifications" && (
          <NotificationsPanel
            data={data}
            onManage={setRecipientsModal}
          />
        )}

        {tab === "integrations" && (
          <IntegrationsPanel
            data={data}
            pending={pending}
            onToggle={handleIntegration}
          />
        )}

        {tab === "users" && (
          <UsersPanel data={data} onInvite={() => setInviteOpen(true)} />
        )}
      </div>

      {itemModal && (
        <ItemModal
          modal={itemModal}
          onClose={() => setItemModal(null)}
          pending={pending}
          onSave={(fd) => {
            if (itemModal.kind === "staff") {
              if (itemModal.mode === "add") run(() => createChecklistItem(fd));
              else run(() => updateChecklistItem(fd));
            } else {
              run(() => updatePipelineStage(fd));
            }
            setItemModal(null);
          }}
          onDelete={
            itemModal.kind === "staff" && itemModal.mode === "edit" && itemModal.id
              ? () => {
                  run(() => deleteChecklistItem(itemModal.id!));
                  setItemModal(null);
                }
              : undefined
          }
        />
      )}

      {recipientsModal && (
        <RecipientsModal
          pref={recipientsModal}
          onClose={() => setRecipientsModal(null)}
          pending={pending}
          onSave={(fd) => {
            run(() => saveNotificationRecipients(fd));
            setRecipientsModal(null);
          }}
        />
      )}

      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          pending={pending}
          onSave={(fd) => {
            run(() => inviteAdminUser(fd));
            setInviteOpen(false);
          }}
        />
      )}

      {toast && <div className="settings-toast">{toast}</div>}
    </div>
  );
}

function OrganizationPanel({
  data,
  pending,
  onSaveOrg,
  onSaveProfile,
}: {
  data: SettingsData;
  pending: boolean;
  onSaveOrg: (fd: FormData) => void;
  onSaveProfile: (fd: FormData) => void;
}) {
  return (
    <div className="st-panel">
      <div className="st-section-title">Organization profile</div>
      <div className="st-section-sub">
        Basic info about the practice — shown in the sidebar and used on any exported reports.
      </div>
      <form
        action={(fd) => onSaveOrg(fd)}
        className="full-card"
        style={{ marginBottom: 0 }}
      >
        <FieldRow label="Practice name">
          <input className="st-input" name="practice_name" defaultValue={data.organization.practice_name} />
        </FieldRow>
        <FieldRow label="Address">
          <input className="st-input" name="address" defaultValue={data.organization.address ?? ""} />
        </FieldRow>
        <FieldRow label="Main phone">
          <input className="st-input" name="phone" defaultValue={data.organization.phone ?? ""} />
        </FieldRow>
        <FieldRow label="Time zone" last>
          <select className="st-input" name="timezone" defaultValue={data.organization.timezone}>
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </FieldRow>
        <button type="submit" className="btn btn-primary" style={{ marginTop: 14 }} disabled={pending}>
          <i className="ti ti-check" style={{ fontSize: 13 }} aria-hidden="true" />
          Save organization
        </button>
      </form>

      <div className="st-section-title" style={{ marginTop: 24 }}>
        Your admin profile
      </div>
      <form action={(fd) => onSaveProfile(fd)} className="full-card">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div
            className="init"
            style={{
              width: 48,
              height: 48,
              fontSize: 16,
              background: "var(--color-blue-light)",
              color: "var(--color-blue-dark)",
            }}
          >
            {data.currentAdmin.initials}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{data.currentAdmin.fullName}</div>
            <div style={{ fontSize: 12, color: "var(--color-ink3)" }}>{data.currentAdmin.roleLabel}</div>
          </div>
        </div>
        <FieldRow label="Display name">
          <input className="st-input" name="full_name" defaultValue={data.currentAdmin.fullName} />
        </FieldRow>
        <FieldRow label="Role shown in sidebar" last>
          <input
            className="st-input"
            name="sidebar_role_label"
            defaultValue={data.currentAdmin.roleLabel}
          />
        </FieldRow>
        <button type="submit" className="btn btn-primary" style={{ marginTop: 14 }} disabled={pending}>
          Save profile
        </button>
      </form>
    </div>
  );
}

function RenewalsPanel({
  data,
  pending,
  onSaveRule,
  onToggleRepeat,
}: {
  data: SettingsData;
  pending: boolean;
  onSaveRule: (fd: FormData) => void;
  onToggleRepeat: (enabled: boolean) => void;
}) {
  return (
    <div className="st-panel">
      <div className="st-section-title">Document renewal rules</div>
      <div className="st-section-sub">
        How often each document type renews, and how far ahead admin gets a reminder. Changing these
        updates every client&apos;s countdown going forward.
      </div>
      <div className="full-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Renewal interval</th>
              <th>Reminder lead time</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.renewalRules.map((rule) => (
              <RenewalRuleRow key={rule.documentType} rule={rule} pending={pending} onSave={onSaveRule} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="st-section-title" style={{ marginTop: 24 }}>
        ITP drafting reminder
      </div>
      <div className="st-section-sub">
        While a client&apos;s ITP is being drafted, you&apos;ll get reminded at 1 week and 2 weeks in.
        The toggle below decides what happens after that second reminder.
      </div>
      <div className="full-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: 1, paddingRight: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              Keep reminding weekly after the 2nd notice
            </div>
            <div style={{ fontSize: 12, color: "var(--color-ink2)", lineHeight: 1.6 }}>
              When on, if the ITP still isn&apos;t marked received after the 2-week reminder, you&apos;ll
              get a new reminder every week until it&apos;s resolved.
            </div>
          </div>
          <ToggleSwitch
            checked={data.itpWeeklyRepeatEnabled}
            disabled={pending}
            onChange={onToggleRepeat}
          />
        </div>
        <p className="notice-inline" style={{ marginTop: 14, marginBottom: 0 }}>
          <i className="ti ti-repeat" aria-hidden="true" />
          Currently <strong style={{ color: "#5c6270" }}>{data.itpWeeklyRepeatEnabled ? "on" : "off"}</strong>
          {data.itpWeeklyRepeatEnabled
            ? " — an overdue ITP will keep getting a weekly reminder until it's marked received."
            : " — reminders stop after the 2-week notice."}
        </p>
      </div>
    </div>
  );
}

function RenewalRuleRow({
  rule,
  pending,
  onSave,
}: {
  rule: SettingsData["renewalRules"][0];
  pending: boolean;
  onSave: (fd: FormData) => void;
}) {
  const matched = matchIntervalPreset(
    {
      interval_count: rule.intervalCount,
      interval_unit: rule.intervalUnit,
      reminder_lead_count: rule.reminderLeadCount,
      reminder_lead_unit: rule.reminderLeadUnit,
    },
    rule.presets,
  );
  const [custom, setCustom] = useState(!matched);
  const [intervalCount, setIntervalCount] = useState(rule.intervalCount);
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>(rule.intervalUnit);
  const [leadCount, setLeadCount] = useState(rule.reminderLeadCount);
  const [leadUnit, setLeadUnit] = useState<IntervalUnit>(rule.reminderLeadUnit);

  function applyPreset(value: string) {
    if (value === "custom") {
      setCustom(true);
      return;
    }
    const preset = rule.presets[parseInt(value, 10)];
    if (!preset) return;
    setCustom(false);
    setIntervalCount(preset.interval_count);
    setIntervalUnit(preset.interval_unit);
    setLeadCount(preset.reminder_lead_count);
    setLeadUnit(preset.reminder_lead_unit);
  }

  return (
    <tr>
      <td style={{ fontWeight: 500, fontSize: 12 }}>{rule.label}</td>
      <td>
        <select
          className="st-input-sm"
          defaultValue={matched ? String(rule.presets.indexOf(matched)) : "custom"}
          onChange={(e) => applyPreset(e.target.value)}
        >
          {rule.presets.map((p, i) => (
            <option key={p.label} value={String(i)}>
              {p.label}
            </option>
          ))}
          <option value="custom">Custom…</option>
        </select>
        {custom && (
          <div className="st-custom-interval">
            <input
              type="number"
              className="st-input-sm"
              style={{ width: 54 }}
              min={1}
              value={intervalCount}
              onChange={(e) => setIntervalCount(parseInt(e.target.value, 10) || 1)}
            />
            <select
              className="st-input-sm"
              value={intervalUnit}
              onChange={(e) => setIntervalUnit(e.target.value as IntervalUnit)}
            >
              <option value="day">days</option>
              <option value="week">weeks</option>
              <option value="month">months</option>
              <option value="year">years</option>
            </select>
          </div>
        )}
      </td>
      <td>
        <select
          className="st-input-sm"
          value={`${leadCount}-${leadUnit}`}
          onChange={(e) => {
            const preset = REMINDER_LEAD_PRESETS.find((p) => `${p.count}-${p.unit}` === e.target.value);
            if (preset) {
              setLeadCount(preset.count);
              setLeadUnit(preset.unit);
            }
          }}
        >
          {REMINDER_LEAD_PRESETS.map((p) => (
            <option key={p.label} value={`${p.count}-${p.unit}`}>
              {p.label}
            </option>
          ))}
        </select>
      </td>
      <td>
        <form
          action={(fd) => {
            fd.set("document_type", rule.documentType);
            fd.set("interval_count", String(intervalCount));
            fd.set("interval_unit", intervalUnit);
            fd.set("reminder_lead_count", String(leadCount));
            fd.set("reminder_lead_unit", leadUnit);
            onSave(fd);
          }}
        >
          <button type="submit" className="btn btn-outline" style={{ fontSize: 11, padding: "4px 10px" }} disabled={pending}>
            Save
          </button>
        </form>
      </td>
    </tr>
  );
}

function ChecklistsPanel({
  data,
  view,
  onViewChange,
  onEditStaff,
  onEditStage,
  onAdd,
}: {
  data: SettingsData;
  view: "staff" | "client";
  onViewChange: (v: "staff" | "client") => void;
  onEditStaff: (item: SettingsData["checklistItems"][0]) => void;
  onEditStage: (stage: SettingsData["pipelineStages"][0]) => void;
  onAdd: () => void;
}) {
  return (
    <div className="st-panel">
      <div className="st-section-title">Onboarding checklist items</div>
      <div className="st-section-sub">
        Add, remove, or reorder what&apos;s required for new staff and new clients. Changes apply to
        the template — not anyone already in progress.
      </div>
      <div className="filter-tab-row">
        <button
          type="button"
          className={`cr-filter-btn${view === "staff" ? " active" : ""}`}
          onClick={() => onViewChange("staff")}
        >
          Staff onboarding
        </button>
        <button
          type="button"
          className={`cr-filter-btn${view === "client" ? " active" : ""}`}
          onClick={() => onViewChange("client")}
        >
          Client pipeline
        </button>
      </div>

      {view === "staff" ? (
        <>
          <div className="full-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Group</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.checklistItems.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontSize: 12 }}>{item.name}</td>
                    <td>
                      <span className={`pill ${item.groupPillClass}`}>{item.groupLabel}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: 11, padding: "3px 9px" }}
                        onClick={() => onEditStaff(item)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn-outline" style={{ marginTop: 12 }} onClick={onAdd}>
            <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" />
            Add checklist item
          </button>
        </>
      ) : (
        <>
          <div className="full-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Trigger to advance</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.pipelineStages.map((stage) => (
                  <tr key={stage.id}>
                    <td style={{ fontSize: 12, fontWeight: 500 }}>{stage.name}</td>
                    <td style={{ fontSize: 12, color: "var(--color-ink2)" }}>
                      {stage.advanceTrigger ?? "—"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: 11, padding: "3px 9px" }}
                        onClick={() => onEditStage(stage)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function GatePanel({
  enabled,
  pending,
  onToggle,
}: {
  enabled: boolean;
  pending: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="st-panel">
      <div className="st-section-title">Supporting documents gate</div>
      <div className="st-section-sub">
        Controls whether a client can move into the Agreements stage before all ITP-supporting
        documents are confirmed present.
      </div>
      <div className="full-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: 1, paddingRight: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              Block ITP submission until supporting documents are confirmed
            </div>
            <div style={{ fontSize: 12, color: "var(--color-ink2)", lineHeight: 1.6 }}>
              When on, a client can&apos;t move into Agreements until CMDE, intake forms, ROI,
              diagnosis info, and consent forms are all checked off.
            </div>
          </div>
          <ToggleSwitch checked={enabled} disabled={pending} onChange={onToggle} />
        </div>
        <p className="notice-inline" style={{ marginTop: 14, marginBottom: 0 }}>
          <i className="ti ti-shield-check" aria-hidden="true" />
          Currently <strong style={{ color: "#5c6270" }}>{enabled ? "enforced" : "not enforced"}</strong>
          {enabled
            ? " — this is the default and recommended setting."
            : " — admin can proceed with a warning only."}
        </p>
      </div>
    </div>
  );
}

function NotificationsPanel({
  data,
  onManage,
}: {
  data: SettingsData;
  onManage: (pref: NotificationPrefView) => void;
}) {
  return (
    <div className="st-panel">
      <div className="st-section-title">Notification preferences</div>
      <div className="st-section-sub">
        Decide who receives each type of alert this system sends. All notification content stays
        PHI-free — client references by code only.
      </div>
      <div className="full-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Notification</th>
              <th>Cadence</th>
              <th>Recipients</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.notifications.map((pref) => (
              <tr key={pref.id}>
                <td style={{ fontSize: 12, fontWeight: 500 }}>{pref.label}</td>
                <td style={{ fontSize: 11, color: "var(--color-ink3)" }}>{pref.cadenceLabel}</td>
                <td style={{ fontSize: 12 }}>{pref.recipientsSummary}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: 11, padding: "3px 9px" }}
                    onClick={() => onManage(pref)}
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IntegrationsPanel({
  data,
  pending,
  onToggle,
}: {
  data: SettingsData;
  pending: boolean;
  onToggle: (service: IntegrationService, connect: boolean) => void;
}) {
  return (
    <div className="st-panel">
      <div className="st-section-title">Connections</div>
      <div className="st-section-sub">
        What this system is connected to, and what each connection can and can&apos;t do.
        API keys for Resend and DocSeal are read from server environment variables — never
        entered in the browser.
      </div>

      {data.integrations.map((row) => {
        const connected = row.status === "connected";
        const errored = row.status === "error";
        return (
          <div
            key={row.service}
            className="full-card"
            style={{ display: "flex", alignItems: "center", gap: 14 }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: row.meta.iconBg,
                color: row.meta.iconColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i className={row.meta.icon} style={{ fontSize: 19 }} aria-hidden="true" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{row.meta.name}</div>
              <div style={{ fontSize: 12, color: "var(--color-ink2)", marginTop: 2 }}>
                {connected && row.connectedEmail
                  ? `Connected as ${row.connectedEmail} · ${row.meta.description}`
                  : row.meta.description}
              </div>
            </div>
            <span
              className={`pill ${connected ? "pill-green" : errored ? "pill-coral" : "pill-gray"}`}
            >
              {connected ? "Connected" : errored ? "Error" : "Not connected"}
            </span>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: 11, padding: "5px 12px", flexShrink: 0 }}
              disabled={pending}
              onClick={() => onToggle(row.service, !connected)}
            >
              {connected ? "Disconnect" : "Connect"}
            </button>
          </div>
        );
      })}

      <div className="action-card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div className="action-card-icon">
          <i className="ti ti-lock" style={{ fontSize: 19 }} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="action-card-title">Catalyst</div>
          <div className="action-card-sub">
            No API integration available — confirmed with Catalyst support. &quot;Go to Catalyst&quot;
            buttons open their general login only; there&apos;s no record-level linking.
          </div>
        </div>
        <span className="pill pill-gray">No API</span>
      </div>
    </div>
  );
}

function UsersPanel({ data, onInvite }: { data: SettingsData; onInvite: () => void }) {
  return (
    <div className="st-panel">
      <div className="st-section-title">Users</div>
      <div className="st-section-sub">
        Who has access to ABA Connect. Staff don&apos;t have accounts in this system — only admin
        users do.
      </div>
      <div className="full-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Email</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.adminUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      className="init"
                      style={{
                        width: 24,
                        height: 24,
                        fontSize: 10,
                        background: "var(--color-blue-light)",
                        color: "var(--color-blue-dark)",
                      }}
                    >
                      {user.initials}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{user.fullName}</span>
                  </div>
                </td>
                <td style={{ fontSize: 12 }}>{user.role}</td>
                <td style={{ fontSize: 12, color: "var(--color-ink2)" }}>{user.email}</td>
                <td>
                  <span className={`pill ${user.statusClass}`}>{user.statusLabel}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={onInvite}>
        <i className="ti ti-user-plus" style={{ fontSize: 13 }} aria-hidden="true" />
        Invite admin user
      </button>
    </div>
  );
}

function FieldRow({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className="st-field-row" style={last ? { borderBottom: "none" } : undefined}>
      <label className="st-field-label">{label}</label>
      {children}
    </div>
  );
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="st-toggle">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="st-toggle-slider" />
    </label>
  );
}

function ItemModal({
  modal,
  onClose,
  pending,
  onSave,
  onDelete,
}: {
  modal: ItemModalState;
  onClose: () => void;
  pending: boolean;
  onSave: (fd: FormData) => void;
  onDelete?: () => void;
}) {
  const isStaff = modal.kind === "staff";
  const title =
    modal.mode === "add"
      ? isStaff
        ? "Add checklist item"
        : "Edit pipeline stage"
      : isStaff
        ? "Edit checklist item"
        : "Edit pipeline stage";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--color-ink3)", marginBottom: 16 }}>
          Changes apply to the template — not to anyone already in progress.
        </div>
        <form
          action={(fd) => {
            if (modal.id) fd.set("id", modal.id);
            onSave(fd);
          }}
        >
          <label className="modal-label">Name</label>
          <input
            className="modal-input"
            name={isStaff ? "name" : "name"}
            defaultValue={modal.name ?? ""}
            placeholder={isStaff ? "e.g. RBT 40-hour training" : "Stage name"}
            style={{ marginBottom: 12 }}
            required
          />
          {isStaff ? (
            <>
              <label className="modal-label">Group</label>
              <select
                className="modal-select"
                name="checklist_group"
                defaultValue={modal.group ?? "required_training"}
                style={{ marginBottom: 16 }}
              >
                {CHECKLIST_GROUP_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <label className="modal-label">Trigger to advance</label>
              <input
                className="modal-input"
                name="advance_trigger"
                defaultValue={modal.trigger ?? ""}
                placeholder="e.g. All required documents uploaded"
                style={{ marginBottom: 16 }}
              />
            </>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-coral)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden="true" />
                Delete
              </button>
            ) : (
              <span />
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={pending}>
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecipientsModal({
  pref,
  onClose,
  pending,
  onSave,
}: {
  pref: NotificationPrefView;
  onClose: () => void;
  pending: boolean;
  onSave: (fd: FormData) => void;
}) {
  const selectedAdminIds = pref.recipients
    .filter((r) => r.target_type === "admin_user" && r.admin_user_id)
    .map((r) => r.admin_user_id!);
  const extraEmails = pref.recipients.filter((r) => r.target_type === "email").map((r) => r.email!);
  const includeAssigned = pref.recipients.some((r) => r.target_type === "assigned_bt_plus_admin");
  const [emails, setEmails] = useState<string[]>(extraEmails);
  const [newEmail, setNewEmail] = useState("");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Manage recipients</div>
        <div style={{ fontSize: 11, color: "var(--color-ink3)", marginBottom: 16 }}>{pref.label}</div>
        <form
          action={(fd) => {
            fd.set("preference_id", pref.id);
            emails.forEach((e) => fd.append("email", e));
            onSave(fd);
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {pref.adminUsers.map((admin) => (
              <label
                key={admin.id}
                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}
              >
                <input
                  type="checkbox"
                  name="admin_user_id"
                  value={admin.id}
                  defaultChecked={selectedAdminIds.includes(admin.id)}
                />
                <span>
                  {admin.name} · {admin.role}
                </span>
              </label>
            ))}
            {pref.type === "missing_case_note" && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <input type="checkbox" name="include_assigned_bt" defaultChecked={includeAssigned} />
                <span>Assigned BT + their admin</span>
              </label>
            )}
          </div>
          <label className="modal-label">Add someone by email</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              className="modal-input"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="name@example.com"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                if (newEmail.trim()) {
                  setEmails([...emails, newEmail.trim()]);
                  setNewEmail("");
                }
              }}
            >
              Add
            </button>
          </div>
          {emails.map((email) => (
            <div key={email} style={{ fontSize: 12, marginBottom: 4, color: "var(--color-ink2)" }}>
              {email}
              <input type="hidden" name="email" value={email} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InviteModal({
  onClose,
  pending,
  onSave,
}: {
  onClose: () => void;
  pending: boolean;
  onSave: (fd: FormData) => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Invite admin user</div>
        <div style={{ fontSize: 11, color: "var(--color-ink3)", marginBottom: 16 }}>
          They&apos;ll receive an email when the invite flow is wired up.
        </div>
        <form action={onSave}>
          <label className="modal-label">Full name</label>
          <input className="modal-input" name="full_name" required style={{ marginBottom: 12 }} />
          <label className="modal-label">Email</label>
          <input
            className="modal-input"
            name="email"
            type="email"
            required
            style={{ marginBottom: 16 }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              Send invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
