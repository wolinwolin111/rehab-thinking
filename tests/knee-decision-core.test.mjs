import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../app/knee-decision-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const {
  buildKneeDecision,
  buildKneeProblems,
  buildKneeRetestPlan,
  buildKneeTreatmentUnits,
  canonicalKneeAction,
} = await import(moduleUrl);

const chief = {
  id: "chief-1",
  side: "right",
  location: "膝内侧",
  sensation: "酸痛",
  action: "下楼梯",
  score: 6,
};

const extensionLimited = {
  id: "motion:knee-extension",
  kind: "motion-range",
  side: "right",
  action: "把膝盖绷直",
  direction: "extension",
  result: "limited",
  activeRange: "limited",
  passiveRange: "limited",
  locations: ["大腿外侧"],
};

test("normalizes common knee task aliases", () => {
  assert.equal(canonicalKneeAction("下楼梯时疼"), "step-down");
  assert.equal(canonicalKneeAction("做下台阶会不适"), "step-down");
  assert.equal(canonicalKneeAction("膝盖绷直"), "knee-extension");
});

test("merges complaint and assessment evidence for the same task", () => {
  const problems = buildKneeProblems([chief], [{
    id: "function:knee-step-down",
    kind: "motion-symptom",
    side: "right",
    action: "下台阶",
    result: "painful",
    symptomScore: 6,
  }]);
  const stepDown = problems.filter((problem) => problem.canonicalActionId === "step-down");
  assert.equal(stepDown.length, 1);
  assert.deepEqual(new Set(stepDown[0].sourceLabels), new Set(["主诉", "评估检查"]));
});

test("keeps a compound complaint task separate from knee extension", () => {
  const problems = buildKneeProblems([chief], [extensionLimited]);
  assert.ok(problems.some((problem) => problem.canonicalActionId === "step-down"));
  assert.ok(problems.some((problem) => problem.canonicalActionId === "knee-extension"));
  assert.equal(problems.length, 2);
});

test("turns a location-only finding into a readable problem title", () => {
  const problems = buildKneeProblems([], [{
    id: "medial-tender",
    kind: "tenderness",
    side: "right",
    result: "painful",
    locations: ["鹅足周围", "大腿内侧"],
  }]);
  assert.equal(problems[0]?.title, "鹅足周围、大腿内侧按压不适");
});

test("a relevant muscle unit updates the complaint and related range in one retest round", () => {
  const input = { role: "general", complaints: [chief], findings: [extensionLimited] };
  const problems = buildKneeProblems(input.complaints, input.findings);
  const units = buildKneeTreatmentUnits(input, problems);
  const lateral = units.find((unit) => unit.id === "knee-lateral-chain");
  assert.ok(lateral);
  assert.deepEqual(new Set(lateral.relatedActionIds), new Set(["step-down", "knee-extension"]));
  const plan = buildKneeRetestPlan(input, problems, lateral);
  assert.deepEqual(new Set(plan.map((item) => item.actionId)), new Set(["step-down", "knee-extension"]));
});

test("an ordinary user can route a limited extension through the selected anterior thigh area", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [{ ...chief, action: "膝盖绷直", location: "膝前" }],
    findings: [{
      ...extensionLimited,
      passiveRange: "not-checked",
      locations: ["大腿前侧"],
      locationChecked: true,
    }],
  });
  const anterior = decision.treatmentUnits.find((unit) => unit.id === "knee-extension-anterior-lateral");
  assert.ok(anterior);
  assert.deepEqual(anterior.relatedActionIds, ["knee-extension"]);
  assert.equal(decision.treatmentUnits.some((unit) => unit.kind === "joint"), false);
});

test("an ordinary user can route a limited extension through the selected medial thigh area", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [{ ...chief, action: "膝盖绷直" }],
    findings: [{
      ...extensionLimited,
      passiveRange: "not-checked",
      locations: ["大腿内侧"],
      locationChecked: true,
    }],
  });
  const medial = decision.treatmentUnits.find((unit) => unit.id === "knee-medial-adductor");
  assert.ok(medial);
  assert.deepEqual(medial.relatedActionIds, ["knee-extension"]);
});

