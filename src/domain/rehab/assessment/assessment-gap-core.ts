export type AssessmentGapRecord = {
  active?: string;
  unableReason?: string;
  functionUnableReason?: string;
  simple?: string;
  strengthUnableReason?: string;
  pairedStrength?: string;
  pairedStrengthUnableReason?: string;
};

export type AssessmentGap = {
  assessmentId: string;
  reason: "motion-instruction" | "motion-unclear" | "strength-instruction" | "strength-no-helper" | "strength-unclear";
};

/** 返回当前最值得补的一项，而不是把用户笼统送回整套评估。 */
export function firstAssessmentGap(ids: string[], records: Record<string, AssessmentGapRecord>): AssessmentGap | null {
  for (const assessmentId of ids) {
    const record = records[assessmentId];
    if (!record) continue;
    if (record.active === "unable" && record.unableReason === "instruction") return { assessmentId, reason: "motion-instruction" };
    if (record.active === "unsure" || record.active === "unable" && record.unableReason && record.unableReason !== "pain") return { assessmentId, reason: "motion-unclear" };
    if (record.simple === "unable" && assessmentId.startsWith("function:")) {
      // 功能动作因疼痛、无力或担心停止，本身已经是有效的临床结果；
      // 只有明确“不知道怎么做”才需要回到这一个动作补充指导。
      if (record.functionUnableReason === "instruction") return { assessmentId, reason: "motion-instruction" };
      continue;
    }
    if (record.simple === "unable") {
      if (record.strengthUnableReason === "instruction") return { assessmentId, reason: "strength-instruction" };
      if (record.strengthUnableReason === "no-helper") return { assessmentId, reason: "strength-no-helper" };
      return { assessmentId, reason: "strength-unclear" };
    }
    if (record.pairedStrength === "unable") {
      if (record.pairedStrengthUnableReason === "instruction") return { assessmentId, reason: "strength-instruction" };
      if (record.pairedStrengthUnableReason === "no-helper") return { assessmentId, reason: "strength-no-helper" };
      return { assessmentId, reason: "strength-unclear" };
    }
  }
  return null;
}

export function assessmentGapActionLabel(gap: AssessmentGap | null) {
  if (!gap) return "返回未完成的检查";
  if (gap.reason === "motion-instruction" || gap.reason === "strength-instruction") return "查看简化动作";
  if (gap.reason === "strength-no-helper") return "改用自助检查";
  return "补充这项检查";
}
