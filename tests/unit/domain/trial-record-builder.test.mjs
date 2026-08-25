import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/trial-record-builder.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

test("buildTrialRecords assembles a single score-based record", () => {
  const records = core.buildTrialRecords({
    candidates: [{ id: "c1", candidateTitle: "处理一", treatmentName: "处理一", treatmentKey: "side:muscle:x", action: "轻柔松解" }],
    carryoverOnly: false,
    beforeScore: 5,
    recordedAfterScore: 2,
    result: "better",
    timeBased: false,
    deferredRetest: false,
    hasSingleRangeEvidence: false,
    movementResponse: "",
    chiefWasActuallyRetested: true,
    responseRole: "partial-contribution",
    retestActionKey: "ankle-dorsiflexion",
    treatmentSide: "右侧",
    targetId: "target:chief",
    targetTitle: "勾脚",
    residualReviewId: "residual",
  });
  assert.equal(records.length, 1);
  assert.equal(records[0].measurement, "score");
  assert.equal(records[0].beforeScore, 5);
  assert.equal(records[0].afterScore, 2);
  assert.equal(records[0].result, "better");
  assert.equal(records[0].chiefRetested, true);
  assert.equal(records[0].reviewOnly, false);
});

test("buildTrialRecords marks batched support entries", () => {
  const records = core.buildTrialRecords({
    candidates: [
      { id: "c1", candidateTitle: "处理一", treatmentName: "处理一", treatmentKey: "k1", action: "a1" },
      { id: "c2", candidateTitle: "处理二", treatmentName: "处理二", treatmentKey: "k2", action: "a2" },
    ],
    carryoverOnly: false,
    beforeScore: 5,
    recordedAfterScore: 2,
    result: "partial",
    timeBased: false,
    deferredRetest: false,
    hasSingleRangeEvidence: false,
    movementResponse: "",
    chiefWasActuallyRetested: false,
    responseRole: "range-contribution",
    retestActionKey: "ankle-dorsiflexion",
    treatmentSide: "右侧",
    targetId: "target:chief",
    targetTitle: "勾脚",
    residualReviewId: "residual",
  });
  assert.equal(records.length, 2);
  assert.equal(records[0].batchedResult, true);
  assert.equal(records[0].supportingOnly, false);
  assert.equal(records[1].batchedResult, true);
  assert.equal(records[1].supportingOnly, true);
  assert.equal(records[1].responseRole, "not-immediately-testable");
});