test("turns an already completed treatment region into a retest-only unit", () => {
  const input = {
    role: "general",
    complaints: [chief],
    findings: [extensionLimited],
    completedTreatments: [{ unitId: "old", dedupKey: "right:muscle:lateral-chain", completedAt: 1 }],
  };
  const decision = buildKneeDecision(input);
  const lateral = decision.treatmentUnits.find((unit) => unit.dedupKey === "right:muscle:lateral-chain");
  assert.equal(lateral?.mode, "retest-only");
});

test("reuses an identical observation when no new treatment occurred", () => {
  const input = {
    role: "general",
    complaints: [chief],
    findings: [extensionLimited],
    completedTreatments: [{ unitId: "lateral", dedupKey: "right:muscle:lateral-chain", completedAt: 1 }],
    observations: [{ id: "obs-step", actionId: "step-down", treatmentSequence: 1, problemIds: ["problem:chief:chief-1"], values: { score: 4 } }],
  };
  const problems = buildKneeProblems(input.complaints, input.findings);
  const lateral = buildKneeTreatmentUnits(input, problems).find((unit) => unit.id === "knee-lateral-chain");
  const plan = buildKneeRetestPlan(input, problems, lateral);
  assert.equal(plan.find((item) => item.actionId === "step-down")?.reuseObservationId, "obs-step");
});

test("does not reuse a result after another treatment was added", () => {
  const input = {
    role: "general",
    complaints: [chief],
    findings: [extensionLimited],
    completedTreatments: [
      { unitId: "first", dedupKey: "right:muscle:first", completedAt: 1 },
      { unitId: "second", dedupKey: "right:muscle:second", completedAt: 2 },
    ],
    observations: [{ id: "old", actionId: "step-down", treatmentSequence: 1, problemIds: ["problem:chief:chief-1"], values: { score: 4 } }],
  };
  const problems = buildKneeProblems(input.complaints, input.findings);
  const lateral = buildKneeTreatmentUnits(input, problems).find((unit) => unit.id === "knee-lateral-chain");
  const plan = buildKneeRetestPlan(input, problems, lateral);
  assert.equal(plan.find((item) => item.actionId === "step-down")?.reuseObservationId, undefined);
});

test("strength problems go to training instead of immediate retesting", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [chief],
    findings: [{ id: "strength:knee-quadriceps", kind: "strength", side: "right", result: "weak" }],
  });
  const strength = decision.problems.find((problem) => problem.kind === "strength");
  assert.equal(strength?.status, "handoff-to-training");
  assert.ok(decision.deferredProblemIds.includes(strength.id));
});

test("swelling is reviewed later rather than after every treatment", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [{ ...chief, action: undefined, sensation: "胀" }],
    findings: [{ id: "swelling:knee", kind: "swelling", side: "right", result: "painful", locations: ["髌骨周围"] }],
  });
  assert.equal(decision.currentTreatment?.kind, "symptom-management");
  assert.ok(decision.retestPlan.every((item) => item.timing === "later"));
});

test("knee swelling hands off to the anterior-thigh unit instead of ending the session", () => {
  const input = {
    role: "general",
    complaints: [{ ...chief, location: "膝盖下缘", action: "下蹲", sensation: "疼痛" }],
    findings: [
      { id: "swelling:knee", kind: "swelling", side: "right", result: "painful", locations: ["髌骨下方"] },
      { id: "function:knee-squat", kind: "motion-symptom", side: "right", action: "下蹲", result: "painful", symptomScore: 8 },
    ],
  };
  const first = buildKneeDecision(input);
  assert.equal(first.currentTreatment?.id, "knee-swelling-management");
  const afterSwelling = buildKneeDecision({
    ...input,
    completedTreatments: [{ unitId: "knee-swelling-management", dedupKey: "right:symptom-management:knee-swelling", completedAt: 1 }],
  });
  assert.equal(afterSwelling.currentTreatment?.id, "knee-anterior-thigh-rectus-femoris");
});

test("knee swelling with a clear complaint but no motion finding opens the first motion screen after swelling", () => {
  const input = {
    role: "general",
    complaints: [{ ...chief, location: "膝盖周围", action: "下蹲", sensation: "疼痛" }],
    findings: [{ id: "swelling:knee", kind: "swelling", side: "right", result: "painful", locations: ["膝盖周围"] }],
  };
  const before = buildKneeDecision(input);
  assert.equal(before.currentTreatment?.kind, "symptom-management");
  const after = buildKneeDecision({
    ...input,
    completedTreatments: [{ unitId: "knee-swelling-management", dedupKey: "right:symptom-management:knee-swelling", completedAt: 1 }],
  });
  assert.equal(after.currentTreatment, undefined);
  assert.equal(after.assessmentChecks[0]?.actionId, "knee-extension");
});

