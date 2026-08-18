import { type CompletedRangeRetestAnswer, type TrialResult } from "./trial-record-types";
import { resultFromScore } from "./trial-record-builder";
import { classifyTreatmentResponse, type TreatmentResponseRole } from "./treatment-response-core";

/**
 * 批量复测的结果计算：范围 + 主诉 → 综合结果和响应角色。
 * 纯函数：不读写任何 state，供 finishRangeBatch 复用并可单测。
 */
export function computeBatchResult(input: {
  chiefBeforeScore: number;
  recordedChiefScore: number;
  chiefWasActuallyRetested: boolean;
  rangeBeforeScore: number;
  outcomes: CompletedRangeRetestAnswer[];
  priorImprovingTreatmentCount: number;
}): { result: TrialResult; responseRole: TreatmentResponseRole } {
  const {
    chiefBeforeScore, recordedChiefScore, chiefWasActuallyRetested,
    rangeBeforeScore, outcomes, priorImprovingTreatmentCount,
  } = input;

  const scoreResult = chiefWasActuallyRetested
    ? resultFromScore(chiefBeforeScore, recordedChiefScore)
    : "same";

  const hasProgress = outcomes.some((outcome) =>
    ["both-match", "passive-match-active-limited", "better-passive-limited"].includes(outcome));
  const allResolved = outcomes.every((outcome) => outcome === "both-match");
  const anyWorse = outcomes.some((outcome) => outcome === "worse");

  const result: TrialResult = scoreResult === "worse" || anyWorse
    ? "worse"
    : allResolved
      ? "better"
      : hasProgress || scoreResult === "better"
        ? "partial"
        : "same";

  const responseRole = classifyTreatmentResponse({
    beforeScore: chiefWasActuallyRetested ? chiefBeforeScore : rangeBeforeScore,
    afterScore: chiefWasActuallyRetested ? recordedChiefScore : rangeBeforeScore,
    result,
    chiefRetested: chiefWasActuallyRetested,
    rangeImproved: hasProgress,
    priorImprovingTreatmentCount,
  });

  return { result, responseRole };
}