"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/lib/nav";
import { signOut } from "@/app/login/actions";

const STORAGE_KEY = "aba-sidebar-collapsed";

type Props = {
  adminName: string;
  adminRole: string;
  adminInitials: string;
  logoUrl?: string | null;
  logoHeight?: number;
};

export function Sidebar({
  adminName,
  adminRole,
  adminInitials,
  logoUrl,
  logoHeight = 150,
}: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed, hydrated]);

  useEffect(() => {
    function onToggle() {
      setCollapsed((v) => !v);
    }
    window.addEventListener("aba:toggle-sidebar", onToggle);
    return () => window.removeEventListener("aba:toggle-sidebar", onToggle);
  }, []);

  const displayHeight = logoHeight;

  return (
    <aside className={`sidebar${collapsed ? " sidebar-collapsed" : ""}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-main">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Practice logo"
              className="brand-logo"
              style={
                collapsed
                  ? { height: 28, maxHeight: 28, maxWidth: 36 }
                  : { height: displayHeight, maxHeight: displayHeight, maxWidth: "100%" }
              }
            />
          ) : (
            <div className={`sidebar-brand-fallback${collapsed ? " is-collapsed" : ""}`}>
              <div className="logo-icon">
                <i className="ti ti-puzzle" aria-hidden="true" />
              </div>
              {!collapsed && (
                <div>
                  <div className="logo-name">ABA Connect</div>
                  <div className="logo-sub">Admin portal</div>
                </div>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          <i
            className={`ti ${collapsed ? "ti-layout-sidebar-left-expand" : "ti-layout-sidebar-left-collapse"}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <nav className="nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="nav-group">
            {!collapsed && <div className="nav-label">{group.label}</div>}
            {group.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item${active ? " active" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <i className={`ti ti-${item.icon}`} aria-hidden="true" />
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span className={`nav-badge nav-badge-${item.badge.tone}`}>
                      {item.badge.count}
                    </span>
                  )}
                  {collapsed && item.badge && (
                    <span className={`nav-badge nav-badge-dot nav-badge-${item.badge.tone}`} />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className={`user-row${collapsed ? " user-row-collapsed" : ""}`}>
          <div
            className="avatar avatar-lg"
            title={collapsed ? `${adminName} · ${adminRole}` : undefined}
          >
            {adminInitials}
          </div>
          {!collapsed && (
            <>
              <div className="user-meta">
                <div className="user-name truncate">{adminName}</div>
                <div className="user-role truncate">{adminRole}</div>
              </div>
              <form action={signOut} className="user-actions">
                <button
                  type="submit"
                  title="Sign out"
                  aria-label="Sign out"
                  className="user-menu-chevron"
                >
                  <i className="ti ti-logout" aria-hidden="true" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        className="sidebar-rail"
        onClick={() => setCollapsed((v) => !v)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        tabIndex={-1}
      />
    </aside>
  );
}
