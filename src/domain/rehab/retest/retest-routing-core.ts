import { canonicalActionIdFromAssessmentId } from "@/src/domain/rehab/intake/action-identity-core";

export type RetestCandidateType = "control" | "joint" | undefined;
export type RetestOutcome = "both-match" | "passive-match-active-limited" | "better-passive-limited" | "passive-limited" | "worse";

/**
 * Convert a range retest result into the next intervention class.
 * PROM limitation after a professional muscle round is a joint candidate;
 * a normal user's same result stays on the active-control path.
 */
export function nextRangeCandidateType(outcome: RetestOutcome | "", canAssessPassive: boolean): RetestCandidateType {
  if (outcome === "passive-match-active-limited") return "control";
  if (outcome === "better-passive-limited" || outcome === "passive-limited") {
    return canAssessPassive ? "joint" : "control";
  }
  return undefined;
}

/**
 * A local-limb target can still contain the exact physical action named by the
 * complaint. Only that matching action's score may update the chief score.
 */
export function capturesChiefRetestScore(
  _targetId: string,
  retestDirectionId: string | undefined,
  chiefDirectionId: string | undefined,
  scoreConfirmed: boolean,
) {
  if (!scoreConfirmed || !retestDirectionId) return false;
  return Boolean(chiefDirectionId
    && canonicalActionIdFromAssessmentId(retestDirectionId) === canonicalActionIdFromAssessmentId(chiefDirectionId));
}

export type ChiefRetestCaptureInput = {
  timeBased: boolean;
  deferredRetest: boolean;
  evidenceCaptured: boolean;
  targetId: string;
  targetChiefRetestAllowed: boolean;
  chiefScoreComparable: boolean;
  activeDirectionId?: string;
  chiefDirectionId?: string;
  chiefImprovedDuringTreatment: boolean;
  chiefRetestCompletedDuringTreatment: boolean;
};

/**
 * 判断一次处理后的证据是否应该写入主诉复测。
 * 时间性处理、延后复测和没有实际证据都不能冒充复测；非主诉目标只有
 * 在对应同一物理动作，或当前主诉仍未被复测时，才可以承接主诉结果。
 */
export function shouldCaptureChiefRetest(input: ChiefRetestCaptureInput) {
  if (input.timeBased || input.deferredRetest || !input.evidenceCaptured || !input.targetChiefRetestAllowed) return false;
  if (input.targetId === "target:chief") return true;
  if (!input.chiefScoreComparable || !input.activeDirectionId) return false;
  const sameChiefAction = input.chiefDirectionId
    && canonicalActionIdFromAssessmentId(input.activeDirectionId) === canonicalActionIdFromAssessmentId(input.chiefDirectionId);
  return Boolean(sameChiefAction || (!input.chiefImprovedDuringTreatment && !input.chiefRetestCompletedDuringTreatment));
}

export type ChiefRetestRequestInput = {
  isResidualReviewStep: boolean;
  chiefScoreComparable: boolean;
  chiefMatchesRange: boolean;
  hasChiefFunctionAction: boolean;
  activeTargetId: string;
  targetRelatesToChief: boolean;
  localNewSourceNeedsChiefRetest: boolean;
  chiefImprovedDuringTreatment: boolean;
  chiefRetestCompletedDuringTreatment: boolean;
};

/** 判断范围处理后是否需要在同一张复测卡上追加主诉复测。 */
export function shouldRequestChiefRetest(input: ChiefRetestRequestInput) {
  if (input.isResidualReviewStep || !input.chiefScoreComparable) return false;
  if (input.chiefMatchesRange && !input.hasChiefFunctionAction) return false;
  const chiefStillNeedsRetest = input.localNewSourceNeedsChiefRetest
    || !input.chiefImprovedDuringTreatment && !input.chiefRetestCompletedDuringTreatment;
  const targetCanCarryChief = input.activeTargetId === "target:chief"
    || input.activeTargetId === "target:local-limb" && chiefStillNeedsRetest
    || input.targetRelatesToChief;
  return targetCanCarryChief && chiefStillNeedsRetest;
}

export function chiefRetestWasRecorded(input: {
  shouldRequest: boolean;
  scoreShownAndRecorded: boolean;
  scoreConfirmed: boolean;
  rangeScoreCaptured: boolean;
}) {
  return (input.shouldRequest || input.scoreShownAndRecorded) && input.scoreConfirmed
    || input.rangeScoreCaptured;
}
