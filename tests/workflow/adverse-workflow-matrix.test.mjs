import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../src/domain/rehab/followup/adverse-response-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

const completeEvent = (patch = {}) => ({
  ...core.createAdverseResponse({
    source: "treatment",
    sourceId: "unit-1",
    sourceLabel: "相关区域处理",
    timing: "immediate",
    beforeScore: 4,
    afterScore: 5,
    relatedAssessmentIds: ["motion:ankle-dorsiflexion", "motion:ankle-eversion"],
    assessmentRevision: 2,
  }),
  afterScoreConfirmed: true,
  settledAfterStopping: "yes",
  locationChanged: "no",
  symptomChanged: "no",
  neuralOrWeakness: "no",
  ...patch,
});

test("96 source, timing, settling and symptom combinations always reach an explicit route", () => {
  const sources = ["treatment", "training", "after-session"];
  const timings = ["during", "immediate", "later", "next-day"];
  const yesNo = ["yes", "no"];
  let count = 0;
  for (const source of sources) for (const timing of timings) for (const settledAfterStopping of yesNo) for (const locationChanged of yesNo) for (const symptomChanged of yesNo) {
    const event = completeEvent({ source, timing, settledAfterStopping, locationChanged, symptomChanged });
    assert.ok(["regress-training", "focused-reassessment", "stop-and-refer"].includes(core.resolveAdverseResponse(event)));
    count += 1;
  }
  assert.equal(count, 96);
});

test("severe, neural and repeat-regression extremes cannot loop into training regression", () => {
  const severe = completeEvent({ source: "training", beforeScore: 3, afterScore: 9, settledAfterStopping: "no" });
  const neural = completeEvent({ source: "training", afterScore: 2, neuralOrWeakness: "yes" });
  const repeated = completeEvent({ source: "training", regressionAttempted: true });
  assert.equal(core.resolveAdverseResponse(severe), "stop-and-refer");
  assert.equal(core.resolveAdverseResponse(neural), "stop-and-refer");
  assert.equal(core.resolveAdverseResponse(repeated), "focused-reassessment");
});

test("focused reassessment is bounded, accepts unchanged answers and invalidates every old plan", () => {
  const event = {
    ...core.createAdverseResponse({
      source: "treatment",
      sourceId: "unit-2",
      sourceLabel: "相关区域处理",
      timing: "immediate",
      beforeScore: 4,
      afterScore: 5,
      relatedAssessmentIds: ["a", "b", "c", "d", "a"],
      assessmentRevision: core.nextAssessmentRevision(7),
    }),
    afterScoreConfirmed: true,
    settledAfterStopping: "yes",
    locationChanged: "no",
    symptomChanged: "no",
    neuralOrWeakness: "no",
  };
  assert.deepEqual(event.relatedAssessmentIds, ["a", "b", "c"]);
  assert.equal(core.focusedReassessmentComplete(event, ["a", "b", "c"]), true);
  assert.equal(core.canExecutePlan(7, event.assessmentRevision), false);
  assert.equal(core.canExecutePlan(event.assessmentRevision, event.assessmentRevision), true);
  const secondRevision = core.nextAssessmentRevision(event.assessmentRevision);
  assert.equal(core.canExecutePlan(event.assessmentRevision, secondRevision), false);
});

test("capture state remains resumable until every required answer is explicitly confirmed", () => {
  const event = core.createAdverseResponse({
    source: "after-session",
    sourceId: "session-2",
    sourceLabel: "次日反应",
    timing: "next-day",
    beforeScore: 1,
    afterScore: 0,
    relatedAssessmentIds: ["function:walk"],
    assessmentRevision: 4,
    returnMode: "followup",
    returnFollowupStage: "summary",
  });
  assert.equal(core.resolveAdverseResponse(event), "capture");
  assert.equal(event.returnMode, "followup");
  assert.equal(event.returnFollowupStage, "summary");
  assert.equal(core.adverseCaptureComplete({ ...event, afterScoreConfirmed: true, settledAfterStopping: "yes", locationChanged: "no", symptomChanged: "no", neuralOrWeakness: "" }), false);
});
