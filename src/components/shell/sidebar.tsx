"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_NAME, BRAND_TAGLINE, NAV_GROUPS } from "@/lib/nav";
import { signOut } from "@/app/login/actions";

const STORAGE_KEY = "aba-sidebar-collapsed";

type Props = {
  adminName: string;
  adminRole: string;
  adminInitials: string;
};

export function Sidebar({ adminName, adminRole, adminInitials }: Props) {
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

  return (
    <aside className={`sidebar${collapsed ? " sidebar-collapsed" : ""}`}>
      <div className="sidebar-logo">
        <span className="sidebar-mark" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/logo-bulb.png" alt="" />
        </span>
        {!collapsed && (
          <span className="sidebar-wordmark">
            <span className="sidebar-wordmark-name">{BRAND_NAME}</span>
            <span className="sidebar-wordmark-sub">{BRAND_TAGLINE}</span>
          </span>
        )}
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
                  aria-label={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
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
