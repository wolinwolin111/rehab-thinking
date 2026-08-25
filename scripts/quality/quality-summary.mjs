import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { evaluateQualityEvidence } from "./quality-evidence-core.mjs";
import { readQualityRunIdentity } from "./quality-run-identity.mjs";

const root = process.env.QUALITY_ROOT ? path.resolve(process.env.QUALITY_ROOT) : path.resolve(import.meta.dirname, "../..");
if (process.env.QUALITY_SKIP_PREBUILD !== "1") {
  const generated = spawnSync("npm", ["run", "prebuild"], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (generated.status !== 0) {
    process.stderr.write(generated.stderr || generated.stdout || "release identity generation failed\n");
    process.exit(1);
  }
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

const registry = await readJson(path.join(root, process.env.QUALITY_SCENARIO_REGISTRY ?? "tests/workflow/scenario-registry.json"));
if (!Array.isArray(registry)) throw new Error("quality scenario registry must be an array");
const pointer = await readJson(path.join(root, "artifacts", "quality", "current-run.json"));
const requestedRunId = process.env.QUALITY_RUN_ID?.trim() || pointer?.runId || "";
const manifestRelative = requestedRunId && pointer?.runId === requestedRunId
  ? pointer.manifestPath
  : requestedRunId
    ? `artifacts/quality/${requestedRunId}/manifest.json`
    : "";
const manifestPath = manifestRelative ? path.join(root, manifestRelative) : "";
const manifest = manifestPath ? await readJson(manifestPath) : null;
const expectedIdentity = await readQualityRunIdentity(root);
const runIdentityMatches = Boolean(manifest && manifest.runId === requestedRunId);
const evaluation = evaluateQualityEvidence({
  manifest: runIdentityMatches ? manifest : null,
  expectedIdentity,
  registry,
});
const summary = {
  generatedAt: new Date().toISOString(),
  runId: requestedRunId || null,
  manifestPath: manifestRelative || null,
  manifestStatus: manifest?.status ?? "missing",
  expectedIdentity,
  runIdentityMatches,
  ...evaluation,
};
const configuredSummaryPath = process.env.QUALITY_SUMMARY_PATH?.trim();
const runSummaryPath = configuredSummaryPath
  ? path.join(root, configuredSummaryPath)
  : requestedRunId
    ? path.join(root, "artifacts", "quality", requestedRunId, "summary.json")
    : path.join(root, "artifacts", "quality", "summary.json");
await mkdir(path.dirname(runSummaryPath), { recursive: true });
await writeFile(runSummaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
await writeFile(path.join(root, "artifacts", "quality", "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
const requiredProblems = evaluation.scenarios
  .filter((entry) => entry.releaseRequired && entry.status !== "passed")
  .map((entry) => `${entry.scenarioId}:${entry.status}`);
console.log([
  `quality_status=${evaluation.status}`,
  `run_id=${requestedRunId || "missing"}`,
  `identity_matches=${evaluation.identityMatches}`,
  `required=${evaluation.counts.requiredPassed}/${evaluation.counts.required}`,
  `evidence=${path.relative(root, runSummaryPath).replaceAll("\\", "/")}`,
  requiredProblems.length ? `blocking=${requiredProblems.join(",")}` : "blocking=none",
].join("\n"));
if (!runIdentityMatches || evaluation.status !== "passed") process.exitCode = 1;
