/**
 * Creates or updates the demo test user in Supabase (email confirmed, fixed password).
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const DEMO_TEST_EMAIL = "demo@aivisibility.test";
export const DEMO_TEST_PASSWORD = "DemoUser2026!Visibility";

function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function findUserByEmail(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  email: string,
) {
  let page = 1;
  const perPage = 200;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function main() {
  loadEnvLocal();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    console.error(
      "[seed:test-user] Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
    process.exit(1);
  }

  const admin = createAdminSupabaseClient();
  const existing = await findUserByEmail(admin, DEMO_TEST_EMAIL);

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: DEMO_TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { name: "Demo User", role: "demo" },
    });
    if (error) {
      console.error("[seed:test-user] update failed:", error.message);
      process.exit(1);
    }
    console.log("[seed:test-user] Updated existing user (password reset, email confirmed).");
  } else {
    const { error } = await admin.auth.admin.createUser({
      email: DEMO_TEST_EMAIL,
      password: DEMO_TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { name: "Demo User", role: "demo" },
    });
    if (error) {
      console.error("[seed:test-user] create failed:", error.message);
      process.exit(1);
    }
    console.log("[seed:test-user] Created new user.");
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://ai-visibility-tool-nu.vercel.app";

  console.log("");
  console.log("✅ Test user ready:");
  console.log(`   Email:    ${DEMO_TEST_EMAIL}`);
  console.log(`   Password: ${DEMO_TEST_PASSWORD}`);
  console.log(`   Login:    ${appUrl}/login`);
  console.log("");
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
