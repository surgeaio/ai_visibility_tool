import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BrandProvider } from "@/lib/context/brand-context";
import { isAuthBypassMode } from "@/lib/config";
import { DEMO_BRAND_ID } from "@/lib/demo/seed-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let defaultBrandId = "";

  if (isAuthBypassMode()) {
    defaultBrandId = DEMO_BRAND_ID;
  } else {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: brands } = await supabase
          .from("brands")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1);
        defaultBrandId = brands?.[0]?.id ?? "";
      }
    } catch {
      defaultBrandId = "";
    }
  }

  return (
    <BrandProvider defaultBrandId={defaultBrandId}>
      <DashboardShell>
        {children}
      </DashboardShell>
    </BrandProvider>
  );
}
