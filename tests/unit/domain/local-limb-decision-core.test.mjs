import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const tissueSource = await readFile(new URL("../app/tissue-pathway-core.ts", import.meta.url), "utf8");
const tissueOutput = ts.transpileModule(tissueSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const tissueUrl = `data:text/javascript;base64,${Buffer.from(tissueOutput).toString("base64")}`;
const source = (await readFile(new URL("../app/local-limb-decision-core.ts", import.meta.url), "utf8"))
  .replace("./tissue-pathway-core", tissueUrl);
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
const decisions = new Map(core.LOCAL_LIMB_LAB_CASES.map((scenario) => [scenario.id, core.buildLocalLimbDecision(scenario.input)]));

test("local limb decision lab contains all twelve audit scenarios", () => {
  assert.equal(core.LOCAL_LIMB_LAB_CASES.length, 12);
});

test("acute local strains avoid release and defer retesting", () => {
  for (const id of ["thigh-back-acute", "calf-back-acute"]) {
    const decision = decisions.get(id);
    assert.equal(decision.phase, "acute-strain");
    assert.equal(decision.allowRelease, false);
    assert.equal(decision.treatmentIds.some((item) => item.endsWith("-release")), false);
    assert.deepEqual(decision.treatmentIds, []);
    assert.equal(decision.retestTiming, "later");
    assert.equal(decision.trainingIds.length, 1);
  }
});

test("contusion and tendon paths stay on one low-load exercise without an immediate treatment loop", () => {
  const contusion = core.buildLocalLimbDecision({
    regionId: "thigh-local", location: "大腿前侧", onset: "今天或昨天", mechanism: "跌倒或碰撞",
    symptomType: "胀痛", symptoms: ["肿胀或淤青", "按压痛"], provocationTypes: ["按压"], goal: 4,
  });
  assert.equal(contusion.phase, "contusion");
  assert.deepEqual(contusion.treatmentIds, []);
  assert.equal(contusion.trainingIds.length, 1);

  const tendon = core.buildLocalLimbDecision({
    regionId: "calf-local", location: "跟腱中段", onset: "1～6周", mechanism: "逐渐出现",
    symptomType: "酸痛", symptoms: [], provocationTypes: ["运动过程中"], goal: 5,
  });
  assert.equal(tendon.phase, "tendon-load");
  assert.deepEqual(tendon.treatmentIds, []);
  assert.equal(tendon.trainingIds.length, 1);
});

test("nonacute tension uses one matching release and one combined activity/function retest", () => {
  const thigh = decisions.get("thigh-front-nonacute");
  assert.deepEqual(thigh.treatmentIds, ["thigh-front-release"]);
  assert.deepEqual(thigh.retestIds, ["thigh-front-length", "thigh-sit-stand"]);
  const calf = decisions.get("calf-front-tension");
  assert.equal(calf.area, "front");
  assert.deepEqual(calf.treatmentIds, ["calf-front-release"]);
  assert.deepEqual(calf.retestIds, ["calf-dorsiflexion", "calf-walk"]);
});

test("strength-only routes skip manual treatment and immediate strength retesting", () => {
  for (const id of ["thigh-medial-strength", "calf-lateral-strength"]) {
    const decision = decisions.get(id);
    assert.equal(decision.phase, "strength-only");
    assert.deepEqual(decision.treatmentIds, []);
    assert.deepEqual(decision.retestIds, []);
    assert.equal(decision.retestTiming, "none");
    assert.ok(decision.trainingIds.length >= 2);
  }
});

test("followups continue effective treatment and reject ineffective treatment", () => {
  const effective = decisions.get("calf-back-followup-effective");
  assert.equal(effective.continueEffectiveTreatment, true);
  assert.deepEqual(effective.treatmentIds, ["calf-back-release"]);
  assert.deepEqual(effective.reviewIds, ["calf-plantarflexion", "calf-heel-raise-strength", "calf-heel-raise"]);
  const ineffective = decisions.get("thigh-back-followup-ineffective");
  assert.equal(ineffective.continueEffectiveTreatment, false);
  assert.deepEqual(ineffective.treatmentIds, []);
});

test("the last same-session response controls the next local decision", () => {
  const base = core.LOCAL_LIMB_LAB_CASES.find((item) => item.id === "calf-front-tension").input;
  const decision = core.buildLocalLimbDecision({
    ...base,
    sessionNumber: 2,
    treatmentHistory: [
      { id: "calf-front-release", result: "same", sessionNumber: 2 },
      { id: "calf-front-release", result: "better", responseRole: "partial-contribution", sessionNumber: 2 },
    ],
  });
  assert.equal(decision.continueEffectiveTreatment, true);
  assert.ok(decision.treatmentIds.includes("calf-front-release"));
});

test("a resolved followup review does not keep treatment alive from the original intake", () => {
  const decision = core.buildLocalLimbDecision({
    ...core.LOCAL_LIMB_LAB_CASES.find((item) => item.id === "calf-back-followup-effective").input,
    findings: [
      { id: "calf-plantarflexion", kind: "length", result: "normal" },
      { id: "calf-heel-raise-strength", kind: "strength", result: "normal" },
      { id: "calf-heel-raise", kind: "function", result: "normal" },
    ],
  });
  assert.equal(decision.continueEffectiveTreatment, false);
  assert.deepEqual(decision.treatmentIds, []);
});

test("new symptoms invalidate the old local treatment route", () => {
  const decision = decisions.get("local-new-symptom");
  assert.equal(decision.phase, "needs-reassessment");
  assert.deepEqual(decision.treatmentIds, []);
  assert.deepEqual(decision.trainingIds, []);
});

test("sport goals set the ceiling but do not expose running in the first session", () => {
  assert.equal(decisions.get("thigh-front-daily").trainingIds.includes("thigh-run-return"), false);
  assert.equal(decisions.get("calf-medial-sport").trainingIds.includes("calf-run-hop"), false);
  const later = core.buildLocalLimbDecision({ ...core.LOCAL_LIMB_LAB_CASES.find((item) => item.id === "calf-medial-sport").input, sessionNumber: 4 });
  assert.equal(later.trainingIds.includes("calf-run-hop"), true);
});

test("an abnormal conditional direction adds only its supported treatment and starter training", () => {
  const decision = core.buildLocalLimbDecision({
    regionId: "thigh-local", location: "大腿内侧", onset: "1～6周", mechanism: "逐渐出现",
    symptomType: "牵扯或紧绷", symptoms: ["活动受限"], provocationTypes: ["走路或单腿"], goal: 4,
    findings: [
      { id: "thigh-medial-length", kind: "length", result: "limited" },
      { id: "thigh-lateral-load", kind: "length", result: "limited" },
      { id: "thigh-lateral-strength", kind: "strength", result: "weak" },
    ],
  });
  assert.ok(decision.treatmentIds.includes("thigh-medial-release"));
  assert.ok(decision.treatmentIds.includes("thigh-lateral-release"));
  assert.ok(decision.treatmentIds.includes("thigh-lateral-control"));
  assert.ok(decision.retestIds.includes("thigh-lateral-load"));
  assert.ok(decision.trainingIds.includes("thigh-lateral-isometric"));
});

test("a calf local partial response can open one functional-chain response experiment", () => {
  const decision = core.buildLocalLimbDecision({
    regionId: "calf-local", location: "小腿前外侧", onset: "1～6周", mechanism: "逐渐出现",
    symptomType: "酸痛", symptoms: ["活动受限"], provocationTypes: ["走路或单腿"], goal: 3,
    findings: [
      { id: "calf-dorsiflexion", kind: "length", result: "limited" },
      { id: "calf-walk", kind: "function", result: "painful" },
    ],
    treatmentHistory: [{ id: "calf-front-release", result: "better", responseRole: "partial-contribution", sessionNumber: 1 }],
  });
  assert.ok(decision.treatmentIds.includes("calf-anterolateral-thigh-lateral-response"));
});

test("a calf response experiment does not open without a functional clue", () => {
  const decision = core.buildLocalLimbDecision({
    regionId: "calf-local", location: "小腿前侧", onset: "1～6周", mechanism: "逐渐出现",
    symptomType: "酸痛", symptoms: ["活动受限"], provocationTypes: ["轻按"], goal: 3,
    findings: [{ id: "calf-dorsiflexion", kind: "length", result: "limited" }],
    treatmentHistory: [{ id: "calf-front-release", result: "same", responseRole: "no-change", sessionNumber: 1 }],
  });
  assert.equal(decision.treatmentIds.includes("calf-anterolateral-thigh-lateral-response"), false);
});

test("a pure anterior calf complaint does not inherit the anterolateral thigh-chain case", () => {
  const decision = core.buildLocalLimbDecision({
    regionId: "calf-local", location: "胫骨前侧", onset: "1～6周", mechanism: "逐渐出现",
    symptomType: "酸痛", symptoms: ["活动受限"], provocationTypes: ["走路或单腿"], goal: 3,
    findings: [{ id: "calf-dorsiflexion", kind: "length", result: "limited" }, { id: "calf-walk", kind: "function", result: "painful" }],
    treatmentHistory: [{ id: "calf-front-release", result: "same", responseRole: "no-change", sessionNumber: 1 }],
  });
  assert.equal(decision.treatmentIds.includes("calf-anterolateral-thigh-lateral-response"), false);
});

test("thigh local pain can continue through an examined functional-chain abnormality", () => {
  const decision = core.buildLocalLimbDecision({
    regionId: "thigh-local", location: "大腿前侧", onset: "1～6周", mechanism: "逐渐出现",
    symptomType: "酸痛", symptoms: ["活动受限"], provocationTypes: ["起身或下蹲"], goal: 3,
    findings: [
      { id: "thigh-front-length", kind: "length", result: "limited" },
      { id: "thigh-back-length", kind: "length", result: "limited" },
      { id: "thigh-back-strength", kind: "strength", result: "weak" },
      { id: "thigh-sit-stand", kind: "function", result: "painful" },
    ],
  });
  assert.ok(decision.treatmentIds.includes("thigh-front-release"));
  assert.ok(decision.treatmentIds.includes("thigh-back-release"));
  assert.ok(decision.treatmentIds.includes("thigh-back-control"));
  assert.ok(decision.retestIds.includes("thigh-back-length"));
});

test("followup verifies the prior key completion before its partial contributor", () => {
  const decision = core.buildLocalLimbDecision({
    regionId: "calf-local", location: "小腿前外侧", onset: "1～6周", mechanism: "逐渐出现",
    symptomType: "酸痛", symptoms: ["活动受限"], provocationTypes: ["走路或单腿"], goal: 3, sessionNumber: 2,
    findings: [{ id: "calf-dorsiflexion", kind: "length", result: "limited" }, { id: "calf-walk", kind: "function", result: "painful" }],
    treatmentHistory: [
      { id: "calf-front-release", result: "better", responseRole: "partial-contribution", sessionNumber: 1 },
      { id: "calf-anterolateral-thigh-lateral-response", result: "better", responseRole: "key-completion", sessionNumber: 1 },
    ],
  });
  assert.equal(decision.treatmentIds[0], "calf-anterolateral-thigh-lateral-response");
  assert.ok(decision.treatmentIds.includes("calf-front-release"));
  assert.equal(decision.continueEffectiveTreatment, true);
});

test("local posterior chains stay local instead of opening joint-wide checklists", () => {
  const thigh = decisions.get("thigh-back-acute");
  assert.deepEqual(thigh.assessmentIds, ["thigh-back-length", "thigh-back-strength", "thigh-bridge-check"]);
  assert.equal(thigh.assessmentIds.some((id) => id.startsWith("knee-") || id.startsWith("ankle-")), false);
  const calf = decisions.get("calf-back-acute");
  assert.deepEqual(calf.assessmentIds, ["calf-plantarflexion", "calf-heel-raise-strength", "calf-heel-raise"]);
  assert.equal(calf.assessmentIds.some((id) => ["calf-dorsiflexion", "calf-inversion", "calf-eversion"].includes(id)), false);
});

test("all lab scenarios return complete and deduplicated decisions", () => {
  for (const scenario of core.LOCAL_LIMB_LAB_CASES) {
    const decision = decisions.get(scenario.id);
    assert.ok(decision.phaseLabel);
    assert.ok(decision.summary);
    assert.equal(new Set(decision.treatmentIds).size, decision.treatmentIds.length);
    assert.equal(new Set(decision.trainingIds).size, decision.trainingIds.length);
    assert.equal(new Set(decision.retestIds).size, decision.retestIds.length);
  }
});
