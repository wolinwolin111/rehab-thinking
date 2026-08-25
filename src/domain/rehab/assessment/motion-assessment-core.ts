/**
 * 活动度检查的记录完成判定核心。
 *
 * 活动范围（主动/被动）检查卡的完成条件：主动记录是否完整、是否还需被动、
 * 被动记录是否完整。供评估完成判定（assessmentRecordComplete）使用，
 * 只依赖最小结构字段，可独立单测。
 */

export type MotionAssessmentRecord = {
  active?: string;
  unableReason?: string;
  discomfort?: string;
  discomfortLocation?: string;
  discomfortType?: string;
  symptomScore?: number;
  familiarSymptom?: string;
  passive?: string;
  passiveEndFeel?: string;
  passiveDiscomfort?: string;
  passiveDiscomfortLocation?: string;
  passiveDiscomfortType?: string;
  passiveSymptomScore?: number;
};

export type MotionAssessmentItem = {
  testMode?: string;
  spinal?: boolean;
  id?: string;
};

/** 主动活动记录是否完整；requireFamiliarity 需要熟悉症状确认。 */
export function activeMotionRecordComplete(record: MotionAssessmentRecord, requireFamiliarity = false) {
  if (!record.active) return false;
  if (record.active === "unable" && !record.unableReason) return false;
  if (record.active === "unable" && record.unableReason !== "pain") return true;
  if (!record.discomfort) return false;
  if (record.discomfort === "yes") return Boolean(record.discomfortLocation?.trim() && record.discomfortType && typeof record.symptomScore === "number" && (!requireFamiliarity || record.familiarSymptom));
  return true;
}

/** 是否需要补被动检查：专业被动项目、主动异常或主动不适时按能力开放。 */
export function motionNeedsPassive(item: MotionAssessmentItem, record: MotionAssessmentRecord, canAssessPassive: boolean) {
  if (!canAssessPassive) return false;
  if (item.testMode === "passive") return true;
  if (record.active === "unable") return false;
  if (item.spinal && !(item.id ?? "").includes("rotation")) return false;
  return Boolean(record.active && (record.active !== "same" || record.discomfort === "yes"));
}

/** 被动活动记录是否完整；requireEndFeel 需要终末感。 */
export function passiveMotionRecordComplete(record: MotionAssessmentRecord, requireEndFeel = false) {
  if (!record.passive) return false;
  if (record.passive === "skip") return true;
  if (requireEndFeel && !record.passiveEndFeel) return false;
  if (!record.passiveDiscomfort) return false;
  if (record.passiveDiscomfort === "yes") return Boolean(record.passiveDiscomfortLocation?.trim() && record.passiveDiscomfortType && typeof record.passiveSymptomScore === "number");
  return true;
}
