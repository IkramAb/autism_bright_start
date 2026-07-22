import { getTrainingTrackerData } from "@/lib/staff";
import { TrainingView } from "@/components/staff/training-view";

export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const rows = await getTrainingTrackerData();
  return <TrainingView rows={rows} />;
}
