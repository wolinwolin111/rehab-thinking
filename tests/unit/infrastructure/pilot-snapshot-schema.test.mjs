import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const contractsSource = await readFile(new URL("../../../src/infrastructure/pilot/api/case-contracts.ts", import.meta.url), "utf8");
const consentSource = await readFile(new URL("../../../src/infrastructure/pilot/consent/consent-core.ts", import.meta.url), "utf8");
const source = await readFile(new URL("../../../src/infrastructure/pilot/persistence/snapshot-schema.ts", import.meta.url), "utf8");
function strip(code, keepExports = false) {
  let out = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/import\s*\{[\s\S]*?\}\s*from\s*"[^"]*";?/g, "");
  if (!keepExports) out = out.replace(/export\s+/g, "");
  return out;
}
const bundle = `${strip(contractsSource)}\n${strip(consentSource)}\n${strip(source, true)}`;
const schema = await import(`data:text/javascript;base64,${Buffer.from(bundle).toString("base64")}`);

function makeSnapshot(overrides = {}) {
  return {
    step: 0,
    intake: { regionId: "knee" },
    safety: {},
    imaging: [],
    assessmentIndex: 0,
    assessmentResults: {},
    trialTargetIndex: 0,
    candidateIndex: 0,
    trialRecords: [],
    postScore: 0,
    movementResponse: "",
    exerciseFeedback: {},
    trainingComplete: false,
    followupMode: false,
    sessionNumber: 1,
    followupScore: 0,
    followupScoreHistory: [],
    followupStage: "review",
    followupPostScore: 0,
    followupCandidateId: "",
    followupTrialRecords: [],
    followupExerciseChoices: {},
    hasNewSymptom: "",
    followupTrends: {},
    ...overrides,
  };
}

test("valid snapshots are accepted and carry the current schema version", () => {
  const result = schema.migratePilotSnapshot(makeSnapshot());
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.schemaVersion, schema.PILOT_SNAPSHOT_SCHEMA_VERSION);
});

test("legacy snapshots are migrated without mutating the input", () => {
  const legacy = makeSnapshot();
  const result = schema.migratePilotSnapshot(legacy);
  assert.equal(result.ok, true);
  assert.equal("schemaVersion" in legacy, false);
  assert.equal(result.snapshot.schemaVersion, 1);
});

test("missing required fields are rejected before page restoration", () => {
  const result = schema.migratePilotSnapshot(makeSnapshot({ intake: undefined }));
  assert.equal(result.ok, false);
});

test("future snapshot versions are rejected instead of partially restored", () => {
  const result = schema.migratePilotSnapshot(makeSnapshot({ schemaVersion: 99 }));
  assert.equal(result.ok, false);
});

test("SCHEMA-01: the service-side schema boundary rejects a partial snapshot", () => {
  assert.throws(
    () => schema.assertAndStampPilotSnapshotSchemaVersion({ schemaVersion: 1, step: 4 }, "snapshot"),
    /snapshot (intake|safety|imaging|assessment)/,
  );
});

test("A5 SCHEMA-01: nested workflow fields are validated before storage or restore", () => {
  const invalidSnapshots = [
    makeSnapshot({ intake: { regionId: 42, description: "" } }),
    makeSnapshot({ safety: { fractureRisk: "maybe" } }),
    makeSnapshot({ assessmentIndex: -1 }),
    makeSnapshot({ sessionNumber: 0 }),
    makeSnapshot({ postScore: 11 }),
    makeSnapshot({ followupScoreHistory: [2, Number.NaN] }),
    makeSnapshot({ trialRecords: [{ candidateId: "candidate-1", result: "invented" }] }),
    makeSnapshot({ movementScores: { flexion: 12 } }),
    makeSnapshot({ bilateralRetestResponses: { left: "unknown" } }),
    makeSnapshot({ sessionHistory: [{ sessionNumber: 0 }] }),
  ];

  for (const snapshot of invalidSnapshots) {
    assert.equal(schema.migratePilotSnapshot(snapshot).ok, false, JSON.stringify(snapshot));
  }
});

test("A5 SCHEMA-01: a complete treatment record remains valid", () => {
  const result = schema.migratePilotSnapshot(makeSnapshot({
    trialRecords: [{
      candidateId: "candidate-1",
      candidateTitle: "candidate",
      targetId: "target-1",
      beforeScore: 4,
      afterScore: 2,
      result: "better",
      movement: "smoother",
    }],
    movementScores: { flexion: 2 },
    movementScoreConfirmed: { flexion: true },
  }));
  assert.equal(result.ok, true);
});

test("A5 SCHEMA-01: cyclic and excessively deep snapshots are rejected during local restoration", () => {
  const cyclic = makeSnapshot();
  cyclic.loop = cyclic;
  assert.equal(schema.migratePilotSnapshot(cyclic).ok, false);
  let nested = {};
  for (let index = 0; index < 30; index += 1) nested = { nested };
  assert.equal(schema.migratePilotSnapshot(makeSnapshot({ extra: nested })).ok, false);
});
