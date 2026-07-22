import { getDocumentTrackerData } from "@/lib/clients";
import { DocumentTrackerView } from "@/components/documents/document-tracker-view";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const data = await getDocumentTrackerData();
  return <DocumentTrackerView data={data} />;
}
