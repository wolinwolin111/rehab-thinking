import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const knowledgeSource = await readFile(new URL("../app/pilot-knowledge.ts", import.meta.url), "utf8");
const knowledgeUrl = `data:text/javascript;base64,${Buffer.from(transpile(knowledgeSource)).toString("base64")}`;
const engineSource = await readFile(new URL("../app/pilot-decision-engine.ts", import.meta.url), "utf8");
const engineCode = transpile(engineSource).replace("./pilot-knowledge.ts", knowledgeUrl);
const engineUrl = `data:text/javascript;base64,${Buffer.from(engineCode).toString("base64")}`;
const {
  PILOT_ASSESSMENT_BUDGET,
  PILOT_QUESTION_BUDGET,
  buildPilotDecisionTrace,
  buildPilotIntakeQuestionQueue,
  buildPilotTreatmentUnits,
  classifyPilotAssessmentEvidence,
  matchPilotRelations,
  rankPilotAssessmentIds,
} = await import(engineUrl);

test("assessment evidence keeps unknown separate from a clear normal screen", () => {
  assert.equal(classifyPilotAssessmentEvidence([
    { id: "motion:ankle-eversion", result: "not-testable" },
    { id: "motion:ankle-dorsiflexion", result: "unknown" },
  ]), "incomplete");
  assert.equal(classifyPilotAssessmentEvidence([
    { id: "motion:ankle-eversion", result: "normal" },
    { id: "motion:ankle-dorsiflexion", result: "unknown" },
  ]), "incomplete");
  assert.equal(classifyPilotAssessmentEvidence([
    { id: "motion:ankle-eversion", result: "normal" },
    { id: "motion:ankle-dorsiflexion", result: "normal" },
  ]), "clear");
  assert.equal(classifyPilotAssessmentEvidence([
    { id: "motion:ankle-eversion", result: "painful" },
    { id: "motion:ankle-dorsiflexion", result: "unknown" },
  ]), "abnormal");
});

test("local thigh and calf screens include one useful opposing or supporting direction", () => {
  const base = {
    userRole: "general",
    onset: "1～6周",
    mechanism: "逐渐出现",
    symptomType: "牵扯或紧绷",
    symptoms: [],
    symptomsConfirmed: true,
    provocationTypes: [],
    provocationConfirmed: true,
    noFixedTask: true,
  };
  const thighAvailable = [
    "motion:thigh-front-length", "motion:thigh-back-length", "motion:thigh-medial-length", "motion:thigh-lateral-load",
    "function:thigh-sit-stand", "function:thigh-walk", "function:thigh-bridge-check", "function:thigh-single-leg",
  ];
  const calfAvailable = [
    "motion:calf-dorsiflexion", "motion:calf-plantarflexion", "motion:calf-inversion", "motion:calf-eversion",
    "function:calf-walk", "function:calf-heel-raise", "function:calf-single-leg",
  ];
  assert.deepEqual(rankPilotAssessmentIds({ ...base, regionIds: ["thigh-local"], locations: ["大腿前侧"] }, thighAvailable), [
    "motion:thigh-front-length", "motion:thigh-back-length", "function:thigh-sit-stand",
  ]);
  assert.deepEqual(rankPilotAssessmentIds({ ...base, regionIds: ["calf-local"], locations: ["小腿内侧"] }, calfAvailable), [
    "motion:calf-inversion", "motion:calf-eversion", "function:calf-single-leg",
  ]);
});

const baseInput = {
  userRole: "general",
  regionIds: ["knee"],
  locations: ["膝内侧关节线附近"],
  onset: "超过4周",
  mechanism: "逐渐出现",
  symptomType: "刺痛",
  symptoms: ["活动受限"],
  symptomsConfirmed: true,
  provocationTypes: ["下楼"],
  provocationConfirmed: true,
  currentTask: "下楼梯",
  baselineScoreConfirmed: true,
  goal: 3,
};

test("intake queue is bounded and does not force a score without a repeatable task", () => {
  const questions = buildPilotIntakeQuestionQueue({
    ...baseInput,
    userRole: "",
    locations: [],
    onset: "",
    mechanism: "",
    symptomType: "",
    symptoms: [],
    symptomsConfirmed: false,
    provocationTypes: ["说不清 / 没有固定动作"],
    provocationConfirmed: true,
    currentTask: "",
    noFixedTask: true,
    baselineScoreConfirmed: false,
    goal: 0,
  });
  assert.ok(questions.length <= PILOT_QUESTION_BUDGET);
  assert.equal(questions.some((question) => question.id === "score"), false);
  assert.deepEqual(questions.slice(0, 2).map((question) => question.id), ["role", "locations"]);
});

