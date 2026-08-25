/**
 * 评估记录完成判定核心。
 *
 * 一项评估检查是否算「已记录」：功能检查看完成/控制/不适，力量看 simple 与
 * 无法完成原因，活动度看主动/被动记录完整性与被动补充条件。供评估进度、
 * 队列推进与专业工作台共用。依赖三个已抽取 core 的字段推导，只读取最小结构字段。
 */

import { strengthAnswerResult, type StrengthAnswer, type StrengthUnableReason } from "@/src/domain/rehab/assessment/assessment-answer-core";
import { functionCompletionValue, functionControlValue, functionDiscomfortValue } from "@/src/domain/rehab/assessment/function-assessment-core";
import { activeMotionRecordComplete, motionNeedsPassive, passiveMotionRecordComplete } from "@/src/domain/rehab/assessment/motion-assessment-core";

export type AssessmentCompleteItem = {
  kind?: string;
  testMode?: string;
  pairedStrengthId?: string;
};

export type AssessmentCompleteRecord = {
  functionCompletion?: string;
  functionControl?: string;
  functionDiscomfort?: string;
  simple?: StrengthAnswer;
  functionUnableReason?: string;
  worseSide?: string;
  bilateralComparison?: string;
  compensations?: string[];
  discomfortLocation?: string;
  discomfortType?: string;
  symptomScore?: number;
  familiarSymptom?: string;
  strengthUnableReason?: StrengthUnableReason;
  active?: string;
  unableReason?: string;
  discomfort?: string;
  passive?: string;
  passiveEndFeel?: string;
  passiveDiscomfort?: string;
  passiveDiscomfortLocation?: string;
  passiveDiscomfortType?: string;
  passiveSymptomScore?: number;
  pairedStrength?: StrengthAnswer;
  pairedStrengthUnableReason?: StrengthUnableReason;
};

/** 一项评估记录是否已经完整到可以推进下一步。 */
export function assessmentRecordComplete(
  item: AssessmentCompleteItem,
  record: AssessmentCompleteRecord | undefined,
  canAssessPassive: boolean,
  bilateral = false,
  requireFamiliarity = false,
  requireEndFeel = false,
) {
  if (!record) return false;
  if (item.kind === "function") {
    const completion = functionCompletionValue(record);
    const control = functionControlValue(record);
    const discomfort = functionDiscomfortValue(record);
    if (!completion) return false;
    if (completion === "skip") return true;
    if (completion === "unable" && !record.functionUnableReason) return false;
    if (completion === "complete" && (!control || !discomfort)) return false;
    if (bilateral && !record.bilateralComparison && !record.worseSide) return false;
    if (control === "compensated" && !record.compensations?.length) return false;
    if (completion === "unable" && record.functionUnableReason !== "pain") return true;
    if (completion === "unable" || discomfort === "yes") return Boolean(record.discomfortLocation?.trim() && record.discomfortType && typeof record.symptomScore === "number" && (!requireFamiliarity || record.familiarSymptom));
    return true;
  }
  if (item.kind !== "motion") {
    if (!record.simple) return false;
    if (item.kind === "strength" && record.simple === "unable" && !record.strengthUnableReason) return false;
    if (bilateral && record.simple !== "skip" && !record.bilateralComparison && !record.worseSide) return false;
    if (item.kind === "strength" && strengthAnswerResult(record.simple, record.strengthUnableReason) === "painful") return Boolean(record.discomfortLocation?.trim() && record.discomfortType && typeof record.symptomScore === "number" && (!requireFamiliarity || record.familiarSymptom));
    return true;
  }
  if (item.testMode === "passive") return canAssessPassive && passiveMotionRecordComplete(record, requireEndFeel);
  if (!activeMotionRecordComplete(record, requireFamiliarity)) return false;
  const motionCanContinueToStrength = record.active !== "unable";
  if (item.pairedStrengthId && motionCanContinueToStrength && !record.pairedStrength) return false;
  if (item.pairedStrengthId && motionCanContinueToStrength && record.pairedStrength === "unable" && !record.pairedStrengthUnableReason) return false;
  if (bilateral && item.pairedStrengthId && record.pairedStrength && record.pairedStrength !== "normal" && !record.bilateralComparison && !record.worseSide) return false;
  if (item.pairedStrengthId && strengthAnswerResult(record.pairedStrength, record.pairedStrengthUnableReason) === "painful") {
    if (record.discomfort !== "yes" || !record.discomfortLocation?.trim() || !record.discomfortType || typeof record.symptomScore !== "number") return false;
  }
  return !motionNeedsPassive(item, record, canAssessPassive) || passiveMotionRecordComplete(record, requireEndFeel);
}
