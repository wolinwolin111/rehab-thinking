import { spawnSync, execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { QUALITY_MANIFEST_SCHEMA_VERSION } from "./quality-evidence-core.mjs";
import { readQualityRunIdentity } from "./quality-run-identity.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const npmCommand = "npm";

function git(args, fallback = "unknown") {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || fallback;
  } catch {
    return fallback;
  }
}

const generated = spawnSync(npmCommand, ["run", "prebuild"], { cwd: root, encoding: "utf8", shell: process.platform === "win32" });
if (generated.status !== 0) {
  process.stderr.write(generated.stderr || generated.stdout || "release identity generation failed\n");
  process.exit(1);
}

const identity = await readQualityRunIdentity(root);
const runId = process.env.QUALITY_RUN_ID?.trim() || `a7-${identity.buildId}-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}`;
const runDir = path.join(root, "artifacts", "quality", runId);
const logsDir = path.join(runDir, "logs");
await mkdir(logsDir, { recursive: true });

const manifest = {
  schemaVersion: QUALITY_MANIFEST_SCHEMA_VERSION,
  runId,
  startedAt: new Date().toISOString(),
  completedAt: null,
  target: { kind: "local", url: null },
  identity: {
    commitSha: identity.commitSha,
    buildId: identity.buildId,
    appVersion: identity.appVersion,
    knowledgeVersion: identity.knowledgeVersion,
    decisionVersion: identity.decisionVersion,
    ruleVersion: identity.ruleVersion,
    snapshotSchemaVersion: identity.snapshotSchemaVersion,
  },
  worktree: { dirty: git(["status", "--porcelain"], "") !== "" },
  gates: [],
  status: "running",
};

const manifestPath = path.join(runDir, "manifest.json");
const pointerPath = path.join(root, "artifacts", "quality", "current-run.json");
async function persist() {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(pointerPath, `${JSON.stringify({ runId, manifestPath: path.relative(root, manifestPath).replaceAll("\\", "/"), identity: manifest.identity }, null, 2)}\n`, "utf8");
}
await persist();

const gates = [
  { id: "fast", layer: "L0-L4", command: ["run", "test:fast"] },
  { id: "workflow", layer: "L2-L3", command: ["run", "test:workflow"] },
  { id: "mutations", layer: "L2-L3", command: ["run", "test:logic:mutations"] },
  { id: "component", layer: "L4", command: ["run", "test:component"] },
  { id: "integration", layer: "L5", command: ["run", "test:integration"] },
  { id: "vertical", layer: "L5", command: ["run", "test:vertical"] },
  { id: "security", layer: "L5", command: ["run", "test:security"] },
  { id: "sqlite-health", layer: "L5", command: ["run", "test:sqlite:health"] },
  { id: "migration-compatibility", layer: "release", command: ["run", "test:migrations:compat"] },
  { id: "dependencies", layer: "release", command: ["run", "test:dependencies"] },
  { id: "performance", layer: "release", command: ["run", "test:performance"] },
  { id: "lint", layer: "release", command: ["run", "lint"] },
];
if (process.argv.includes("--include-browser")) {
  gates.push({ id: "browser-minimal", layer: "L6", command: ["run", "test:browser:release"] });
}

for (const gate of gates) {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const result = spawnSync(npmCommand, gate.command, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env,
      QUALITY_RUN_ID: runId,
      QUALITY_BUILD_ID: identity.buildId,
      QUALITY_COMMIT: identity.commitSha,
      QUALITY_ARTIFACTS_DIR: path.join(runDir, "browser"),
    },
  });
  const logPath = path.join(logsDir, `${gate.id}.log`);
  await writeFile(logPath, `${result.stdout ?? ""}${result.stderr ?? ""}`, "utf8");
  const status = result.status === 0 ? "passed" : "failed";
  manifest.gates.push({
    id: gate.id,
    layer: gate.layer,
    status,
    exitCode: result.status ?? 1,
    command: `npm ${gate.command.join(" ")}`,
    startedAt,
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - startedMs,
    logPath: path.relative(root, logPath).replaceAll("\\", "/"),
  });
  console.log(`${status === "passed" ? "PASS" : "FAIL"} ${gate.layer} ${gate.id} (${Date.now() - startedMs} ms)`);
  await persist();
  if (status === "failed") {
    const tail = `${result.stdout ?? ""}${result.stderr ?? ""}`.split(/\r?\n/).slice(-30).join("\n");
    console.error(tail);
    break;
  }
}

manifest.completedAt = new Date().toISOString();
manifest.status = manifest.gates.length === gates.length && manifest.gates.every((gate) => gate.status === "passed") ? "passed" : "failed";
await persist();
console.log(`quality manifest: ${path.relative(root, manifestPath)}`);
process.exitCode = manifest.status === "passed" ? 0 : 1;