test("ordinary knee user gets a short queue led by the complaint task", () => {
  const available = [
    "motion:knee-extension",
    "motion:knee-flexion",
    "strength:knee-quadriceps",
    "strength:knee-adductor-pes",
    "strength:knee-glute",
    "function:knee-squat",
    "function:knee-step-down",
  ];
  const queue = rankPilotAssessmentIds(baseInput, available);
  assert.equal(queue.length, PILOT_ASSESSMENT_BUDGET.general);
  assert.equal(queue[0], "function:knee-step-down");
  assert.deepEqual(queue.slice(1, 3), ["motion:knee-extension", "motion:knee-flexion"]);
});

test("knee keeps extension before flexion and neither direction is displaced by strength checks", () => {
  const queue = rankPilotAssessmentIds({
    ...baseInput,
    currentTask: "膝盖不舒服",
    provocationTypes: ["活动时"],
  }, [
    "strength:knee-quadriceps",
    "function:knee-squat",
    "motion:knee-flexion",
    "strength:knee-glute",
    "motion:knee-extension",
  ]);
  assert.deepEqual(queue.slice(0, 2), ["motion:knee-extension", "motion:knee-flexion"]);
});

test("a flexion complaint does not remove the extension-first knee baseline", () => {
  const queue = rankPilotAssessmentIds({
    ...baseInput,
    currentTask: "弯膝时膝后不舒服",
    provocationTypes: ["弯膝"],
  }, [
    "motion:knee-flexion",
    "motion:knee-extension",
    "strength:knee-hamstring",
    "function:knee-squat",
  ]);
  assert.deepEqual(queue.slice(0, 2), ["motion:knee-extension", "motion:knee-flexion"]);
});

test("infrapatellar stair pain keeps the chief task, both knee motions and a local check", () => {
  const queue = rankPilotAssessmentIds({
    ...baseInput,
    locations: ["髌骨下方"],
    currentTask: "下楼梯",
    provocationTypes: ["下楼"],
  }, [
    "function:knee-step-down",
    "motion:knee-extension",
    "motion:knee-flexion",
    "special:knee-patella-tenderness-self",
    "strength:knee-quadriceps",
    "strength:knee-hamstring",
  ]);
  assert.deepEqual(queue.slice(0, 4), [
    "function:knee-step-down",
    "motion:knee-extension",
    "motion:knee-flexion",
    "special:knee-patella-tenderness-self",
  ]);
  assert.equal(queue.includes("strength:knee-hamstring"), false);
});

test("hamstring strength is added only when knee-flexion force is a stated problem", () => {
  const queue = rankPilotAssessmentIds({
    ...baseInput,
    locations: ["膝后侧"],
    currentTask: "弯膝发力时大腿后侧无力",
    provocationTypes: ["用力或对抗阻力"],
    symptomType: "无力或不稳",
  }, [
    "motion:knee-extension",
    "motion:knee-flexion",
    "strength:knee-quadriceps",
    "strength:knee-hamstring",
  ]);
  assert.ok(queue.includes("strength:knee-hamstring"));
});

test("acute lateral ankle prioritizes related motion and weight bearing without a full foot package", () => {
  const input = {
    ...baseInput,
    regionIds: ["ankle-foot"],
    locations: ["外踝 / 前外侧"],
    onset: "今天或昨天",
    mechanism: "扭转或崴伤",
    symptomType: "胀痛",
    symptoms: ["肿胀或淤青", "活动受限"],
    provocationTypes: ["走路或负重"],
    currentTask: "走路",
  };
  const available = [
    "motion:ankle-dorsiflexion",
    "motion:ankle-plantarflexion",
    "motion:ankle-inversion",
    "motion:ankle-eversion",
    "motion:ankle-great-toe-extension",
    "motion:ankle-toe-flexion",
    "strength:ankle-evertor",
    "function:ankle-weight-bearing",
  ];
  const queue = rankPilotAssessmentIds(input, available);
  assert.equal(queue.length, PILOT_ASSESSMENT_BUDGET.general + 1);
  assert.deepEqual(queue.slice(0, 4), [
    "motion:ankle-dorsiflexion",
    "motion:ankle-eversion",
    "motion:ankle-plantarflexion",
    "motion:ankle-inversion",
  ]);
  assert.equal(queue[4], "function:ankle-weight-bearing");
  assert.equal(queue.some((id) => id.includes("toe")), false);
});

