"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthErrorMessage } from "@/lib/auth/error-messages";
import { createClientSafe } from "@/lib/supabase/client";

function authRedirectUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return `${fromEnv}/auth/callback`;
  if (typeof window !== "undefined") return `${window.location.origin}/auth/callback`;
  return "/auth/callback";
}

export default function SignupPage() {
  const supabase = createClientSafe();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (!supabase) {
      setStatus("Configure Supabase environment variables to enable sign up.");
      return;
    }

    if (password.length < 8) {
      setStatus("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: authRedirectUrl() },
    });
    setLoading(false);

    if (error) {
      setStatus(getAuthErrorMessage(error));
      return;
    }

    if (data.session) {
      window.location.href = "/dashboard";
      return;
    }

    setPendingEmail(true);
    setStatus("Check your email to confirm your account, then sign in.");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
      <Card className="w-full max-w-md border-[#262626] bg-[#111]">
        <CardHeader>
          <CardTitle className="text-white">Surgeaio AI Visibility Tool</CardTitle>
          <CardDescription className="text-neutral-500">
            Create an account with email and password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {pendingEmail ? (
            <SignupPendingEmail status={status} />
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </Button>
              {status ? <p className="text-center text-sm text-neutral-400">{status}</p> : null}
              <p className="text-center text-xs text-neutral-600">
                Already have an account?{" "}
                <Link href="/login" className="underline hover:text-white">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SignupPendingEmail({ status }: { status: string | null }) {
  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-neutral-400">{status}</p>
      <Button asChild variant="secondary" className="w-full">
        <Link href="/login">Back to sign in</Link>
      </Button>
    </div>
  );
}
