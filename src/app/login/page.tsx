import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { AuthForm } from "./auth-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-app p-6">
      <div className="card w-full max-w-sm p-8">
        <div className="flex flex-col items-center text-center">
          <div className="logo-icon mb-4">
            <i className="ti ti-puzzle" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-semibold text-ink">ABA Connect</h1>
          <p className="mt-1 text-xs text-ink3">
            Admin portal · Autism Bright Start
          </p>
        </div>
        <AuthForm />
      </div>
    </main>
  );
}
