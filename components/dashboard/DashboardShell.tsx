"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  FileSearch,
  ShieldCheck,
  Heart,
  LayoutDashboard,
  Lightbulb,
  ListOrdered,
  Link as LinkIcon,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboard";
import { ClientSelector } from "@/components/layout/ClientSelector";
import { useSelectedBrand } from "@/lib/context/brand-context";
import { DEMO_RECOMMENDATIONS } from "@/lib/demo/seed-data";
import { LogoutButton } from "@/components/dashboard/LogoutButton";

const TITLE_MAP: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/prompts": "Prompt Management",
  "/dashboard/competitors": "Competitors",
  "/dashboard/sentiment": "Sentiment",
  "/dashboard/sources": "Sources",
  "/dashboard/citations": "Citations",
  "/dashboard/recommendations": "Recommendations",
  "/dashboard/jobs": "Jobs",
  "/dashboard/settings": "Profile & workspace",
  "/dashboard/brands/new": "Add client",
  "/dashboard/llm-visibility": "LLM Visibility",
  "/dashboard/google-rankings": "Google Rankings",
  "/dashboard/search-rankings": "Search Rankings",
  "/dashboard/analytics": "Analytics",
  "/dashboard/website-audit": "Website Audit",
  "/dashboard/brand-audit": "Brand Audit",
  "/dashboard/website-audit/non-indexed": "Non-indexed pages",
};

function resolvePageTitle(pathname: string): string {
  if (pathname.startsWith("/dashboard/llm-visibility/")) return "LLM prompt detail";
  if (pathname.startsWith("/dashboard/llm-visibility")) return "LLM Visibility";
  if (pathname.startsWith("/dashboard/google-rankings/")) return "Keyword detail";
  if (pathname.startsWith("/dashboard/search-rankings")) return "Search Rankings";
  if (pathname.startsWith("/dashboard/google-rankings")) return "Google Rankings";
  if (pathname.startsWith("/dashboard/competitors/")) return "Competitor detail";
  if (pathname.startsWith("/dashboard/website-audit/non-indexed")) return "Non-indexed pages";
  if (pathname.startsWith("/dashboard/website-audit")) return "Website Audit";
  return TITLE_MAP[pathname] ?? "Dashboard";
}

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: number; match?: "exact" | "prefix" };

type NavSection = { label: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Home",
    items: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard, match: "exact" }],
  },
  {
    label: "Analytics",
    items: [
      { href: "/dashboard/llm-visibility", label: "LLM Visibility", icon: Bot, match: "prefix" },
      { href: "/dashboard/google-rankings", label: "Google Rankings", icon: Search, match: "prefix" },
      { href: "/dashboard/search-rankings", label: "Search Rankings", icon: ListOrdered, match: "prefix" },
      { href: "/dashboard/competitors", label: "Competitors", icon: Users, match: "prefix" },
      { href: "/dashboard/analytics", label: "3-layer analytics", icon: BarChart3, match: "prefix" },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/dashboard/prompts", label: "Prompts", icon: MessageSquare, match: "prefix" },
      { href: "/dashboard/website-audit", label: "Website audit", icon: FileSearch, match: "prefix" },
      { href: "/dashboard/brand-audit", label: "Brand Audit", icon: ShieldCheck, match: "prefix" },
      {
        href: "/dashboard/recommendations",
        label: "Recommendations",
        icon: Lightbulb,
        match: "prefix",
        badge: DEMO_RECOMMENDATIONS.filter((r) => r.status === "pending").length,
      },
      { href: "/dashboard/jobs", label: "Jobs", icon: Activity, match: "prefix" },
    ],
  },
  {
    label: "More",
    items: [
      { href: "/dashboard/sentiment", label: "Sentiment", icon: Heart, match: "prefix" },
      { href: "/dashboard/sources", label: "Sources", icon: LinkIcon, match: "prefix" },
      { href: "/dashboard/citations", label: "Citations", icon: BookOpen, match: "prefix" },
    ],
  },
  {
    label: "Settings",
    items: [{ href: "/dashboard/settings", label: "Profile", icon: Settings, match: "exact" }],
  },
];

function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { selectedBrandId, setSelectedBrandId } = useSelectedBrand();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#262626] p-4">
        <p className="mb-2 text-xxs font-medium uppercase tracking-wide text-neutral-500">Client</p>
        <ClientSelector selectedBrandId={selectedBrandId} onSelect={setSelectedBrandId} />
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="mb-1 px-3 text-xxs font-semibold uppercase tracking-wide text-neutral-600">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isNavActive(pathname, item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200",
                      active ? "bg-[#1a1a1a] text-white" : "text-neutral-400 hover:bg-[#1a1a1a] hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge != null && (
                      <Badge variant="secondary" className="font-mono text-xxs">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-[#262626] p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-[#262626] text-xs">YO</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">You</p>
            <Badge variant="outline" className="mt-1 text-xxs">
              Pro trial
            </Badge>
          </div>
        </div>
        <LogoutButton className="mt-3 w-full justify-start text-neutral-400 hover:text-white" />
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const title = resolvePageTitle(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-black">
      <aside className="hidden w-[240px] shrink-0 border-r border-[#262626] bg-[#0a0a0a] lg:block">
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-b border-[#262626] bg-black/80 px-4 py-3 backdrop-blur-md lg:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="secondary" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] border-[#262626] p-0">
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-white lg:text-xl">{title}</h1>
          <DashboardTopBarCompact />
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function DashboardTopBarCompact() {
  const dateRange = useDashboardStore((s) => s.dateRange);
  const setDateRange = useDashboardStore((s) => s.setDateRange);
  const modelFilter = useDashboardStore((s) => s.modelFilter);
  const setModelFilter = useDashboardStore((s) => s.setModelFilter);

  return (
    <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className="font-mono text-xs">
            {dateRange === "7d" ? "Last 7d" : dateRange === "30d" ? "Last 30d" : "Last 90d"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setDateRange("7d")}>Last 7d</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDateRange("30d")}>Last 30d</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDateRange("90d")}>Last 90d</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className="text-xs capitalize">
            {modelFilter === "all" ? "All models" : modelFilter}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(["all", "chatgpt", "gemini", "claude", "perplexity"] as const).map((m) => (
            <DropdownMenuItem key={m} className="capitalize" onClick={() => setModelFilter(m)}>
              {m === "all" ? "All models" : m}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button size="sm" variant="secondary">
        Export
      </Button>
    </div>
  );
}
