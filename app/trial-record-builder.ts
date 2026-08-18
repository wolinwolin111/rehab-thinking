import { type CompletedRangeRetestAnswer, type RangeRetestAnswer, type TrialRecord, type TrialRecordBuildInput } from "./trial-record-types";

function isCompletedRangeRetestAnswer(value: RangeRetestAnswer | undefined): value is CompletedRangeRetestAnswer {
  return value !== undefined && value !== "";
}

/**
 * 由一组预计算好的候选字段，组装成一条或多条试处理记录。
 * 纯函数：不读写任何 state，输入输出显式，供 finishTrial 复用并可单测。
 */
export function buildTrialRecords(input: TrialRecordBuildInput): TrialRecord[] {
  const {
    candidates, carryoverOnly, beforeScore, recordedAfterScore, result, timeBased, deferredRetest,
    hasSingleRangeEvidence, singleRangeDirectionId, singleRangeDiscomfort, singleRangeScore,
    movementResponse, chiefWasActuallyRetested, responseRole, priorTreatmentTitle,
    retestActionKey, treatmentSide, targetId, targetTitle, residualReviewId,
  } = input;

  return candidates.map((candidate, index): TrialRecord => ({
    candidateId: candidate.id,
    treatmentKey: candidate.treatmentKey,
    treatmentSide,
    candidateTitle: candidate.candidateTitle,
    treatmentName: candidate.treatmentName,
    action: candidate.action,
    targetId,
    targetTitle,
    measurement: deferredRetest ? "deferred" : timeBased ? "time" : hasSingleRangeEvidence ? "range" : "score",
    rangeOutcome: hasSingleRangeEvidence && isCompletedRangeRetestAnswer(movementResponse) ? movementResponse : undefined,
    rangeOutcomes: hasSingleRangeEvidence && singleRangeDirectionId && isCompletedRangeRetestAnswer(movementResponse) ? { [singleRangeDirectionId]: movementResponse } : undefined,
    rangeDiscomforts: hasSingleRangeEvidence && singleRangeDirectionId && singleRangeDiscomfort ? { [singleRangeDirectionId]: singleRangeDiscomfort } : undefined,
    rangeScores: hasSingleRangeEvidence && singleRangeDirectionId && typeof singleRangeScore === "number" ? { [singleRangeDirectionId]: singleRangeScore } : undefined,
    beforeScore,
    afterScore: recordedAfterScore,
    result,
    movement: result === "better" ? "smoother" : result === "worse" ? "worse" : "same",
    timeBased,
    retestOnly: carryoverOnly,
    reviewOnly: candidate.id === residualReviewId,
    batchedResult: candidates.length > 1,
    supportingOnly: candidates.length > 1 && index > 0,
    chiefRetested: chiefWasActuallyRetested,
    reusedFromTargetTitle: carryoverOnly ? priorTreatmentTitle : undefined,
    retestActionKey: deferredRetest || timeBased ? undefined : retestActionKey,
    responseRole: candidates.length > 1 && index > 0 ? "not-immediately-testable" : responseRole,
  }));
}