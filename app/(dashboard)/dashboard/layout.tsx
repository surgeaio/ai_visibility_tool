import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DemoBanner } from "@/components/dashboard/DemoBanner";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell>
      <DemoBanner />
      {children}
    </DashboardShell>
  );
}
