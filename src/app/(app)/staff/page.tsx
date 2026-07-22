import { getStaffDirectoryData } from "@/lib/staff";
import { StaffDirectoryView } from "@/components/staff/staff-directory-view";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const rows = await getStaffDirectoryData();
  return <StaffDirectoryView rows={rows} />;
}
