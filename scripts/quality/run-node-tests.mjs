import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const TEST_SUFFIXES = [".test.mjs", ".integration.mjs"];

async function collect(target) {
  const absolute = resolve(target);
  const entries = await readdir(absolute, { withFileTypes: true }).catch(() => null);
  if (!entries) return TEST_SUFFIXES.some((suffix) => absolute.endsWith(suffix)) ? [absolute] : [];
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const child = resolve(absolute, entry.name);
    if (entry.isDirectory()) files.push(...await collect(child));
    else if (TEST_SUFFIXES.some((suffix) => child.endsWith(suffix))) files.push(child);
  }
  return files;
}

const dot = process.argv.includes("--dot");
const targets = process.argv.slice(2).filter((argument) => argument !== "--dot");
if (targets.length === 0) throw new Error("Provide at least one test file or directory.");

const files = [...new Set((await Promise.all(targets.map(collect))).flat())].sort();
if (files.length === 0) throw new Error(`No Node test files found in: ${targets.join(", ")}`);

console.log(`node-test-discovery: ${files.length} files`);
const result = spawnSync(process.execPath, ["--test", ...(dot ? ["--test-reporter=dot"] : []), ...files], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
