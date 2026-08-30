import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadTypeScriptModule } from "../support/load-typescript-module.mjs";

const schema = await loadTypeScriptModule("./src/infrastructure/pilot/persistence/snapshot-schema.ts");
const fixture = JSON.parse(await readFile(new URL("../fixtures/workflow/p0-minimal-case.json", import.meta.url), "utf8"));

test("TEST-19: the normal workflow fixture passes the production snapshot schema", () => {
  const result = schema.validatePilotSnapshotV3(fixture.case.snapshot);
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.snapshot.schemaVersion, schema.PILOT_SNAPSHOT_SCHEMA_VERSION);
});

test("TEST-19: the normal fixture starts from public event vocabulary only", () => {
  const supported = new Set([
    "case_created", "consent_confirmed", "intake_saved", "intake_confirmed", "assessment_answered",
    "assessment_skipped", "assessment_completed", "finding_generated", "treatment_started", "treatment_skipped",
    "treatment_retested", "training_plan_saved", "training_feedback_saved", "session_saved", "feedback_submitted", "case_deleted",
  ]);
  for (const event of fixture.case.events) assert.equal(supported.has(event.type), true, event.type);
});
