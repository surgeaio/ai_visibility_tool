import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <MarketingNavbar />
      {children}
      <MarketingFooter />
    </div>
  );
}
