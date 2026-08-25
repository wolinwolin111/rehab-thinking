import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadLocalDecisionCore() {
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
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const core = await loadLocalDecisionCore();

const areaLabels = {
  "thigh-local": { front: "大腿前侧", back: "大腿后侧", medial: "大腿内侧", lateral: "大腿外侧" },
  "calf-local": { front: "小腿前侧", back: "小腿后侧", medial: "小腿内侧", lateral: "小腿外侧" },
};
const motionIds = {
  "thigh-local": { front: "thigh-front-length", back: "thigh-back-length", medial: "thigh-medial-length", lateral: "thigh-lateral-load" },
  "calf-local": { front: "calf-dorsiflexion", back: "calf-plantarflexion", medial: "calf-inversion", lateral: "calf-eversion" },
};
const strengthIds = {
  "thigh-local": { front: "thigh-front-strength", back: "thigh-back-strength", medial: "thigh-medial-strength", lateral: "thigh-lateral-strength" },
  "calf-local": { front: "calf-dorsiflexor-strength", back: "calf-heel-raise-strength", medial: "calf-invertor-strength", lateral: "calf-evertor-strength" },
};

function product(...lists) {
  return lists.reduce((acc, list) => acc.flatMap((prefix) => list.map((value) => [...prefix, value])), [[]]);
}

const cases = product(
  ["thigh-local", "calf-local"],
  ["front", "back", "medial", "lateral"],
  ["今天或昨天", "1～6周", "超过6周"],
  ["左侧", "右侧"],
  ["自助", "思路模式·给别人"],
  ["明确动作", "没有固定动作"],
  ["无明确异常", "活动范围受限", "单纯力量不足"],
  [1, 3, 5],
).map(([regionId, area, onset, side, mode, complaintMode, findingMode, goal], index) => {
  const location = areaLabels[regionId][area];
  const hasLimitedMotion = findingMode === "活动范围受限";
  const hasWeaknessOnly = findingMode === "单纯力量不足";
  return {
    id: `CM-${String(index + 1).padStart(4, "0")}`,
    dimensions: { regionId, area, onset, side, mode, complaintMode, findingMode, goal },
    input: {
      regionId,
      location,
      side,
      onset,
      mechanism: complaintMode === "明确动作" ? "逐渐出现" : "没有明确受伤",
      symptomType: hasWeaknessOnly ? "无力或不稳" : complaintMode === "明确动作" ? "酸痛" : "说不清的不适",
      symptoms: hasLimitedMotion ? ["活动受限"] : hasWeaknessOnly ? ["力量不足"] : [],
      provocationTypes: hasWeaknessOnly ? ["用力或对抗阻力"] : complaintMode === "明确动作" ? ["走路、站立或负重"] : ["说不清 / 没有固定动作"],
      goal,
      findings: hasLimitedMotion
        ? [{ id: motionIds[regionId][area], kind: "length", result: "limited" }]
        : hasWeaknessOnly
          ? [{ id: strengthIds[regionId][area], kind: "strength", result: "weak" }]
          : [],
    },
  };
});

test("临床成对组合矩阵至少覆盖240组，并且每组都有明确出口", () => {
  assert.equal(cases.length, 1728);
  const phases = new Set();
  for (const scenario of cases) {
    const decision = core.buildLocalLimbDecision(scenario.input);
    phases.add(decision.phase);
    assert.ok(decision.phaseLabel, scenario.id);
    assert.ok(decision.summary, scenario.id);
    assert.ok(
      decision.treatmentIds.length > 0
        || decision.trainingIds.length > 0
        || decision.retestTiming !== "none"
        || ["strength-only", "needs-reassessment"].includes(decision.phase),
      `${scenario.id} 没有处理、训练、复测或明确停止出口: ${JSON.stringify(decision)}`,
    );
    for (const key of ["assessmentIds", "reviewIds", "treatmentIds", "trainingIds", "retestIds"]) {
      assert.equal(new Set(decision[key]).size, decision[key].length, `${scenario.id} ${key} 重复`);
    }
  }
  assert.deepEqual([...phases].sort(), ["nonacute-tension", "strength-only"].sort());
  console.log(`clinical-matrix-cases=${cases.length}; phases=${[...phases].sort().join(",")}`);
});
