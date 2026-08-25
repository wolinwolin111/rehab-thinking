import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadBundle(paths) {
  const parts = [];
  for (let i = 0; i < paths.length; i++) {
    const src = await readFile(new URL(paths[i], import.meta.url), "utf8");
    let out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    out = out.replace(/import\s*\{[^}]*\}\s*from\s*"[^"]*";?/g, "");
    if (i < paths.length - 1) out = out.replace(/export\s+/g, "");
    parts.push(out);
  }
  return import(`data:text/javascript;base64,${Buffer.from(parts.join("\n")).toString("base64")}`);
}

const core = await loadBundle([
  "../../../src/domain/rehab/treatment/treatment-response-core.ts",
  "../../../src/domain/rehab/treatment/trial-record-builder.ts",
  "../../../src/domain/rehab/retest/batch-retest-compute.ts",
]);

test("all ranges resolved with chief drop yields better partial-contribution", () => {
  const { result, responseRole } = core.computeBatchResult({
    chiefBeforeScore: 5,
    recordedChiefScore: 2,
    chiefWasActuallyRetested: true,
    rangeBeforeScore: 5,
    outcomes: ["both-match"],
    priorImprovingTreatmentCount: 0,
  });
  assert.equal(result, "better");
  assert.equal(responseRole, "partial-contribution");
});

test("chief unchanged but range improved yields partial range-contribution", () => {
  const { result, responseRole } = core.computeBatchResult({
    chiefBeforeScore: 5,
    recordedChiefScore: 5,
    chiefWasActuallyRetested: true,
    rangeBeforeScore: 5,
    outcomes: ["better-passive-limited"],
    priorImprovingTreatmentCount: 0,
  });
  assert.equal(result, "partial");
  assert.equal(responseRole, "range-contribution");
});

test("pain improves but activity worsens yields a mixed stop result", () => {
  const { result, responseRole, activityWorsened } = core.computeBatchResult({
    chiefBeforeScore: 5,
    recordedChiefScore: 3,
    chiefWasActuallyRetested: true,
    rangeBeforeScore: 5,
    outcomes: ["both-match", "worse"],
    priorImprovingTreatmentCount: 0,
  });
  assert.equal(result, "partial");
  assert.equal(responseRole, "worsened");
  assert.equal(activityWorsened, true);
});

test("activity worsening without symptom improvement remains worse", () => {
  const { result, responseRole, activityWorsened } = core.computeBatchResult({
    chiefBeforeScore: 5,
    recordedChiefScore: 5,
    chiefWasActuallyRetested: true,
    rangeBeforeScore: 5,
    outcomes: ["both-match", "worse"],
    priorImprovingTreatmentCount: 0,
  });
  assert.equal(result, "worse");
  assert.equal(responseRole, "worsened");
  assert.equal(activityWorsened, true);
});
