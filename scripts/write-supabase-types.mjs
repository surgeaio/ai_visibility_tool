import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "lib", "supabase", "database.types.ts");

const result = spawnSync(
  "npx",
  ["supabase", "gen", "types", "typescript", "--local", "--schema", "public"],
  {
    cwd: root,
    encoding: "utf-8",
    shell: true,
    maxBuffer: 50 * 1024 * 1024,
  },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || "supabase gen types failed");
  process.exit(result.status ?? 1);
}

writeFileSync(outPath, result.stdout, "utf-8");
console.log("Wrote", outPath);
