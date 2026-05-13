"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function TestKeyButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);

  async function runTest() {
    setLoading(true);
    try {
      const res = await fetch(`/api/api-keys/${encodeURIComponent(id)}/test`, { method: "POST" });
      const json: unknown = await res.json();
      const ok = typeof json === "object" && json && "ok" in json ? Boolean((json as { ok: boolean }).ok) : false;
      const message =
        typeof json === "object" && json && "message" in json ? String((json as { message?: string }).message) : "";
      if (ok) {
        toast.success(message || "Key works");
      } else {
        toast.error(message || "Test failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => void runTest()} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
    </Button>
  );
}
