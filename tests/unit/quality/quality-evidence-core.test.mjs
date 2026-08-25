import assert from "node:assert/strict";
import test from "node:test";
import { evaluateQualityEvidence } from "../../../scripts/quality/quality-evidence-core.mjs";

const identity = {
  commitSha: "commit",
  buildId: "build",
  appVersion: "app",
  knowledgeVersion: "knowledge",
  decisionVersion: "decision",
  ruleVersion: "rule",
  snapshotSchemaVersion: 1,
};
const registry = [
  { scenarioId: "L2", layer: "L2", gateId: "workflow", releaseRequired: true },
  { scenarioId: "L6", layer: "L6", gateId: "browser", releaseRequired: true },
];

function manifest(overrides = {}) {
  return {
    schemaVersion: 1,
    identity,
    gates: [{ id: "workflow", status: "passed" }, { id: "browser", status: "passed" }],
    ...overrides,
  };
}

test("A7 TEST-14: only current, complete evidence can pass the release registry", () => {
  assert.equal(evaluateQualityEvidence({ manifest: manifest(), expectedIdentity: identity, registry }).status, "passed");
  assert.equal(evaluateQualityEvidence({ manifest: manifest({ gates: [{ id: "workflow", status: "passed" }] }), expectedIdentity: identity, registry }).status, "incomplete");
  assert.equal(evaluateQualityEvidence({ manifest: manifest({ gates: [{ id: "workflow", status: "passed" }, { id: "browser", status: "failed" }] }), expectedIdentity: identity, registry }).status, "failed");
  assert.equal(evaluateQualityEvidence({ manifest: manifest({ identity: { ...identity, buildId: "stale" } }), expectedIdentity: identity, registry }).status, "failed");
  assert.equal(evaluateQualityEvidence({ manifest: manifest({ schemaVersion: 0 }), expectedIdentity: identity, registry }).status, "failed");
});
