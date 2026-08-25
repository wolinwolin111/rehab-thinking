import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync, spawn } from "node:child_process";
import path from "node:path";

const [label, ...playwrightArgs] = process.argv.slice(2);
if (!label || label.startsWith("-")) {
  console.error("Usage: node scripts/quality/run-browser-tests.mjs <label> <playwright args...>");
  process.exit(2);
}

const artifactsDir = process.env.QUALITY_ARTIFACTS_DIR ?? path.join("artifacts", "quality", "playwright", label);
await mkdir(artifactsDir, { recursive: true });

function currentCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const commit = process.env.QUALITY_COMMIT?.trim() || currentCommit();
const buildId = process.env.QUALITY_BUILD_ID?.trim() || `local-${process.env.npm_package_version ?? "unknown"}`;
const runId = process.env.QUALITY_RUN_ID?.trim() || `${label}-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${process.pid}`;
const startedAt = new Date().toISOString();
const manifestPath = path.join(artifactsDir, "manifest.json");
const pointerPath = path.join("artifacts", "quality", "playwright", "current-run.json");
await mkdir(path.dirname(pointerPath), { recursive: true });
await writeFile(manifestPath, `${JSON.stringify({ runId, commit, buildId, label, startedAt, targetUrl: process.env.WALKTHROUGH_URL ?? "http://localhost:3000/" }, null, 2)}\n`, "utf8");
await writeFile(pointerPath, `${JSON.stringify({ runId, commit, buildId }, null, 2)}\n`, "utf8");
console.log(`quality run: ${runId} (${commit.slice(0, 12)}, ${buildId})`);

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(command, ["playwright", "test", ...playwrightArgs], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, QUALITY_ARTIFACTS_DIR: artifactsDir, QUALITY_RUN_ID: runId, QUALITY_COMMIT: commit, QUALITY_BUILD_ID: buildId },
});

const outcome = await new Promise((resolve) => {
  child.on("error", (error) => {
    console.error(error);
    resolve({ code: 1, signal: null });
  });
  child.on("exit", (code, signal) => resolve({ code, signal }));
});
const exitCode = outcome.code ?? (outcome.signal ? 1 : 0);
await writeFile(manifestPath, `${JSON.stringify({ runId, commit, buildId, label, startedAt, completedAt: new Date().toISOString(), exitCode, targetUrl: process.env.WALKTHROUGH_URL ?? "http://localhost:3000/" }, null, 2)}\n`, "utf8");
process.exitCode = exitCode;
