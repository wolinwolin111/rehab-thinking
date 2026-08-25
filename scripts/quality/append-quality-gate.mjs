import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sameQualityIdentity } from "./quality-evidence-core.mjs";
import { readQualityRunIdentity } from "./quality-run-identity.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const [gateId, status, layer, evidencePath] = process.argv.slice(2);
const allowedGates = new Set(["browser-minimal", "manual-task", "vps-health", "vps-recovery"]);
if (!allowedGates.has(gateId) || !["passed", "failed"].includes(status) || !layer || !evidencePath) {
  console.error("usage: node append-quality-gate.mjs <allowed-gate-id> <passed|failed> <layer> <evidence-path>");
  process.exit(2);
}
const pointer = JSON.parse(await readFile(path.join(root, "artifacts", "quality", "current-run.json"), "utf8"));
const manifestPath = path.join(root, pointer.manifestPath);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const expectedIdentity = await readQualityRunIdentity(root);
if (manifest.runId !== pointer.runId || !sameQualityIdentity(manifest.identity, expectedIdentity)) {
  console.error("current quality run identity does not match the current build");
  process.exit(1);
}
const absoluteEvidence = path.resolve(root, evidencePath);
const evidence = await readFile(absoluteEvidence, "utf8").catch(() => "");
if (!evidence.trim()) {
  console.error("quality gate evidence file is missing or empty");
  process.exit(1);
}
const gate = {
  id: gateId,
  layer,
  status,
  exitCode: status === "passed" ? 0 : 1,
  command: "external verified task",
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  durationMs: null,
  logPath: path.relative(root, absoluteEvidence).replaceAll("\\", "/"),
};
manifest.gates = [...manifest.gates.filter((item) => item.id !== gateId), gate];
manifest.completedAt = new Date().toISOString();
manifest.status = manifest.gates.some((item) => item.status === "failed") ? "failed" : "passed";
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`quality gate ${gateId}: ${status}`);
