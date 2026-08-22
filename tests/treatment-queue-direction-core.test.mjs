import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/treatment-queue-direction-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

const base = {
  candidateType: "muscle",
  hasRetestForDirection: false,
  motionAnswerIsLimited: false,
  canMobilizeJoint: true,
  directionAllowsPassive: true,
};

test("未完成或部分改善的肌肉方向仍保留后续候选", () => {
  assert.equal(core.isTreatmentQueueDirectionCandidateNeeded({ ...base }), true);
  assert.equal(core.isTreatmentQueueDirectionCandidateNeeded({ ...base, currentOutcome: "better" }), true);
  assert.equal(core.isTreatmentQueueDirectionCandidateNeeded({ ...base, currentOutcome: "both-match" }), false);
});

test("加重结果对所有候选都是停止信号", () => {
  for (const candidateType of ["muscle", "joint", "control"]) {
    assert.equal(core.isTreatmentQueueDirectionCandidateNeeded({ ...base, candidateType, currentOutcome: "worse" }), false);
  }
});

test("关节候选只在允许被动处理且方向有对应证据时开放", () => {
  assert.equal(core.isTreatmentQueueDirectionCandidateNeeded({ ...base, candidateType: "joint", initialPassive: "limited" }), true);
  assert.equal(core.isTreatmentQueueDirectionCandidateNeeded({ ...base, candidateType: "joint", initialPassive: "limited", canMobilizeJoint: false }), false);
  assert.equal(core.isTreatmentQueueDirectionCandidateNeeded({ ...base, candidateType: "joint", currentOutcome: "passive-limited", directionAllowsPassive: false }), false);
});

test("控制候选区分被动受限和主动受限两条路径", () => {
  assert.equal(core.isTreatmentQueueDirectionCandidateNeeded({ ...base, candidateType: "control", currentOutcome: "passive-match-active-limited" }), true);
  assert.equal(core.isTreatmentQueueDirectionCandidateNeeded({ ...base, candidateType: "control", currentOutcome: "passive-limited", directionAllowsPassive: false }), true);
  assert.equal(core.isTreatmentQueueDirectionCandidateNeeded({ ...base, candidateType: "control", motionAnswerIsLimited: true, directionAllowsPassive: false }), true);
  assert.equal(core.isTreatmentQueueDirectionCandidateNeeded({ ...base, candidateType: "control", initialPassive: "same", directionAllowsPassive: true }), true);
});

test("已存在同方向复测但没有开放结果时，不用初始证据重复开放控制候选", () => {
  assert.equal(core.isTreatmentQueueDirectionCandidateNeeded({
    ...base,
    candidateType: "control",
    initialPassive: "same",
    hasRetestForDirection: true,
  }), false);
});
