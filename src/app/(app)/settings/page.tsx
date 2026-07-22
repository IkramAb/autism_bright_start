import { Suspense } from "react";
import { getSettingsData } from "@/lib/settings";
import { SettingsView } from "@/components/settings/settings-view";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const data = await getSettingsData();
  return (
    <Suspense fallback={null}>
      <SettingsView data={data} />
    </Suspense>
  );
}
