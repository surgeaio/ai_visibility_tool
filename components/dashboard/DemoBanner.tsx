import { isDemoMode } from "@/lib/config";

export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
      <strong className="text-yellow-100">Demo mode:</strong> running with seeded data. Add{" "}
      <code className="rounded bg-black/30 px-1 font-mono text-xs">OPENAI_API_KEY</code> /{" "}
      <code className="rounded bg-black/30 px-1 font-mono text-xs">ANTHROPIC_API_KEY</code> and Supabase env vars to
      enable live analysis and persistence.
    </div>
  );
}
