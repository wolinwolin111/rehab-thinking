import { readFile } from "node:fs/promises";
import path from "node:path";

export async function readQualityRunIdentity(root) {
  const generated = await readFile(path.join(root, "src", "infrastructure", "pilot", "release", "release.generated.ts"), "utf8");
  const releaseMatch = generated.match(/Object\.freeze\((\{[\s\S]*?\}) as const\)/);
  if (!releaseMatch) throw new Error("Cannot read generated pilot release identity");
  const release = JSON.parse(releaseMatch[1]);
  const contracts = await readFile(path.join(root, "src", "infrastructure", "pilot", "api", "case-contracts.ts"), "utf8");
  const schemaMatch = contracts.match(/PILOT_SNAPSHOT_SCHEMA_VERSION\s*=\s*(\d+)/);
  if (!schemaMatch) throw new Error("Cannot read snapshot schema version");
  return {
    commitSha: release.commitSha,
    buildId: release.buildId,
    appVersion: release.appVersion,
    knowledgeVersion: release.knowledgeVersion,
    decisionVersion: release.decisionVersion,
    ruleVersion: release.ruleVersion,
    snapshotSchemaVersion: Number(schemaMatch[1]),
  };
}
