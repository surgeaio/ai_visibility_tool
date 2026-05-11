"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function MarketingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-200",
        scrolled ? "border-b border-[#262626] bg-black/70 backdrop-blur-md" : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 lg:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#262626] bg-[#111] text-sm font-semibold text-white">
            P
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">peec</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/pricing" className="text-sm text-neutral-300 transition-colors duration-200 hover:text-white">
            Pricing
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-sm text-neutral-300 transition-colors duration-200 hover:text-white">
              Resources <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-[180px]">
              <DropdownMenuItem asChild>
                <Link href="#">Blog</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="#">Docs</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="#">Changelog</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="#" className="text-sm text-neutral-300 transition-colors duration-200 hover:text-white">
            Partnerships
          </Link>
          <Link href="#" className="text-sm text-neutral-300 transition-colors duration-200 hover:text-white">
            MCP
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" asChild className="text-neutral-300">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Start Free Trial</Link>
          </Button>
        </div>

        <button
          type="button"
          className="rounded-lg border border-[#262626] p-2 text-white md:hidden"
          aria-label="Menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-[#262626] bg-black px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <Link href="/pricing" className="text-sm text-neutral-200" onClick={() => setOpen(false)}>
              Pricing
            </Link>
            <Link href="#" className="text-sm text-neutral-200">
              Resources
            </Link>
            <Link href="#" className="text-sm text-neutral-200">
              Partnerships
            </Link>
            <Link href="#" className="text-sm text-neutral-200">
              MCP
            </Link>
            <SeparatorMobile />
            <Button variant="ghost" asChild className="justify-start">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

function SeparatorMobile() {
  return <div className="my-1 h-px bg-[#262626]" />;
}
