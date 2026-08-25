import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/training-stage-gate-core.ts", import.meta.url), "utf8");
const bilateralSource = await readFile(new URL("../app/bilateral-flow-core.ts", import.meta.url), "utf8");
const bilateralCode = ts.transpileModule(bilateralSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const bilateralUrl = `data:text/javascript;base64,${Buffer.from(bilateralCode).toString("base64")}`;
const code = ts.transpileModule(source.replace('from "./bilateral-flow-core"', `from "${bilateralUrl}"`), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

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
