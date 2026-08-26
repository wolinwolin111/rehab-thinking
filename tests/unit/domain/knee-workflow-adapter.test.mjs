import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const { kneeCandidateAllowedInTreatmentQueue, kneeCandidateBelongsToCurrentDecision, kneeDecisionInputFromWorkflow, kneeExerciseIdsForDecision, kneeLegacyCandidateIdsForUnit, kneeRetestInstruction, kneeTreatmentInstruction } = await loadTypeScriptModule("./src/domain/rehab/shared/knee-workflow-adapter.ts");
const { buildKneeDecision } = await loadTypeScriptModule("./src/domain/rehab/shared/knee-decision-core.ts");
const adapterSource = await readFile(
  new URL("../../../src/domain/rehab/shared/knee-workflow-adapter.ts", import.meta.url),
  "utf8",
);

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

test("S-01：各检查事实携带自身侧别，缺省回退主诉侧", () => {
  const input = kneeDecisionInputFromWorkflow({
    role: "general",
    side: "右侧",
    location: "膝前",
    action: "膝盖绷直",
    baselineScore: 5,
    assessments: [
      { id: "motion:knee-extension", kind: "motion", title: "膝伸直", active: "limited", passive: "skip", side: "左侧" },
      { id: "strength:knee-quadriceps", kind: "strength", title: "股四头肌力量", simple: "weak" },
    ],
  });
  const extension = input.findings.find((finding) => finding.id === "motion:knee-extension");
  assert.equal(extension?.side, "left", "检查结果自带左侧时不得压平成主诉右侧");
  const strength = input.findings.find((finding) => finding.kind === "strength");
  assert.equal(strength?.side, "right", "未带侧别的检查沿用主诉侧");
});

test("S-03：被动检查看不出来时仍生成事实且不丢答案", () => {
  const input = kneeDecisionInputFromWorkflow({
    role: "general",
    side: "双侧/中间",
    location: "膝前",
    action: "膝盖绷直",
    baselineScore: 5,
    assessments: [{ id: "motion:knee-extension", kind: "motion", title: "膝伸直", active: "same", passive: "unsure", side: "左侧" }],
  });
  const fact = input.findings.find((finding) => finding.id === "motion:knee-extension");
  assert.ok(fact, "passive unsure 不能静默丢弃");
  assert.equal(fact?.result, "unknown");
});

test("S-03：主动单侧受限按真实侧别生成受限事实", () => {
  const input = kneeDecisionInputFromWorkflow({
    role: "general",
    side: "右侧",
    location: "膝前",
    action: "弯膝",
    baselineScore: 5,
    assessments: [{ id: "motion:knee-flexion", kind: "motion", title: "膝屈曲", active: "left-limited", passive: "skip", side: "左侧" }],
  });
  const fact = input.findings.find((finding) => finding.kind === "motion-range");
  assert.equal(fact?.result, "limited");
  assert.equal(fact?.side, "left");
});

test("S-07：worse 复测映射为双维度受限，未知取值显式告警", () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (value) => warnings.push(String(value));
  try {
    const worse = kneeDecisionInputFromWorkflow({
      role: "general",
      side: "右侧",
      location: "膝前",
      action: "膝盖绷直",
      baselineScore: 4,
      assessments: [{ id: "motion:knee-extension", kind: "motion", title: "膝伸直", active: "limited", passive: "limited" }],
      treatmentRecords: [{ candidateId: "knee-extension-control", retestOnly: true, rangeOutcomes: { "knee-extension": "worse" } }],
    });
    const worseValues = worse.observations[0]?.values;
    assert.equal(worseValues?.["active-range"], "limited");
    assert.equal(worseValues?.["passive-range"], "limited", "worse 的被动维度信息不得丢失");
    kneeDecisionInputFromWorkflow({
      role: "general",
      side: "右侧",
      location: "膝前",
      action: "膝盖绷直",
      assessments: [],
      treatmentRecords: [{ candidateId: "knee-extension-control", retestOnly: true, rangeOutcomes: { "knee-extension": "mystery-value" } }],
    });
  } finally {
    console.warn = originalWarn;
  }
  assert.ok(warnings.some((message) => message.includes("未知")), "未知复测取值必须显式告警而不是静默兜底");
});

test("S-05：双侧左右处理记录去重键独立，中文侧前缀被识别", () => {
  const input = kneeDecisionInputFromWorkflow({
    role: "general",
    side: "双侧/中间",
    location: "膝前",
    action: "膝盖绷直",
    baselineScore: 5,
    assessments: [],
    treatmentRecords: [
      { candidateId: "knee-lateral-chain", treatmentKey: "左侧:muscle:lateral-chain" },
      { candidateId: "knee-lateral-chain", treatmentKey: "右侧:muscle:lateral-chain" },
      { candidateId: "custom-manual-release", treatmentKey: "左侧:custom:manual-release" },
    ],
  });
  const keys = input.completedTreatments.map((record) => record.dedupKey);
  assert.equal(new Set(keys).size, keys.length, `dedupKey 必须互不相同: ${keys.join(", ")}`);
  assert.ok(keys.includes("左侧:custom:manual-release"), "非核心处理沿用原 treatmentKey");
});

test("S-02：结构化标记按各自侧别生成事实，旧文本格式兼容", () => {
  const base = { role: "general", side: "右侧", location: "膝前", action: "下蹲", baselineScore: 4, symptoms: ["肿胀或淤青", "按压痛"], assessments: [] };
  const structured = kneeDecisionInputFromWorkflow({
    ...base,
    swellingMarks: [{ side: "左侧", location: "髌骨上方" }, { side: "右侧", location: "腘窝" }],
    tendernessMarks: [{ side: "左侧", location: "髌骨下方" }],
  });
  const swellingFacts = structured.findings.filter((finding) => finding.kind === "swelling");
  assert.deepEqual(swellingFacts.map((finding) => finding.side).sort(), ["left", "right"]);
  assert.deepEqual(swellingFacts.find((finding) => finding.side === "left")?.locations, ["髌骨上方"]);
  const tendernessFacts = structured.findings.filter((finding) => finding.kind === "tenderness");
  assert.equal(tendernessFacts.length, 1);
  assert.equal(tendernessFacts[0].side, "left");

  const legacy = kneeDecisionInputFromWorkflow({ ...base, swellingLocation: "髌骨上方" });
  const legacySwelling = legacy.findings.filter((finding) => finding.kind === "swelling");
  assert.equal(legacySwelling.length, 1);
  assert.equal(legacySwelling[0].side, "right");
});
