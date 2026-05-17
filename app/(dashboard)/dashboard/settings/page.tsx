"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white">Settings</h2>
        <p className="text-sm text-neutral-500">Workspace preferences and integrations (demo UI).</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard/settings/billing">Billing</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brand profile</CardTitle>
          <CardDescription>Used as the default mention target in analyses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bn">Brand name</Label>
            <Input id="bn" defaultValue="Attio" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site">Website</Label>
            <Input id="site" defaultValue="https://attio.com" />
          </div>
          <Button>Save changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
          <CardDescription>Email digest when visibility shifts beyond thresholds.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Alert email</Label>
            <Input id="email" type="email" placeholder="you@company.com" />
          </div>
          <Button variant="secondary">Subscribe</Button>
        </CardContent>
      </Card>

      <Separator />

      <p className="text-xs text-neutral-600">
        Connect Supabase + OAuth in production to persist settings per workspace.
      </p>
    </div>
  );
}
