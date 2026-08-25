import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const errors = [];

async function exists(target) {
  return access(path.join(root, target)).then(() => true, () => false);
}

const appFiles = [];
async function collect(directory, result) {
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const child = path.join(directory, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) await collect(child, result);
    else result.push(child);
  }
}
await collect("app", appFiles);
for (const file of appFiles) {
  const name = path.basename(file);
  const allowed = ["page.tsx", "layout.tsx", "route.ts", "globals.css", "README.md", "_shared.ts"].includes(name);
  if (!allowed) errors.push(`non-route app file: ${file}`);
}

const docsRoot = (await readdir(path.join(root, "docs"), { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
const expectedDocs = ["README.md", "knee-ankle-pilot-knowledge.md", "pilot-scenario-coverage.md", "rehab-decision-framework.md", "rehabmind-complete-product-design.md"].sort();
if (JSON.stringify(docsRoot) !== JSON.stringify(expectedDocs)) errors.push(`unexpected docs root files: ${docsRoot.join(", ")}`);

const testsRoot = (await readdir(path.join(root, "tests"), { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name);
if (testsRoot.some((name) => name !== "README.md")) errors.push(`unexpected tests root files: ${testsRoot.join(", ")}`);

const rootEntries = await readdir(root, { withFileTypes: true });
const rootTemporaryEntries = rootEntries
  .map((entry) => entry.name)
  .filter((name) => name.startsWith(".tmp-") && name !== ".tmp-deploy-secrets.txt");
if (rootTemporaryEntries.length) errors.push(`root temporary outputs remain: ${rootTemporaryEntries.join(", ")}`);

const oldPaths = [
  "app/rehabmind-complete-demo.tsx",
  "app/pilot-case-service.ts",
  "app/consent-core.ts",
  "db/schema.ts",
  "db/pilot-case-repository.ts",
  "db/sqlite-pilot-case-repository.ts",
  "tests/integration/d1",
  "scripts/check-architecture-boundaries.mjs",
  "scripts/verify-logic-mutations.mjs",
  "wrangler.jsonc",
  "wrangler.local.jsonc",
  "worker/index.ts",
  "types/cloudflare-workers.d.ts",
  "db/index.ts",
  "db/repository/pilot-case-repository.ts",
  ".openai/hosting.json",
  "build/sites-vite-plugin.ts",
];
for (const oldPath of oldPaths) if (await exists(oldPath)) errors.push(`legacy path remains: ${oldPath}`);

const workbenchPath = "src/features/rehabmind/components/workbench/rehabmind-workbench.tsx";
const workbench = await readFile(path.join(root, workbenchPath), "utf8");
const workbenchLines = workbench.split(/\r?\n/).length;
if (workbenchLines > 7500) errors.push(`workbench exceeds interim structural ceiling: ${workbenchLines}`);
const stageFiles = [
  "symptom-stage.tsx",
  "confirmation-stage.tsx",
  "assessment-stage.tsx",
  "treatment-retest-stage.tsx",
  "training-stage.tsx",
  "summary-stage.tsx",
];
for (const stageFile of stageFiles) {
  const source = await readFile(path.join(root, "src/features/rehabmind/components/stages", stageFile), "utf8");
  if (/ReactNode|return\s+children|\{\s*children\s*\}/.test(source)) {
    errors.push(`stage is still a pass-through wrapper: ${stageFile}`);
  }
}

if (errors.length) {
  console.error(`repository structure errors (${errors.length}):\n${errors.join("\n")}`);
  process.exit(1);
}
console.log(`repository structure: ok (app=${appFiles.length}, workbenchLines=${workbenchLines})`);
