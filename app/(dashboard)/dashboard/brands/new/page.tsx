"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AddClientPage() {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!name || !domain) {
      toast.error("Client name and domain are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          domain,
          website: website.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string; data?: { id: string }; brand?: { id: string } };
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      const id = json.data?.id ?? json.brand?.id;
      if (id) localStorage.setItem("selectedBrandId", id);
      toast.success(`Client "${name}" added successfully!`);
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold text-white">Add New Client</h1>
      <Card className="border-[#262626] bg-[#111]">
        <CardHeader>
          <CardTitle className="text-white">Client Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Client / Brand Name</Label>
            <Input
              id="name"
              placeholder="e.g. Easyderma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              placeholder="e.g. easyderma.in"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="website">Full Website URL</Label>
            <Input
              id="website"
              placeholder="e.g. https://easyderma.in"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => void handleSubmit()} disabled={loading} className="flex-1">
              {loading ? "Adding..." : "Add Client"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
