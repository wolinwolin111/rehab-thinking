/**
 * 医生意见与既往就医经历的最小合同。
 *
 * “看过医生”只能说明有过就医经历，不能直接推出当前被限制。
 * 这里集中把旧的 priorCare/imaging 文案投影成训练门控可消费的状态，
 * 保留旧字段只是为了兼容快照，不让页面各处自行猜测含义。
 */
export type MedicalRestrictionState = "none-reported" | "restricted" | "cleared" | "unknown";

export type MedicalGuidance = {
  reviewedByClinician: boolean;
  restrictionState: MedicalRestrictionState;
  restrictionDetails?: string;
  source: "user-report" | "imaging-selection" | "legacy-migrated";
  recordedAt?: string;
};

export function deriveMedicalGuidance(priorCare: readonly string[] = [], imaging: readonly string[] = [], recordedAt?: string): MedicalGuidance {
  const reviewedByClinician = priorCare.includes("看过医生");
  const hasRestriction = imaging.includes("医生有限制");
  const hasClearance = imaging.includes("医生已允许按建议康复");
  const restrictionState: MedicalRestrictionState = hasRestriction
    ? "restricted"
    : hasClearance
      ? "cleared"
      : reviewedByClinician
        ? "unknown"
        : "none-reported";
  return {
    reviewedByClinician,
    restrictionState,
    ...(restrictionState === "unknown" ? { restrictionDetails: "已知有过就医经历，但当前没有明确记录允许或限制内容。" } : {}),
    source: hasRestriction || hasClearance ? "imaging-selection" : reviewedByClinician ? "user-report" : "legacy-migrated",
    ...(recordedAt ? { recordedAt } : {}),
  };
}

export function medicalGuidanceNeedsClarification(guidance: MedicalGuidance) {
  return guidance.reviewedByClinician && guidance.restrictionState === "unknown";
}
