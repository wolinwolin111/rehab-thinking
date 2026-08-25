export type TreatmentQueueDirectionEligibilityInput = {
  candidateType: string;
  currentOutcome?: string;
  hasRetestForDirection: boolean;
  initialPassive?: string;
  motionAnswerIsLimited: boolean;
  canMobilizeJoint: boolean;
  directionAllowsPassive: boolean;
};

/**
 * 判断某个候选是否仍能为指定方向提供有效的下一步处理。
 * 页面只负责提供当前方向证据和能力条件，队列核心不读取页面状态。
 */
export function isTreatmentQueueDirectionCandidateNeeded(input: TreatmentQueueDirectionEligibilityInput) {
  if (["both-match", "worse"].includes(input.currentOutcome ?? "")) return false;

  if (input.candidateType === "muscle") {
    return !input.currentOutcome || !["both-match", "worse"].includes(input.currentOutcome);
  }

  if (input.candidateType === "joint") {
    if (!input.canMobilizeJoint || !input.directionAllowsPassive) return false;
    return input.currentOutcome === "better-passive-limited"
      || input.currentOutcome === "passive-limited"
      || (!input.hasRetestForDirection && input.initialPassive === "limited");
  }

  if (input.candidateType === "control") {
    if (!input.directionAllowsPassive) {
      return ["better-passive-limited", "passive-limited"].includes(input.currentOutcome ?? "")
        || (!input.hasRetestForDirection && !input.currentOutcome && input.motionAnswerIsLimited);
    }
    return input.currentOutcome === "passive-match-active-limited"
      || (!input.hasRetestForDirection && !input.currentOutcome && input.initialPassive === "same");
  }

  return false;
}
