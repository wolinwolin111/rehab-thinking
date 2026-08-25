import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const core = await loadTypeScriptModule("./src/domain/rehab/treatment/treatment-queue-core.ts");

const candidates = [
  { id: "muscle-1", type: "muscle" },
  { id: "control-1", type: "control" },
  { id: "joint-1", type: "joint" },
];

test("加重或活动表现恶化时，队列核心停止而不寻找下一项", () => {
  const result = core.resolveTreatmentQueueAdvance({
    candidates,
    startIndex: 0,
    preferredTypes: ["control"],
    getType: (candidate) => candidate.type,
    result: "worse",
    activityWorsened: false,
  });
  assert.equal(result.stopped, true);
  assert.equal(result.nextCandidateIndex, -1);
  assert.equal(result.advanceToNextTarget, false);
});

test("同目标优先找到后续符合类型的候选", () => {
  const result = core.resolveTreatmentQueueAdvance({
    candidates,
    startIndex: 0,
    preferredTypes: ["joint"],
    getType: (candidate) => candidate.type,
    result: "partial",
    activityWorsened: false,
  });
  assert.equal(result.nextCandidateIndex, 2);
  assert.equal(result.nextTargetPosition, undefined);
  assert.equal(result.advanceToNextTarget, false);
});

test("同目标没有合适候选时，才定位后续目标并保留稳定位置", () => {
  const targets = [
    { id: "target:a", candidates: [candidates[0]] },
    { id: "target:b", candidates: [{ id: "joint-2", type: "joint" }] },
  ];
  const result = core.resolveTreatmentQueueAdvance({
    candidates: targets[0].candidates,
    startIndex: 0,
    preferredTypes: ["joint"],
    getType: (candidate) => candidate.type,
    result: "better",
    activityWorsened: false,
    targets,
    startTargetIndex: 0,
    isEligibleAcrossTargets: (candidate, target) => target.id === "target:b" && candidate.type === "joint",
  });
  assert.deepEqual(result.nextTargetPosition, { targetIndex: 1, candidateIndex: 0 });
  assert.equal(result.advanceToNextTarget, false);
});

test("没有后续候选时才允许结束当前目标", () => {
  const result = core.resolveTreatmentQueueAdvance({
    candidates,
    startIndex: 2,
    result: "better",
    activityWorsened: false,
  });
  assert.equal(result.nextCandidateIndex, -1);
  assert.equal(result.advanceToNextTarget, true);
});
