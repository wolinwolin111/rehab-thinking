import { buildTrialRecords } from "@/src/domain/rehab/treatment/trial-record-builder";
import { chiefRetestWasRecorded, shouldCaptureChiefRetest, type ChiefRetestCaptureInput } from "@/src/domain/rehab/retest/retest-routing-core";
import type { CompletedRangeRetestAnswer, TrialRecord, TrialRecordBuildInput, TrialResult, YesNo } from "@/src/domain/rehab/treatment/trial-record-types";
import type { TreatmentResponseRole } from "@/src/domain/rehab/treatment/treatment-response-core";

export type TreatmentRecordFlowInput = {
  recordInput: Omit<TrialRecordBuildInput, "chiefWasActuallyRetested" | "retestActionKey">;
  retestActionKey?: string;
  retest: ChiefRetestCaptureInput;
};

export type TreatmentRecordFlow = {
  chiefWasActuallyRetested: boolean;
  records: TrialRecord[];
};

export type RangeTreatmentRecordCandidateInput = {
  id: string;
  treatmentKey: string;
  treatmentSide?: string;
  treatmentSides?: string[];
  sideResults?: Record<string, "better" | "same" | "worse">;
  candidateTitle: string;
  treatmentName: string;
  action: string;
};

export type RangeTreatmentRecordBuildInput = {
  candidates: RangeTreatmentRecordCandidateInput[];
  carryoverOnly: boolean;
  rangeOutcome?: CompletedRangeRetestAnswer;
  rangeOutcomes: Record<string, CompletedRangeRetestAnswer>;
  rangeDiscomforts: Record<string, YesNo>;
  rangeScores: Record<string, number>;
  beforeScore: number;
  afterScore: number;
  result: TrialResult;
  activityWorsened: boolean;
  chiefWasActuallyRetested: boolean;
  reusedFromTargetTitle?: string;
  retestActionKey?: string;
  responseRole: TreatmentResponseRole;
  targetId: string;
  targetTitle: string;
  residualReviewId: string;
};

export function resolveChiefRetestCapture(input: ChiefRetestCaptureInput) {
  return shouldCaptureChiefRetest(input);
}

export function resolveRangeChiefRetestCapture(input: {
  shouldRequest: boolean;
  scoreShownAndRecorded: boolean;
  scoreConfirmed: boolean;
  rangeScoreCaptured: boolean;
}) {
  return chiefRetestWasRecorded(input);
}

/**
 * 将处理后的实际复测证据绑定到处理记录。
 *
 * 处理记录的 chiefRetested 和 retestActionKey 必须由同一个证据判断产生，
 * 不能由页面先写一份记录、再在别处分支猜测这条记录是否更新了主诉。
 */
export function resolveTreatmentRecordFlow(input: TreatmentRecordFlowInput): TreatmentRecordFlow {
  const chiefWasActuallyRetested = resolveChiefRetestCapture(input.retest);
  const records = buildTrialRecords({
    ...input.recordInput,
    chiefWasActuallyRetested,
    retestActionKey: input.retestActionKey,
  });
  return { chiefWasActuallyRetested, records };
}

/**
 * 组装活动度批量复测的处理记录。批量记录的首项和配合项必须共享同一轮
 * 复测证据，但只有首项承接主结果，配合项保留为不可单独归因的线索。
 */
export function buildRangeTreatmentRecords(input: RangeTreatmentRecordBuildInput): TrialRecord[] {
  return input.candidates.map((candidate, index) => ({
    candidateId: candidate.id,
    treatmentKey: candidate.treatmentKey,
    treatmentSide: candidate.treatmentSide,
    treatmentSides: candidate.treatmentSides,
    sideResults: candidate.sideResults,
    candidateTitle: candidate.candidateTitle,
    treatmentName: candidate.treatmentName,
    action: candidate.action,
    targetId: input.targetId,
    targetTitle: input.targetTitle,
    measurement: "range",
    rangeOutcome: input.rangeOutcome,
    rangeOutcomes: input.rangeOutcomes,
    rangeDiscomforts: input.rangeDiscomforts,
    rangeScores: input.rangeScores,
    beforeScore: input.beforeScore,
    afterScore: input.afterScore,
    result: input.result,
    movement: input.activityWorsened ? "worse" : input.result === "better" ? "smoother" : input.result === "worse" ? "worse" : "same",
    activityWorsened: input.activityWorsened,
    retestOnly: input.carryoverOnly,
    reviewOnly: candidate.id === input.residualReviewId,
    batchedResult: input.candidates.length > 1,
    supportingOnly: input.candidates.length > 1 && index > 0,
    chiefRetested: input.chiefWasActuallyRetested,
    reusedFromTargetTitle: input.carryoverOnly ? input.reusedFromTargetTitle : undefined,
    retestActionKey: input.retestActionKey,
    responseRole: input.candidates.length > 1 && index > 0 ? "not-immediately-testable" : input.responseRole,
  }));
}