test("joint mobilization is permission-gated and follows one related muscle round", () => {
  const general = buildKneeDecision({ role: "general", complaints: [chief], findings: [extensionLimited] });
  const rehabBeforeMuscle = buildKneeDecision({ role: "rehab", complaints: [chief], findings: [extensionLimited] });
  const rehabAfterMuscle = buildKneeDecision({
    role: "rehab",
    complaints: [chief],
    findings: [extensionLimited],
    completedTreatments: [{
      unitId: "knee-extension-lateral-chain",
      dedupKey: "right:muscle:lateral-chain",
      completedAt: 1,
      relatedActionIds: ["knee-extension"],
    }],
    observations: [{
      id: "extension-after-muscle",
      actionId: "knee-extension",
      treatmentSequence: 1,
      problemIds: ["problem:motion:knee-extension"],
      values: { "active-range": "limited", "passive-range": "limited" },
    }, {
      id: "step-down-after-muscle",
      actionId: "step-down",
      treatmentSequence: 1,
      problemIds: ["problem:chief:chief-1"],
      values: { score: 4 },
    }],
  });
  assert.equal(general.treatmentUnits.some((unit) => unit.kind === "joint"), false);
  assert.equal(rehabBeforeMuscle.treatmentUnits.some((unit) => unit.id === "knee-extension-joint"), false);
  assert.ok(rehabAfterMuscle.treatmentUnits.some((unit) => unit.id === "knee-extension-joint"));
  assert.equal(rehabAfterMuscle.currentTreatment?.id, "knee-extension-joint");
});

test("does not unlock joint treatment until the post-muscle retest still shows passive limitation", () => {
  const decision = buildKneeDecision({
    role: "rehab",
    complaints: [chief],
    findings: [extensionLimited],
    completedTreatments: [{ unitId: "lateral", dedupKey: "right:muscle:lateral-chain", completedAt: 1, relatedActionIds: ["knee-extension"] }],
  });
  assert.equal(decision.treatmentUnits.some((unit) => unit.kind === "joint"), false);
  assert.equal(decision.currentTreatment?.dedupKey, "right:muscle:lateral-chain");
  assert.deepEqual(new Set(decision.retestPlan.map((item) => item.actionId)), new Set(["step-down", "knee-extension"]));
  assert.deepEqual(decision.assessmentChecks, []);
});

test("keeps the latest value of each metric when score and range are recorded separately", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [{ ...chief, action: "膝盖绷直" }],
    findings: [extensionLimited],
    observations: [
      { id: "range-first", actionId: "knee-extension", treatmentSequence: 1, problemIds: [], values: { "active-range": "matches", "passive-range": "matches" } },
      { id: "score-later", actionId: "knee-extension", treatmentSequence: 1, problemIds: [], values: { score: 2 } },
    ],
  });
  const rangeProblem = decision.problems.find((problem) => problem.kind === "motion-range");
  assert.equal(rangeProblem?.status, "resolved");
});

test("does not combine a new score with range data from an older treatment sequence", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [{ ...chief, action: "膝盖绷直" }],
    findings: [extensionLimited],
    observations: [
      { id: "old-range", actionId: "knee-extension", treatmentSequence: 1, problemIds: [], values: { "active-range": "matches", "passive-range": "matches" } },
      { id: "new-score", actionId: "knee-extension", treatmentSequence: 2, problemIds: [], values: { score: 2 } },
    ],
  });
  const rangeProblem = decision.problems.find((problem) => problem.kind === "motion-range");
  assert.notEqual(rangeProblem?.status, "resolved");
});

test("does not reuse a partial observation when the same action still lacks a required metric", () => {
  const completed = { unitId: "anterior-lateral", dedupKey: "right:muscle:extension-anterior-lateral", completedAt: 1, relatedActionIds: ["knee-extension"] };
  const decision = buildKneeDecision({
    role: "general",
    complaints: [{ ...chief, action: "膝盖绷直" }],
    findings: [extensionLimited],
    completedTreatments: [completed],
    observations: [
      { id: "score-only", actionId: "knee-extension", treatmentSequence: 1, problemIds: [], values: { score: 3 } },
    ],
  });
  assert.equal(decision.currentTreatment?.dedupKey, completed.dedupKey);
  assert.ok(decision.retestPlan.some((item) => item.actionId === "knee-extension" && !item.reuseObservationId));
});

