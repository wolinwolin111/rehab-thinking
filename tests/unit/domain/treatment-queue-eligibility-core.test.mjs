import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../../src/domain/rehab/treatment/treatment-queue-eligibility-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

const candidate = (type, retestIds = []) => ({ type, retestIds });
const base = {
  candidate: candidate("control", ["ankle-dorsiflexion"]),
  target: { findingId: "motion:knee-extension" },
  preferredTypes: [],
  trackedDirectionIds: new Set(),
  mergedOutcomes: {},
  chiefStillSymptomatic: false,
  getCandidateType: (item) => item.type,
  getCandidateRetestIds: (item) => item.retestIds,
  getTargetDirectionId: (item) => item.findingId.startsWith("motion:") ? item.findingId.replace(/^motion:/, "") : undefined,
  samePhysicalAction: (left, right) => left === right,
  directionNeedsCandidate: () => false,
};

test("优先类型不匹配时不能进入下一项", () => {
  assert.equal(core.isTreatmentQueueCandidateEligible({ ...base, preferredTypes: ["joint"] }), false);
});

test("已追踪方向存在时只根据该方向决定资格", () => {
  assert.equal(core.isTreatmentQueueCandidateEligible({
    ...base,
    trackedDirectionIds: new Set(["ankle-dorsiflexion"]),
    chiefStillSymptomatic: true,
    directionNeedsCandidate: (_candidate, directionId) => directionId === "ankle-dorsiflexion",
  }), true);
  assert.equal(core.isTreatmentQueueCandidateEligible({
    ...base,
    trackedDirectionIds: new Set(["ankle-dorsiflexion"]),
    chiefStillSymptomatic: true,
    directionNeedsCandidate: () => false,
  }), false);
});

test("候选已有同物理动作的复测结果时使用合并结果判断", () => {
  assert.equal(core.isTreatmentQueueCandidateEligible({
    ...base,
    mergedOutcomes: { "alias:ankle-dorsiflexion": "passive-limited" },
    samePhysicalAction: (left, right) => left.replace("alias:", "") === right,
    directionNeedsCandidate: (_candidate, directionId, outcomes) => directionId === "ankle-dorsiflexion" && outcomes["alias:ankle-dorsiflexion"] === "passive-limited",
  }), true);
});

test("没有候选方向时回退到目标方向或主诉持续状态", () => {
  assert.equal(core.isTreatmentQueueCandidateEligible({
    ...base,
    candidate: candidate("joint", []),
    directionNeedsCandidate: (_candidate, directionId) => directionId === "knee-extension",
  }), true);
  assert.equal(core.isTreatmentQueueCandidateEligible({ ...base, chiefStillSymptomatic: true }), true);
  assert.equal(core.isTreatmentQueueCandidateEligible(base), false);
});

test("没有目标方向且方向判断为否时，主诉持续状态作为最终回退", () => {
  assert.equal(core.isTreatmentQueueCandidateEligible({
    ...base,
    target: { findingId: "target:chief" },
    chiefStillSymptomatic: true,
    directionNeedsCandidate: () => false,
  }), true);
});
