import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const core = await loadTypeScriptModule("./src/domain/rehab/retest/retest-obligation-core.ts");
const workflow = await loadTypeScriptModule("./src/features/rehabmind/workflow/workflow-orchestrator.ts");
const targetBuilder = await loadTypeScriptModule("./src/domain/rehab/treatment/build-trial-targets-core.ts");

const stepDown = {
  assessmentId: "function:knee-step-down",
  label: "台阶下降控制检查",
  baselineCompletion: "unable",
  mode: "completion-status",
  baselineScore: 8,
};

test("executed treatment keeps its unfinished function retest after the live candidate queue changes", () => {
  const pending = core.pendingFunctionRetests({
    targets: [{ candidates: [{ id: "muscle:quadriceps" }], functionRetestObligations: [stepDown] }],
    records: [{ candidateId: "muscle:quadriceps", targetId: "target:motion:knee-flexion" }],
  });
  assert.deepEqual(pending.map((item) => item.assessmentId), ["function:knee-step-down"]);

  const completed = core.pendingFunctionRetests({
    targets: [{ candidates: [{ id: "muscle:quadriceps" }], functionRetestObligations: [stepDown] }],
    records: [{
      candidateId: "muscle:quadriceps",
      targetId: "target:motion:knee-flexion",
      functionRetests: {
        "function:knee-step-down": { ...stepDown, afterCompletion: "complete", afterScore: 5 },
      },
    }],
  });
  assert.deepEqual(completed, []);
});

test("completion-status 有疼痛基线时，能完成但未打分不算已复测", () => {
  const pending = core.pendingFunctionRetests({
    targets: [{ candidates: [{ id: "muscle:quadriceps" }], functionRetestObligations: [stepDown] }],
    records: [{
      candidateId: "muscle:quadriceps",
      targetId: "target:motion:knee-flexion",
      functionRetests: {
        "function:knee-step-down": { ...stepDown, afterCompletion: "complete" },
      },
    }],
  });
  assert.deepEqual(pending.map((item) => item.assessmentId), ["function:knee-step-down"]);
});

test("two performed function actions remain independent obligations", () => {
  const squat = { ...stepDown, assessmentId: "function:knee-squat", label: "下蹲" };
  const singleLeg = { ...stepDown, assessmentId: "function:knee-single-leg-squat", label: "单腿下蹲", baselineScore: 7 };
  const summary = core.summarizeFunctionRetestObligations({
    obligations: [squat, singleLeg],
    answers: {
      "function:knee-squat": { completion: "complete" },
    },
  });
  assert.equal(summary.ready, false);
  assert.equal(summary.records, undefined);

  const complete = core.summarizeFunctionRetestObligations({
    obligations: [squat, singleLeg],
    answers: {
      "function:knee-squat": { completion: "complete", score: 5, scoreConfirmed: true },
      "function:knee-single-leg-squat": { completion: "unable", unableReason: "pain", score: 7, scoreConfirmed: true },
    },
  });
  assert.equal(complete.ready, true);
  assert.deepEqual(Object.keys(complete.records), ["function:knee-squat", "function:knee-single-leg-squat"]);
  assert.equal(complete.result, "partial");
});

test("completion-status 分数对比：降=better、平=partial、未完成但降=partial", () => {
  const summarize = (answer) => core.summarizeFunctionRetestObligations({
    obligations: [stepDown],
    answers: { "function:knee-step-down": answer },
  });
  assert.equal(summarize({ completion: "complete", score: 5, scoreConfirmed: true }).result, "better");
  assert.equal(summarize({ completion: "complete", score: 8, scoreConfirmed: true }).result, "partial");
  assert.equal(summarize({ completion: "complete", score: 9, scoreConfirmed: true }).result, "worse");
  assert.equal(summarize({ completion: "unable", unableReason: "pain", score: 4, scoreConfirmed: true }).result, "partial");
  assert.equal(summarize({ completion: "unable", unableReason: "pain", score: 8, scoreConfirmed: true }).result, "same");
  // 没力/不敢没有疼痛可比性要求，不打分也算答完。
  assert.equal(summarize({ completion: "unable", unableReason: "weak" }).result, "same");
  assert.equal(summarize({ completion: "unable", unableReason: "weak" }).ready, true);
  // 能完成但没打分 → 未答完。
  assert.equal(summarize({ completion: "complete" }).ready, false);
});

