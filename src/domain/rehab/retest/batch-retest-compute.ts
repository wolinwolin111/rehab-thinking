import { type CompletedRangeRetestAnswer, type TrialResult } from "@/src/domain/rehab/treatment/trial-record-types";
import { resultFromScore } from "@/src/domain/rehab/treatment/trial-record-builder";
import { classifyTreatmentResponse, type TreatmentResponseRole } from "@/src/domain/rehab/treatment/treatment-response-core";

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
}): { result: TrialResult; responseRole: TreatmentResponseRole; activityWorsened: boolean } {
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

  // 症状分数和活动表现是两个独立证据。疼痛下降但活动变差时，保留
  // “有改善”的分数趋势，同时标记活动恶化，让流程停止并进入聚焦复查。
  // 不能把这组数据伪造成单纯的 worse，也不能让疼痛改善掩盖活动恶化。
  const mixedImprovementAndActivityWorsening = scoreResult === "better" && anyWorse;
  const result: TrialResult = scoreResult === "worse" || anyWorse && !mixedImprovementAndActivityWorsening
    ? "worse"
    : allResolved
      ? "better"
      : hasProgress || scoreResult === "better"
        ? "partial"
        : "same";

  const responseRole = anyWorse
    ? "worsened"
    : classifyTreatmentResponse({
      beforeScore: chiefWasActuallyRetested ? chiefBeforeScore : rangeBeforeScore,
      afterScore: chiefWasActuallyRetested ? recordedChiefScore : rangeBeforeScore,
      result,
      chiefRetested: chiefWasActuallyRetested,
      rangeImproved: hasProgress,
      priorImprovingTreatmentCount,
    });

  return { result, responseRole, activityWorsened: anyWorse };
}
