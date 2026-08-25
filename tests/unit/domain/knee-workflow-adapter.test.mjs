import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const coreSource = await readFile(new URL("../app/knee-decision-core.ts", import.meta.url), "utf8");
const adapterSource = await readFile(new URL("../app/knee-workflow-adapter.ts", import.meta.url), "utf8");
const coreCode = ts.transpileModule(coreSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const coreUrl = `data:text/javascript;base64,${Buffer.from(coreCode).toString("base64")}`;
const adapterCode = ts.transpileModule(adapterSource.replace('from "./knee-decision-core"', `from "${coreUrl}"`), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const adapterUrl = `data:text/javascript;base64,${Buffer.from(adapterCode).toString("base64")}`;
const { kneeCandidateAllowedInTreatmentQueue, kneeCandidateBelongsToCurrentDecision, kneeDecisionInputFromWorkflow, kneeExerciseIdsForDecision, kneeLegacyCandidateIdsForUnit, kneeRetestInstruction, kneeTreatmentInstruction } = await import(adapterUrl);
const { buildKneeDecision } = await import(coreUrl);

test("maps the current knee flexion assessment without guessing a missing treatment site", () => {
  const input = kneeDecisionInputFromWorkflow({
    role: "general",
    side: "右侧",
    location: "膝后侧",
    symptomType: "酸痛",
    action: "弯膝",
    baselineScore: 6,
    assessments: [{ id: "motion:knee-flexion", kind: "motion", title: "膝屈曲", active: "limited", passive: "skip" }],
  });
  const decision = buildKneeDecision(input);
  assert.equal(input.complaints[0].side, "right");
  assert.equal(input.findings[0].direction, "flexion");
  assert.equal(decision.treatmentUnits.some((unit) => unit.kind === "muscle"), false);
  assert.equal(decision.assessmentChecks.length, 1);
});

test("keeps flexion pain when flexion range is also limited", () => {
  const input = kneeDecisionInputFromWorkflow({
    role: "general",
    side: "右侧",
    location: "髌骨下方",
    symptomType: "刺痛",
    action: "下蹲",
    baselineScore: 6,
    symptoms: [],
    assessments: [{
      id: "motion:knee-flexion",
      kind: "motion",
      title: "膝屈曲",
      active: "limited",
      passive: "skip",
      discomfort: "yes",
      discomfortType: "刺痛",
      symptomScore: 5,
      discomfortLocations: ["髌骨下方"],
      tensionChecked: true,
    }],
  });
  assert.ok(input.findings.some((finding) => finding.kind === "motion-range" && finding.direction === "flexion"));
  const symptom = input.findings.find((finding) => finding.kind === "motion-symptom" && finding.direction === "flexion");
  assert.equal(symptom?.sensation, "刺痛");
  assert.equal(symptom?.symptomScore, 5);
  assert.deepEqual(symptom?.locations, ["髌骨下方"]);
});

test("maps treatment and range records so the joint gate uses the actual post-treatment result", () => {
  const input = kneeDecisionInputFromWorkflow({
    role: "rehab",
    side: "右侧",
    location: "膝后侧",
    symptomType: "牵扯感",
    action: "膝盖绷直",
    baselineScore: 4,
    assessments: [{ id: "motion:knee-extension", kind: "motion", title: "膝伸直", active: "limited", passive: "limited", tensionLocations: ["大腿外侧"] }],
    treatmentRecords: [{ candidateId: "knee-extension-lateral-chain", rangeOutcomes: { "knee-extension": "passive-limited" }, rangeScores: { "knee-extension": 3 } }],
  });
  const decision = buildKneeDecision(input);
  assert.ok(decision.treatmentUnits.some((unit) => unit.id === "knee-extension-joint"));
  assert.equal(decision.currentTreatment?.id, "knee-extension-joint");
});

test("maps an improved-but-still-limited professional PROM retest to the joint gate", () => {
  const input = kneeDecisionInputFromWorkflow({
    role: "rehab",
    side: "右侧",
    location: "膝后侧",
    symptomType: "牵扯感",
    action: "膝盖绷直",
    baselineScore: 6,
    assessments: [{
      id: "motion:knee-extension",
      kind: "motion",
      title: "膝伸直",
      active: "limited",
      passive: "limited",
      passiveEndFeel: "firm",
      tensionLocations: ["大腿外侧"],
    }],
    treatmentRecords: [{
      candidateId: "knee-extension-lateral-chain",
      rangeOutcomes: { "knee-extension": "better-passive-limited" },
      rangeScores: { "knee-extension": 3 },
      chiefRetested: true,
      afterScore: 3,
    }],
  });
  assert.equal(input.findings.find((finding) => finding.kind === "motion-range")?.passiveEndFeel, "firm");
  const decision = buildKneeDecision(input);
  assert.equal(decision.currentTreatment?.id, "knee-extension-joint");
});

test("pure passive assessments are recorded without inventing active weakness", () => {
  const input = kneeDecisionInputFromWorkflow({
    role: "rehab",
    side: "右侧",
    location: "膝前",
    symptomType: "酸痛",
    assessments: [{
      id: "motion:knee-patella-lateral",
      kind: "motion",
      title: "髌骨向外活动",
      passive: "limited",
      passiveEndFeel: "firm",
      passiveDiscomfort: "no",
    }],
  });
  const range = input.findings.find((finding) => finding.kind === "motion-range");
  assert.equal(range?.passiveRange, "limited");
  assert.equal(range?.activeRange, "unknown");
  assert.equal(input.findings.some((finding) => finding.kind === "strength"), false);
});

test("derives the treated knee direction from the recorded range retest", () => {
  const input = kneeDecisionInputFromWorkflow({
    role: "rehab",
    side: "右侧",
    location: "膝内侧",
    symptomType: "酸痛",
    action: "膝盖绷直",
    baselineScore: 6,
    assessments: [{
      id: "motion:knee-extension",
      kind: "motion",
      title: "膝关节主动伸直",
      active: "limited",
      passive: "limited",
      tensionChecked: true,
      tensionLocations: ["大腿内侧"],
    }],
    treatmentRecords: [{
      candidateId: "knee-medial-soft-tissue",
      treatmentKey: "right:muscle:medial-thigh-pes",
      rangeOutcomes: { "knee-extension": "passive-limited" },
    }],
  });
  assert.deepEqual(input.completedTreatments?.[0]?.relatedActionIds, ["knee-extension"]);
  const decision = buildKneeDecision(input);
  assert.ok(decision.treatmentUnits.some((unit) => unit.id === "knee-extension-joint"));
});

test("maps a control problem and quadriceps weakness into training entries", () => {
  const input = kneeDecisionInputFromWorkflow({
    role: "general",
    side: "左侧",
    location: "左膝",
    action: "下台阶",
    assessments: [
      { id: "function:knee-step-down", kind: "function", title: "下台阶", control: "compensated", simple: "present" },
      { id: "strength:knee-quadriceps", kind: "strength", title: "把膝盖伸直的力量", simple: "weak", discomfortLocations: ["股四头肌"] },
    ],
  });
  const decision = buildKneeDecision(input);
  assert.ok(decision.treatmentUnits.some((unit) => unit.id === "knee-hip-knee-control"));
  assert.ok(decision.treatmentUnits.some((unit) => unit.id === "knee-quadriceps-strength"));
});

test("only the current knee unit can enter the immediate treatment queue", () => {
  const decision = buildKneeDecision(kneeDecisionInputFromWorkflow({
    role: "general",
    side: "右侧",
    location: "膝内侧",
    symptomType: "酸痛",
    action: "下楼梯",
    baselineScore: 6,
    assessments: [{ id: "motion:knee-extension", kind: "motion", title: "膝伸直", active: "limited", passive: "skip", tensionLocations: ["大腿外侧"] }],
  }));
  assert.equal(decision.currentTreatment?.id, "knee-lateral-chain");
  assert.equal(kneeCandidateBelongsToCurrentDecision("knee-medial-lateral-chain", decision), true);
  assert.equal(kneeCandidateAllowedInTreatmentQueue("knee-medial-lateral-chain", decision), false);
  assert.equal(kneeCandidateAllowedInTreatmentQueue("knee-lateral-chain", decision), true);
  assert.equal(kneeCandidateBelongsToCurrentDecision("knee-medial-joint", decision), false);
});

test("a recorded core unit keeps its core dedup identity instead of the legacy muscle key", () => {
  const input = kneeDecisionInputFromWorkflow({
    role: "general",
    side: "右侧",
    location: "膝内侧",
    symptomType: "酸痛",
    action: "下楼梯",
    baselineScore: 6,
    assessments: [{ id: "motion:knee-extension", kind: "motion", title: "膝伸直", active: "limited", passive: "skip", tensionLocations: ["大腿外侧"] }],
    treatmentRecords: [{ candidateId: "knee-lateral-chain", treatmentKey: "muscle:大腿外侧链" }],
  });
  assert.equal(input.completedTreatments[0]?.dedupKey, "right:muscle:lateral-chain");
});

test("control and strength decisions hand off to specific knee exercises", () => {
  const decision = buildKneeDecision(kneeDecisionInputFromWorkflow({
    role: "general",
    side: "左侧",
    location: "左膝",
    action: "下台阶",
    assessments: [
      { id: "function:knee-step-down", kind: "function", title: "下台阶", control: "compensated", simple: "present" },
      { id: "strength:knee-quadriceps", kind: "strength", title: "把膝盖伸直的力量", simple: "weak", discomfortLocations: ["股四头肌"] },
    ],
  }));
  const exerciseIds = kneeExerciseIdsForDecision(decision);
  assert.ok(exerciseIds.includes("knee-heel-slide-quad-set"));
  assert.ok(exerciseIds.includes("knee-standing-hip-flexion"));
  assert.ok(exerciseIds.includes("knee-step"));
});

test("each mapped knee unit supplies its own instruction instead of inheriting legacy copy", () => {
  const decision = buildKneeDecision(kneeDecisionInputFromWorkflow({
    role: "general",
    side: "右侧",
    location: "膝后侧",
    symptomType: "牵扯感",
    action: "弯膝",
    assessments: [{ id: "motion:knee-flexion", kind: "motion", title: "膝屈曲", active: "limited", passive: "skip", tensionLocations: ["膝后", "小腿上端"] }],
  }));
  const unit = decision.currentTreatment;
  assert.equal(unit?.id, "knee-posterior-calf-muscle");
  assert.match(kneeTreatmentInstruction(unit), /膝后周围和小腿上端/);
  assert.doesNotMatch(kneeTreatmentInstruction(unit), /大腿外侧/);
  assert.equal(kneeRetestInstruction(unit), "只复测本轮受影响的动作：弯膝。");
});

test("a merged anterior-lateral unit keeps the instruction aligned with its displayed site", () => {
  const unit = {
    id: "knee-lateral-chain",
    site: "大腿前侧与外侧链",
    action: "轻柔松解检查中明确紧张的股直肌、大腿前侧或外侧链区域",
  };
  const instruction = kneeTreatmentInstruction(unit);
  assert.match(instruction, /大腿前侧/);
  assert.match(instruction, /髋外侧和大腿外侧/);
  assert.doesNotMatch(instruction, /只在髋外侧和大腿外侧/);
});

test("medial knee treatment keeps pes before a separate adductor unit", () => {
  assert.match(adapterSource, /先在膝内下方的鹅足相关肌肉区域/);
  assert.match(adapterSource, /"knee-medial-adductor": "在大腿内侧找到检查时更紧或更酸的内收肌区域/);
});

test("a training-only knee decision has no immediate-treatment candidate but keeps exercises", () => {
  const decision = buildKneeDecision(kneeDecisionInputFromWorkflow({
    role: "general",
    side: "右侧",
    location: "右膝",
    assessments: [{ id: "strength:knee-quadriceps", kind: "strength", title: "把膝盖伸直的力量", simple: "weak", discomfortLocations: ["股四头肌"] }],
  }));
  assert.equal(decision.currentTreatment?.id, "knee-quadriceps-strength");
  assert.deepEqual(kneeLegacyCandidateIdsForUnit(decision.currentTreatment.id), []);
  assert.equal(kneeCandidateAllowedInTreatmentQueue("knee-heel-slide-quad-set", decision), false);
  assert.ok(kneeExerciseIdsForDecision(decision).includes("knee-heel-slide-quad-set"));
});

test("missing local evidence returns one check and admits no legacy treatment", () => {
  const decision = buildKneeDecision(kneeDecisionInputFromWorkflow({
    role: "general",
    side: "右侧",
    location: "膝后侧",
    symptomType: "牵扯感",
    action: "弯膝",
    assessments: [{ id: "motion:knee-flexion", kind: "motion", title: "膝屈曲", active: "limited", passive: "skip" }],
  }));
  assert.equal(decision.currentTreatment, undefined);
  assert.equal(decision.assessmentChecks.length, 1);
  assert.equal(kneeCandidateBelongsToCurrentDecision("knee-extension-muscles", decision), false);
});

test("resolved support problems leave only the final chief retest", () => {
  const decision = buildKneeDecision(kneeDecisionInputFromWorkflow({
    role: "general",
    side: "右侧",
    location: "膝内侧",
    symptomType: "酸痛",
    action: "下楼梯",
    baselineScore: 6,
    assessments: [{ id: "motion:knee-extension", kind: "motion", title: "膝伸直", active: "limited", passive: "skip", tensionLocations: ["大腿外侧"] }],
    treatmentRecords: [{
      candidateId: "knee-lateral-chain",
      treatmentKey: "muscle:thigh-lateral",
      afterScore: 3,
      chiefRetested: true,
      rangeOutcomes: { "knee-extension": "both-match" },
    }],
  }));
  assert.equal(decision.currentTreatment, undefined);
  assert.deepEqual(decision.finalRetestPlan.map((item) => item.actionId), ["step-down"]);
});

test("a retest-only workflow record updates observations without counting as another treatment", () => {
  const decision = buildKneeDecision(kneeDecisionInputFromWorkflow({
    role: "general",
    side: "右侧",
    location: "膝内侧",
    symptomType: "酸痛",
    action: "下楼梯",
    baselineScore: 6,
    assessments: [{ id: "motion:knee-extension", kind: "motion", title: "膝伸直", active: "limited", passive: "skip", tensionLocations: ["大腿外侧"] }],
    treatmentRecords: [{
      candidateId: "knee-lateral-chain",
      treatmentKey: "muscle:thigh-lateral",
      afterScore: 4,
    }, {
      candidateId: "knee-lateral-chain",
      treatmentKey: "muscle:thigh-lateral",
      afterScore: 4,
      retestOnly: true,
      rangeOutcomes: { "knee-extension": "both-match" },
    }],
  }));
  assert.equal(decision.currentTreatment?.dedupKey, "right:muscle:lateral-chain");
  assert.equal(decision.retestPlan.some((item) => item.actionId === "knee-extension"), false);
});

test("knee swelling management hands off to the remaining pain-related muscle unit", () => {
  const snapshot = {
    role: "general",
    side: "右侧",
    location: "髌骨下方 / 髌腱",
    symptomType: "疼痛",
    action: "下楼梯",
    baselineScore: 5,
    symptoms: ["肿胀或淤青", "按压痛"],
    swellingLocation: "髌骨周围",
    tendernessLocation: "髌骨下方 / 髌腱",
    assessments: [{
      id: "function:knee-step-down",
      kind: "function",
      title: "台阶下降控制",
      simple: "painful",
      discomfort: "yes",
      discomfortType: "疼痛",
      symptomScore: 5,
      discomfortLocations: ["髌骨下方 / 髌腱"],
    }],
  };
  const before = buildKneeDecision(kneeDecisionInputFromWorkflow(snapshot));
  assert.equal(before.currentTreatment?.id, "knee-swelling-management");

  const after = buildKneeDecision(kneeDecisionInputFromWorkflow({
    ...snapshot,
    treatmentRecords: [{ candidateId: "knee-swelling-management", afterScore: 5 }],
  }));
  assert.equal(after.currentTreatment?.id, "knee-anterior-thigh-rectus-femoris");
});
