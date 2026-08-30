import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

// v3 重构后 batch-retest-compute 依赖 retest-obligation-core 的 combineRetestResults 等，
// 手拼 strip-bundle 不再可行，改为真实模块加载。
const core = await loadTypeScriptModule("./src/domain/rehab/retest/batch-retest-compute.ts");

test("all ranges resolved with chief drop yields better partial-contribution", () => {
  const { result, responseRole } = core.computeBatchResult({
    chiefBeforeScore: 5,
    recordedChiefScore: 2,
    chiefWasActuallyRetested: true,
    rangeBeforeScore: 5,
    outcomes: ["both-match"],
    priorImprovingTreatmentCount: 0,
  });
  assert.equal(result, "better");
  assert.equal(responseRole, "partial-contribution");
});

test("chief unchanged but range improved yields partial range-contribution", () => {
  const { result, responseRole } = core.computeBatchResult({
    chiefBeforeScore: 5,
    recordedChiefScore: 5,
    chiefWasActuallyRetested: true,
    rangeBeforeScore: 5,
    outcomes: ["better-passive-limited"],
    priorImprovingTreatmentCount: 0,
  });
  assert.equal(result, "partial");
  assert.equal(responseRole, "range-contribution");
});

test("pain improves but activity worsens yields a mixed stop result", () => {
  const { result, responseRole, activityWorsened } = core.computeBatchResult({
    chiefBeforeScore: 5,
    recordedChiefScore: 3,
    chiefWasActuallyRetested: true,
    rangeBeforeScore: 5,
    outcomes: ["both-match", "worse"],
    priorImprovingTreatmentCount: 0,
  });
  assert.equal(result, "partial");
  assert.equal(responseRole, "worsened");
  assert.equal(activityWorsened, true);
});

test("activity worsening without symptom improvement remains worse", () => {
  const { result, responseRole, activityWorsened } = core.computeBatchResult({
    chiefBeforeScore: 5,
    recordedChiefScore: 5,
    chiefWasActuallyRetested: true,
    rangeBeforeScore: 5,
    outcomes: ["both-match", "worse"],
    priorImprovingTreatmentCount: 0,
  });
  assert.equal(result, "worse");
  assert.equal(responseRole, "worsened");
  assert.equal(activityWorsened, true);
});
