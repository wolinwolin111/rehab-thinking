/**
 * 将一次真实完成的功能评估转换成分域证据。
 *
 * 该核心不选择治疗或训练项目，只回答这次记录属于疼痛、控制、能力还是未完成，
 * 让下游决策按自己的通道消费，避免把所有功能 tags 当成全局指令。
 */

import { functionCompletionValue, functionControlValue, functionDiscomfortValue, type FunctionAssessmentRecord } from "@/src/domain/rehab/assessment/function-assessment-core";

export type FunctionEvidence = {
  assessmentId: string;
  performed: boolean;
  completion: "complete" | "unable" | "skip" | "unknown";
  /**
   * 普通同条件复测与能力状态复核必须分开：
   * - ordinary：首次实际完成过动作，可以比较质量/不适；
   * - completion-status：实际尝试过但因疼痛或没力没完成，只比较能否完成；
   * - none：没有形成可用的动作基线。
   */
  retestMode: "ordinary" | "completion-status" | "none";
  pain: boolean;
  control: "stable" | "compensated" | "unknown";
  capacity: "adequate" | "reduced" | "unknown";
  channels: {
    treatment: boolean;
    training: boolean;
    retest: boolean;
    ordinaryRetest: boolean;
    completionStatusRetest: boolean;
  };
};

export function functionEvidenceFromRecord(assessmentId: string, record: FunctionAssessmentRecord = {}): FunctionEvidence {
  const completion = functionCompletionValue(record);
  const unableReason = record.functionUnableReason;
  const pain = functionDiscomfortValue(record) === "yes";
  const controlValue = functionControlValue(record);
  const control = controlValue === "compensated" ? "compensated" : controlValue === "stable" ? "stable" : "unknown";
  const reducedCapacity = unableReason === "weak" || record.simple === "weak";
  const capacity = reducedCapacity ? "reduced" : completion === "complete" ? "adequate" : "unknown";
  // “无法完成”还要区分是否真的尝试过：疼痛或没力而中止，仍留下了
  // 可复核的动作证据；害怕或没听懂时没有形成动作基线，不能直接复测。
  const performed = completion === "complete"
    || completion === "unable" && ["pain", "weak"].includes(unableReason ?? "");
  const retestMode = completion === "complete" && performed
    ? "ordinary"
    : performed && completion === "unable" && ["pain", "weak"].includes(unableReason ?? "")
      ? "completion-status"
      : "none";
  return {
    assessmentId,
    performed,
    completion: completion ?? "unknown",
    retestMode,
    pain,
    control,
    capacity,
    channels: {
      // 疼痛或无法完成只提供处理/负荷线索，不自动生成控制训练。
      treatment: performed && pain,
      // 只有明确代偿或没力，才进入控制/能力训练通道。
      training: performed && (control === "compensated" || capacity === "reduced"),
      // 只有实际做过动作，才允许把它作为同一动作的复测基线。
      retest: performed,
      ordinaryRetest: retestMode === "ordinary",
      completionStatusRetest: retestMode === "completion-status",
    },
  };
}

export function functionEvidenceDecisionTags(evidence: FunctionEvidence) {
  return [
    evidence.channels.treatment ? "function-symptom" : "",
    evidence.control === "compensated" ? "function-control" : "",
    evidence.capacity === "reduced" ? "function-capacity" : "",
    evidence.completion === "unable" ? "function-unable" : "",
  ].filter(Boolean);
}
