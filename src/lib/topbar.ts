import { createClient } from "@/lib/supabase/server";
import { getDocumentTrackerData } from "@/lib/clients";

export type SearchHit = {
  id: string;
  kind: "client" | "staff";
  label: string;
  sub: string;
  href: string;
};

export type TopbarAlert = {
  id: string;
  title: string;
  meta: string;
  href: string;
  tone: "coral" | "amber" | "neutral";
};

export type TopbarAlerts = {
  items: TopbarAlert[];
  count: number;
};

/** Lightweight clients + staff lookup for the topbar search. PHI-safe for clients. */
export async function searchDirectory(query: string): Promise<SearchHit[]> {
  const q = query.trim().replace(/[%_,]/g, "");
  if (q.length < 1) return [];

  const supabase = await createClient();
  const pattern = `%${q}%`;

  const [{ data: clients }, { data: staffByName }, { data: staffByEmail }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, ref_code, status")
      .ilike("ref_code", pattern)
      .order("ref_code")
      .limit(6),
    supabase
      .from("staff")
      .select("id, full_name, role, email")
      .ilike("full_name", pattern)
      .order("full_name")
      .limit(6),
    supabase
      .from("staff")
      .select("id, full_name, role, email")
      .ilike("email", pattern)
      .order("full_name")
      .limit(6),
  ]);

  const staffById = new Map<string, { id: string; full_name: string; role: string | null; email: string | null }>();
  for (const s of [...(staffByName ?? []), ...(staffByEmail ?? [])]) {
    staffById.set(String(s.id), {
      id: String(s.id),
      full_name: String(s.full_name),
      role: (s.role as string | null) ?? null,
      email: (s.email as string | null) ?? null,
    });
  }

  const hits: SearchHit[] = [];

  for (const c of clients ?? []) {
    hits.push({
      id: String(c.id),
      kind: "client",
      label: `Client #${c.ref_code}`,
      sub: String(c.status ?? "client"),
      href: `/clients/${c.id}`,
    });
  }

  for (const s of [...staffById.values()].slice(0, 6)) {
    hits.push({
      id: s.id,
      kind: "staff",
      label: s.full_name,
      sub: s.role ?? s.email ?? "Staff",
      href: "/staff",
    });
  }

  return hits.slice(0, 10);
}

/** Document + case-note signals for the topbar notification panel. */
export async function getTopbarAlerts(): Promise<TopbarAlerts> {
  const docs = await getDocumentTrackerData();
  const items: TopbarAlert[] = [];

  for (const client of docs.clients) {
    for (const doc of client.documents) {
      if (doc.category !== "overdue" && doc.category !== "expiring") continue;
      const tone = doc.category === "overdue" ? "coral" : "amber";
      items.push({
        id: `${client.id}-${doc.label}-${doc.category}`,
        title: `${doc.label} — Client #${client.refCode}`,
        meta:
          doc.category === "overdue"
            ? "Renewal overdue"
            : doc.expiresLabel || "Expiring soon",
        href: `/documents`,
        tone,
      });
    }
  }

  items.sort((a, b) => {
    const order = { coral: 0, amber: 1, neutral: 2 };
    return order[a.tone] - order[b.tone];
  });

  const sliced = items.slice(0, 8);
  return { items: sliced, count: items.length };
}
