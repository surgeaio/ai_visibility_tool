import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const API_ROOT = join(process.cwd(), "app", "api");
const MARKER = "export const dynamic = ";
const LINE = 'export const dynamic = "force-dynamic";\n\n';

function walk(dir, files = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p, files);
    else if (name.name === "route.ts") files.push(p);
  }
  return files;
}

let updated = 0;
for (const file of walk(API_ROOT)) {
  const content = readFileSync(file, "utf8");
  if (content.includes(MARKER)) continue;
  writeFileSync(file, LINE + content, "utf8");
  updated++;
  console.log("updated:", file.replace(process.cwd() + "\\", "").replace(process.cwd() + "/", ""));
}
console.log(`Done. ${updated} route(s) updated.`);
