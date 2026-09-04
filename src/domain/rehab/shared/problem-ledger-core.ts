export type ProblemDestination = "treatment" | "training" | "later-review" | "assessment" | "medical-review";

export type LedgerProblem = {
  id: string;
  kind: string;
  routed?: boolean;
  completed?: boolean;
};

export type LedgerEntry = LedgerProblem & {
  destination: ProblemDestination;
};

const TRAINING_KINDS = new Set(["力量或控制", "活动控制"]);
const LATER_REVIEW_KINDS = new Set(["肿胀", "按压痛", "局部体征"]);
const IMMEDIATE_KINDS = new Set(["主诉", "主诉动作", "动作不适", "活动度", "肌肉"]);

/**
 * Every discovered problem must have one explicit destination. An empty
 * treatment queue is therefore not equivalent to an empty problem list.
 */
export function buildProblemLedger(
  problems: LedgerProblem[],
  options: { pathway: string; assessmentInsufficient: boolean },
): LedgerEntry[] {
  return problems.map((problem) => {
    if (TRAINING_KINDS.has(problem.kind)) return { ...problem, destination: "training" };
    if (LATER_REVIEW_KINDS.has(problem.kind)) return { ...problem, destination: "later-review" };
    if (options.pathway === "bone-stress-suspected") return { ...problem, destination: "medical-review" };
    if (options.pathway !== "standard") return { ...problem, destination: "later-review" };
    if (options.assessmentInsufficient) return { ...problem, destination: "assessment" };
    if (IMMEDIATE_KINDS.has(problem.kind)) {
      return { ...problem, destination: problem.routed || problem.completed ? "treatment" : "assessment" };
    }
    return { ...problem, destination: "assessment" };
  });
}

export function hasUnroutedImmediateProblem(entries: LedgerEntry[]) {
  return entries.some((entry) => entry.destination === "assessment");
}

/**
 * A routed problem is not necessarily solved.  It remains active until the
 * required endpoint is reached (for example, pain reaches 0 or the tested
 * range matches the comparison side).  This distinction prevents an empty
 * next-treatment queue from being rendered as a silent completion.
 */
export function unresolvedImmediateProblems(entries: LedgerEntry[]) {
  return entries.filter((entry) => entry.destination === "treatment" && !entry.completed);
}

export function hasUnresolvedImmediateProblem(entries: LedgerEntry[]) {
  return unresolvedImmediateProblems(entries).length > 0;
}

export function emptyTreatmentMessage(entries: LedgerEntry[]) {
  if (entries.some((entry) => entry.destination === "assessment")) return {
    title: "还有问题需要补充检查",
    detail: "已经记录到症状或活动异常，但目前的信息还不能确定合适的处理。",
    action: "返回补充检查",
  };
  if (entries.some((entry) => entry.destination === "medical-review")) return {
    title: "先完成医学确认",
    detail: "当前问题不进入普通肌肉松解；训练按低负荷顺序（无痛走路 → 基础功能负荷）安排。",
    action: "保存当前记录",
  };
  if (entries.some((entry) => entry.destination === "later-review")) return {
    title: "本次采用阶段管理",
    detail: "按当前提示完成保护或低负荷活动，稍后或下次再比较。",
    action: "查看当前安排",
  };
  if (entries.some((entry) => entry.destination === "training")) return {
    title: "进入针对性训练",
    detail: "当前主要是力量或动作控制问题，不需要反复进行即时复测。",
    action: "开始针对性训练",
  };
  if (entries.some((entry) => entry.destination === "treatment")) return {
    title: "仍有待处理问题",
    detail: "已进入处理路径的问题尚未达到目标，请继续完成剩余处理或复测。",
    action: "继续处理",
  };
  return {
    title: "本次没有发现明确异常",
    detail: "保持舒适活动；症状仍存在时返回补充描述或检查。",
    action: "查看低强度活动",
  };
}
