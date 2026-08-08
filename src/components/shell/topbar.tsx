"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTE_META, type RouteMeta } from "@/lib/nav";

const FALLBACK: RouteMeta = {
  title: "ABA Connect",
  action: "Add client",
  crumbs: ["Dashboard"],
  subtitle: "",
};

function matchRoute(pathname: string): RouteMeta {
  const key = Object.keys(ROUTE_META).find(
    (href) => pathname === href || pathname.startsWith(href + "/"),
  );
  return key ? ROUTE_META[key] : FALLBACK;
}

/** Map breadcrumb label → href for intermediate crumbs. */
function crumbHref(label: string): string | null {
  switch (label) {
    case "Dashboard":
      return "/dashboard";
    case "Clients":
      return "/clients";
    case "Staff":
      return "/staff";
    case "Settings":
      return "/settings";
    default:
      return null;
  }
}

export function Topbar({ adminName }: { adminName: string }) {
  void adminName;
  const pathname = usePathname();
  const meta = matchRoute(pathname);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="sidebar-trigger"
          onClick={() => window.dispatchEvent(new CustomEvent("aba:toggle-sidebar"))}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        >
          <i className="ti ti-layout-sidebar" aria-hidden="true" />
        </button>
        <span className="topbar-sep" aria-hidden="true" />
        <nav className="topbar-crumbs breadcrumb" aria-label="Breadcrumb">
          {meta.crumbs.map((crumb, i) => {
            const last = i === meta.crumbs.length - 1;
            const href = !last ? crumbHref(crumb) : null;
            return (
              <span key={`${crumb}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {i > 0 && (
                  <span className="breadcrumb-sep" aria-hidden="true">
                    /
                  </span>
                )}
                {last ? (
                  <span className="breadcrumb-current">{crumb}</span>
                ) : href ? (
                  <Link href={href}>{crumb}</Link>
                ) : (
                  <span>{crumb}</span>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      <div className="topbar-right">
        <div className="search">
          <i className="ti ti-search" aria-hidden="true" />
          <input placeholder="Search clients or staff…" aria-label="Search clients or staff" />
        </div>

        <button className="icon-btn" aria-label="Notifications">
          <i className="ti ti-bell" aria-hidden="true" />
          <span className="notif-dot" />
        </button>

        <button
          className="btn btn-primary"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("aba:primary-action", { detail: { pathname } }),
            )
          }
        >
          <i className="ti ti-plus text-[13px]" aria-hidden="true" />
          {meta.action}
        </button>
      </div>
    </header>
  );
}
