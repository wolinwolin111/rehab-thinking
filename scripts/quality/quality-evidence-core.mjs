export const QUALITY_MANIFEST_SCHEMA_VERSION = 1;

export function sameQualityIdentity(actual, expected) {
  const keys = ["commitSha", "buildId", "appVersion", "knowledgeVersion", "decisionVersion", "ruleVersion", "snapshotSchemaVersion"];
  return keys.every((key) => actual?.[key] === expected?.[key]);
}

export function evaluateQualityEvidence({ manifest, expectedIdentity, registry }) {
  const identityMatches = Boolean(manifest && sameQualityIdentity(manifest.identity, expectedIdentity));
  const currentSchema = manifest?.schemaVersion === QUALITY_MANIFEST_SCHEMA_VERSION;
  const gateById = new Map((manifest?.gates ?? []).map((gate) => [gate.id, gate]));
  const scenarios = registry.map((entry) => {
    const gate = entry.gateId ? gateById.get(entry.gateId) : null;
    const status = !identityMatches || !currentSchema
      ? "identity_mismatch"
      : gate?.status === "passed"
        ? "passed"
        : gate?.status === "failed"
          ? "failed"
          : "not_run";
    return {
      scenarioId: entry.scenarioId,
      layer: entry.layer ?? "L6",
      releaseRequired: entry.releaseRequired === true,
      status,
      gateId: entry.gateId ?? null,
    };
  });
  const required = scenarios.filter((entry) => entry.releaseRequired);
  const status = !identityMatches || !currentSchema
    ? "failed"
    : required.some((entry) => entry.status === "failed")
      ? "failed"
      : required.every((entry) => entry.status === "passed")
        ? "passed"
        : "incomplete";
  return {
    status,
    identityMatches,
    currentSchema,
    scenarios,
    counts: {
      passed: scenarios.filter((entry) => entry.status === "passed").length,
      failed: scenarios.filter((entry) => entry.status === "failed").length,
      notRun: scenarios.filter((entry) => entry.status === "not_run").length,
      identityMismatch: scenarios.filter((entry) => entry.status === "identity_mismatch").length,
      required: required.length,
      requiredPassed: required.filter((entry) => entry.status === "passed").length,
    },
  };
}
