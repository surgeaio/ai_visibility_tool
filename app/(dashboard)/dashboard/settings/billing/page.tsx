"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Billing</h2>
        <p className="text-sm text-neutral-500">Plans and invoices will appear here (coming soon).</p>
      </div>
      <Card className="border-[#262626] bg-[#111]">
        <CardHeader>
          <CardTitle className="text-base text-white">Pro trial</CardTitle>
          <CardDescription>Upgrade when you are ready to connect production data.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/pricing" className="text-sm text-sky-400 hover:underline">
            View pricing →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
