"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { ok: boolean; error?: string; message?: string };

function initialsFromName(fullName: string): string {
  return fullName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function signupAllowed(): boolean {
  const flag = process.env.ALLOW_ADMIN_SIGNUP;
  if (flag === "false") return false;
  if (flag === "true") return true;
  return process.env.NODE_ENV !== "production";
}

function emailAllowedForSignup(email: string): string | null {
  const domain = process.env.ADMIN_SIGNUP_EMAIL_DOMAIN?.trim();
  if (!domain) return null;
  if (!email.toLowerCase().endsWith(`@${domain.toLowerCase()}`)) {
    return `Use your @${domain} email address.`;
  }
  return null;
}

/** Creates the admin_users row after client-side Supabase signUp. */
export async function createAdminProfile(
  fullName: string,
  authUserId?: string,
): Promise<ActionResult> {
  if (!signupAllowed()) {
    return {
      ok: false,
      error:
        "New admin signup is disabled. Ask an existing admin to invite you from Settings.",
    };
  }

  const trimmed = fullName.trim();
  if (!trimmed) return { ok: false, error: "Enter your full name." };

  const supabase = await createClient();
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();

  let userId = sessionUser?.id;
  let email = sessionUser?.email?.toLowerCase();

  // When email confirmation is on, signUp may not set a session cookie yet.
  if (!userId && authUserId) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.getUserById(authUserId);
      if (error || !data.user?.email) {
        return { ok: false, error: "Sign up did not complete. Try again." };
      }
      userId = data.user.id;
      email = data.user.email.toLowerCase();
    } catch {
      return {
        ok: false,
        error:
          "Signup is not fully configured. Set SUPABASE_SERVICE_ROLE_KEY on the server.",
      };
    }
  }

  if (!userId || !email) {
    return { ok: false, error: "Sign up did not complete. Try again." };
  }

  const domainError = emailAllowedForSignup(email);
  if (domainError) return { ok: false, error: domainError };

  try {
    const admin = createAdminClient();
    const { error: profileError } = await admin.from("admin_users").insert({
      id: userId,
      full_name: trimmed,
      email,
      role: "admin",
      sidebar_role_label: "Admin",
      avatar_initials: initialsFromName(trimmed),
      status: "active",
    });

    if (profileError) {
      if (profileError.code === "23505") {
        return { ok: false, error: "An admin account with this email already exists." };
      }
      return { ok: false, error: "Could not create admin profile. Try again." };
    }
  } catch {
    return {
      ok: false,
      error:
        "Signup is not fully configured. Set SUPABASE_SERVICE_ROLE_KEY on the server.",
    };
  }

  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