test("the latest passive-range result controls the joint-treatment gate", () => {
  const decision = buildKneeDecision({
    role: "rehab",
    complaints: [{ ...chief, action: "膝盖绷直" }],
    findings: [extensionLimited],
    completedTreatments: [{ unitId: "lateral", dedupKey: "right:muscle:lateral-chain", completedAt: 1, relatedActionIds: ["knee-extension"] }],
    observations: [
      { id: "passive-limited-first", actionId: "knee-extension", treatmentSequence: 1, problemIds: [], values: { "active-range": "limited", "passive-range": "limited" } },
      { id: "passive-restored-later", actionId: "knee-extension", treatmentSequence: 1, problemIds: [], values: { "active-range": "limited", "passive-range": "matches" } },
    ],
  });
  assert.equal(decision.treatmentUnits.some((unit) => unit.id === "knee-extension-joint"), false);
  assert.ok(decision.treatmentUnits.some((unit) => unit.id === "knee-extension-control"));
});

test("an older treatment sequence cannot reopen a joint gate after the current sequence recovered", () => {
  const decision = buildKneeDecision({
    role: "rehab",
    complaints: [{ ...chief, action: "膝盖绷直" }],
    findings: [extensionLimited],
    completedTreatments: [
      { unitId: "lateral", dedupKey: "right:muscle:lateral-chain", completedAt: 1, relatedActionIds: ["knee-extension"] },
      { unitId: "anterior", dedupKey: "right:muscle:anterior-thigh", completedAt: 2, relatedActionIds: ["knee-extension"] },
    ],
    observations: [
      { id: "old-limited", actionId: "knee-extension", treatmentSequence: 1, problemIds: [], values: { "active-range": "limited", "passive-range": "limited" } },
      { id: "current-recovered", actionId: "knee-extension", treatmentSequence: 2, problemIds: [], values: { "active-range": "matches", "passive-range": "matches" } },
    ],
  });
  assert.equal(decision.treatmentUnits.some((unit) => unit.id === "knee-extension-joint"), false);
});

test("moves past a completed treatment after its affected actions have been recorded", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [chief],
    findings: [extensionLimited],
    completedTreatments: [{ unitId: "medial", dedupKey: "right:muscle:medial-thigh-pes", completedAt: 1, relatedActionIds: ["step-down", "knee-extension"] }],
    observations: [
      { id: "step-after-medial", actionId: "step-down", treatmentSequence: 1, problemIds: [], values: { score: 4 } },
      { id: "extension-after-medial", actionId: "knee-extension", treatmentSequence: 1, problemIds: [], values: { "active-range": "limited" } },
    ],
  });
  assert.notEqual(decision.currentTreatment?.dedupKey, "right:muscle:medial-thigh-pes");
});

test("offers one simple next check when the complaint action is unclear", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [{ id: "vague", side: "right", location: "膝内侧", sensation: "不舒服" }],
    findings: [],
  });
  assert.equal(decision.currentTreatment, undefined);
  assert.equal(decision.assessmentChecks.length, 1);
  assert.equal(decision.assessmentChecks[0].actionId, "knee-extension");
});

test("unknown extension result advances to one flexion check without creating treatment", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [{ id: "vague", side: "right", location: "膝周围", sensation: "说不清" }],
    findings: [{ id: "extension-unknown", kind: "motion-range", side: "right", direction: "extension", result: "unknown" }],
  });
  assert.equal(decision.currentTreatment, undefined);
  assert.equal(decision.assessmentChecks[0]?.actionId, "knee-flexion");
});

test("a normal extension check still advances to flexion when the complaint is vague", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [{ id: "vague", side: "right", location: "膝周围", sensation: "说不清" }],
    findings: [{ id: "extension-normal", kind: "motion-range", side: "right", direction: "extension", result: "normal", activeRange: "matches" }],
  });
  assert.equal(decision.currentTreatment, undefined);
  assert.equal(decision.assessmentChecks[0]?.actionId, "knee-flexion");
});

