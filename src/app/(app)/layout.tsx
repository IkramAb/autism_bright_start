import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { getTopbarAlerts } from "@/lib/topbar";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const [{ logoUrl, logoHeight }, alerts] = await Promise.all([
    getBranding(),
    getTopbarAlerts(),
  ]);

  return (
    <div className="app-shell">
      <Sidebar
        adminName={admin.fullName}
        adminRole={admin.roleLabel}
        adminInitials={admin.initials}
        logoUrl={logoUrl}
        logoHeight={logoHeight}
      />
      <div className="main">
        <Topbar adminName={admin.fullName} alerts={alerts} />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
