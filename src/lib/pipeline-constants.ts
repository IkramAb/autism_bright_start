// Shared pipeline constants — safe to import from client components.

export const PIPELINE_STRIP = [
  "Referral",
  "Phone screen",
  "Docs",
  "CMDE",
  "ITP",
  "Agreements",
  "Active",
];

const STAGE_TO_STRIP: Record<string, number> = {
  new_referral: 0,
  phone_screen: 1,
  docs_collection: 2,
  cmde_submitted: 3,
  cmde_review: 3,
  itp_creation: 4,
  agreements: 5,
  active: 6,
};

export function stripIndexForStage(stageKey: string | undefined): number {
  return stageKey ? (STAGE_TO_STRIP[stageKey] ?? 0) : 0;
}
