import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../../../src/domain/rehab/shared/bilateral-flow-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

test("主诉优先侧不会被评估更差侧静默替换", () => {
  const result = core.resolveBilateralPriority({ complaintPrioritySide: "左侧", assessmentWorseSide: "右侧" });
  assert.equal(result.prioritySide, "左侧");
  assert.equal(result.source, "主诉");
  assert.equal(result.needsConfirmation, true);
  assert.equal(result.conflictSide, "右侧");
});

test("没有主诉优先侧时使用评估结果，但没有结果必须继续要求选择", () => {
  assert.equal(core.resolveBilateralPriority({ assessmentWorseSide: "右侧" }).prioritySide, "右侧");
  assert.equal(core.resolveBilateralPriority({}).source, "待选择");
});

test("安全侧可以覆盖处理顺序并留下确认提醒", () => {
  const result = core.resolveBilateralPriority({ complaintPrioritySide: "左侧", safetySide: "右侧" });
  assert.equal(result.prioritySide, "右侧");
  assert.equal(result.source, "安全");
  assert.equal(result.needsConfirmation, true);
});

test("双侧评估未完成时只能进入低负荷出口", () => {
  const result = core.bilateralAssessmentGate({
    bilateral: true,
    prioritySide: "左侧",
    requiredAssessmentIds: ["motion:knee-extension", "function:knee-step-up"],
    completedAssessmentIds: ["motion:knee-extension"],
  });
  assert.equal(result.complete, false);
  assert.deepEqual(result.missing, ["function:knee-step-up"]);
  assert.equal(core.bilateralTrainingGate({ bilateral: true, assessmentComplete: result.complete }), "low-load");
  assert.deepEqual(core.bilateralCheckpointOptions({ bilateral: true, assessmentComplete: false, otherSideHasPendingTreatment: false }), [
    "return-other-side-assessment", "low-load-activity", "save-and-continue",
  ]);
});

test("双侧评估完成后才能开放正常训练，处理加重优先停止", () => {
  assert.equal(core.bilateralTrainingGate({ bilateral: true, assessmentComplete: true }), "normal");
  assert.equal(core.bilateralTrainingGate({ bilateral: true, assessmentComplete: true, treatmentWorsened: true }), "blocked");
  assert.deepEqual(core.bilateralCheckpointOptions({ bilateral: true, assessmentComplete: true, otherSideHasPendingTreatment: true }), [
    "continue-other-side-treatment", "normal-training", "save-and-continue",
  ]);
});

test("处理队列按优先侧排序，但保留另一侧记录", () => {
  const items = [{ id: "left", side: "左侧" }, { id: "right", side: "右侧" }, { id: "both", side: "两侧接近" }];
  assert.deepEqual(core.orderBilateralSides(items, "右侧").map((item) => item.id), ["right", "left", "both"]);
});

test("M-07：更差侧推断计入 track 级单侧异常", () => {
  assert.equal(core.inferBilateralAssessmentWorseSide([{ priority: "track", side: "右侧" }]), "右侧");
  assert.equal(core.inferBilateralAssessmentWorseSide([{ priority: "support", side: "左侧" }, { priority: "track", side: "右侧" }]), undefined);
});

test("M-07：两侧都有异常、无异常或优先级不含 support/track 时不产生伪共识", () => {
  assert.equal(core.inferBilateralAssessmentWorseSide([]), undefined);
  assert.equal(core.inferBilateralAssessmentWorseSide([{ priority: "support", side: "两侧异常" }]), undefined);
  assert.equal(core.inferBilateralAssessmentWorseSide([{ priority: "info", side: "右侧" }]), undefined);
});
