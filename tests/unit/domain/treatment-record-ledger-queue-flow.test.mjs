import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const [recordFlow, ledgerCore, queue] = await Promise.all([
  loadTypeScriptModule("./src/domain/rehab/treatment/treatment-record-flow-core.ts"),
  loadTypeScriptModule("./src/domain/rehab/treatment/treatment-ledger-core.ts"),
  loadTypeScriptModule("./src/domain/rehab/treatment/treatment-queue-core.ts"),
]);
const workflow = await loadTypeScriptModule("./src/domain/rehab/shared/workflow-state-core.ts");

function scoreRecord(overrides = {}) {
  return recordFlow.resolveTreatmentRecordFlow({
    recordInput: {
      candidates: [{
        id: "candidate:chief",
        candidateTitle: "主诉处理",
        treatmentName: "主诉处理",
        treatmentKey: "chief:right",
        action: "下楼梯",
      }],
      carryoverOnly: false,
      beforeScore: 4,
      recordedAfterScore: 0,
      result: "better",
      activityWorsened: false,
      timeBased: false,
      deferredRetest: false,
      hasSingleRangeEvidence: false,
      movementResponse: "",
      functionBaselineCompletion: undefined,
      functionAfterCompletion: undefined,
      functionRetestMode: undefined,
      responseRole: "independent-completion",
      priorTreatmentTitle: undefined,
      treatmentSide: "右侧",
      treatmentSides: undefined,
      sideResults: undefined,
      targetId: "target:chief",
      targetTitle: "下楼梯",
      residualReviewId: "residual-review",
      ...overrides.recordInput,
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
      ...overrides.retest,
    },
  });
}

test("处理记录完成主诉后，台账完成状态和同目标下一项保持一致", () => {
  const flow = scoreRecord();
  const completed = ledgerCore.completedProblemIdsFromTreatmentRecords(flow.records);
  const queueResult = queue.resolveTreatmentQueueAdvance({
    candidates: [{ id: "chief", type: "muscle" }, { id: "control", type: "control" }],
    startIndex: 0,
    preferredTypes: ["control"],
    getType: (candidate) => candidate.type,
    result: flow.records[0].result,
    activityWorsened: Boolean(flow.records[0].activityWorsened),
  });

  assert.equal(flow.records[0].chiefRetested, true);
  assert.equal(flow.records[0].retestActionKey, "下楼梯");
  assert.equal(completed.has("chief"), true);
  assert.equal(queueResult.stopped, false);
  assert.equal(queueResult.nextCandidateIndex, 1);
});

test("未完成主诉不能由台账提前关闭，队列仍可继续定位后续候选", () => {
  const flow = scoreRecord({
    recordInput: { recordedAfterScore: 2, result: "better", responseRole: "partial-contribution" },
  });
  const completed = ledgerCore.completedProblemIdsFromTreatmentRecords(flow.records);
  const queueResult = queue.resolveTreatmentQueueAdvance({
    candidates: [{ id: "chief", type: "muscle" }, { id: "joint", type: "joint" }],
    startIndex: 0,
    preferredTypes: ["joint"],
    getType: (candidate) => candidate.type,
    result: flow.records[0].result,
    activityWorsened: false,
  });

  assert.equal(completed.has("chief"), false);
  assert.equal(queueResult.nextCandidateIndex, 1);
  assert.equal(queueResult.advanceToNextTarget, false);
});

test("活动表现加重时记录保留证据但队列必须停止", () => {
  const flow = scoreRecord({
    recordInput: { recordedAfterScore: 2, result: "better", activityWorsened: true, responseRole: "worsened" },
  });
  const completed = ledgerCore.completedProblemIdsFromTreatmentRecords(flow.records);
  const queueResult = queue.resolveTreatmentQueueAdvance({
    candidates: [{ id: "chief", type: "muscle" }, { id: "control", type: "control" }],
    startIndex: 0,
    preferredTypes: ["control"],
    getType: (candidate) => candidate.type,
    result: flow.records[0].result,
    activityWorsened: Boolean(flow.records[0].activityWorsened),
  });

  assert.equal(flow.records[0].activityWorsened, true);
  assert.equal(completed.has("chief"), false);
  assert.equal(queueResult.stopped, true);
  assert.equal(queueResult.nextCandidateIndex, -1);
});

test("记录完成后动态队列按稳定目标身份定位，不依赖旧的候选下标", () => {
  const flow = scoreRecord();
  const completedRecord = flow.records[0];
  const resolvedIndex = workflow.resolveDynamicQueueAdvance(1, [
    "target:motion:knee-extension:joint",
  ], {
    completedKey: `${completedRecord.targetId}:${completedRecord.candidateId}`,
    nextKey: "target:motion:knee-extension:old-candidate",
    nextTargetId: "target:motion:knee-extension",
    completedTargetId: completedRecord.targetId,
  });

  assert.equal(completedRecord.targetId, "target:chief");
  assert.equal(resolvedIndex, 0);
});
