"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdmin } from "@/lib/auth";
import type {
  AbaStatus,
  ReferralSource,
  MaStatus,
  ClientStatus,
  PipelineStage,
  ClientDocumentRow,
} from "@/lib/types/db";
import { DEFAULT_CLIENT_DOC_TYPES } from "@/lib/client-doc-defaults";
import type { Database } from "@/lib/supabase/types";

export type ActionResult = { ok: boolean; error?: string };

const COMPLETE_DOC_STATUSES = new Set([
  "uploaded",
  "submitted",
  "pending_approval",
  "approved",
  "signed",
]);

async function nextRefCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const { data } = await supabase.from("clients").select("ref_code");
  let max = 100;
  for (const row of data ?? []) {
    const code = row.ref_code as string;
    if (/^\d+$/.test(code)) {
      const n = parseInt(code, 10);
      if (n > max) max = n;
    }
  }
  return String(max + 1).padStart(4, "0");
}

const REF_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _-]*$/;

// Resolves the client reference code from an optional admin-supplied value,
// falling back to the next auto-generated numeric code when left blank.
async function resolveRefCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  raw: FormDataEntryValue | null,
): Promise<{ code?: string; error?: string }> {
  const custom = typeof raw === "string" ? raw.trim() : "";
  if (!custom) return { code: await nextRefCode(supabase) };

  if (custom.length > 32)
    return { error: "Client ID must be 32 characters or fewer." };
  if (!REF_CODE_PATTERN.test(custom))
    return {
      error:
        "Client ID may only contain letters, numbers, spaces, dashes, and underscores.",
    };

  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("ref_code", custom)
    .maybeSingle();
  if (existing) return { error: `Client ID "${custom}" is already in use.` };

  return { code: custom };
}

async function newReferralStageId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const { data } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("key", "new_referral")
    .single();
  return (data?.id as string) ?? null;
}

async function seedDefaultDocuments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
) {
  await supabase.from("client_documents").insert(
    DEFAULT_CLIENT_DOC_TYPES.map((doc_type) => ({
      client_id: clientId,
      doc_type,
      status: "missing" as const,
    })),
  );
}

export async function createReferral(formData: FormData): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const referralSource = (formData.get("referral_source") as ReferralSource) || "other";
  const serviceStartOn = (formData.get("service_start_on") as string) || null;

  const supabase = await createClient();
  const stageId = await newReferralStageId(supabase);
  if (!stageId) return { ok: false, error: "Pipeline not configured." };

  const { code: refCode, error: refError } = await resolveRefCode(
    supabase,
    formData.get("ref_code"),
  );
  if (refError) return { ok: false, error: refError };

  const { data: inserted, error } = await supabase
    .from("clients")
    .insert({
      ref_code: refCode!,
      service_start_on: serviceStartOn,
      referral_source: referralSource,
      current_stage_id: stageId,
      status: "onboarding",
      handled_by_admin_id: admin.id,
    })
    .select("id")
    .single();

  if (error)
    return {
      ok: false,
      error: error.code === "23505" ? "That Client ID is already in use." : error.message,
    };

  await supabase.from("client_stage_history").insert({
    client_id: inserted!.id,
    stage_id: stageId,
    changed_by: admin.id,
    note: "Referral created",
  });

  await seedDefaultDocuments(supabase, inserted!.id);

  revalidatePath("/pipeline");
  revalidatePath("/clients");
  revalidatePath("/documents");
  return { ok: true };
}

export async function createClientFull(formData: FormData): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const serviceStartOn = (formData.get("service_start_on") as string) || null;
  const referralSource = (formData.get("referral_source") as ReferralSource) || "other";
  const abaStatus = (formData.get("aba_status") as AbaStatus) || "unknown";
  const maStatus = (formData.get("ma_status") as MaStatus) || "unknown";
  const phoneScreenDue = (formData.get("phone_screen_due_on") as string) || null;

  const supabase = await createClient();
  const stageId = await newReferralStageId(supabase);
  if (!stageId) return { ok: false, error: "Pipeline not configured." };

  const { code: refCode, error: refError } = await resolveRefCode(
    supabase,
    formData.get("ref_code"),
  );
  if (refError) return { ok: false, error: refError };

  const { data: inserted, error } = await supabase
    .from("clients")
    .insert({
      ref_code: refCode!,
      service_start_on: serviceStartOn,
      referral_source: referralSource,
      aba_status: abaStatus,
      ma_status: maStatus,
      phone_screen_due_on: phoneScreenDue,
      current_stage_id: stageId,
      status: "onboarding",
      handled_by_admin_id: admin.id,
    })
    .select("id")
    .single();

  if (error)
    return {
      ok: false,
      error: error.code === "23505" ? "That Client ID is already in use." : error.message,
    };

  await supabase.from("client_stage_history").insert({
    client_id: inserted!.id,
    stage_id: stageId,
    changed_by: admin.id,
    note: "Client added to pipeline",
  });

  await seedDefaultDocuments(supabase, inserted!.id);

  revalidatePath("/pipeline");
  revalidatePath("/clients");
  revalidatePath("/documents");
  return { ok: true };
}

