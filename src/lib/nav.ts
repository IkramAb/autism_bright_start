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

/** Per-route topbar title + primary action label (mirrors the prototype). */
export const ROUTE_META: Record<
  string,
  { title: string; action: string }
> = {
  "/dashboard": { title: "Dashboard", action: "Add client" },
  "/pipeline": { title: "Onboarding pipeline", action: "Add new client" },
  "/clients": { title: "Client records", action: "Add client" },
  "/documents": { title: "Document tracker", action: "Upload doc" },
  "/case-notes": { title: "Case notes", action: "Send report" },
  "/staff": { title: "Staff directory", action: "Add employee" },
  "/onboarding": { title: "Staff onboarding", action: "Add employee" },
  "/training": { title: "Training tracker", action: "Upload cert" },
  "/settings": { title: "Settings", action: "Invite admin" },
};
