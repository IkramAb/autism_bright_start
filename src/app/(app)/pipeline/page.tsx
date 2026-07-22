import { getPipelineData } from "@/lib/pipeline";
import { PipelineView } from "@/components/pipeline/pipeline-view";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const { columns, totalInProgress, needAction } = await getPipelineData();

  return (
    <PipelineView
      columns={columns}
      totalInProgress={totalInProgress}
      needAction={needAction}
    />
  );
}
