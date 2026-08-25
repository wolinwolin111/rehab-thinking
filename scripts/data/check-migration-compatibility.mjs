import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { inspectAdditiveMigration } from "./migration-compatibility-core.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const drizzleDir = path.join(root, "drizzle");
const files = (await readdir(drizzleDir)).filter((name) => name.endsWith(".sql")).sort();
const issues = [];
for (const file of files.filter((name) => !name.startsWith("0000_"))) {
  issues.push(...inspectAdditiveMigration(file, await readFile(path.join(drizzleDir, file), "utf8")));
}
console.log(JSON.stringify({ migrations: files.length, incremental: Math.max(0, files.length - 1), issues }));
if (issues.length) process.exitCode = 1;
