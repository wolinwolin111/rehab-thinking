import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const identity = {
  commitSha: "test-commit",
  buildId: "test-build",
  appVersion: "test-app",
  knowledgeVersion: "test-knowledge",
  decisionVersion: "test-decision",
  ruleVersion: "test-rules",
  snapshotSchemaVersion: 2,
};

async function createRoot() {
  const root = await mkdtemp(path.join(tmpdir(), "rehabmind-quality-"));
  await mkdir(path.join(root, "src", "infrastructure", "pilot", "release"), { recursive: true });
  await mkdir(path.join(root, "src", "infrastructure", "pilot", "api"), { recursive: true });
  await writeFile(path.join(root, "src", "infrastructure", "pilot", "release", "release.generated.ts"), `export const PILOT_RELEASE = Object.freeze(${JSON.stringify(identity)} as const);\n`, "utf8");
  await writeFile(path.join(root, "src", "infrastructure", "pilot", "api", "case-contracts.ts"), "export const PILOT_SNAPSHOT_SCHEMA_VERSION = 2;\n", "utf8");
  await writeFile(path.join(root, "registry.json"), JSON.stringify([{
    scenarioId: "P0-current-run",
    priority: "P0",
    layer: "L5",
    evidenceType: "integration",
    gateId: "integration",
    releaseRequired: true,
    script: "npm run test:integration",
  }]), "utf8");
  return root;
}

function runSummary(root) {
  const script = new URL("../../../scripts/quality/quality-summary.mjs", import.meta.url);
  return spawnSync(process.execPath, [script.pathname.replace(/^\/(.:)/, "$1")], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      QUALITY_ROOT: root,
      QUALITY_SKIP_PREBUILD: "1",
      QUALITY_SCENARIO_REGISTRY: "registry.json",
      QUALITY_SUMMARY_PATH: "artifacts/quality/summary.json",
      QUALITY_RUN_ID: "current-run",
    },
  });
}

test("TEST-14: stale browser artifacts cannot satisfy the current manifest protocol", async () => {
  const root = await createRoot();
  const staleDir = path.join(root, "artifacts", "quality", "playwright", "old-run");
  await mkdir(staleDir, { recursive: true });
  await writeFile(path.join(staleDir, "results.json"), JSON.stringify({ status: "passed" }), "utf8");

  const result = runSummary(root);

  assert.notEqual(result.status, 0, result.stdout || result.stderr);
  const summary = JSON.parse(await readFile(path.join(root, "artifacts", "quality", "summary.json"), "utf8"));
  assert.equal(summary.status, "failed");
  assert.equal(summary.scenarios[0].status, "identity_mismatch");
});

test("TEST-14: current identity and a passed required gate satisfy the summary", async () => {
  const root = await createRoot();
  const runDir = path.join(root, "artifacts", "quality", "current-run");
  await mkdir(runDir, { recursive: true });
  await writeFile(path.join(runDir, "manifest.json"), JSON.stringify({
    schemaVersion: 1,
    runId: "current-run",
    identity,
    status: "passed",
    gates: [{ id: "integration", status: "passed" }],
  }), "utf8");
  await writeFile(path.join(root, "artifacts", "quality", "current-run.json"), JSON.stringify({
    runId: "current-run",
    manifestPath: "artifacts/quality/current-run/manifest.json",
  }), "utf8");

  const result = runSummary(root);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /quality_status=passed/);
  const summary = JSON.parse(await readFile(path.join(root, "artifacts", "quality", "summary.json"), "utf8"));
  assert.equal(summary.status, "passed");
  assert.equal(summary.counts.requiredPassed, 1);
});
