import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const contractsSource = await readFile(new URL("../app/pilot-case-contracts.ts", import.meta.url), "utf8");
const timelineSource = await readFile(new URL("../app/pilot-timeline.ts", import.meta.url), "utf8");
const contractsModuleUrl = `data:text/javascript;base64,${Buffer.from(ts.transpileModule(contractsSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText).toString("base64")}`;
const timeline = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(timelineSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText.replace("./pilot-case-contracts", contractsModuleUrl)).toString("base64")}`);

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