test("completed basic range checks are not asked again", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [{ id: "vague", side: "right", location: "膝周围", sensation: "说不清" }],
    findings: [
      { id: "extension-normal", kind: "motion-range", side: "right", direction: "extension", result: "normal", activeRange: "matches" },
      { id: "flexion-normal", kind: "motion-range", side: "right", direction: "flexion", result: "normal", activeRange: "matches" },
    ],
  });
  assert.equal(decision.currentTreatment, undefined);
  assert.deepEqual(decision.assessmentChecks, []);
});

test("function-control and quadriceps weakness create training entries without immediate strength retest", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [chief],
    findings: [
      { id: "step-control", kind: "function-control", side: "right", action: "下台阶", result: "unstable" },
      { id: "quadriceps-weak", kind: "strength", side: "right", result: "weak", locations: ["股四头肌"] },
    ],
  });
  assert.ok(decision.treatmentUnits.some((unit) => unit.id === "knee-hip-knee-control"));
  const strength = decision.treatmentUnits.find((unit) => unit.id === "knee-quadriceps-strength");
  assert.ok(strength);
  assert.deepEqual(strength.relatedActionIds, []);
});

test("marks an improved complaint separately while keeping an unresolved range problem active", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [chief],
    findings: [extensionLimited],
    observations: [
      { id: "chief-improved", actionId: "step-down", treatmentSequence: 1, problemIds: [], values: { score: 3 } },
      { id: "extension-still-limited", actionId: "knee-extension", treatmentSequence: 1, problemIds: [], values: { "active-range": "limited", "passive-range": "limited" } },
    ],
  });
  assert.equal(decision.problems.find((problem) => problem.canonicalActionId === "step-down")?.status, "improved");
  const extension = decision.problems.find((problem) => problem.canonicalActionId === "knee-extension");
  assert.equal(extension?.status, "still-present");
  assert.equal(decision.currentProblemId, extension?.id);
  assert.ok(decision.currentTreatment);
  assert.deepEqual(decision.currentTreatment.relatedActionIds, ["knee-extension"]);
  assert.equal(decision.retestPlan.some((item) => item.actionId === "step-down"), false);
});

test("passive range recovery does not resolve an active range limitation", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [{ ...chief, action: "膝盖绷直" }],
    findings: [{ ...extensionLimited, passiveRange: "matches", locations: ["大腿前侧"], locationChecked: true }],
    observations: [{
      id: "extension-active-still-limited",
      actionId: "knee-extension",
      treatmentSequence: 1,
      problemIds: [],
      values: { "active-range": "limited", "passive-range": "matches" },
    }],
  });
  const extension = decision.problems.find((problem) => problem.kind === "motion-range");
  assert.equal(extension?.status, "still-present");
  assert.ok(decision.treatmentUnits.some((unit) => unit.id === "knee-extension-control"));
});

test("retests an improved complaint once at the end instead of after every remaining treatment", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [chief],
    findings: [extensionLimited],
    observations: [
      { id: "chief-improved", actionId: "step-down", treatmentSequence: 2, problemIds: [], values: { score: 3 } },
      { id: "extension-restored", actionId: "knee-extension", treatmentSequence: 2, problemIds: [], values: { "active-range": "matches", "passive-range": "matches" } },
    ],
  });
  assert.equal(decision.currentTreatment, undefined);
  assert.deepEqual(decision.finalRetestPlan.map((item) => item.actionId), ["step-down"]);
});

test("uses one posterior treatment region for supported flexion or extension limitations", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [{ ...chief, location: "膝后", action: "弯膝" }],
    findings: [{
      id: "flexion-posterior",
      kind: "motion-range",
      side: "right",
      action: "弯膝",
      direction: "flexion",
      result: "limited",
      activeRange: "limited",
      passiveRange: "not-checked",
      locations: ["膝后", "小腿上端"],
    }],
  });
  const posterior = decision.treatmentUnits.find((unit) => unit.id === "knee-posterior-calf-muscle");
  assert.ok(posterior);
  assert.deepEqual(posterior.relatedActionIds, ["knee-flexion"]);
});

test("asks for one location check instead of inventing a flexion treatment without local evidence", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [{ ...chief, location: "膝周围", action: "弯膝" }],
    findings: [{ id: "flexion-no-site", kind: "motion-range", side: "right", action: "弯膝", direction: "flexion", result: "limited", activeRange: "limited", passiveRange: "not-checked" }],
  });
  assert.equal(decision.treatmentUnits.some((unit) => unit.kind === "muscle"), false);
  assert.equal(decision.assessmentChecks.length, 1);
  assert.match(decision.assessmentChecks[0].title, /弯膝/);
});