test("acute ankle sprain always keeps all four ankle directions with dorsiflexion and eversion first", () => {
  const available = [
    "motion:ankle-dorsiflexion",
    "motion:ankle-plantarflexion",
    "motion:ankle-inversion",
    "motion:ankle-eversion",
    "function:ankle-weight-bearing",
    "function:ankle-heel-raise",
  ];
  const input = {
    ...baseInput,
    regionIds: ["ankle-foot"],
    locations: ["外踝 / 前外侧"],
    onset: "今天或昨天",
    mechanism: "扭转或崴伤",
    symptomType: "疼痛，性质说不清",
    symptoms: [],
    provocationTypes: ["活动到某个角度"],
    currentTask: "脚背向下压",
  };
  const queue = rankPilotAssessmentIds(input, available);
  assert.deepEqual(queue, [
    "motion:ankle-plantarflexion",
    "motion:ankle-dorsiflexion",
    "motion:ankle-eversion",
    "motion:ankle-inversion",
  ]);
});

test("an acute ankle walking complaint adds weight bearing only after the four directions", () => {
  const input = {
    ...baseInput,
    regionIds: ["ankle-foot"],
    locations: ["外踝 / 前外侧"],
    onset: "今天或昨天",
    mechanism: "扭转或崴伤",
    symptomType: "胀痛",
    symptoms: ["肿胀或淤青"],
    provocationTypes: ["走路或负重"],
    currentTask: "走路",
  };
  const queue = rankPilotAssessmentIds(input, [
    "motion:ankle-dorsiflexion",
    "motion:ankle-plantarflexion",
    "motion:ankle-inversion",
    "motion:ankle-eversion",
    "function:ankle-weight-bearing",
  ]);
  assert.deepEqual(queue, [
    "motion:ankle-dorsiflexion",
    "motion:ankle-eversion",
    "motion:ankle-plantarflexion",
    "motion:ankle-inversion",
    "function:ankle-weight-bearing",
  ]);
});

test("an ankle sprain older than seven days still keeps all four ankle directions", () => {
  const input = {
    ...baseInput,
    regionIds: ["ankle-foot"],
    locations: ["外踝 / 前外侧"],
    onset: "1～6周",
    mechanism: "扭转或崴伤",
    symptomType: "牵扯或紧绷",
    symptoms: ["活动受限"],
    provocationTypes: ["活动到某个角度"],
    currentTask: "脚背向下压",
  };
  const queue = rankPilotAssessmentIds(input, [
    "motion:ankle-dorsiflexion",
    "motion:ankle-plantarflexion",
    "motion:ankle-inversion",
    "motion:ankle-eversion",
    "function:ankle-weight-bearing",
  ]);
  assert.deepEqual(queue.slice(0, 4), [
    "motion:ankle-plantarflexion",
    "motion:ankle-dorsiflexion",
    "motion:ankle-eversion",
    "motion:ankle-inversion",
  ]);
});

test("a clear local toe complaint does not trigger routine ankle or hip checks", () => {
  const input = {
    ...baseInput,
    regionIds: ["ankle-foot"],
    locations: ["大拇趾"],
    symptomType: "局部疼痛",
    symptoms: [],
    provocationTypes: ["鞋子挤压"],
    currentTask: "穿鞋走路",
  };
  const available = [
    "motion:ankle-dorsiflexion",
    "motion:ankle-inversion",
    "motion:ankle-great-toe-extension",
    "motion:ankle-toe-flexion",
    "strength:ankle-calf",
    "function:ankle-weight-bearing",
  ];
  const queue = rankPilotAssessmentIds(input, available);
  assert.deepEqual(queue.slice(0, 2), ["motion:ankle-great-toe-extension", "motion:ankle-toe-flexion"]);
});

test("anterior ankle discomfort follows the complaint direction and does not force eversion", () => {
  const input = {
    ...baseInput,
    regionIds: ["ankle-foot"],
    locations: ["踝前"],
    onset: "超过6周",
    mechanism: "没有明确受伤",
    symptomType: "酸痛",
    symptoms: [],
    provocationTypes: ["活动到某个角度"],
    currentTask: "脚背向下压",
  };
  const queue = rankPilotAssessmentIds(input, [
    "motion:ankle-dorsiflexion",
    "motion:ankle-plantarflexion",
    "motion:ankle-inversion",
    "motion:ankle-eversion",
    "function:ankle-weight-bearing",
  ]);
  assert.deepEqual(queue.slice(0, 3), [
    "motion:ankle-plantarflexion",
    "motion:ankle-dorsiflexion",
    "function:ankle-weight-bearing",
  ]);
  assert.equal(queue.includes("motion:ankle-eversion"), false);
});