export async function updateClientRefCode(
  clientId: string,
  rawRefCode: string,
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const custom = rawRefCode?.trim();
  if (!custom) return { ok: false, error: "Client ID cannot be empty." };
  if (custom.length > 32)
    return { ok: false, error: "Client ID must be 32 characters or fewer." };
  if (!REF_CODE_PATTERN.test(custom))
    return {
      ok: false,
      error:
        "Client ID may only contain letters, numbers, spaces, dashes, and underscores.",
    };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("ref_code", custom)
    .maybeSingle();
  if (existing && existing.id !== clientId)
    return { ok: false, error: `Client ID "${custom}" is already in use.` };

  const { error } = await supabase
    .from("clients")
    .update({ ref_code: custom })
    .eq("id", clientId);
  if (error)
    return {
      ok: false,
      error: error.code === "23505" ? "That Client ID is already in use." : error.message,
    };

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/pipeline");
  revalidatePath("/documents");
  return { ok: true };
}

export async function updateClient(
  clientId: string,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const referralSource = (formData.get("referral_source") as ReferralSource) || "other";
  const abaStatus = (formData.get("aba_status") as AbaStatus) || "unknown";
  const maStatus = (formData.get("ma_status") as MaStatus) || "unknown";
  const status = (formData.get("status") as ClientStatus) || "onboarding";
  const serviceStartOn = (formData.get("service_start_on") as string) || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      referral_source: referralSource,
      aba_status: abaStatus,
      ma_status: maStatus,
      status,
      service_start_on: serviceStartOn,
    })
    .eq("id", clientId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/pipeline");
  revalidatePath("/documents");
  return { ok: true };
}

export async function deleteClient(clientId: string): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/clients");
  revalidatePath("/pipeline");
  revalidatePath("/documents");
  return { ok: true };
}

export async function advanceStage(clientId: string): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();

  const [{ data: client }, { data: stages }, { data: settings }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).single(),
    supabase.from("pipeline_stages").select("*").order("sort_order"),
    supabase.from("organization_settings").select("document_gate_enabled").single(),
  ]);

  if (!client) return { ok: false, error: "Client not found." };

  const stageList = (stages ?? []) as PipelineStage[];
  const current = stageList.find((s) => s.id === client.current_stage_id);
  if (!current) return { ok: false, error: "Current stage missing." };

  const next = stageList.find((s) => s.sort_order === current.sort_order + 1);
  if (!next) return { ok: false, error: "Already at the final stage." };

  // Document gate: block entry into Agreements until supporting docs are complete.
  if (next.key === "agreements" && settings?.document_gate_enabled) {
    const { data: docs } = await supabase
      .from("client_documents")
      .select("status")
      .eq("client_id", clientId);
    const list = (docs ?? []) as Pick<ClientDocumentRow, "status">[];
    const complete =
      list.length > 0 && list.every((d) => COMPLETE_DOC_STATUSES.has(d.status));
    if (!complete) {
      return {
        ok: false,
        error: "Supporting documents must be complete before Agreements (document gate is on).",
      };
    }
  }

  const patch: Database["public"]["Tables"]["clients"]["Update"] = { current_stage_id: next.id };
  if (next.key === "cmde_submitted" && !client.cmde_submitted_on)
    patch.cmde_submitted_on = new Date().toISOString().slice(0, 10);
  if (next.key === "itp_creation" && !client.itp_drafting_started_on)
    patch.itp_drafting_started_on = new Date().toISOString().slice(0, 10);
  if (next.key === "active") patch.status = "active";

  const { error } = await supabase.from("clients").update(patch).eq("id", clientId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("client_stage_history").insert({
    client_id: clientId,
    stage_id: next.id,
    changed_by: admin.id,
    note: `Advanced to ${next.name}`,
  });

  revalidatePath("/pipeline");
  return { ok: true };
}

export async function setCorrections(
  clientId: string,
  value: boolean,
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ corrections_requested: value })
    .eq("id", clientId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/pipeline");
  return { ok: true };
}
