import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadBundle(paths) {
  const parts = [];
  for (let i = 0; i < paths.length; i++) {
    const src = await readFile(new URL(paths[i], import.meta.url), "utf8");
    let out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    out = out.replace(/import\s+(?:type\s+)?\{[^}]*\}\s*from\s*"[^"]*";?/g, "");
    out = out.replace(/import\s+[^"'\n]+\s+from\s*"[^"]*";?/g, "");
    if (i < paths.length - 1) out = out.replace(/export\s+/g, "");
    parts.push(out);
  }
  return import(`data:text/javascript;base64,${Buffer.from(parts.join("\n")).toString("base64")}`);
}

// buildTrialTargets 的运行时依赖（按拓扑序，依赖在前）
const core = await loadBundle([
  "../app/pilot-motion-muscle-knowledge.ts",
  "../app/action-identity-core.ts",
  "../app/assessment-answer-core.ts",
  "../app/candidate-order-core.ts",
  "../app/chief-action-core.ts",
  "../app/knee-decision-core.ts",
  "../app/knee-workflow-adapter.ts",
  "../app/candidate-treatment-core.ts",
  "../app/candidate-safety-core.ts",
  "../app/candidate-action-core.ts",
  "../app/candidate-scoring-core.ts",
  "../app/patella-mobility-core.ts",
  "../app/trial-target-core.ts",
  "../app/build-trial-targets-core.ts",
]);

function product(...lists) {
  return lists.reduce((acc, list) => acc.flatMap((combo) => list.map((value) => [...combo, value])), [[]]);
}

const muscleCandidate = {
  id: "muscle:quadriceps", title: "股四头肌轻柔松解", type: "muscle", access: "self",
  do: "在股四头肌找到更紧、更酸的区域轻柔松解30秒", observe: "只做轻柔按压", retest: "重新比较屈膝活动度",
  tags: ["quadriceps", "knee-flexion"], retestIds: ["knee-flexion"], siteLabel: "大腿前侧", targetLabel: "", actionLabel: "轻柔松解",
};
const jointCandidate = {
  id: "joint:knee-flexion-mobilization", title: "膝关节屈曲方向松动", type: "joint", access: "therapist",
  do: "由专业人员完成膝关节屈曲方向松动", observe: "记录活动范围", retest: "复测屈曲活动度",
  tags: ["knee-flexion", "joint-mobility"], retestIds: ["knee-flexion"], siteLabel: "膝关节", targetLabel: "", actionLabel: "膝关节屈曲松动",
};

const kneeRegion = {
  id: "knee", shortName: "膝", mobilityInterventions: [], candidateGroups: [{ candidates: [muscleCandidate, jointCandidate] }],
};

function makeContext(overrides = {}) {
  const findings = overrides.findings ?? [
    { id: "motion:knee-flexion", priority: "support", title: "膝关节屈曲活动度", side: "右侧", tags: ["knee-flexion", "motion"] },
  ];
  return {
    region: kneeRegion,
    findings,
    assessmentResults: {},
    intake: {
      side: "右侧", symptomType: "酸痛", location: "膝关节", mechanism: "逐渐出现", onset: "2～7天",
      reportedActions: [{ raw: "弯膝", label: "弯膝" }], customAction: "", reproduction: "", forceDirection: "",
      actionAnalysis: { task: "弯膝", category: "", function: "", load: "", direction: "" },
      userRole: "general", provocationTypes: [], symptoms: [], stabbingPalpation: "", goal: 4, description: "", baselineScore: 5, baselineScoreConfirmed: true,
    },
    trialRecords: [],
    tissuePathway: { id: "standard" },
    kneeDecision: null,
    localLimbDecision: null,
    matchedPilotRelations: [],
    pilotRelationsByAssessmentId: new Map(),
    pilotTreatmentUnits: [],
    matchedCandidateGroups: [],
    canAssessPassive: false,
    canMobilizeJoint: false,
    swellingGuidance: undefined,
    assessments: [],
    sharedTensionId: "shared:pilot-muscle-tension",
    assessmentTitle: (id, title) => title,
    sharedTensionLocationsForMotion: () => [],
    chiefFunctionAssessmentId: () => "",
    ...overrides,
  };
}

// D2/D3 不变量：任意组合输入都不抛异常、不重复处理身份、主诉目标按需出现
test("buildTrialTargets never throws and returns a deduped array across the scenario matrix", () => {
  const symptomTypes = ["酸痛", "刺痛", "麻或电感", "无力", "刺胀"];
  const pathways = ["standard", "muscle-contusion", "bone-stress-suspected", "tendon-load"];
  const roles = ["general", "coach", "rehab"];
  const chiefModes = ["clear", "none"];
  for (const [symptomType, pathway, role, chiefMode] of product(symptomTypes, pathways, roles, chiefModes)) {
    const ctx = makeContext({
      intake: {
        ...makeContext().intake,
        symptomType,
        userRole: role,
        reportedActions: chiefMode === "clear" ? [{ raw: "弯膝", label: "弯膝" }] : [],
      },
      tissuePathway: { id: pathway },
    });
    const targets = core.buildTrialTargets(ctx);
    assert.ok(Array.isArray(targets), JSON.stringify({ symptomType, pathway, role, chiefMode }));
    // D1：同一处理候选（candidate.id）在队列里只出现一次
    const ids = targets.flatMap((target) => target.candidates.map((candidate) => candidate.id));
    assert.equal(new Set(ids).size, ids.length, JSON.stringify({ symptomType, pathway, role, chiefMode, ids }));
  }
});

test("a clear chief action yields a chief target when chief candidates exist", () => {
  const targets = core.buildTrialTargets(makeContext());
  assert.ok(targets.some((t) => t.id === "target:chief"), "chief target should exist");
  const chief = targets.find((t) => t.id === "target:chief");
  assert.ok(chief.candidates.length > 0, "chief target should carry candidates");
});

test("an empty findings list returns an empty queue", () => {
  assert.deepEqual(core.buildTrialTargets(makeContext({ findings: [] })), []);
});