test("posterior ankle or Achilles symptoms prioritize plantarflexion and dorsiflexion", () => {
  const queue = rankPilotAssessmentIds({
    ...baseInput,
    regionIds: ["ankle-foot"],
    locations: ["跟腱中段"],
    onset: "1～6周",
    mechanism: "逐渐出现",
    symptomType: "酸痛",
    symptoms: [],
    provocationTypes: ["提踵或蹬地"],
    currentTask: "提踵时跟腱不舒服",
  }, [
    "motion:ankle-dorsiflexion",
    "motion:ankle-plantarflexion",
    "motion:ankle-inversion",
    "motion:ankle-eversion",
    "function:ankle-heel-raise",
  ]);
  assert.deepEqual(queue.slice(0, 3), [
    "motion:ankle-plantarflexion",
    "motion:ankle-dorsiflexion",
    "function:ankle-heel-raise",
  ]);
  assert.equal(queue.includes("motion:ankle-eversion"), false);
});

test("medial ankle symptoms pair inversion and eversion without forcing all directions", () => {
  const queue = rankPilotAssessmentIds({
    ...baseInput,
    regionIds: ["ankle-foot"],
    locations: ["内踝后方"],
    onset: "超过6周",
    mechanism: "没有明确受伤",
    symptomType: "牵扯或紧绷",
    symptoms: [],
    provocationTypes: ["活动到某个角度"],
    currentTask: "脚掌向内时不舒服",
  }, [
    "motion:ankle-dorsiflexion",
    "motion:ankle-plantarflexion",
    "motion:ankle-inversion",
    "motion:ankle-eversion",
    "function:ankle-weight-bearing",
  ]);
  assert.deepEqual(queue.slice(0, 2), ["motion:ankle-inversion", "motion:ankle-eversion"]);
  assert.equal(queue.includes("motion:ankle-plantarflexion"), false);
});

test("vague ankle discomfort keeps the short dorsiflexion and eversion screen", () => {
  const queue = rankPilotAssessmentIds({
    ...baseInput,
    regionIds: ["ankle-foot"],
    locations: ["脚踝周围"],
    onset: "超过6周",
    mechanism: "没有明确受伤",
    symptomType: "说不清的不适",
    symptoms: [],
    provocationTypes: [],
    currentTask: "",
    noFixedTask: true,
  }, [
    "motion:ankle-dorsiflexion",
    "motion:ankle-plantarflexion",
    "motion:ankle-inversion",
    "motion:ankle-eversion",
    "function:ankle-weight-bearing",
  ]);
  assert.deepEqual(queue.slice(0, 2), ["motion:ankle-dorsiflexion", "motion:ankle-eversion"]);
});

test("the user-facing foot-bottom eversion wording prioritizes the eversion screen", () => {
  const queue = rankPilotAssessmentIds({
    ...baseInput,
    regionIds: ["ankle-foot"],
    locations: ["外踝"],
    currentTask: "脚底向外转",
  }, ["motion:ankle-dorsiflexion", "motion:ankle-inversion", "motion:ankle-eversion"]);
  assert.equal(queue[0], "motion:ankle-eversion");
});

test("treatment units deduplicate the same site and ignore unknown findings", () => {
  const findings = [
    { id: "motion:knee-extension", result: "limited" },
    { id: "function:knee-step-down", result: "painful" },
    { id: "strength:knee-adductor-pes", result: "unknown" },
  ];
  const units = buildPilotTreatmentUnits(baseInput, findings);
  const keys = units.map((unit) => `${unit.kind}:${unit.site}`);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(units.some((unit) => unit.kind === "muscle"));
  assert.ok(units.some((unit) => unit.kind === "joint"));
  assert.equal(units.some((unit) => unit.retestIds.includes("strength:knee-adductor-pes")), false);
});

test("decision trace keeps multiple regions without producing an unlimited checklist", () => {
  const input = {
    ...baseInput,
    regionIds: ["knee", "ankle-foot"],
    locations: ["膝内侧", "外踝 / 前外侧"],
    currentTask: "下楼和走路",
    provocationTypes: ["下楼", "走路或负重"],
  };
  const trace = buildPilotDecisionTrace(input, [
    "motion:knee-extension",
    "motion:knee-flexion",
    "function:knee-step-down",
    "motion:ankle-dorsiflexion",
    "motion:ankle-inversion",
    "motion:ankle-eversion",
    "function:ankle-weight-bearing",
  ]);
  assert.ok(trace.matchedRelationIds.some((id) => id.startsWith("KNEE")));
  assert.ok(trace.matchedRelationIds.some((id) => id.startsWith("ANKLE")));
  assert.ok(trace.assessmentIds.length <= PILOT_ASSESSMENT_BUDGET.general);
});

