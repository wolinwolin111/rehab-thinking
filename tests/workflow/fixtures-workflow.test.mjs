import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const contractsSource = await readFile(new URL("../../src/infrastructure/pilot/api/case-contracts.ts", import.meta.url), "utf8");
const consentSource = await readFile(new URL("../../src/infrastructure/pilot/consent/consent-core.ts", import.meta.url), "utf8");
const schemaSource = await readFile(new URL("../../src/infrastructure/pilot/persistence/snapshot-schema.ts", import.meta.url), "utf8");
const fixture = JSON.parse(await readFile(new URL("../fixtures/workflow/p0-minimal-case.json", import.meta.url), "utf8"));

function compile(source, keepExports = false) {
  let output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/import\s*\{[\s\S]*?\}\s*from\s*"[^"]*";?/g, "");
  if (!keepExports) output = output.replace(/export\s+/g, "");
  return output;
}

const schema = await import(`data:text/javascript;base64,${Buffer.from(`${compile(contractsSource)}\n${compile(consentSource)}\n${compile(schemaSource, true)}`).toString("base64")}`);

test("TEST-19: the normal workflow fixture passes the production snapshot schema", () => {
  const result = schema.migratePilotSnapshot(fixture.case.snapshot);
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
