import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const contractsSource = await readFile(new URL("../app/pilot-case-contracts.ts", import.meta.url), "utf8");
const source = await readFile(new URL("../app/pilot-snapshot-schema.ts", import.meta.url), "utf8");
function strip(code, keepExports = false) {
  let out = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/import\s*\{[\s\S]*?\}\s*from\s*"[^"]*";?/g, "");
  if (!keepExports) out = out.replace(/export\s+/g, "");
  return out;
}
const bundle = `${strip(contractsSource)}\n${strip(source, true)}`;
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
