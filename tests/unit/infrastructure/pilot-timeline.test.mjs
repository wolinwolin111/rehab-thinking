import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const timeline = await loadTypeScriptModule("./src/infrastructure/pilot/persistence/timeline.ts");

function event(sequence, overrides = {}) {
  return {
    id: `event-${sequence}`,
    caseId: "case-1",
    sequence,
    type: "intake_saved",
    payload: JSON.stringify({ raw: {}, confirmed: {}, parsed: {}, inferred: {} }),
    source: "user",
    occurredAt: `2026-08-21T00:00:0${sequence}.000Z`,
    appVersion: "app",
    knowledgeVersion: "knowledge",
    decisionVersion: "decision",
    ...overrides,
  };
}

test("timeline reconstruction returns ordered valid events", () => {
  const result = timeline.reconstructPilotCaseTimeline([
    event(2),
    event(1, { type: "case_created", source: "system", payload: JSON.stringify({ source: "case_creation" }) }),
  ]);
  assert.equal(result.valid, true);
  assert.deepEqual(result.events.map((item) => item.sequence), [1, 2]);
});

test("timeline reconstruction reports gaps, forged sources, invalid payloads and time regressions", () => {
  const result = timeline.reconstructPilotCaseTimeline([
    event(1, { type: "case_created", source: "admin", payload: "[]" }),
    event(3, { occurredAt: "2026-08-20T00:00:00.000Z" }),
  ]);
  assert.equal(result.valid, false);
  assert.deepEqual(new Set(result.issues.map((issue) => issue.code)), new Set(["invalid_source", "invalid_payload", "sequence_gap", "time_regression"]));
});
