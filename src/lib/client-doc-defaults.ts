/** Default document checklist rows created for every new client. */
export const DEFAULT_CLIENT_DOC_TYPES = [
  "medical_documentation",
  "insurance_card",
  "food_allergies",
  "student_questionnaire",
  "roi",
  "discharge_doc",
  "medication_questionnaire",
  "prev_diagnostic",
  "cmde",
  "itp",
  "iep",
  "wellness_assessment",
  "parent_handbook",
  "service_agreement",
  "transport_agreement",
] as const;

export type DefaultClientDocType = (typeof DEFAULT_CLIENT_DOC_TYPES)[number];
