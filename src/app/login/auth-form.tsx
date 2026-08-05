"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createAdminProfile } from "./actions";
import { mapAuthError } from "./auth-errors";
import { PasswordField } from "./password-field";

const inputClass =
  "rounded-[9px] border border-line bg-app px-3 py-2 text-sm text-ink outline-none focus:border-blue";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setError(null);
    setMessage(null);
  }

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const form = e.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();
    const password = String(new FormData(form).get("password") ?? "");

    if (!email || !password) {
      setError("Enter your email and password.");
      setPending(false);
      return;
    }

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user) {
      setError(mapAuthError(authError?.message ?? "Incorrect email or password."));
      setPending(false);
      return;
    }

    const { data: admin, error: adminError } = await supabase
      .from("admin_users")
      .select("id")
      .eq("id", data.user.id)
      .eq("status", "active")
      .maybeSingle();

    if (adminError || !admin) {
      await supabase.auth.signOut();
      setError("This account does not have admin access.");
      setPending(false);
      return;
    }

    router.refresh();
    router.push("/dashboard");
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const fullName = String(fd.get("full_name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm_password") ?? "");

    if (!fullName || !email || !password) {
      setError("Fill in all fields.");
      setPending(false);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setPending(false);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      setPending(false);
      return;
    }

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError || !data.user) {
      setError(mapAuthError(authError?.message ?? "Could not create account."));
      setPending(false);
      return;
    }

    const profile = await createAdminProfile(fullName, data.user.id);
    if (!profile.ok) {
      if (data.session) await supabase.auth.signOut();
      setError(profile.error ?? "Could not create admin profile.");
      setPending(false);
      return;
    }

    if (data.session) {
      router.refresh();
      router.push("/dashboard");
      return;
    }

    setMessage(
      "Account created. Check your email to confirm your address, then sign in.",
    );
    setPending(false);
    setMode("signin");
  }

  return (
    <div className="mt-7">
      <div
        className="flex overflow-hidden rounded-[8px] border border-line bg-app"
        role="tablist"
        aria-label="Authentication mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signin"}
          onClick={() => switchMode("signin")}
          className="flex flex-1 items-center justify-center gap-1 border-none py-2 text-[11px] font-medium"
          style={{
            fontFamily: "var(--font-sans)",
            cursor: "pointer",
            background: mode === "signin" ? "var(--color-blue)" : "transparent",
            color: mode === "signin" ? "#fff" : "var(--color-ink2)",
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          onClick={() => switchMode("signup")}
          className="flex flex-1 items-center justify-center gap-1 border-none py-2 text-[11px] font-medium"
          style={{
            fontFamily: "var(--font-sans)",
            cursor: "pointer",
            background: mode === "signup" ? "var(--color-blue)" : "transparent",
            color: mode === "signup" ? "#fff" : "var(--color-ink2)",
          }}
        >
          Sign up
        </button>
      </div>

      {mode === "signin" ? (
        <form onSubmit={handleSignIn} className="mt-5 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink2">Email</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@autismbrightstart.org"
              className={inputClass}
            />
          </label>

          <PasswordField
            name="password"
            label="Password"
            autoComplete="current-password"
            placeholder="••••••••"
          />

          <AuthFeedback error={error} message={message} />

          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary mt-1 w-full justify-center"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignUp} className="mt-5 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink2">Full name</span>
            <input
              name="full_name"
              type="text"
              autoComplete="name"
              required
              placeholder="Amal Abdi"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink2">Work email</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@autismbrightstart.org"
              className={inputClass}
            />
          </label>

          <PasswordField
            name="password"
            label="Password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            minLength={8}
          />

          <PasswordField
            name="confirm_password"
            label="Confirm password"
            autoComplete="new-password"
            placeholder="••••••••"
            minLength={8}
          />

          <AuthFeedback error={error} message={message} />

          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary mt-1 w-full justify-center"
          >
            {pending ? "Creating account…" : "Create admin account"}
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-[11px] leading-relaxed text-ink3">
        Admin access only — staff don&apos;t have accounts in this system.
        {mode === "signup" && (
          <> New accounts get full admin access to ABA Connect.</>
        )}
      </p>
    </div>
  );
}

function AuthFeedback({
  error,
  message,
}: {
  error: string | null;
  message: string | null;
}) {
  if (error) {
    return (
      <div className="alert-row alert-row-coral">
        <i className="ti ti-alert-triangle" aria-hidden="true" />
        <div className="alert-row-body">{error}</div>
      </div>
    );
  }
  if (message) {
    return (
      <div className="alert-row alert-row-teal">
        <i className="ti ti-check" aria-hidden="true" />
        <div className="alert-row-body">{message}</div>
      </div>
    );
  }
  return null;
}
