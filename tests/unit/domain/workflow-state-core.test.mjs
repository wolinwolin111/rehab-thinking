import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../../src/domain/rehab/shared/workflow-state-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { resolveDynamicQueueAdvance, resolveDynamicQueueAdvanceForTargets, stableQueueTargetKey, buildPendingQueueAdvance, findNextCandidateIndex, findNextCandidateAcrossTargets } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

test("a completed swelling target hands off to the muscle target that shifted into its place", () => {
  assert.equal(resolveDynamicQueueAdvance(0, ["target:chief:knee-muscle"], {
    completedKey: "target:swelling:knee-swelling",
    nextKey: "",
  }), 0);
});

test("an explicit next treatment is found by identity after the queue reorders", () => {
  assert.equal(resolveDynamicQueueAdvance(0, ["target:motion:knee-control", "target:chief:knee-muscle"], {
    completedKey: "target:swelling:knee-swelling",
    nextKey: "target:chief:knee-muscle",
  }), 1);
});

test("a stable target id survives removal of its previously first candidate", () => {
  assert.equal(resolveDynamicQueueAdvance(0, [
    "target:motion:knee-extension:joint-mobilization",
    "target:chief:other-muscle",
  ], {
    completedKey: "target:chief:first-muscle",
    nextKey: "target:motion:knee-extension:first-muscle",
    nextTargetId: "target:motion:knee-extension",
  }), 0);
});

test("a newly opened treatment for the same problem runs before the old next problem", () => {
  assert.equal(resolveDynamicQueueAdvance(1, [
    "target:chief:second-muscle",
    "target:motion:knee-extension:joint",
  ], {
    completedKey: "target:chief:first-muscle",
    nextKey: "target:motion:knee-extension:joint",
    completedTargetId: "target:chief",
  }), 0);
});

test("reusing a result without a new record exits a still-present final target", () => {
  assert.equal(resolveDynamicQueueAdvance(0, ["target:motion:knee-muscle"], {
    completedKey: "target:motion:knee-muscle",
    nextKey: "",
  }), 1);
});

test("an empty recalculated queue resolves to its completed position", () => {
  assert.equal(resolveDynamicQueueAdvance(1, [], {
    completedKey: "target:chief:knee-muscle",
    nextKey: "",
  }), 0);
});

test("same-target candidate traversal respects the current position and preferred type", () => {
  const candidates = [
    { id: "muscle", type: "muscle" },
    { id: "joint", type: "joint" },
    { id: "control", type: "control" },
  ];
  assert.equal(findNextCandidateIndex({
    candidates,
    startIndex: 0,
    preferredTypes: ["control"],
    getType: (candidate) => candidate.type,
  }), 2);
  assert.equal(findNextCandidateIndex({
    candidates,
    startIndex: 2,
    preferredTypes: ["joint"],
    getType: (candidate) => candidate.type,
  }), -1);
});

test("later-target traversal returns stable target and candidate positions", () => {
  const targets = [
    { id: "chief", candidates: [{ id: "first", type: "muscle" }] },
    { id: "motion", candidates: [{ id: "joint", type: "joint" }, { id: "control", type: "control" }] },
  ];
  assert.deepEqual(findNextCandidateAcrossTargets({
    targets,
    startTargetIndex: 0,
    getCandidates: (target) => target.candidates,
    preferredTypes: ["control"],
    getType: (candidate) => candidate.type,
  }), { targetIndex: 1, candidateIndex: 1 });
});

test("queue traversal leaves clinical eligibility with the caller", () => {
  const candidates = [{ id: "covered", type: "muscle" }, { id: "pending", type: "muscle" }];
  assert.equal(findNextCandidateIndex({
    candidates,
    startIndex: -1,
    isEligible: (candidate) => candidate.id === "pending",
  }), 1);
});

test("目标 key 使用稳定目标和首候选，不依赖数组位置", () => {
  assert.equal(stableQueueTargetKey({ id: "target:chief", candidates: [{ id: "muscle-a" }] }), "target:chief:muscle-a");
  assert.equal(stableQueueTargetKey({ id: "target:empty", candidates: [] }), "target:empty:");
});

test("pending advance 同时保留完成目标和下一目标身份", () => {
  assert.deepEqual(buildPendingQueueAdvance(
    { id: "target:chief", candidates: [{ id: "muscle-a" }] },
    { id: "target:motion", candidates: [{ id: "joint-a" }] },
  ), {
    completedKey: "target:chief:muscle-a",
    nextKey: "target:motion:joint-a",
    nextTargetId: "target:motion",
    completedTargetId: "target:chief",
  });
});

test("真实目标数组重排后按稳定目标身份恢复位置", () => {
  const targets = [
    { id: "target:motion", candidates: [{ id: "joint-new" }] },
  ];
  const pending = buildPendingQueueAdvance(
    { id: "target:chief", candidates: [{ id: "muscle-old" }] },
    { id: "target:motion", candidates: [{ id: "joint-old" }] },
  );
  assert.equal(resolveDynamicQueueAdvanceForTargets(1, targets, pending), 0);
});
