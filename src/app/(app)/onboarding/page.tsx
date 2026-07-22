import { getOnboardingListData } from "@/lib/staff";
import { OnboardingView } from "@/components/staff/onboarding-view";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const cards = await getOnboardingListData();
  return <OnboardingView cards={cards} />;
}
