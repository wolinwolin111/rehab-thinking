import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const core = await loadTypeScriptModule("./src/domain/rehab/assessment/function-assessment-plan-core.ts");

const base = {
  reportedActions: [],
  customAction: "",
  reproduction: "",
  forceDirection: "",
  actionAnalysis: null,
  location: "",
  symptoms: [],
  onset: "1～6周",
  mechanism: "逐渐出现",
  goal: 2,
  isGuided: false,
};

const candidates = (ids) => ids.map((id) => ({ id, title: id, tags: [] }));
const plan = (patch, ids) => core.selectFunctionAssessmentPlan({
  ...base,
  ...patch,
  regionId: patch.regionId,
  candidates: candidates(ids),
  firstResults: {},
});

test("thigh sit-to-stand is selected only when the complaint names sitting or rising", () => {
  const selected = plan({ regionId: "thigh-local", reportedActions: [{ raw: "起身" }] }, ["thigh-walk", "thigh-sit-stand"]);
  assert.equal(selected[0].id, "thigh-sit-stand");
  assert.equal(core.chiefFunctionAssessmentIds({ ...base, reportedActions: [{ raw: "站" }] }, "thigh-local").includes("function:thigh-sit-stand"), false);
});

test("a knee stair complaint does not add heel raise as an unrelated function check", () => {
  const selected = plan({ regionId: "knee", reportedActions: [{ raw: "下楼" }] }, ["knee-step-down", "knee-squat", "knee-heel-raise"]);
  assert.equal(selected[0].id, "knee-step-down");
  assert.equal(selected.some((item) => item.id === "knee-heel-raise"), false);
});

test("jump and landing only enter the return-to-sport function stage", () => {
  const lowGoal = plan({ regionId: "knee", goal: 3, reportedActions: [{ raw: "跳跃落地" }] }, ["knee-hop-landing"]);
  const sportGoal = plan({ regionId: "knee", goal: 4, reportedActions: [{ raw: "跳跃落地" }] }, ["knee-hop-landing"]);
  assert.deepEqual(lowGoal, []);
  assert.equal(sportGoal[0].id, "knee-hop-landing");
});

test("an unmatched custom complaint is not disguised as a standard function task", () => {
  const selected = plan({ regionId: "knee", customAction: "抱孩子转身时不舒服" }, ["knee-squat", "knee-step-down", "knee-single-leg"]);
  assert.deepEqual(selected, []);
});

test("guided progression opens the next load only after a normal first result", () => {
  const first = plan({ regionId: "knee", isGuided: true, reportedActions: [] }, ["knee-squat", "knee-single-leg", "knee-single-leg-squat"]);
  assert.deepEqual(first.map((item) => item.id), ["knee-squat"]);
  const progressed = core.selectFunctionAssessmentPlan({
    ...base,
    regionId: "knee",
    isGuided: true,
    candidates: candidates(["knee-squat", "knee-single-leg", "knee-single-leg-squat"]),
    firstResults: { "function:knee-squat": "normal" },
  });
  assert.deepEqual(progressed.map((item) => item.id), ["knee-squat", "knee-single-leg"]);
});

test("guided explicit chief action opens the next function only after the chief is normal", () => {
  const initial = core.selectFunctionAssessmentPlan({
    ...base,
    regionId: "knee",
    isGuided: true,
    reportedActions: [{ raw: "下蹲" }],
    candidates: candidates(["knee-squat", "knee-single-leg", "knee-single-leg-squat"]),
    firstResults: {},
  });
  assert.deepEqual(initial.map((item) => item.id), ["knee-squat"]);

  const progressed = core.selectFunctionAssessmentPlan({
    ...base,
    regionId: "knee",
    isGuided: true,
    reportedActions: [{ raw: "下蹲" }],
    candidates: candidates(["knee-squat", "knee-single-leg", "knee-single-leg-squat"]),
    firstResults: { "function:knee-squat": "normal" },
  });
  assert.deepEqual(progressed.map((item) => item.id), ["knee-squat", "knee-single-leg"]);
});

test("M-06: 提取被跳过的主诉动作标题（剥离占位后缀）", () => {
  const findings = [
    { id: "track:function:knee-step-down", title: "下楼暂时没判断清楚", priority: "track", tags: ["chief-skip"] },
    { id: "track:function:knee-hop", title: "单腿跳暂时没判断清楚", priority: "track", tags: [] },
    { id: "function:knee-squat", title: "下蹲", priority: "support", tags: [] },
  ];
  assert.deepEqual(core.skippedChiefActionTitles(findings), ["下楼"]);
  assert.deepEqual(core.skippedChiefActionTitles([]), []);
});
