"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/store/dashboard";

interface Client {
  id: string;
  name: string;
  domain: string;
  website?: string;
}

interface ClientSelectorProps {
  selectedBrandId: string;
  onSelect: (brandId: string) => void;
}

export function ClientSelector({ selectedBrandId, onSelect }: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const setBrandName = useDashboardStore((s) => s.setBrandName);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/brands?limit=50&offset=0", { cache: "no-store" });
      const json = (await res.json()) as { data?: Client[]; brands?: Client[] };
      const raw = json.data ?? json.brands ?? [];
      const list: Client[] = raw.map((b) => {
        let host = b.domain ?? "";
        if (!host && b.website) {
          try {
            host = new URL(b.website).hostname;
          } catch {
            host = "";
          }
        }
        return {
          id: b.id,
          name: b.name,
          domain: host,
          website: b.website,
        };
      });
      setClients(list);
      const current = list.find((c) => c.id === selectedBrandId) ?? list[0] ?? null;
      setSelected(current);
      if (current) setBrandName(current.name);
    } catch {
      setClients([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, [selectedBrandId, setBrandName]);

  useEffect(() => {
    if (!loading && clients.length > 0 && !clients.some((c) => c.id === selectedBrandId)) {
      const first = clients[0];
      onSelect(first.id);
      setBrandName(first.name);
      localStorage.setItem("selectedBrandId", first.id);
    }
  }, [loading, clients, selectedBrandId, onSelect, setBrandName]);

  useEffect(() => {
    void fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    if (clients.length === 0) return;
    const current = clients.find((c) => c.id === selectedBrandId) ?? null;
    setSelected(current);
    if (current) setBrandName(current.name);
  }, [selectedBrandId, clients, setBrandName]);

  const handleSelect = (client: Client) => {
    setSelected(client);
    onSelect(client.id);
    setBrandName(client.name);
    localStorage.setItem("selectedBrandId", client.id);
  };

  const handleDeleteClient = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}"?\n\nThis permanently removes the brand and ALL its prompts, responses, and metrics. This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/brands/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({ error: "Delete failed" }))) as { error?: string };
        alert(err.error ?? "Delete failed");
        return;
      }
      const remaining = clients.filter((c) => c.id !== id);
      setClients(remaining);
      if (selectedBrandId === id) {
        const next = remaining[0] ?? null;
        if (next) {
          handleSelect(next);
        } else {
          onSelect("");
          setBrandName("");
          localStorage.removeItem("selectedBrandId");
        }
      }
    } catch {
      alert("Network error — could not delete client");
    }
  };

  if (loading) {
    return <div className="mb-2 h-10 animate-pulse rounded-md bg-[#1a1a1a]" />;
  }

  if (clients.length === 0) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className="mb-2 w-full justify-start gap-2"
        onClick={() => router.push("/dashboard/brands/new")}
      >
        <Plus className="h-3.5 w-3.5" />
        Add first client
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className="mb-2 h-auto w-full justify-between gap-2 border border-[#333] py-2 pl-3 pr-2 font-normal hover:bg-[#141414]"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[10px] font-semibold text-sky-300">
              {selected?.name?.slice(0, 2).toUpperCase() ?? "NA"}
            </div>
            <div className="min-w-0 text-left">
              <p className="truncate text-[13px] font-medium text-white">{selected?.name ?? "Select client"}</p>
              {selected?.domain ? (
                <p className="truncate text-[11px] text-neutral-500">{selected.domain}</p>
              ) : null}
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64 border-[#262626] bg-[#111]">
        <div className="px-2 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          Your clients
        </div>
        {clients.map((client) => (
          <DropdownMenuItem
            key={client.id}
            className="group cursor-pointer gap-2 text-neutral-200 focus:bg-[#1a1a1a] focus:text-white"
            onClick={() => handleSelect(client)}
          >
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${
                client.id === selectedBrandId ? "bg-sky-500/15 text-sky-300" : "bg-[#262626] text-neutral-400"
              }`}
            >
              {client.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px]">{client.name}</p>
              {client.domain ? <p className="truncate text-[11px] text-neutral-500">{client.domain}</p> : null}
            </div>
            {client.id === selectedBrandId ? (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            ) : null}
            <button
              onClick={(e) => void handleDeleteClient(e, client.id, client.name)}
              className="ml-1 shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-red-500/20 group-hover:opacity-100"
              title={`Delete ${client.name}`}
              aria-label={`Delete ${client.name}`}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </button>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-[#262626]" />
        <DropdownMenuItem
          className="cursor-pointer text-neutral-200 focus:bg-[#1a1a1a] focus:text-white"
          onClick={() => router.push("/dashboard/brands/new")}
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          <span className="text-[13px]">Add new client</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
