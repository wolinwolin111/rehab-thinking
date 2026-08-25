import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../../src/domain/rehab/followup/adverse-response-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

const base = { source: "training", sourceId: "bridge", sourceLabel: "臀桥", timing: "during", beforeScore: 2, afterScore: 0, relatedAssessmentIds: ["motion:knee-extension", "motion:knee-extension", "function:step-down"], assessmentRevision: 3 };

test("training discomfort that settles with the same symptom pattern regresses once", () => {
  const event = { ...core.createAdverseResponse(base), afterScore: 4, afterScoreConfirmed: true, settledAfterStopping: "yes", locationChanged: "no", symptomChanged: "no", neuralOrWeakness: "no" };
  assert.equal(core.resolveAdverseResponse(event), "regress-training");
});

test("training cannot loop back to regression after one reduced trial", () => {
  const event = { ...core.createAdverseResponse(base), afterScore: 4, afterScoreConfirmed: true, settledAfterStopping: "yes", locationChanged: "no", symptomChanged: "no", neuralOrWeakness: "no", regressionAttempted: true };
  assert.equal(core.resolveAdverseResponse(event), "focused-reassessment");
});

test("persistent severe worsening or new neural weakness stops the session", () => {
  const persistent = { ...core.createAdverseResponse(base), afterScore: 8, afterScoreConfirmed: true, settledAfterStopping: "no", locationChanged: "no", symptomChanged: "no", neuralOrWeakness: "no" };
  assert.equal(core.resolveAdverseResponse(persistent), "stop-and-refer");
  assert.equal(core.resolveAdverseResponse({ ...persistent, afterScore: 4, neuralOrWeakness: "yes" }), "stop-and-refer");
});

test("treatment worsening and a changed training symptom use focused reassessment", () => {
  const treatment = { ...core.createAdverseResponse({ ...base, source: "treatment" }), afterScore: 5, afterScoreConfirmed: true, settledAfterStopping: "yes", locationChanged: "no", symptomChanged: "no", neuralOrWeakness: "no" };
  const changedTraining = { ...core.createAdverseResponse(base), afterScore: 5, afterScoreConfirmed: true, settledAfterStopping: "yes", locationChanged: "yes", symptomChanged: "yes", neuralOrWeakness: "no" };
  assert.equal(core.resolveAdverseResponse(treatment), "focused-reassessment");
  assert.equal(core.resolveAdverseResponse(changedTraining), "focused-reassessment");
});

test("reassessment ids are bounded and plan revisions cannot cross", () => {
  const event = core.createAdverseResponse(base);
  assert.deepEqual(core.focusedReassessmentIds(event, "function:chief"), ["function:chief", "motion:knee-extension", "function:step-down"]);
  assert.equal(core.canExecutePlan(3, 4), false);
  assert.equal(core.canExecutePlan(4, 4), true);
});

test("confirming unchanged answers still completes a new assessment revision", () => {
  const event = { ...core.createAdverseResponse(base), relatedAssessmentIds: ["motion:knee-extension", "function:step-down"], assessmentRevision: 4 };
  assert.equal(core.focusedReassessmentComplete(event, ["motion:knee-extension"]), false);
  assert.equal(core.focusedReassessmentComplete(event, ["motion:knee-extension", "function:step-down"]), true);
  assert.equal(core.canExecutePlan(3, event.assessmentRevision), false);
  assert.equal(core.canExecutePlan(event.assessmentRevision, event.assessmentRevision), true);
});

test("mixed and extreme adverse combinations always end in an explicit destination", () => {
  const cases = [
    ["training", "yes", "no", "no", "no", 4, "regress-training"],
    ["training", "yes", "yes", "no", "no", 4, "focused-reassessment"],
    ["training", "no", "no", "no", "no", 5, "focused-reassessment"],
    ["training", "no", "no", "no", "no", 9, "stop-and-refer"],
    ["treatment", "yes", "no", "no", "no", 3, "focused-reassessment"],
    ["treatment", "no", "yes", "yes", "no", 6, "focused-reassessment"],
    ["treatment", "yes", "no", "no", "yes", 3, "stop-and-refer"],
    ["after-session", "no", "no", "no", "no", 8, "stop-and-refer"],
    ["after-session", "yes", "no", "no", "no", 3, "focused-reassessment"],
  ];
  for (const [source, settled, locationChanged, symptomChanged, neuralOrWeakness, afterScore, expected] of cases) {
    const event = { ...core.createAdverseResponse({ ...base, source }), afterScore, afterScoreConfirmed: true, settledAfterStopping: settled, locationChanged, symptomChanged, neuralOrWeakness };
    assert.equal(core.resolveAdverseResponse(event), expected, `${source}:${settled}:${afterScore}`);
  }
});
