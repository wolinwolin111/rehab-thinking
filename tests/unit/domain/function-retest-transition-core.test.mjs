import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../../src/domain/rehab/retest/function-retest-transition-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

const base = {
  isFunctionTarget: true,
  mode: "ordinary",
  completion: "complete",
  unableReason: "",
  scoreConfirmed: false,
};

test("普通功能复测必须同时完成动作回答和分数确认", () => {
  const result = core.resolveFunctionRetestTransition(base);
  assert.equal(result.requiresCompletion, true);
  assert.equal(result.requiresScore, true);
  assert.equal(result.answerComplete, true);
  assert.equal(result.functionReady, false);
  assert.equal(result.retestReady, false);

  const confirmed = core.resolveFunctionRetestTransition({ ...base, scoreConfirmed: true });
  assert.equal(confirmed.functionReady, true);
  assert.equal(confirmed.evidenceCaptured, true);
});

test("首次未完成的功能动作只要求复核能否完成，不伪造疼痛分数", () => {
  const unable = core.resolveFunctionRetestTransition({
    ...base,
    mode: "completion-status",
    completion: "complete",
  });
  assert.equal(unable.completionOnly, true);
  assert.equal(unable.requiresScore, false);
  assert.equal(unable.functionReady, true);
  assert.equal(unable.automaticResult, "partial");

  const stillUnable = core.resolveFunctionRetestTransition({
    ...base,
    mode: "completion-status",
    completion: "unable",
    unableReason: "pain",
  });
  assert.equal(stillUnable.functionReady, true);
  assert.equal(stillUnable.automaticResult, "same");
});

test("无法完成但没有原因时不能完成复测", () => {
  const result = core.resolveFunctionRetestTransition({
    ...base,
    mode: "completion-status",
    completion: "unable",
  });
  assert.equal(result.answerComplete, false);
  assert.equal(result.functionReady, false);
  assert.equal(result.evidenceCaptured, false);
});

test("非功能目标仍使用普通分数确认", () => {
  const pending = core.resolveFunctionRetestTransition({
    ...base,
    isFunctionTarget: false,
    mode: "none",
    completion: "",
  });
  assert.equal(pending.requiresCompletion, false);
  assert.equal(pending.requiresScore, true);
  assert.equal(pending.functionReady, false);

  const confirmed = core.resolveFunctionRetestTransition({
    ...pending,
    scoreConfirmed: true,
  });
  assert.equal(confirmed.functionReady, true);
});

test("普通主诉没有可比较分数时被阻断，但完成状态复测保留例外", () => {
  const ordinary = core.resolveTreatmentRetestGate({
    ...base,
    targetId: "target:chief",
    chiefScoreComparable: false,
  });
  assert.equal(ordinary.chiefScoreRetestBlocked, true);
  assert.equal(ordinary.retestReady, true);
  assert.equal(ordinary.functionReady, false);
  assert.equal(ordinary.evidenceCaptured, false);

  const completionOnly = core.resolveTreatmentRetestGate({
    ...base,
    mode: "completion-status",
    targetId: "target:chief",
    chiefScoreComparable: false,
  });
  assert.equal(completionOnly.chiefScoreRetestBlocked, false);
  assert.equal(completionOnly.retestReady, true);
  assert.equal(completionOnly.evidenceCaptured, true);
});
