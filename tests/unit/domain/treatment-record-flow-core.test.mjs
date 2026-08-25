import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const core = await loadTypeScriptModule("./src/domain/rehab/treatment/treatment-record-flow-core.ts");

function input(overrides = {}) {
  return {
    recordInput: {
      candidates: [{
        id: "candidate:chief-muscle",
        candidateTitle: "主诉相关处理",
        treatmentName: "主诉相关处理",
        treatmentKey: "chief-muscle:right",
        action: "轻柔处理",
      }],
      carryoverOnly: false,
      beforeScore: 5,
      recordedAfterScore: 2,
      result: "better",
      activityWorsened: false,
      timeBased: false,
      deferredRetest: false,
      hasSingleRangeEvidence: false,
      movementResponse: "",
      functionBaselineCompletion: undefined,
      functionAfterCompletion: undefined,
      functionRetestMode: undefined,
      responseRole: "partial-contribution",
      priorTreatmentTitle: undefined,
      treatmentSide: "右侧",
      treatmentSides: undefined,
      sideResults: undefined,
      targetId: "target:chief",
      targetTitle: "下楼梯",
      residualReviewId: "residual",
    },
    retestActionKey: "下楼梯",
    retest: {
      timeBased: false,
      deferredRetest: false,
      evidenceCaptured: true,
      targetId: "target:chief",
      targetChiefRetestAllowed: true,
      chiefScoreComparable: true,
      activeDirectionId: undefined,
      chiefDirectionId: undefined,
      chiefImprovedDuringTreatment: false,
      chiefRetestCompletedDuringTreatment: false,
    },
    ...overrides,
  };
}

test("处理后主诉复测证据同时写入记录标记和复测动作", () => {
  const result = core.resolveTreatmentRecordFlow(input());
  assert.equal(result.chiefWasActuallyRetested, true);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].chiefRetested, true);
  assert.equal(result.records[0].retestActionKey, "下楼梯");
});

test("时间性处理或缺少证据时不能绑定主诉复测", () => {
  const result = core.resolveTreatmentRecordFlow(input({
    recordInput: {
      ...input().recordInput,
      timeBased: true,
    },
    retest: {
      ...input().retest,
      timeBased: true,
      evidenceCaptured: true,
    },
  }));
  assert.equal(result.chiefWasActuallyRetested, false);
  assert.equal(result.records[0].chiefRetested, false);
  assert.equal(result.records[0].retestActionKey, undefined);
});

test("非主诉目标只有同一物理动作才承接主诉复测", () => {
  const result = core.resolveTreatmentRecordFlow(input({
    recordInput: { ...input().recordInput, targetId: "target:local-limb" },
    retest: {
      ...input().retest,
      targetId: "target:local-limb",
      activeDirectionId: "motion:ankle-dorsiflexion",
      chiefDirectionId: "motion:ankle-dorsiflexion",
    },
  }));
  assert.equal(result.chiefWasActuallyRetested, true);
  assert.equal(result.records[0].chiefRetested, true);
});

function rangeInput(overrides = {}) {
  return {
    candidates: [
      {
        id: "candidate:range-primary",
        treatmentKey: "range-primary:right",
        treatmentSide: "右侧",
        candidateTitle: "活动范围处理",
        treatmentName: "活动范围处理",
        action: "控制练习",
      },
      {
        id: "candidate:range-support",
        treatmentKey: "range-support:right",
        treatmentSide: "右侧",
        candidateTitle: "配合处理",
        treatmentName: "配合处理",
        action: "配合练习",
      },
    ],
    carryoverOnly: false,
    rangeOutcome: "passive-match-active-limited",
    rangeOutcomes: { "motion:ankle-dorsiflexion": "passive-match-active-limited" },
    rangeDiscomforts: { "motion:ankle-dorsiflexion": "yes" },
    rangeScores: { "motion:ankle-dorsiflexion": 3 },
    beforeScore: 5,
    afterScore: 5,
    result: "same",
    activityWorsened: false,
    chiefWasActuallyRetested: false,
    reusedFromTargetTitle: "原主诉",
    retestActionKey: "踝背屈",
    responseRole: "range-contribution",
    targetId: "target:local-limb",
    targetTitle: "踝背屈",
    residualReviewId: "residual-review",
    ...overrides,
  };
}

test("批量活动度记录保留范围证据但不误写主诉复测", () => {
  const records = core.buildRangeTreatmentRecords(rangeInput());
  assert.equal(records.length, 2);
  assert.equal(records[0].measurement, "range");
  assert.deepEqual(records[0].rangeScores, { "motion:ankle-dorsiflexion": 3 });
  assert.equal(records[0].chiefRetested, false);
  assert.equal(records[0].beforeScore, 5);
  assert.equal(records[0].afterScore, 5);
  assert.equal(records[0].responseRole, "range-contribution");
});

test("批量记录的配合项不能冒充独立可归因结果", () => {
  const records = core.buildRangeTreatmentRecords(rangeInput({
    chiefWasActuallyRetested: true,
    beforeScore: 5,
    afterScore: 2,
    result: "better",
  }));
  assert.equal(records[0].chiefRetested, true);
  assert.equal(records[0].responseRole, "range-contribution");
  assert.equal(records[0].supportingOnly, false);
  assert.equal(records[1].batchedResult, true);
  assert.equal(records[1].supportingOnly, true);
  assert.equal(records[1].responseRole, "not-immediately-testable");
  assert.equal(records[1].retestActionKey, "踝背屈");
});

test("批量记录可以保留复查项和既有目标沿用关系", () => {
  const records = core.buildRangeTreatmentRecords(rangeInput({
    candidates: [rangeInput().candidates[0], { ...rangeInput().candidates[1], id: "residual-review" }],
    carryoverOnly: true,
    chiefWasActuallyRetested: false,
  }));
  assert.equal(records[0].retestOnly, true);
  assert.equal(records[0].reusedFromTargetTitle, "原主诉");
  assert.equal(records[1].reviewOnly, true);
});

test("范围复测记录门禁只接受已确认的主诉分数或范围分数", () => {
  assert.equal(core.resolveRangeChiefRetestCapture({
    shouldRequest: true,
    scoreShownAndRecorded: false,
    scoreConfirmed: false,
    rangeScoreCaptured: false,
  }), false);
  assert.equal(core.resolveRangeChiefRetestCapture({
    shouldRequest: false,
    scoreShownAndRecorded: true,
    scoreConfirmed: true,
    rangeScoreCaptured: false,
  }), true);
  assert.equal(core.resolveRangeChiefRetestCapture({
    shouldRequest: false,
    scoreShownAndRecorded: false,
    scoreConfirmed: false,
    rangeScoreCaptured: true,
  }), true);
});
