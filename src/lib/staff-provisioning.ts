import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Supa = SupabaseClient<Database>;

const DEFAULT_TRAININGS = [
  "RBT 40-hour training",
  "EIDBI 101",
  "Cultural Responsiveness in ASD Services",
  "Vulnerable adults training",
  "Mandated reporter training",
  "ADS strategy training",
  "Company orientation",
];

const BG_STEPS = [
  { step: "step1_application", sort: 1 },
  { step: "step2_fingerprinting", sort: 2 },
  { step: "step3_approval", sort: 3 },
  { step: "study_number", sort: 4 },
] as const;

const DEFAULT_STAFF_DOCS = [
  "Signed offer letter",
  "I-9 employment verification",
  "W-4 tax form",
  "RBT 40hr training cert",
  "DHS provider enrollment form",
  "Background check documents",
];

export type ProvisionCounts = {
  checklist: number;
  trainings: number;
  backgroundChecks: number;
  documents: number;
};

export type ProvisionResult = {
  ok: boolean;
  error?: string;
  counts: ProvisionCounts;
};

function offsetDate(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** True when the staff member already has at least one row in `table`. */
async function hasRows(
  supabase: Supa,
  table: "staff_onboarding_items" | "staff_trainings" | "staff_background_checks" | "staff_documents",
  staffId: string,
): Promise<boolean> {
  const { data } = await supabase.from(table).select("id").eq("staff_id", staffId).limit(1);
  return Boolean(data?.length);
}

/**
 * Creates the onboarding checklist, trainings, background-check steps, and HR
 * document placeholders for a staff member.
 *
 * Idempotent by design — each table is skipped when the staff member already has
 * rows in it. Without that, a second run duplicates trainings and documents and
 * hard-errors on `staff_background_checks`' unique (staff_id, step), leaving a
 * half-written record behind.
 */
export async function provisionOnboarding(
  supabase: Supa,
  staffId: string,
  hiredOn: string,
): Promise<ProvisionResult> {
  const counts: ProvisionCounts = {
    checklist: 0,
    trainings: 0,
    backgroundChecks: 0,
    documents: 0,
  };

  if (!(await hasRows(supabase, "staff_onboarding_items", staffId))) {
    // `active: true` matters — deleteChecklistItem in settings is a SOFT delete,
    // so without this filter every removed template item is still assigned.
    const { data: template } = await supabase
      .from("staff_checklist_template")
      .select("*")
      .eq("active", true)
      .order("sort_order");

    if (template?.length) {
      const { error } = await supabase.from("staff_onboarding_items").insert(
        template.map((t) => ({
          staff_id: staffId,
          template_item_id: t.id,
          label: t.name,
          checklist_group: t.checklist_group,
          sort_order: t.sort_order,
          due_on:
            t.default_due_offset_days && hiredOn
              ? offsetDate(hiredOn, t.default_due_offset_days)
              : null,
        })),
      );
      if (error) return { ok: false, error: error.message, counts };
      counts.checklist = template.length;
    }
  }

  if (!(await hasRows(supabase, "staff_trainings", staffId))) {
    const { error } = await supabase.from("staff_trainings").insert(
      DEFAULT_TRAININGS.map((name) => ({
        staff_id: staffId,
        name,
        status: "pending" as const,
        due_on: name === "RBT 40-hour training" ? offsetDate(hiredOn, 60) : null,
      })),
    );
    if (error) return { ok: false, error: error.message, counts };
    counts.trainings = DEFAULT_TRAININGS.length;
  }

  if (!(await hasRows(supabase, "staff_background_checks", staffId))) {
    const { error } = await supabase.from("staff_background_checks").insert(
      BG_STEPS.map((s) => ({
        staff_id: staffId,
        step: s.step,
        sort_order: s.sort,
        status: s.step === "study_number" ? ("not_assigned" as const) : ("pending" as const),
      })),
    );
    if (error) return { ok: false, error: error.message, counts };
    counts.backgroundChecks = BG_STEPS.length;
  }

  if (!(await hasRows(supabase, "staff_documents", staffId))) {
    const { error } = await supabase.from("staff_documents").insert(
      DEFAULT_STAFF_DOCS.map((name) => ({
        staff_id: staffId,
        name,
        status: "missing" as const,
      })),
    );
    if (error) return { ok: false, error: error.message, counts };
    counts.documents = DEFAULT_STAFF_DOCS.length;
  }

  return { ok: true, counts };
}
