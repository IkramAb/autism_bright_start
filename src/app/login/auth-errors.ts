export function mapAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirm your email address first — check your inbox for the Supabase confirmation link.";
  }
  if (lower.includes("user already registered")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (lower.includes("password") && lower.includes("least")) {
    return message;
  }

  return message;
}
