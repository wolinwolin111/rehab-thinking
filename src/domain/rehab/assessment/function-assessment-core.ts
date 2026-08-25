/**
 * 功能动作检查的字段值提取核心。
 *
 * 功能检查卡把「能否做完 / 动作稳不稳 / 会不会不适」分开记录，但旧的 simple 字段
 * 也能推导这些值。这里集中三组推导规则，供评估完成判定（assessmentRecordComplete）
 * 与功能 finding 生成共用，只依赖最小结构字段，可独立单测。
 */

export type YesNo = "yes" | "no";
export type FunctionCompletion = "complete" | "unable" | "skip";
export type FunctionControl = "stable" | "compensated" | "unsure";
export type FunctionUnableReason = "pain" | "weak" | "fear" | "instruction";

export type FunctionAssessmentRecord = {
  functionCompletion?: string;
  functionControl?: string;
  functionDiscomfort?: string;
  simple?: string;
  functionUnableReason?: string;
};

/** 功能动作的完成状态：优先用显式字段，否则由 simple 推导。 */
export function functionCompletionValue(record: FunctionAssessmentRecord): FunctionCompletion | undefined {
  if (record.functionCompletion) return record.functionCompletion as FunctionCompletion;
  if (record.simple === "unable") return "unable";
  if (record.simple === "skip") return "skip";
  if (["normal", "present", "painful"].includes(record.simple ?? "")) return "complete";
  return undefined;
}

/** 功能动作的控制状态：优先显式字段，否则由 simple 推导。 */
export function functionControlValue(record: FunctionAssessmentRecord): FunctionControl | undefined {
  if (record.functionControl) return record.functionControl as FunctionControl;
  if (record.functionCompletion) return undefined;
  if (record.simple === "present") return "compensated";
  if (["normal", "painful"].includes(record.simple ?? "")) return "stable";
  return undefined;
}

/** 功能动作的不适状态：显式字段优先，无法完成按原因推导，否则由 simple 推导。 */
export function functionDiscomfortValue(record: FunctionAssessmentRecord): YesNo | undefined {
  if (record.functionDiscomfort) return record.functionDiscomfort as YesNo;
  if (record.functionCompletion === "unable") {
    if (!record.functionUnableReason) return undefined;
    return record.functionUnableReason === "pain" ? "yes" : "no";
  }
  if (record.functionCompletion) return undefined;
  if (["painful", "unable"].includes(record.simple ?? "")) return "yes";
  if (["normal", "present"].includes(record.simple ?? "")) return "no";
  return undefined;
}
