import { getCaseNotesData } from "@/lib/case-notes";
import { CaseNotesView } from "@/components/case-notes/case-notes-view";
import { NoWeeksView } from "@/components/case-notes/no-weeks-view";

export const dynamic = "force-dynamic";

export default async function CaseNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const data = await getCaseNotesData(params.week);

  if (!data) return <NoWeeksView />;

  return <CaseNotesView data={data} />;
}
