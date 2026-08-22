/**
 * 复测资格核心：主诉被报告过，不代表它已经有可比较的现场基线。
 */

export type RetestBaselineMode = "ordinary" | "completion-status" | "none";

export type RetestEligibility = "same-session" | "after-training" | "completion-status" | "next-session" | "not-comparable";

export type RetestBaselineEvidence = {
  mode: RetestBaselineMode;
};

/**
 * 在多个实际评估证据中选择主诉本次可用的基线类型。
 * 普通动作基线优先于完成状态基线；没有实际证据时不生成复测资格。
 */
export function retestBaselineModeFromEvidence(evidence: RetestBaselineEvidence[]): RetestBaselineMode {
  if (evidence.some((item) => item.mode === "ordinary")) return "ordinary";
  if (evidence.some((item) => item.mode === "completion-status")) return "completion-status";
  return "none";
}

export type RetestEligibilityInput = {
  hasReportedChiefAction: boolean;
  hasPerformedBaseline: boolean;
  /** 普通动作基线，还是仅形成了“尝试过但没完成”的能力状态基线。 */
  baselineMode?: RetestBaselineMode;
  isComparableNow?: boolean;
  treatmentOrTrainingCompleted?: boolean;
};

export function retestEligibility(input: RetestEligibilityInput): RetestEligibility {
  if (!input.hasReportedChiefAction) return "not-comparable";
  if (input.baselineMode === "none") return "not-comparable";
  if (input.baselineMode === "completion-status") {
    return input.hasPerformedBaseline ? "completion-status" : "not-comparable";
  }
  if (input.isComparableNow === false) return input.treatmentOrTrainingCompleted ? "next-session" : "not-comparable";
  if (!input.hasPerformedBaseline) return "not-comparable";
  return input.treatmentOrTrainingCompleted ? "after-training" : "same-session";
}
