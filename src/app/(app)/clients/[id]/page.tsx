import { notFound } from "next/navigation";
import { getClientDetail } from "@/lib/clients";
import { ClientDetailView } from "@/components/clients/client-detail-view";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClientDetail(id);
  if (!client) notFound();
  return <ClientDetailView client={client} />;
}
