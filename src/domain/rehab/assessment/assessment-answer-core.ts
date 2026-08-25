export type StrengthUnableReason = "pain" | "weak" | "control" | "instruction" | "no-helper" | "fear";

export type StrengthAnswer = "normal" | "present" | "weak" | "painful" | "positive" | "unable" | "skip";

export type AssessmentFindingResult = "normal" | "painful" | "weak" | "unknown" | "not-testable";
export type MotionUnableReason = "pain" | "fear" | "instruction" | "other";

export function shouldAskMotionDiscomfort(active?: string) {
  return Boolean(active && active !== "unable");
}

export function shouldAskPairedStrength(active?: string) {
  return Boolean(active && active !== "unable");
}

export function shouldCaptureUnableMotionSymptom(active?: string, reason?: MotionUnableReason) {
  return active === "unable" && reason === "pain";
}

/**
 * “做不出来”只描述检查过程，不等于正常，也不天然等于力量弱。
 * 只有补充原因后，才能把结果交给决策层。
 */
export function strengthAnswerResult(answer?: StrengthAnswer, reason?: StrengthUnableReason): AssessmentFindingResult {
  if (answer === "painful" || (answer === "unable" && reason === "pain")) return "painful";
  if (answer === "weak" || (answer === "unable" && ["weak", "control"].includes(reason ?? ""))) return "weak";
  if (answer === "unable") return reason ? "not-testable" : "unknown";
  if (answer === "skip" || !answer) return "unknown";
  return "normal";
}

export function strengthAnswerForWorkflow(answer?: StrengthAnswer, reason?: StrengthUnableReason): StrengthAnswer | undefined {
  const result = strengthAnswerResult(answer, reason);
  if (result === "painful") return "painful";
  if (result === "weak") return "weak";
  if (result === "normal") return "normal";
  if (answer === "unable") return "unable";
  return answer;
}

export type StrengthFindingInput = { id: string; title: string };

/** 力量 finding 的答案：优先读记录，否则从标题推断（偏弱→weak、引起不适→painful）。 */
export function strengthFindingAnswer(finding: StrengthFindingInput, records: Record<string, { simple?: string } | undefined>): StrengthAnswer | undefined {
  const recorded = records[finding.id]?.simple;
  if (recorded) return recorded as StrengthAnswer;
  if (finding.title.includes("偏弱")) return "weak";
  if (finding.title.includes("引起不适")) return "painful";
  return undefined;
}
