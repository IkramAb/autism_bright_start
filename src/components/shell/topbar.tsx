"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ROUTE_META, type RouteMeta } from "@/lib/nav";
import { searchTopbar } from "@/app/(app)/shell/actions";
import type { SearchHit, TopbarAlerts } from "@/lib/topbar";

const FALLBACK: RouteMeta = {
  title: "ABA Connect",
  crumbs: ["Overview"],
  subtitle: "",
};

function matchRoute(pathname: string): RouteMeta {
  const key = Object.keys(ROUTE_META).find(
    (href) => pathname === href || pathname.startsWith(href + "/"),
  );
  return key ? ROUTE_META[key] : FALLBACK;
}

/**
 * Map breadcrumb label → href for intermediate crumbs. Only "Overview" is ever
 * both non-last and routable — the middle crumbs are sidebar group labels with
 * no route, and the page crumbs are always last (never linked).
 */
function crumbHref(label: string): string | null {
  return label === "Overview" ? "/dashboard" : null;
}

export function Topbar({
  adminName,
  alerts,
}: {
  adminName: string;
  alerts: TopbarAlerts;
}) {
  void adminName;
  const pathname = usePathname();
  const router = useRouter();
  const meta = matchRoute(pathname);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const notifWrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (searchWrapRef.current && !searchWrapRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (notifWrapRef.current && !notifWrapRef.current.contains(target)) {
        setNotifOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    setSearchOpen(false);
    setNotifOpen(false);
    setQuery("");
    setHits([]);
  }, [pathname]);

  function runSearch(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setHits([]);
      setSearchOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const results = await searchTopbar(value);
        setHits(results);
        setSearchOpen(true);
      });
    }, 200);
  }

  function goToHit(hit: SearchHit) {
    setSearchOpen(false);
    setQuery("");
    setHits([]);
    router.push(hit.href);
  }

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
        <div className="topbar-search-wrap" ref={searchWrapRef}>
          <div className="search">
            <i className="ti ti-search" aria-hidden="true" />
            <input
              placeholder="Search clients or staff…"
              aria-label="Search clients or staff"
              aria-expanded={searchOpen}
              aria-controls="topbar-search-results"
              role="combobox"
              aria-autocomplete="list"
              value={query}
              onChange={(e) => runSearch(e.target.value)}
              onFocus={() => {
                if (hits.length || query.trim()) setSearchOpen(true);
              }}
            />
          </div>
          {searchOpen && (
            <div id="topbar-search-results" className="topbar-panel" role="listbox">
              {pending && hits.length === 0 ? (
                <div className="topbar-panel-empty">Searching…</div>
              ) : hits.length === 0 ? (
                <div className="topbar-panel-empty">
                  {query.trim() ? "No matches found." : "Type a client code or staff name."}
                </div>
              ) : (
                hits.map((hit) => (
                  <button
                    key={`${hit.kind}-${hit.id}`}
                    type="button"
                    className="topbar-panel-item"
                    role="option"
                    onClick={() => goToHit(hit)}
                  >
                    <span className="topbar-panel-item-icon" aria-hidden="true">
                      <i className={`ti ti-${hit.kind === "client" ? "user" : "id-badge"}`} />
                    </span>
                    <span className="topbar-panel-item-text">
                      <span className="topbar-panel-item-label">{hit.label}</span>
                      <span className="topbar-panel-item-sub">{hit.sub}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="topbar-notif-wrap" ref={notifWrapRef}>
          <button
            type="button"
            className="icon-btn"
            aria-label="Notifications"
            aria-expanded={notifOpen}
            aria-controls="topbar-notif-panel"
            onClick={() => {
              setNotifOpen((v) => !v);
              setSearchOpen(false);
            }}
          >
            <i className="ti ti-bell" aria-hidden="true" />
            {alerts.count > 0 && <span className="notif-dot" />}
          </button>
          {notifOpen && (
            <div id="topbar-notif-panel" className="topbar-panel topbar-panel-notif" role="dialog" aria-label="Notifications">
              <div className="topbar-panel-head">
                <span>Alerts</span>
                {alerts.count > 0 && (
                  <span className="topbar-panel-count">{alerts.count}</span>
                )}
              </div>
              {alerts.items.length === 0 ? (
                <div className="topbar-panel-empty">No document alerts right now.</div>
              ) : (
                alerts.items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="topbar-panel-item"
                    onClick={() => setNotifOpen(false)}
                  >
                    <span
                      className={`topbar-panel-tone topbar-panel-tone-${item.tone}`}
                      aria-hidden="true"
                    />
                    <span className="topbar-panel-item-text">
                      <span className="topbar-panel-item-label">{item.title}</span>
                      <span className="topbar-panel-item-sub">{item.meta}</span>
                    </span>
                  </Link>
                ))
              )}
              <Link
                href="/documents"
                className="topbar-panel-footer"
                onClick={() => setNotifOpen(false)}
              >
                View document tracker
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