test("reviewed case relations change the candidate path instead of serving as display-only notes", () => {
  const kneeMatches = matchPilotRelations({
    ...baseInput,
    locations: ["膝内侧"],
    symptomType: "胀痛",
    provocationTypes: ["走路或负重"],
    currentTask: "站立承重",
  });
  assert.ok(kneeMatches.some(({ relation }) => relation.id === "KNEE-R05"));
  assert.ok(kneeMatches.some(({ relation }) => relation.sourceCases.includes("KNEE-005")));

  const ankleMatches = matchPilotRelations({
    ...baseInput,
    regionIds: ["ankle-foot"],
    locations: ["足底"],
    symptomType: "牵扯或紧绷",
    provocationTypes: ["走路或负重"],
    currentTask: "走路时足底牵扯",
  });
  assert.ok(ankleMatches.some(({ relation }) => relation.id === "ANKLE-R04"));
  assert.ok(ankleMatches.some(({ relation }) => relation.sourceCases.includes("MULTI-001")));
});

test("generic knee pain does not activate the weight-bearing distension relation", () => {
  const matches = matchPilotRelations({
    ...baseInput,
    locations: ["膝前"],
    symptomType: "酸痛",
    symptoms: [],
    provocationTypes: ["走路或负重"],
    currentTask: "走路",
  });
  assert.equal(matches.some(({ relation }) => relation.id === "KNEE-R05"), false);
});

test("medial knee pain on stairs activates the reviewed medial knee path", () => {
  const matches = matchPilotRelations({
    ...baseInput,
    locations: ["膝内侧"],
    symptomType: "刺痛",
    provocationTypes: ["下楼"],
    currentTask: "下楼梯",
  });
  assert.ok(matches.some(({ relation }) => relation.id === "KNEE-R07"));
});

test("medial knee candidates preserve pes then adductor then lateral priority", () => {
  const units = buildPilotTreatmentUnits({
    ...baseInput,
    locations: ["膝内侧", "鹅足"],
    currentTask: "下楼梯",
  }, [
    { id: "motion:knee-extension", result: "limited" },
    { id: "function:knee-step-down", result: "painful" },
  ]);
  assert.deepEqual(units.filter((unit) => unit.kind === "muscle").slice(0, 3).map((unit) => unit.id), [
    "knee-pes-local",
    "knee-adductor-local",
    "knee-lateral-chain",
  ]);
});

test("medial ankle location raises assessment priority but unknown findings do not create treatment", () => {
  const input = {
    ...baseInput,
    regionIds: ["ankle-foot"],
    locations: ["内踝后方"],
    symptomType: "疼痛，性质说不清",
    currentTask: "走路",
  };
  assert.ok(matchPilotRelations(input).some(({ relation }) => relation.id === "ANKLE-R04"));
  assert.equal(buildPilotTreatmentUnits(input, [{ id: "motion:ankle-inversion", result: "unknown" }]).some((unit) => unit.id === "ankle-medial-calf"), false);
  assert.equal(buildPilotTreatmentUnits(input, [{ id: "motion:ankle-inversion", result: "limited" }]).some((unit) => unit.id === "ankle-medial-calf"), true);
});

test("vague lateral ankle discomfort does not activate every activity-specific relation", () => {
  const matches = matchPilotRelations({
    ...baseInput,
    regionIds: ["ankle-foot"],
    locations: ["外踝"],
    symptomType: "说不清",
    symptoms: [],
    provocationTypes: [],
    currentTask: "",
    noFixedTask: true,
  });
  assert.equal(matches.some(({ relation }) => relation.id === "ANKLE-R05"), false);
  assert.equal(matches.some(({ relation }) => relation.id === "ANKLE-R06"), false);
});

test("a task word cannot satisfy a symptom condition", () => {
  const matches = matchPilotRelations({
    ...baseInput,
    locations: ["膝内侧"],
    symptomType: "酸痛",
    symptoms: [],
    provocationTypes: ["承重"],
    currentTask: "站立承重",
  });
  assert.equal(matches.some(({ relation }) => relation.id === "KNEE-R05"), false);
});
