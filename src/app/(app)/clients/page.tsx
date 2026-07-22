import { getClientListData } from "@/lib/clients";
import { ClientsListView } from "@/components/clients/clients-list-view";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const data = await getClientListData();
  return <ClientsListView data={data} />;
}
