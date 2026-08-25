import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const core = await loadTypeScriptModule("./src/domain/rehab/training/training-stage-gate-core.ts");

const base = {
  bilateral: false,
  assessmentComplete: true,
  safetySignal: false,
  treatmentWorsened: false,
  trainingComplete: false,
  trainingPlanSaved: false,
};

test("单侧或双侧评估完成后进入正常训练", () => {
  const result = core.resolveTrainingStageGate(base);
  assert.equal(result.bilateralGate, "normal");
  assert.equal(result.lowLoadOnly, false);
  assert.equal(result.blocked, false);
  assert.equal(result.closed, false);
});

test("双侧评估未完成只开放低负荷训练", () => {
  const result = core.resolveTrainingStageGate({ ...base, bilateral: true, assessmentComplete: false });
  assert.equal(result.bilateralGate, "low-load");
  assert.equal(result.lowLoadOnly, true);
  assert.equal(result.blocked, false);
});

test("安全信号或处理加重阻断训练阶段", () => {
  for (const key of ["safetySignal", "treatmentWorsened"]) {
    const result = core.resolveTrainingStageGate({ ...base, [key]: true });
    assert.equal(result.bilateralGate, "blocked");
    assert.equal(result.blocked, true);
    assert.equal(result.lowLoadOnly, false);
  }
});

test("训练方案已保存即关闭阶段，但不等同于已执行", () => {
  const result = core.resolveTrainingStageGate({ ...base, trainingPlanSaved: true });
  assert.equal(result.closed, true);

  const executed = core.resolveTrainingStageGate({ ...base, trainingComplete: true });
  assert.equal(executed.closed, true);
});
