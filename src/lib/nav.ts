export type NavItem = {
  href: string;
  label: string;
  icon: string; // Tabler icon class suffix, e.g. "layout-dashboard"
  badge?: { count: number; tone: "amber" | "coral" };
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/** Sidebar structure, matching the prototype's groups, items, icons, and order. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" },
    ],
  },
  {
    label: "Clients",
    items: [
      {
        href: "/pipeline",
        label: "Onboarding pipeline",
        icon: "git-merge",
        badge: { count: 3, tone: "amber" },
      },
      { href: "/clients", label: "Client record", icon: "users" },
      { href: "/documents", label: "Documents", icon: "files" },
      { href: "/case-notes", label: "Case notes", icon: "writing" },
    ],
  },
  {
    label: "Staff",
    items: [
      { href: "/staff", label: "Staff directory", icon: "id-badge" },
      { href: "/onboarding", label: "Onboarding", icon: "checklist" },
      { href: "/training", label: "Training", icon: "certificate" },
    ],
  },
  {
    label: "Settings",
    items: [{ href: "/settings", label: "Settings", icon: "settings" }],
  },
];

export type RouteMeta = {
  title: string;
  action: string;
  /** Breadcrumb trail shown in the topbar (e.g. Dashboard / Clients / …). */
  crumbs: string[];
  /** One-line muted subtitle under the in-page title. */
  subtitle: string;
};

/** Per-route topbar / page chrome metadata. */
export const ROUTE_META: Record<string, RouteMeta> = {
  "/dashboard": {
    title: "Dashboard",
    action: "Add client",
    crumbs: ["Dashboard"],
    subtitle: "Practice overview — clients, pipeline, documents, and case notes.",
  },
  "/pipeline": {
    title: "Onboarding pipeline",
    action: "Add new client",
    crumbs: ["Dashboard", "Clients", "Onboarding pipeline"],
    subtitle: "Track new referrals through docs, CMDE/ITP, and activation.",
  },
  "/clients": {
    title: "Client records",
    action: "Add client",
    crumbs: ["Dashboard", "Clients", "Client records"],
    subtitle: "PHI-minimized client list — reference codes only.",
  },
  "/documents": {
    title: "Document tracker",
    action: "Upload doc",
    crumbs: ["Dashboard", "Clients", "Documents"],
    subtitle: "Renewals, expirations, and document collection status.",
  },
  "/case-notes": {
    title: "Case notes",
    action: "Send report",
    crumbs: ["Dashboard", "Clients", "Case notes"],
    subtitle: "Daily note compliance against the two-notes-per-day rule.",
  },
  "/staff": {
    title: "Staff directory",
    action: "Add employee",
    crumbs: ["Dashboard", "Staff", "Staff directory"],
    subtitle: "Clinic roster, roles, trainings, and certifications.",
  },
  "/onboarding": {
    title: "Staff onboarding",
    action: "Add employee",
    crumbs: ["Dashboard", "Staff", "Onboarding"],
    subtitle: "Checklist progress for employees currently onboarding.",
  },
  "/training": {
    title: "Training tracker",
    action: "Upload cert",
    crumbs: ["Dashboard", "Staff", "Training"],
    subtitle: "Required trainings and certification due dates.",
  },
  "/settings": {
    title: "Settings",
    action: "Invite admin",
    crumbs: ["Dashboard", "Settings"],
    subtitle: "Organization, renewals, checklists, gates, and integrations.",
  },
};
