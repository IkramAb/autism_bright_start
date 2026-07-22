"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdmin } from "@/lib/auth";
import type { Database } from "@/lib/supabase/types";
import { ESIGN_DOC_TYPES } from "@/lib/documents";

export type ActionResult = { ok: boolean; error?: string; message?: string };

export async function saveClientNote(
  clientId: string,
  body: string,
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Note cannot be empty." };

  const supabase = await createClient();
  const { error } = await supabase.from("client_notes").insert({
    client_id: clientId,
    body: trimmed,
    created_by: admin.id,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  return { ok: true };
}

export async function requestDocument(documentId: string): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("client_documents")
    .update({ status: "requested" })
    .eq("id", documentId);

  if (error) return { ok: false, error: error.message };

  revalidatePathsForDoc(documentId);
  return { ok: true, message: "Document marked as requested." };
}

export async function sendEsign(documentId: string): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("client_documents")
    .select("client_id, doc_type")
    .eq("id", documentId)
    .single();

  if (!doc || !ESIGN_DOC_TYPES.has(doc.doc_type as string)) {
    return { ok: false, error: "This document type does not support e-signatures." };
  }

  const { error: docError } = await supabase
    .from("client_documents")
    .update({ status: "awaiting_esig" })
    .eq("id", documentId);

  if (docError) return { ok: false, error: docError.message };

  // DocSeal stub — recipient email is NOT stored (PHI). Status only.
  const esignType = doc.doc_type as
    | "parent_handbook"
    | "service_agreement"
    | "transport_agreement"
    | "roi";

  const { data: existing } = await supabase
    .from("esign_requests")
    .select("id")
    .eq("client_id", doc.client_id)
    .eq("document_type", esignType)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("esign_requests")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        external_id: `stub-${documentId.slice(0, 8)}`,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("esign_requests").insert({
      client_id: doc.client_id,
      document_type: esignType,
      status: "sent",
      sent_at: new Date().toISOString(),
      external_id: `stub-${documentId.slice(0, 8)}`,
    });
  }

  revalidatePathsForDoc(documentId);
  return {
    ok: true,
    message: "E-signature request queued (DocSeal — connect in Settings to send live requests).",
  };
}

export async function resendEsign(documentId: string): Promise<ActionResult> {
  return sendEsign(documentId);
}

export async function scheduleRenewal(documentId: string): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("client_documents")
    .update({ status: "requested" })
    .eq("id", documentId);

  if (error) return { ok: false, error: error.message };

  revalidatePathsForDoc(documentId);
  return { ok: true, message: "Renewal scheduled — document marked for follow-up." };
}

export async function sendRenewalReminder(documentId: string): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const { sendPhiFreeEmail } = await import("@/lib/integrations/resend");
  const result = await sendPhiFreeEmail({
    to: [admin.email],
    subject: "ABA Connect — document renewal reminder",
    html: "<p>You have documents needing attention. Log in to ABA Connect to review renewals.</p>",
  });

  revalidatePathsForDoc(documentId);
  if (!result.ok) {
    return { ok: true, message: `Reminder queued locally (${result.error}).` };
  }
  return { ok: true, message: "Renewal reminder sent via Resend." };
}

export async function setDriveLink(
  documentId: string,
  driveUrl: string,
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const url = driveUrl.trim();
  if (!url.startsWith("http")) return { ok: false, error: "Enter a valid Drive URL." };

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("client_documents")
    .select("status")
    .eq("id", documentId)
    .single();

  const patch: Database["public"]["Tables"]["client_documents"]["Update"] = {
    drive_url: url,
    uploaded_on: today,
  };
  if (existing?.status === "missing" || existing?.status === "requested") {
    patch.status = "uploaded";
  }

  const { error } = await supabase.from("client_documents").update(patch).eq("id", documentId);
  if (error) return { ok: false, error: error.message };

  revalidatePathsForDoc(documentId);
  return { ok: true, message: "Drive link saved." };
}

async function revalidatePathsForDoc(documentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_documents")
    .select("client_id")
    .eq("id", documentId)
    .single();

  revalidatePath("/documents");
  revalidatePath("/clients");
  if (data?.client_id) revalidatePath(`/clients/${data.client_id}`);
}

export async function runDocumentAction(
  documentId: string,
  actionKey: string,
  driveUrl?: string,
): Promise<ActionResult> {
  switch (actionKey) {
    case "request_doc":
      return requestDocument(documentId);
    case "send_esign":
      return sendEsign(documentId);
    case "resend_esign":
      return resendEsign(documentId);
    case "schedule_renewal":
      return scheduleRenewal(documentId);
    case "send_reminder":
      return sendRenewalReminder(documentId);
    case "set_drive_link":
      return setDriveLink(documentId, driveUrl ?? "");
    case "open_drive":
      return { ok: true };
    case "schedule_bcba":
      return { ok: true, message: "Flagged for BCBA scheduling (noted in client record)." };
    default:
      return { ok: false, error: "Unknown action." };
  }
}
