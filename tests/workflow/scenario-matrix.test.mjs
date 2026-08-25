import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function load(rel) {
  const source = await readFile(new URL(rel, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const identity = await load("../../src/domain/rehab/intake/action-identity-core.ts");
const relax = await load("../../src/domain/rehab/training/home-relaxation-core.ts");
const tension = await load("../../src/domain/rehab/assessment/muscle-tension-assessment-core.ts");
const patella = await load("../../src/domain/rehab/assessment/patella-mobility-core.ts");
const knowledge = await load("../../src/knowledge/pilot/pilot-motion-muscle-knowledge.ts");

// 组合工具：笛卡尔积
function product(...lists) {
  return lists.reduce((acc, list) => acc.flatMap((combo) => list.map((value) => [...combo, value])), [[]]);
}

// 改动5：紧张检查「默认查 + 窄例外」全组合不变量
test("muscle-tension check: default true except spinal/contusion/bone-stress/swelling/neural", () => {
  const pathways = ["standard", "muscle-contusion", "bone-stress-suspected", "tendon-load", undefined];
  const symptomTypes = ["酸痛", "刺痛", "麻或电感", "钝痛或酸胀", "说不清"];
  const symptomSets = [[], ["肿胀或淤青"], ["麻、电或感觉变化"], ["肿胀或淤青", "麻、电或感觉变化"]];
  for (const [spinal, pathway, symptomType, symptoms] of product([false, true], pathways, symptomTypes, symptomSets)) {
    const got = tension.needsMuscleTensionCheck({ spinal, tissuePathwayId: pathway, symptomType, symptoms });
    const isNeural = symptomType === "麻或电感" || symptoms.includes("麻、电或感觉变化");
    const expected = !(spinal || pathway === "muscle-contusion" || pathway === "bone-stress-suspected" || isNeural);
    assert.equal(got, expected, JSON.stringify({ spinal, pathway, symptomType, symptoms }));
  }
});

// 改动4：髌骨方向 → 膝屈/伸 运动学关联全组合不变量
test("kinematic link: patella directions relate to knee flexion/extension only", () => {
  const patellaIds = ["knee-patella-superior", "knee-patella-inferior", "knee-patella-medial", "knee-patella-lateral"];
  const subsets = product([false, true], [false, true], [false, true], [false, true]).map((flags) => patellaIds.filter((_, i) => flags[i]));
  const chiefs = ["knee-flexion", "knee-extension", "ankle-dorsiflexion", "", undefined];
  for (const treatment of subsets) {
    for (const chief of chiefs) {
      const got = identity.treatmentRelatesToChief(treatment, chief);
      const expected = treatment.some((id) => {
        const links = identity.KINEMATIC_LINKS[id] ?? [];
        return links.some((rel) => identity.canonicalActionIdFromAssessmentId(rel) === identity.canonicalActionIdFromAssessmentId(chief ?? ""));
      });
      assert.equal(got, expected, JSON.stringify({ treatment, chief }));
    }
  }
});

// 改动1：复测清单只保留受限方向全组合不变量
test("patella retest findings keep only limited directions", () => {
  const patellaIds = ["knee-patella-superior", "knee-patella-inferior", "knee-patella-medial", "knee-patella-lateral"];
  const allFindings = patellaIds.map((id) => ({ id: `motion:${id}` }));
  const subsets = product([false, true], [false, true], [false, true], [false, true]).map((flags) => patellaIds.filter((_, i) => flags[i]));
  for (const limited of subsets) {
    const got = patella.filterPatellaFindingsToLimited(allFindings, limited).map((f) => f.id.replace(/^motion:/, ""));
    assert.deepEqual(got, limited, JSON.stringify({ limited }));
  }
});

// 改动6：放松「选择性避开」提示全组合不变量
test("self-release avoidance note appears only for risky cases", () => {
  const pathways = ["standard", "muscle-contusion", "bone-stress-suspected", "tendon-load"];
  const symptomSets = [[], ["肿胀或淤青"], ["麻、电或感觉变化"]];
  const stabbings = ["", "sharp"];
  const symptomTypes = ["酸痛", "麻或电感", "刺痛"];
  for (const [pathway, symptoms, stabbing, symptomType] of product(pathways, symptomSets, stabbings, symptomTypes)) {
    const note = relax.selfReleaseAvoidanceNote({ tissuePathwayId: pathway, symptoms, stabbingPalpation: stabbing, symptomType, tensionLabels: [], effectiveMuscleLabels: [], trainingMuscleLabels: [] });
    const risky = pathway === "muscle-contusion" || pathway === "bone-stress-suspected" || pathway === "tendon-load"
      || symptoms.includes("肿胀或淤青") || symptoms.includes("麻、电或感觉变化")
      || stabbing === "sharp" || symptomType === "麻或电感";
    assert.equal(note.length > 0, risky, JSON.stringify({ pathway, symptoms, stabbing, symptomType }));
    // 基础提示始终存在，且放松目标不因风险而整体隐藏
    const targets = relax.buildHomeRelaxationTargets({ tissuePathwayId: pathway, symptoms, stabbingPalpation: stabbing, symptomType, tensionLabels: ["小腿后侧肌群"], effectiveMuscleLabels: [], trainingMuscleLabels: [] });
    assert.equal(targets.length, 1, JSON.stringify({ pathway, symptoms, stabbing, symptomType }));
  }
});

// 改动2：髌骨方向标题中文化（不返回裸英文 ID）
test("professional titles for patella directions are Chinese", () => {
  for (const [id, label] of [["knee-patella-superior", "髌骨向上滑动"], ["knee-patella-inferior", "髌骨向下滑动"], ["knee-patella-medial", "髌骨向内滑动"], ["knee-patella-lateral", "髌骨向外滑动"]]) {
    const title = knowledge.professionalAssessmentTitle(`motion:${id}`, id);
    assert.equal(title, label);
    assert.ok(!title.includes("knee-patella"), `${id} should not leak the raw id`);
  }
});

// 改动3：紧张部位一条一个 finding（不 join）
test("muscle tension produces one finding per location", () => {
  const findings = tension.buildMuscleTensionFindings({ assessmentId: "motion:calf-dorsiflexion", assessmentTitle: "踝背屈", locations: ["小腿前侧", "小腿后侧", "小腿前侧"] });
  assert.deepEqual(findings.map((f) => f.location), ["小腿前侧", "小腿后侧"]);
  assert.ok(findings.every((f) => !f.title.includes("、")), "each finding title must not join multiple locations");
});
