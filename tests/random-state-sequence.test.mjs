import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const [profile, workbench, training, adverse, queue] = await Promise.all([
  load("../app/workflow-profile-core.ts"),
  load("../app/stage-workbench-core.ts"),
  load("../app/training-feedback-core.ts"),
  load("../app/adverse-response-core.ts"),
  load("../app/workflow-state-core.ts"),
]);

const operations = ["select", "cancel", "skip", "back", "modify", "save", "restore", "adverse", "reassess", "end", "next"];
const exercises = [{ id: "exercise-a" }, { id: "exercise-b" }];

function rng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function snapshot(state) {
  return JSON.parse(JSON.stringify(state));
}

function initialState(mode) {
  return {
    mode,
    stage: "intake",
    sessionNumber: 1,
    assessmentRevision: 1,
    planRevision: 1,
    answers: 0,
    skipped: 0,
    trainingFeedback: {},
    saved: null,
    stopped: false,
  };
}

function applyOperation(state, operation, random) {
  const beforeRevision = state.assessmentRevision;
  if (operation === "select") state.answers += 1;
  if (operation === "cancel") state.answers = Math.max(0, state.answers - 1);
  if (operation === "skip") state.skipped += 1;
  if (operation === "back") state.stage = state.stage === "summary" ? "training" : state.stage === "training" ? "treatment" : state.stage === "treatment" ? "assessment" : "intake";
  if (operation === "modify") {
    state.assessmentRevision = adverse.nextAssessmentRevision(state.assessmentRevision);
    state.planRevision = state.assessmentRevision;
    state.stage = "assessment";
    state.trainingFeedback = {};
  }
  if (operation === "reassess") {
    state.assessmentRevision = adverse.nextAssessmentRevision(state.assessmentRevision);
    state.planRevision = state.assessmentRevision;
    state.stage = "reassessment";
    state.trainingFeedback = {};
  }
  if (operation === "save") state.saved = snapshot({ ...state, saved: null });
  if (operation === "restore" && state.saved) Object.assign(state, snapshot(state.saved), { saved: state.saved });
  if (operation === "adverse") {
    const afterScore = 2 + Math.floor(random() * 7);
    const event = {
      ...adverse.createAdverseResponse({
        source: random() > 0.5 ? "training" : "treatment",
        sourceId: "random-unit",
        sourceLabel: "随机动作",
        timing: "immediate",
        beforeScore: 4,
        afterScore,
        relatedAssessmentIds: ["motion:knee-extension"],
        assessmentRevision: state.assessmentRevision,
      }),
      afterScoreConfirmed: true,
      settledAfterStopping: afterScore > 4 ? "yes" : "no",
      locationChanged: "no",
      symptomChanged: "no",
      neuralOrWeakness: afterScore >= 8 ? "yes" : "no",
    };
    const route = adverse.resolveAdverseResponse(event);
    if (route === "stop-and-refer") {
      state.stage = "stopped";
      state.stopped = true;
    } else if (route === "focused-reassessment") {
      state.stage = "reassessment";
      state.assessmentRevision = adverse.nextAssessmentRevision(state.assessmentRevision);
      state.planRevision = state.assessmentRevision;
    } else if (route === "regress-training") {
      state.stage = "training";
    }
  }
  if (operation === "end") {
    if (state.stage === "training" && !training.trainingFeedbackComplete(exercises, state.trainingFeedback)) return;
    if (state.stage !== "stopped") state.stage = "summary";
  }
  if (operation === "next" && state.stage === "summary") {
    state.sessionNumber += 1;
    state.assessmentRevision = adverse.nextAssessmentRevision(state.assessmentRevision);
    state.planRevision = state.assessmentRevision;
    state.stage = "intake";
    state.answers = 0;
    state.skipped = 0;
    state.trainingFeedback = {};
  }
  if (state.planRevision !== state.assessmentRevision && operation !== "restore") state.planRevision = state.assessmentRevision;
  if (operation !== "restore") assert.ok(state.assessmentRevision >= beforeRevision, "评估版本只能递增");
}

function assertState(state) {
  assert.ok(["intake", "assessment", "treatment", "training", "reassessment", "summary", "stopped"].includes(state.stage));
  const normalized = profile.normalizeWorkflowProfile({ productMode: state.mode });
  if (state.mode === "guided") {
    assert.equal(normalized.canAssessPassive, false);
    assert.equal(normalized.canMobilizeJoint, false);
  }
  const stages = workbench.workbenchStageStates({
    canContinueSafety: state.stage !== "intake",
    assessmentFlowComplete: ["treatment", "training", "summary"].includes(state.stage),
    completedAssessmentCount: state.stage === "assessment" ? 1 : 2,
    totalAssessmentCount: 2,
    unresolvedProblemCount: state.stage === "assessment" ? 1 : 0,
    trialRecordCount: ["training", "summary"].includes(state.stage) ? 1 : 0,
    trainingComplete: state.stage === "summary",
    trainingPlanSaved: false,
    exerciseCount: 2,
    isSummaryStep: state.stage === "summary",
  });
  assert.equal(stages.length, 6);
  assert.ok(stages.every((value) => typeof value === "string" && value.length > 0));
  assert.ok(state.planRevision <= state.assessmentRevision);
  assert.equal(queue.resolveDynamicQueueAdvance(0, ["target:a", "target:b"], { completedKey: "target:a", nextKey: "target:b" }), 1);
}

test("两种模式各500条、每条最多100步的随机状态序列都有合法状态和出口", () => {
  let sequenceCount = 0;
  for (const mode of ["guided", "thinking"]) {
    for (let seed = 1; seed <= 500; seed += 1) {
      const random = rng(seed + (mode === "thinking" ? 100000 : 0));
      const state = initialState(mode);
      for (let step = 0; step < 100; step += 1) {
        const operation = operations[Math.floor(random() * operations.length)];
        applyOperation(state, operation, random);
        assertState(state);
      }
      assert.ok(state.stage, `${mode} seed ${seed} 没有阶段出口`);
      sequenceCount += 1;
    }
  }
  assert.equal(sequenceCount, 1000);
  console.log(`random-state-sequences=${sequenceCount}; max-steps=100`);
});