test("after the flexion location check finds no clear site, the flow moves to flexion control without asking again", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [{ ...chief, location: "膝周围", action: "弯膝" }],
    findings: [{
      id: "flexion-no-clear-site",
      kind: "motion-range",
      side: "right",
      action: "弯膝",
      direction: "flexion",
      result: "limited",
      activeRange: "limited",
      passiveRange: "not-checked",
      locationChecked: true,
    }],
  });
  assert.equal(decision.assessmentChecks.length, 0);
  assert.equal(decision.currentTreatment?.id, "knee-flexion-control");
});

test("does not generate another treatment for a fully resolved action", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [{ ...chief, action: "膝盖绷直" }],
    findings: [extensionLimited],
    observations: [{
      id: "extension-resolved",
      actionId: "knee-extension",
      treatmentSequence: 1,
      problemIds: [],
      values: { score: 0, "active-range": "matches", "passive-range": "matches" },
    }],
  });
  assert.ok(decision.problems.every((problem) => problem.status === "resolved"));
  assert.equal(decision.currentTreatment, undefined);
});

test("infrapatellar pain can call the rectus-femoris unit when anterior-thigh examination supports it", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [{ ...chief, location: "膝下", action: "下台阶" }],
    findings: [
      { id: "tension:anterior-thigh", kind: "tenderness", side: "right", result: "painful", locations: ["股直肌"] },
      { id: "motion:knee-flexion", kind: "motion-range", side: "right", action: "屈膝", direction: "flexion", result: "limited", activeRange: "limited", passiveRange: "not-checked" },
      { id: "function:knee-squat", kind: "motion-symptom", side: "right", action: "下蹲", result: "painful", symptomScore: 5 },
    ],
  });
  const anterior = decision.treatmentUnits.find((unit) => unit.id === "knee-anterior-thigh-rectus-femoris");
  assert.ok(anterior);
  assert.deepEqual(new Set(anterior.relatedActionIds), new Set(["step-down", "squat", "knee-flexion"]));
});

test("infrapatellar pain on step-down keeps an anterior-thigh first trial even when range is not limited", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [{ ...chief, location: "髌骨下方", action: "下楼梯" }],
    findings: [
      { id: "motion:knee-extension", kind: "motion-range", side: "right", action: "膝盖绷直", direction: "extension", result: "normal", activeRange: "matches", passiveRange: "not-checked" },
      { id: "motion:knee-flexion", kind: "motion-range", side: "right", action: "弯膝", direction: "flexion", result: "normal", activeRange: "matches", passiveRange: "not-checked" },
      { id: "function:knee-step-down", kind: "motion-symptom", side: "right", action: "下台阶", result: "painful", symptomScore: 5 },
    ],
  });
  assert.equal(decision.currentTreatment?.id, "knee-anterior-thigh-rectus-femoris");
  assert.deepEqual(decision.assessmentChecks, []);
  assert.ok(decision.currentTreatment?.relatedActionIds.includes("step-down"));
});

test("infrapatellar squat complaint keeps the rectus-femoris trial when the function card is merged into the chief", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [{ ...chief, location: "髌骨下方 / 髌腱", action: "下蹲" }],
    findings: [],
  });
  assert.equal(decision.currentTreatment?.id, "knee-anterior-thigh-rectus-femoris");
  assert.ok(decision.currentTreatment?.relatedActionIds.includes("squat"));
});

test("infrapatellar load pain keeps the rectus-femoris first trial when extension is also limited", () => {
  const decision = buildKneeDecision({
    role: "general",
    complaints: [{ ...chief, location: "膝盖下缘", action: "下蹲" }],
    findings: [
      { id: "motion:knee-extension", kind: "motion-range", side: "right", action: "膝盖绷直", direction: "extension", result: "limited", activeRange: "limited", passiveRange: "not-checked" },
      { id: "motion:knee-flexion", kind: "motion-range", side: "right", action: "弯膝", direction: "flexion", result: "limited", activeRange: "limited", passiveRange: "not-checked" },
      { id: "function:knee-squat", kind: "motion-symptom", side: "right", action: "下蹲", result: "painful", symptomScore: 8 },
    ],
  });
  assert.equal(decision.currentTreatment?.id, "knee-anterior-thigh-rectus-femoris");
  assert.ok(decision.currentTreatment?.relatedActionIds.includes("squat"));
});
