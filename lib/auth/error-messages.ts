import type { AuthError } from "@supabase/supabase-js";

export function getAuthErrorMessage(error: AuthError | null | undefined): string {
  if (!error) return "";
  const msg = error.message ?? "";
  switch (msg) {
    case "Invalid login credentials":
      return "Email or password is incorrect.";
    case "Email not confirmed":
      return "Please check your email to confirm your account.";
    case "User already registered":
      return "An account with this email already exists. Try signing in.";
    default:
      if (msg.includes("provider is not enabled")) {
        return "This sign-in method is not enabled yet. Use email and password, or see GOOGLE_OAUTH_SETUP.md.";
      }
      return msg || "Something went wrong. Please try again.";
  }
}
