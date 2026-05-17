import { readdir } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

const MIGRATION_SUMMARIES: Record<string, string> = {
  "20260112000000_initial_schema.sql": "Core schema: orgs, brands, prompts, AI results, RLS",
  "20260213000001_user_api_keys.sql": "Encrypted user API keys table + RLS",
  "20260213000002_crm_tracking_tables.sql": "LLM performance, Google rankings, audits, citations tracking",
  "20260214000000_phase_2_real_data.sql": "GSC connections + crawl_jobs tables",
  "20260215000000_final_real_data.sql": "Recommendation detail columns",
  "20260216000000_google_rankings_serp_features.sql": "google_rankings.serp_features JSONB",
  "20260515000000_brand_audit_tables.sql": "Brand audit scrapes, LLM results, reports",
};

type PublicTable = keyof Database["public"]["Tables"];

async function listLocalMigrations(): Promise<string[]> {
  const files = await readdir(MIGRATIONS_DIR);
  return files.filter((f) => f.endsWith(".sql")).sort();
}

async function tableOk(
  admin: ReturnType<typeof createClient<Database>>,
  table: PublicTable,
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await admin.from(table).select("id").limit(1);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const local = await listLocalMigrations();
  console.log("\nLocal migration files:\n");
  for (const file of local) {
    const summary = MIGRATION_SUMMARIES[file] ?? "(see SQL file)";
    console.log(`  ${file}`);
    console.log(`    ${summary}`);
  }

  const admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("\nApplied migrations:");
  console.log("  Run `npx supabase db push` or see MIGRATIONS_GUIDE.md to compare remote history.");

  console.log("\nCore table probe (public):");
  const expected: PublicTable[] = [
    "brands",
    "prompts",
    "competitors",
    "google_rankings",
    "gsc_connections",
    "user_api_keys",
  ];

  for (const table of expected) {
    const result = await tableOk(admin, table);
    console.log(`  ${table}: ${result.ok ? "ok" : `MISSING — ${result.message}`}`);
  }

  const brandAudit = await admin
    .from("brand_audit_reports" as PublicTable)
    .select("id")
    .limit(1);
  console.log(
    `  brand_audit_reports: ${brandAudit.error ? `MISSING — ${brandAudit.error.message}` : "ok"}`,
  );

  console.log("");
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
