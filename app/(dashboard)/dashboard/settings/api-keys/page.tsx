"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus } from "lucide-react";
import { AddApiKeyModal } from "@/components/settings/api-keys/AddApiKeyModal";
import { ApiKeyList } from "@/components/settings/api-keys/ApiKeyList";
import { Button } from "@/components/ui/button";
import type { UserApiKeyListItem } from "@/lib/repositories/user-api-keys.repo";
import { toast } from "sonner";

export default function ApiKeysSettingsPage() {
  const [keys, setKeys] = useState<UserApiKeyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/api-keys", { cache: "no-store" });
      const json = (await res.json()) as { keys?: UserApiKeyListItem[]; error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load");
      }
      setKeys(json.keys ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Remove this API key? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/api-keys/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Delete failed");
      }
      toast.success("Key removed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-white">
            <KeyRound className="h-5 w-5 text-sky-400" />
            <h2 className="text-lg font-semibold">API keys</h2>
          </div>
          <p className="text-sm text-neutral-500">
            Connect your own provider keys for live runs. Keys are encrypted before storage. We never show the full
            secret again—only a short preview.
          </p>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add key
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : (
        <ApiKeyList keys={keys} onDelete={(id) => void handleDelete(id)} />
      )}

      <AddApiKeyModal open={modalOpen} onOpenChange={setModalOpen} onSaved={() => void load()} />

      <p className="text-xs text-neutral-600">
        Set <code className="text-neutral-400">ENCRYPTION_KEY</code> to a 64-character hex string in production (
        <code className="text-neutral-400">openssl rand -hex 32</code>). Demo mode uses a built-in dev key—do not use for
        real secrets.
      </p>
    </div>
  );
}
