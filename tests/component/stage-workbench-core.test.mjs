import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../src/features/rehabmind/workflow/stage-workbench-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

const base = {
  canContinueSafety: true,
  assessmentFlowComplete: false,
  completedAssessmentCount: 0,
  totalAssessmentCount: 6,
  unresolvedProblemCount: 0,
  trialRecordCount: 0,
  trainingComplete: false,
  exerciseCount: 0,
  isSummaryStep: false,
};

test("in-progress stages show counts instead of a completion label", () => {
  assert.deepEqual(core.workbenchStageStates({
    ...base,
    completedAssessmentCount: 3,
    totalAssessmentCount: 6,
    unresolvedProblemCount: 2,
    trialRecordCount: 1,
    exerciseCount: 4,
  }), ["已完成", "3/6", "2项", "1条记录", "4项", "待完成"]);
});

test("completed stages collapse to the completion label", () => {
  assert.deepEqual(core.workbenchStageStates({
    ...base,
    assessmentFlowComplete: true,
    trainingComplete: true,
    isSummaryStep: true,
  }), ["已完成", "已完成", "待评估", "待开始", "已完成", "已完成"]);
});

test("an empty training stage reads as not yet arranged", () => {
  assert.deepEqual(core.workbenchStageStates(base)[4], "待安排");
});
