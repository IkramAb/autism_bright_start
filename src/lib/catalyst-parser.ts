/**
 * Pure Catalyst export parser — never persists student names or note content.
 * Matches rows to schedule slots by ref_code (if present in Student), date,
 * inferred AM/PM period, and assigned BT name.
 */

export type CatalystMatchTarget = {
  clientId: string;
  refCode: string;
  sessionDate: string;
  period: "am" | "pm";
  assignedStaffId: string | null;
  staffFullName: string;
  slot: 1 | 2;
};

export type CatalystParseResult = {
  rowsTotal: number;
  rowsMatched: number;
  matchedKeys: Array<{ clientId: string; sessionDate: string; slot: 1 | 2 }>;
};

type ParsedRow = {
  refCode: string | null;
  serviceDate: string;
  period: "am" | "pm";
  user: string;
};

export function parseCatalystCsv(csvText: string): ParsedRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const colIndex = mapColumns(headers);
  if (!colIndex) return [];

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    if (cells.every((c) => !c.trim())) continue;

    const student = cells[colIndex.student]?.trim() ?? "";
    const dateRaw = cells[colIndex.serviceDate]?.trim() ?? "";
    const timeRaw = cells[colIndex.sessionTime]?.trim() ?? "";
    const user = cells[colIndex.user]?.trim() ?? "";
    if (!dateRaw || !user) continue;

    const serviceDate = normalizeDate(dateRaw);
    if (!serviceDate) continue;

    const period = inferPeriod(timeRaw);
    if (!period) continue;

    rows.push({
      refCode: extractRefCode(student),
      serviceDate,
      period,
      user,
    });
  }
  return rows;
}

/** Match parsed rows against this week's schedule targets; returns counts + slot keys only. */
export function matchCatalystRows(
  rows: ParsedRow[],
  targets: CatalystMatchTarget[],
): CatalystParseResult {
  const matchedKeys: CatalystParseResult["matchedKeys"] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const candidates = targets.filter((t) => {
      if (t.sessionDate !== row.serviceDate || t.period !== row.period) return false;
      if (row.refCode && t.refCode !== row.refCode) return false;
      if (!t.assignedStaffId) return false;
      return staffMatchesUser(t.staffFullName, row.user);
    });

    for (const hit of candidates) {
      const key = `${hit.clientId}|${hit.sessionDate}|${hit.slot}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matchedKeys.push({
        clientId: hit.clientId,
        sessionDate: hit.sessionDate,
        slot: hit.slot,
      });
    }
  }

  return {
    rowsTotal: rows.length,
    rowsMatched: matchedKeys.length,
    matchedKeys,
  };
}

export function parseAndMatchCatalystExport(
  csvText: string,
  targets: CatalystMatchTarget[],
): CatalystParseResult {
  const rows = parseCatalystCsv(csvText);
  return matchCatalystRows(rows, targets);
}

function mapColumns(headers: string[]): {
  student: number;
  serviceDate: number;
  sessionTime: number;
  user: number;
} | null {
  const find = (name: string) =>
    headers.findIndex((h) => h === name || h.replace(/\s+/g, " ") === name);

  const student = find("student");
  const serviceDate = find("service date");
  const sessionTime = find("session time");
  const user = find("user");
  if (student < 0 || serviceDate < 0 || sessionTime < 0 || user < 0) return null;

  return { student, serviceDate, sessionTime, user };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** Pull a 4-digit ref code from Student if present; never returned/stored otherwise. */
function extractRefCode(student: string): string | null {
  const hash = student.match(/#\s*(\d{4})\b/);
  if (hash) return hash[1];
  const bare = student.match(/\b(\d{4})\b/);
  return bare ? bare[1] : null;
}

function normalizeDate(raw: string): string | null {
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return raw;

  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    const [, m, d, y] = us;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function inferPeriod(sessionTime: string): "am" | "pm" | null {
  const start = sessionTime.split(/[–\-—]/)[0]?.trim() ?? sessionTime;
  const m = start.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!m) return "am";
  let hour = parseInt(m[1], 10);
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return hour < 12 ? "am" : "pm";
}

function staffMatchesUser(staffFullName: string, user: string): boolean {
  const a = staffFullName.toLowerCase().trim();
  const b = user.toLowerCase().trim();
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const aParts = a.split(/\s+/);
  const bParts = b.split(/\s+/);
  const aLast = aParts[aParts.length - 1];
  const bLast = bParts[bParts.length - 1];
  return aLast.length > 2 && bLast.length > 2 && (aLast === bLast || b.includes(aLast));
}
