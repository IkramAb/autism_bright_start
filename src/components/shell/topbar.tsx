"use client";

import { usePathname } from "next/navigation";
import { ROUTE_META } from "@/lib/nav";

function matchRoute(pathname: string) {
  const key = Object.keys(ROUTE_META).find(
    (href) => pathname === href || pathname.startsWith(href + "/"),
  );
  return key ? ROUTE_META[key] : { title: "ABA Connect", action: "Add client" };
}

export function Topbar({ adminName }: { adminName: string }) {
  void adminName;
  const pathname = usePathname();
  const meta = matchRoute(pathname);

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="topbar">
      <span className="topbar-title">
        {meta.title}
        <span className="topbar-sub">{dateLabel}</span>
      </span>

      <div className="search">
        <i className="ti ti-search" aria-hidden="true" />
        <input placeholder="Search clients or staff…" />
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
  );
}
