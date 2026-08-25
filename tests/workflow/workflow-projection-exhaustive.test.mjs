// 投影函数全空间穷举验证。
// Oracle 来源：
// - 阶段解锁阶梯：docs/pilot-scenario-coverage.md 六阶段逐级解锁 + SYS-STATE-001（上游失效锁回评估）
// - 训练门禁：SYS-S02/S03（加重停止不得进入训练）、SYS-BILATERAL-003（双侧未完整评估仅低负荷）
// - 不变量完备性：INV-WORKFLOW-STAGE-BYPASS / INV-RETEST-SKIPPED / INV-QUEUE-EARLY-END / INV-TRAINING-GATE-BYPASS 文档定义
// - 单调性：完成度只进不退时，解锁层级不得回退（阶段进度设计性质）
import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../support/load-typescript-module.mjs";

const workflow = await loadTypeScriptModule(
  "./src/features/rehabmind/workflow/workflow-orchestrator.ts",
);
const invariants = await loadTypeScriptModule(
  "./src/features/rehabmind/workflow/workflow-invariants.ts",
);

const GOOD_KEYS = [
  "intakeComplete",
  "safetyComplete",
  "assessmentReadyForTreatment",
  "planIsCurrent",
  "trainingComplete",
  "trainingPlanSaved",
];
const BAD_KEYS = [
  "adverseResponse",
  "assessmentNeedsReferral",
  "queueRefreshing",
  "pendingAssessmentCheck",
  "safetySignal",
  "treatmentWorsened",
];
const NEUTRAL_KEYS = ["bilateral", "assessmentComplete"];
const BOOL_KEYS = [...GOOD_KEYS, ...BAD_KEYS, ...NEUTRAL_KEYS];

const QUEUE_PAIRS = [];
for (const length of [0, 1, 2, 4]) {
  for (let index = 0; index <= 4; index += 1) {
    if (index <= length) QUEUE_PAIRS.push([length, index]);
  }
}

function makeInput(mask, queueLength, queueIndex) {
  const input = { queueLength, queueIndex };
  for (let bit = 0; bit < BOOL_KEYS.length; bit += 1) {
    input[BOOL_KEYS[bit]] = Boolean(mask & (1 << bit));
  }
  return input;
}

function derivedTreatmentComplete(input) {
  return !input.queueRefreshing
    && !input.pendingAssessmentCheck
    && (input.queueLength === 0 || input.queueIndex >= input.queueLength);
}

// 解锁阶梯的独立推导，每一级标注设计依据；与实现无关地重述产品规则顺序。
function expectedMaxUnlock(input) {
  if (!input.intakeComplete) return 0;
  if (!input.safetyComplete) return 1;
  if (input.adverseResponse || !input.planIsCurrent) return 2;
  if (!input.assessmentReadyForTreatment || input.assessmentNeedsReferral) return 2;
  if (!derivedTreatmentComplete(input)) return 3;
  if (!(input.trainingComplete || input.trainingPlanSaved)) return 4;
  return 5;
}

function expectedTrainingBlocked(input) {
  return input.safetySignal || input.treatmentWorsened;
}

function expectedLowLoadOnly(input) {
  return input.bilateral && !input.assessmentComplete
    && !input.safetySignal && !input.treatmentWorsened;
}

function expectedInvariantCodes(input, projection, snapshotStep) {
  const codes = [];
  if (snapshotStep > projection.maxUnlocked) codes.push("INV-WORKFLOW-STAGE-BYPASS");
  if (snapshotStep >= 4 && !projection.treatmentComplete) codes.push("INV-RETEST-SKIPPED");
  if (snapshotStep >= 4 && input.queueLength > 0 && input.queueIndex < input.queueLength) {
    codes.push("INV-QUEUE-EARLY-END");
  }
  if (snapshotStep >= 5 && !(input.trainingComplete || input.trainingPlanSaved)) {
    codes.push("INV-TRAINING-GATE-BYPASS");
  }
  return codes.sort();
}

test("投影穷举：全部 16384 种布尔组合 × 队列网格的解锁阶梯符合文档门禁顺序", () => {
  let checked = 0;
  for (let mask = 0; mask < 1 << BOOL_KEYS.length; mask += 1) {
    for (const [queueLength, queueIndex] of QUEUE_PAIRS) {
      const input = makeInput(mask, queueLength, queueIndex);
      const projection = workflow.projectWorkflowState(input);
      assert.equal(
        projection.maxUnlocked,
        expectedMaxUnlock(input),
        `maxUnlocked mismatch at ${JSON.stringify(input)}`,
      );
      checked += 1;
    }
  }
  assert.equal(checked, (1 << BOOL_KEYS.length) * QUEUE_PAIRS.length);
});

