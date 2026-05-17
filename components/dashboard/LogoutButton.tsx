"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action="/api/auth/logout" method="post">
      <Button type="submit" variant="ghost" size="sm" className={className}>
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
    </form>
  );
}
