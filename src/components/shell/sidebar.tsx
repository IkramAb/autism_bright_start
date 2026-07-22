"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/lib/nav";
import { signOut } from "@/app/login/actions";

type Props = {
  adminName: string;
  adminRole: string;
  adminInitials: string;
  logoUrl?: string | null;
};

export function Sidebar({ adminName, adminRole, adminInitials, logoUrl }: Props) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="flex items-center gap-2.5">
          <div className={`logo-icon${logoUrl ? " logo-icon-image" : ""}`}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Practice logo" className="logo-img" />
            ) : (
              <i className="ti ti-puzzle" aria-hidden="true" />
            )}
          </div>
          <div>
            <div className="logo-name">ABA Connect</div>
            <div className="logo-sub">Admin portal</div>
          </div>
        </div>
      </div>

      <nav className="nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            <div className="nav-label">{group.label}</div>
            {group.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item${active ? " active" : ""}`}
                >
                  <i className={`ti ti-${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`nav-badge nav-badge-${item.badge.tone}`}>
                      {item.badge.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="user-row">
          <div className="avatar">{adminInitials}</div>
          <div className="min-w-0 flex-1">
            <div className="user-name truncate">{adminName}</div>
            <div className="user-role truncate">{adminRole}</div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              title="Sign out"
              aria-label="Sign out"
              className="icon-btn"
              style={{ width: 28, height: 28 }}
            >
              <i className="ti ti-logout" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