test("bilateral function retest requires and stores both sides", () => {
  const bilateral = { ...stepDown, sides: ["左侧", "右侧"] };
  assert.equal(core.summarizeFunctionRetestObligations({
    obligations: [bilateral],
    answers: { "function:knee-step-down::左侧": { completion: "complete" } },
  }).ready, false);

  const summary = core.summarizeFunctionRetestObligations({
    obligations: [bilateral],
    answers: {
      "function:knee-step-down::左侧": { completion: "complete", score: 5, scoreConfirmed: true },
      "function:knee-step-down::右侧": { completion: "unable", unableReason: "weak" },
    },
  });
  assert.equal(summary.ready, true);
  assert.equal(summary.records[stepDown.assessmentId].sideResults["左侧"].afterCompletion, "complete");
  assert.equal(summary.records[stepDown.assessmentId].sideResults["右侧"].afterCompletion, "unable");
});

test("a restored bilateral draft with only one side remains pending", () => {
  const bilateral = { ...stepDown, sides: ["左侧", "右侧"] };
  const pending = core.pendingFunctionRetests({
    targets: [{ candidates: [{ id: "muscle:calf" }], functionRetestObligations: [bilateral] }],
    records: [{
      candidateId: "muscle:calf",
      targetId: "target:function:knee-step-down",
      functionRetests: {
        "function:knee-step-down": {
          ...bilateral,
          afterCompletion: "complete",
          sideResults: { 左侧: { afterCompletion: "complete" } },
        },
      },
    }],
  });
  assert.deepEqual(pending.map((item) => item.assessmentId), ["function:knee-step-down"]);
});

test("range and function results use the strict combined outcome", () => {
  assert.equal(core.combineRetestResults("better", "same"), "partial");
  assert.equal(core.combineRetestResults("better", "worse"), "worse");
  assert.equal(core.combineRetestResults("better", "better"), "better");
});

test("an empty treatment queue cannot unlock training while a required retest is pending", () => {
  const base = {
    intakeComplete: true,
    safetyComplete: true,
    adverseResponse: false,
    planIsCurrent: true,
    assessmentReadyForTreatment: true,
    assessmentNeedsReferral: false,
    queueRefreshing: false,
    pendingAssessmentCheck: false,
    queueLength: 0,
    queueIndex: 0,
    bilateral: false,
    assessmentComplete: true,
    safetySignal: false,
    treatmentWorsened: false,
    trainingComplete: false,
    trainingPlanSaved: false,
  };
  assert.equal(workflow.projectWorkflowState({ ...base, pendingRetestCount: 1 }).treatmentComplete, false);
  assert.equal(workflow.projectWorkflowState({ ...base, pendingRetestCount: 0 }).treatmentComplete, true);
});

test("performed painful function findings create obligations, fear and instruction do not", () => {
  const candidate = {
    id: "muscle:quadriceps", title: "大腿前侧轻柔处理", type: "muscle", access: "self",
    observe: "", retest: "", tags: ["squat"], retestIds: ["knee-flexion"],
  };
  const makeContext = (functionUnableReason) => ({
    // 这里只验证功能证据能否生成复查义务，不引入膝部专用决策对候选的二次过滤。
    region: { id: "hip", shortName: "髋", mobilityInterventions: [], candidateGroups: [{ candidates: [candidate] }] },
    findings: [{ id: "function:knee-squat", priority: "support", title: "下蹲因为不适无法完成", side: "右侧", tags: ["squat"] }],
    assessmentResults: { "function:knee-squat": { simple: functionUnableReason === "pain" ? "unable" : "skip", functionCompletion: "unable", functionUnableReason, functionDiscomfort: functionUnableReason === "pain" ? "yes" : "no", symptomScore: 8 } },
    intake: { side: "右侧", reportedActions: [{ raw: "绷直膝盖" }], symptomType: "酸痛", userRole: "general", provocationTypes: [], symptoms: [], stabbingPalpation: "", goal: 3, description: "", baselineScore: 8, baselineScoreConfirmed: true },
    trialRecords: [], tissuePathway: { id: "standard" }, kneeDecision: null, localLimbDecision: null,
    matchedPilotRelations: [], pilotRelationsByAssessmentId: new Map(), pilotTreatmentUnits: [], matchedCandidateGroups: [],
    canAssessPassive: false, canMobilizeJoint: false, swellingGuidance: undefined,
    assessments: [{ id: "function:knee-squat", title: "下蹲", kind: "function" }],
    sharedTensionId: "shared:pilot-muscle-tension", assessmentTitle: (_id, title) => title,
    sharedTensionLocationsForMotion: () => [], chiefFunctionAssessmentId: () => "",
  });
  const pain = targetBuilder.buildTrialTargets(makeContext("pain"));
  assert.deepEqual(pain.flatMap((target) => target.functionRetestObligations ?? []).map((item) => item.assessmentId), ["function:knee-squat"]);
  assert.deepEqual(targetBuilder.buildTrialTargets(makeContext("fear")).flatMap((target) => target.functionRetestObligations ?? []), []);
  assert.deepEqual(targetBuilder.buildTrialTargets(makeContext("instruction")).flatMap((target) => target.functionRetestObligations ?? []), []);
});
