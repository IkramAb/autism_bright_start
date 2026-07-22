import { getCaseNotesData } from "@/lib/case-notes";
import { CaseNotesView } from "@/components/case-notes/case-notes-view";

export const dynamic = "force-dynamic";

export default async function CaseNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const data = await getCaseNotesData(params.week);

  if (!data) {
    return (
      <div className="page-stack">
        <div className="full-card">
          <p className="page-meta">No compliance weeks found. Run database seed to load the Jun 15–19, 2026 week.</p>
        </div>
      </div>
    );
  }

  return <CaseNotesView data={data} />;
}
