"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientSafe } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClientSafe();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setStatus("Configure Supabase environment variables to enable email login.");
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    setStatus(error ? error.message : "Check your email for the magic link.");
  }

  async function oauth(provider: "google") {
    if (!supabase) {
      setStatus("Configure Supabase environment variables to enable Google OAuth.");
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${origin}/auth/callback` },
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
      <Card className="w-full max-w-md border-[#262626] bg-[#111]">
        <CardHeader>
          <CardTitle className="text-white">Log in to Peec AI</CardTitle>
          <CardDescription className="text-neutral-500">
            Email magic link or Google — requires Supabase Auth configuration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={magicLink} className="space-y-4">
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
            <Button type="submit" className="w-full">
              Continue with email
            </Button>
          </form>
          <Button type="button" variant="secondary" className="w-full" onClick={() => oauth("google")}>
            Continue with Google
          </Button>
          {status && <p className="text-center text-sm text-neutral-400">{status}</p>}
          <p className="text-center text-xs text-neutral-600">
            <Link href="/dashboard" className="underline hover:text-white">
              Skip to dashboard (demo)
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
