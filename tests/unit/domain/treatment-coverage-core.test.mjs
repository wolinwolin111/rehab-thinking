import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../../src/domain/rehab/treatment/treatment-coverage-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

test("a new supported region keeps the route open regardless of attempt count", () => {
  const state = core.summarizeTreatmentCoverage([
    { treatmentKey: "calf-front", result: "same", responseRole: "no-change", directionIds: ["dorsiflexion", "plantarflexion"] },
    { treatmentKey: "calf-back", result: "same", responseRole: "no-change", directionIds: ["dorsiflexion", "plantarflexion"] },
    { treatmentKey: "calf-front", result: "same", responseRole: "no-change", directionIds: ["dorsiflexion"] },
  ], [{ treatmentKey: "calf-lateral", directionIds: ["eversion"] }]);
  assert.equal(state.decision, "continue-new-coverage");
  assert.deepEqual(state.coveredTreatmentKeys, ["calf-front", "calf-back"]);
});

test("coverage ends only after supported regions are exhausted without change", () => {
  const state = core.summarizeTreatmentCoverage([
    { treatmentKey: "calf-front", result: "same", responseRole: "no-change", directionIds: ["dorsiflexion", "plantarflexion"] },
    { treatmentKey: "calf-back", result: "same", responseRole: "no-change", directionIds: ["dorsiflexion", "plantarflexion"] },
  ], []);
  assert.equal(state.decision, "stop-covered-no-effect");
});

test("range improvement remains effective when the chief score is unchanged", () => {
  const state = core.summarizeTreatmentCoverage([
    { treatmentKey: "calf-front", result: "partial", responseRole: "range-contribution", directionIds: ["dorsiflexion"] },
  ], []);
  assert.equal(state.decision, "complete-with-effect");
  assert.equal(state.hasRangeImprovement, true);
});

test("range improvement is retained when the same batch also lowers the chief score", () => {
  const state = core.summarizeTreatmentCoverage([
    { treatmentKey: "thigh-front", result: "better", responseRole: "partial-contribution", rangeImproved: true, directionIds: ["thigh-front-length"] },
  ], []);
  assert.equal(state.decision, "complete-with-effect");
  assert.equal(state.hasRangeImprovement, true);
});

test("worsening always stops before another coverage direction", () => {
  const state = core.summarizeTreatmentCoverage([
    { treatmentKey: "calf-front", result: "worse", responseRole: "worsened" },
  ], [{ treatmentKey: "calf-back" }]);
  assert.equal(state.decision, "stop-worsened");
});

test("activity worsening stops coverage even when the score result is partial", () => {
  const state = core.summarizeTreatmentCoverage([
    { treatmentKey: "thigh-front", result: "partial", responseRole: "worsened", activityWorsened: true },
  ], [{ treatmentKey: "calf-back" }]);
  assert.equal(state.decision, "stop-worsened");
  assert.equal(state.hasWorsened, true);
});
