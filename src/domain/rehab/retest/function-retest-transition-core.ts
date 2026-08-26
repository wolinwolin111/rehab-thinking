import type { FunctionUnableReason } from "@/src/domain/rehab/assessment/function-assessment-core";

export type FunctionRetestMode = "ordinary" | "completion-status" | "none";
export type FunctionRetestCompletion = "" | "complete" | "unable";

export type FunctionRetestTransitionInput = {
  isFunctionTarget: boolean;
  mode: FunctionRetestMode;
  completion: FunctionRetestCompletion;
  unableReason?: FunctionUnableReason | "";
  scoreConfirmed: boolean;
  chiefScoreRetestBlocked?: boolean;
  /** T-01：首次评估的动作完成状态；ordinary 复测中从 complete 变 unable 视同加重。 */
  initialCompletion?: "complete" | "unable" | "skip" | "unknown";
};

export type FunctionRetestTransition = {
  completionOnly: boolean;
  answerComplete: boolean;
  requiresCompletion: boolean;
  requiresScore: boolean;
  functionReady: boolean;
  retestReady: boolean;
  evidenceCaptured: boolean;
  automaticResult?: "partial" | "same" | "worse";
};

export type TreatmentRetestGateInput = FunctionRetestTransitionInput & {
  targetId?: string;
  chiefScoreComparable: boolean;
};

export type TreatmentRetestGate = FunctionRetestTransition & {
  chiefScoreRetestBlocked: boolean;
};

/**
 * 统一处理功能动作的处理后复测门槛。
 *
 * 功能动作有两种不同的基线：实际完成过动作时可以做普通分数复测；
 * 首次因疼痛或没力未完成时只能复核“现在能不能完成”。页面只能展示
 * 结果，不能分别维护这套判断，否则一个入口很容易漏掉完成状态复测。
 */
export function resolveFunctionRetestTransition(
  input: FunctionRetestTransitionInput,
): FunctionRetestTransition {
  const completionOnly = input.isFunctionTarget && input.mode === "completion-status";
  const requiresCompletion = input.isFunctionTarget;
  const requiresScore = input.isFunctionTarget ? !completionOnly : true;
  const answerComplete = input.completion === "complete"
    || input.completion === "unable" && Boolean(input.unableReason);
  const functionReady = input.isFunctionTarget
    ? answerComplete && (!requiresScore || input.scoreConfirmed)
    : input.scoreConfirmed;
  const retestReady = input.chiefScoreRetestBlocked ? true : functionReady;
  const evidenceCaptured = input.isFunctionTarget ? functionReady : input.scoreConfirmed;
  // T-01：首次能完成的动作，处理后复测变成做不完——这是功能层面的恶化信号，
  // 即使疼痛分数相同也视同加重（A 方案：直接停止当前处理队列）。
  const completionWorsened = !completionOnly
    && input.initialCompletion === "complete"
    && input.completion === "unable";

  return {
    completionOnly,
    answerComplete,
    requiresCompletion,
    requiresScore,
    functionReady,
    retestReady,
    evidenceCaptured,
    automaticResult: completionOnly && answerComplete
      ? input.completion === "complete" ? "partial" : "same"
      : completionWorsened && answerComplete
        ? "worse"
        : undefined,
  };
}

/**
 * 组合主诉分数门禁与功能动作复测门禁。
 *
 * 主诉没有可比较分数时，普通主诉复测不能假装完成；但首次未完成的
 * 功能动作可以走 completion-status 分支，只复核能否完成。这个例外
 * 必须和功能复测模式一起判断，不能由页面分支各自拼接条件。
 */
export function resolveTreatmentRetestGate(input: TreatmentRetestGateInput): TreatmentRetestGate {
  const initial = resolveFunctionRetestTransition(input);
  const chiefScoreRetestBlocked = input.targetId === "target:chief"
    && !input.chiefScoreComparable
    && !initial.completionOnly;
  const transition = chiefScoreRetestBlocked
    ? resolveFunctionRetestTransition({ ...input, chiefScoreRetestBlocked: true })
    : initial;
  return { ...transition, chiefScoreRetestBlocked };
}
