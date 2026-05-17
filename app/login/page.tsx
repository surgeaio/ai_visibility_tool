"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthErrorMessage } from "@/lib/auth/error-messages";
import { createClientSafe } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-neutral-400">
      Loading…
    </div>
  );
}

function LoginPageContent() {
  const supabase = createClientSafe();
  const searchParams = useSearchParams();
  const authErrorParam = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (!supabase) {
      setStatus("Configure Supabase environment variables to enable sign in.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setStatus(getAuthErrorMessage(error));
      return;
    }
    window.location.href = "/dashboard";
  }

  async function sendMagicLink() {
    setStatus(null);
    if (!supabase) {
      setStatus("Configure Supabase environment variables to enable email login.");
      return;
    }
    if (!email.trim()) {
      setStatus("Enter your email above to receive a magic link.");
      return;
    }
    setLoading(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    setLoading(false);
    setStatus(error ? getAuthErrorMessage(error) : "Check your email for the magic link.");
  }

  async function oauth(provider: "google") {
    if (!supabase) {
      setStatus("Configure Supabase environment variables to enable Google OAuth.");
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${origin}/auth/callback` },
    });
    if (error) setStatus(getAuthErrorMessage(error));
  }

  const authError = authErrorParam ? decodeURIComponent(authErrorParam) : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
      <Card className="w-full max-w-md border-[#262626] bg-[#111]">
        <CardHeader>
          <CardTitle className="text-white">Surgeaio AI Visibility Tool</CardTitle>
          <CardDescription className="text-neutral-500">
            Sign in with email and password, magic link, or Google.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={signInWithPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-xs text-neutral-600">
            <button
              type="button"
              className="underline hover:text-white disabled:opacity-50"
              disabled={loading}
              onClick={() => void sendMagicLink()}
            >
              Or sign in with a magic link
            </button>
          </p>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={loading}
            onClick={() => void oauth("google")}
          >
            Continue with Google
          </Button>

          {authError ? <p className="text-center text-sm text-red-400">{authError}</p> : null}
          {status ? <p className="text-center text-sm text-neutral-400">{status}</p> : null}

          <p className="text-center text-xs text-neutral-600">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline hover:text-white">
              Sign up
            </Link>
          </p>
          <p className="text-center text-xs text-neutral-600">
            {process.env.NODE_ENV !== "production" ? (
              <Link href="/dashboard" className="underline hover:text-white">
                Skip to dashboard (demo)
              </Link>
            ) : null}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