test("投影穷举：加重与安全信号在全空间内一律阻断训练进入；双侧低负荷门禁三态正确", () => {
  for (let mask = 0; mask < 1 << BOOL_KEYS.length; mask += 1) {
    for (const [queueLength, queueIndex] of QUEUE_PAIRS) {
      const input = makeInput(mask, queueLength, queueIndex);
      const projection = workflow.projectWorkflowState(input);
      if (expectedTrainingBlocked(input)) {
        assert.ok(
          !projection.canEnterTraining && projection.trainingStageGate.blocked,
          `blocked training expected at ${JSON.stringify(input)}`,
        );
      } else if (expectedLowLoadOnly(input)) {
        assert.ok(
          projection.trainingStageGate.lowLoadOnly && !projection.trainingStageGate.blocked,
          `low-load gate expected at ${JSON.stringify(input)}`,
        );
      }
    }
  }
});

test("不变量检测器完备性：全空间 × 全部快照步的告警集合与文档规则一一对应", () => {
  for (let mask = 0; mask < 1 << BOOL_KEYS.length; mask += 1) {
    for (const [queueLength, queueIndex] of QUEUE_PAIRS) {
      const input = makeInput(mask, queueLength, queueIndex);
      const projection = workflow.projectWorkflowState(input);
      for (let snapshotStep = 0; snapshotStep <= 5; snapshotStep += 1) {
        const actual = invariants
          .inspectWorkflowProjectionInvariants({ snapshotStep, projection })
          .slice()
          .sort();
        assert.deepEqual(
          actual,
          expectedInvariantCodes(input, projection, snapshotStep),
          `invariant mismatch at step=${snapshotStep} ${JSON.stringify(input)}`,
        );
      }
    }
  }
});

test("单调性：单个完成布尔翻转时解锁层级只进不退，坏信号翻转只降不升", () => {
  const directionalKeys = [...GOOD_KEYS, ...BAD_KEYS];
  const queueFixtures = [[0, 0], [4, 1]];
  const tables = queueFixtures.map(([length, index]) => {
    const table = new Int8Array(1 << BOOL_KEYS.length);
    for (let mask = 0; mask < 1 << BOOL_KEYS.length; mask += 1) {
      table[mask] = workflow.projectWorkflowState(makeInput(mask, length, index)).maxUnlocked;
    }
    return table;
  });
  for (let mask = 0; mask < 1 << BOOL_KEYS.length; mask += 1) {
    for (let bit = 0; bit < directionalKeys.length; bit += 1) {
      const flipped = mask | (1 << bit);
      if (flipped === mask) continue;
      const isGoodKey = GOOD_KEYS.includes(directionalKeys[bit]);
      tables.forEach((table, tableIndex) => {
        const before = table[mask];
        const after = table[flipped];
        if (isGoodKey) {
          assert.ok(
            after >= before,
            `${directionalKeys[bit]}=true dropped unlock ${before}->${after} (mask=${mask}, queue=${JSON.stringify(queueFixtures[tableIndex])})`,
          );
        } else {
          assert.ok(
            after <= before,
            `${directionalKeys[bit]}=true raised unlock ${before}->${after} (mask=${mask}, queue=${JSON.stringify(queueFixtures[tableIndex])})`,
          );
        }
      });
    }
  }
});

test("处理完成判定：队列存在未消费项且无刷新/待检时，处理阶段必须视为未完成", () => {
  for (let mask = 0; mask < 1 << BOOL_KEYS.length; mask += 1) {
    for (const [queueLength, queueIndex] of QUEUE_PAIRS) {
      if (queueLength === 0) continue;
      const input = makeInput(mask, queueLength, queueIndex);
      if (input.queueRefreshing || input.pendingAssessmentCheck) continue;
      if (input.queueIndex >= input.queueLength) continue;
      const projection = workflow.projectWorkflowState(input);
      assert.equal(
        projection.treatmentComplete,
        false,
        `early completion at ${JSON.stringify(input)}`,
      );
    }
  }
});
