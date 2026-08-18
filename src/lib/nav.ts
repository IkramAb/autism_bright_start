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

/**
 * Product wordmark shown in the sidebar header. Lives here rather than in
 * `lib/branding.ts` because that module pulls in the server-only Supabase admin
 * client, and the sidebar is a client component.
 */
export const BRAND_NAME = "Autism Bright Start";
export const BRAND_TAGLINE = "Care workspace";

/**
 * Sidebar structure — grouped by how the practice works (workspace → care
 * operations → staff operations → admin) rather than by entity type.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview", icon: "layout-dashboard" },
      { href: "/clients", label: "Clients", icon: "users" },
      { href: "/staff", label: "Staff", icon: "id-badge" },
    ],
  },
  {
    label: "Care operations",
    items: [
      {
        href: "/pipeline",
        label: "Onboarding",
        icon: "git-merge",
        badge: { count: 3, tone: "amber" },
      },
      { href: "/documents", label: "Documents", icon: "files" },
      { href: "/case-notes", label: "Case notes", icon: "writing" },
    ],
  },
  {
    label: "Staff operations",
    items: [
      { href: "/onboarding", label: "Staff onboarding", icon: "checklist" },
      { href: "/training", label: "Training", icon: "certificate" },
    ],
  },
  {
    label: "Admin",
    items: [{ href: "/settings", label: "Settings", icon: "settings" }],
  },
];

export type RouteMeta = {
  title: string;
  /** Breadcrumb trail shown in the topbar (e.g. Overview / Clients / …). */
  crumbs: string[];
  /** One-line muted subtitle under the in-page title. */
  subtitle: string;
};

/**
 * Per-route topbar / page chrome metadata. Crumbs follow the sidebar shape:
 * Overview / <group label> / <nav label>. Group labels have no route of their
 * own, so `crumbHref()` in the topbar renders them as plain text.
 */
export const ROUTE_META: Record<string, RouteMeta> = {
  "/dashboard": {
    title: "Overview",
    crumbs: ["Overview"],
    subtitle: "Practice overview — clients, pipeline, documents, and case notes.",
  },
  "/clients": {
    title: "Client records",
    crumbs: ["Overview", "Workspace", "Clients"],
    subtitle: "PHI-minimized client list — reference codes only.",
  },
  "/staff": {
    title: "Staff directory",
    crumbs: ["Overview", "Workspace", "Staff"],
    subtitle: "Clinic roster, roles, trainings, and certifications.",
  },
  "/pipeline": {
    title: "Onboarding pipeline",
    crumbs: ["Overview", "Care operations", "Onboarding"],
    subtitle: "Track new referrals through docs, CMDE/ITP, and activation.",
  },
  "/documents": {
    title: "Document tracker",
    crumbs: ["Overview", "Care operations", "Documents"],
    subtitle: "Renewals, expirations, and document collection status.",
  },
  "/case-notes": {
    title: "Case notes",
    crumbs: ["Overview", "Care operations", "Case notes"],
    subtitle: "Daily note compliance against the two-notes-per-day rule.",
  },
  "/onboarding": {
    title: "Staff onboarding",
    crumbs: ["Overview", "Staff operations", "Staff onboarding"],
    subtitle: "Checklist progress for employees currently onboarding.",
  },
  "/training": {
    title: "Training tracker",
    crumbs: ["Overview", "Staff operations", "Training"],
    subtitle: "Required trainings and certification due dates.",
  },
  "/settings": {
    title: "Settings",
    crumbs: ["Overview", "Admin", "Settings"],
    subtitle: "Organization, renewals, checklists, gates, and integrations.",
  },
};
