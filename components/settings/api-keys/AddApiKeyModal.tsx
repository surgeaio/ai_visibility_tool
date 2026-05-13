"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApiKeyProvider } from "@/lib/validators/api-keys.schema";
import { toast } from "sonner";

const PROVIDERS: { value: ApiKeyProvider; label: string; help: string }[] = [
  { value: "openai", label: "ChatGPT (OpenAI)", help: "https://platform.openai.com/api-keys" },
  { value: "anthropic", label: "Claude (Anthropic)", help: "https://console.anthropic.com/" },
  { value: "gemini", label: "Gemini (Google AI)", help: "https://aistudio.google.com/apikey" },
  { value: "perplexity", label: "Perplexity", help: "https://docs.perplexity.ai/guides/getting-started" },
  { value: "google_search_console", label: "Google Search Console", help: "OAuth flow coming soon" },
  { value: "google_analytics", label: "Google Analytics", help: "OAuth flow coming soon" },
];

export function AddApiKeyModal({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [provider, setProvider] = useState<ApiKeyProvider>("openai");
  const [keyName, setKeyName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [show, setShow] = useState(false);
  const [testBeforeSave, setTestBeforeSave] = useState(true);
  const [saving, setSaving] = useState(false);

  const help = PROVIDERS.find((p) => p.value === provider)?.help ?? "";

  async function save() {
    if (!keyName.trim() || !apiKey.trim()) {
      toast.error("Name and API key are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, keyName: keyName.trim(), apiKey, testBeforeSave }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        const err = typeof json === "object" && json && "error" in json ? String((json as { error: string }).error) : "Save failed";
        toast.error(err);
        return;
      }
      toast.success("API key saved");
      setKeyName("");
      setApiKey("");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-[#262626] bg-[#111]">
        <DialogHeader>
          <DialogTitle>Add API key</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as ApiKeyProvider)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-neutral-500">
              Where to find this key:{" "}
              <a href={help} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
                docs
              </a>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kn">Key name</Label>
            <Input id="kn" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="e.g. Production OpenAI" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="kv">Secret</Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShow((s) => !s)}>
                {show ? "Hide" : "Show"}
              </Button>
            </div>
            <Input
              id="kv"
              type={show ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="tbs" checked={testBeforeSave} onCheckedChange={(v) => setTestBeforeSave(Boolean(v))} />
            <Label htmlFor="tbs" className="text-sm font-normal text-neutral-300">
              Test before saving
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
