import { createClient } from "@/lib/supabase/server";

export type CurrentAdmin = {
  id: string;
  fullName: string;
  email: string;
  roleLabel: string;
  initials: string;
};

/**
 * Returns the signed-in admin profile, or null if the request is unauthenticated
 * or the user is not an active admin. Staff never have accounts, so any logged-in
 * user must resolve to an active row in admin_users.
 */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  let admin:
    | {
        id: string;
        full_name: string | null;
        email: string;
        sidebar_role_label: string | null;
        avatar_initials: string | null;
      }
    | null = null;

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const result = await supabase
      .from("admin_users")
      .select("id, full_name, email, sidebar_role_label, avatar_initials, status")
      .eq("id", user.id)
      .eq("status", "active")
      .maybeSingle();
    admin = result.data;
  } catch {
    // Supabase unreachable (e.g. DB not yet provisioned) — treat as logged out.
    return null;
  }

  if (!admin) return null;

  const fullName: string = admin.full_name ?? "Admin";
  const initials: string =
    admin.avatar_initials ??
    fullName
      .split(" ")
      .map((p: string) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return {
    id: admin.id,
    fullName,
    email: admin.email,
    roleLabel: admin.sidebar_role_label ?? "Admin",
    initials,
  };
}
