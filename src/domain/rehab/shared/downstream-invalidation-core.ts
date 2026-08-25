/**
 * 下游状态失效核心。
 *
 * 主组件在「返回修改上游信息」时需要清除受影响的下游状态。这里集中定义：
 * 1. 哪些上游变化会触发哪些下游状态组的失效；
 * 2. 复诊复查答案变化时是否需要作废当前复诊工作；
 * 3. 作废时如何只移除本次康复的复诊记录、保留历史康复记录。
 *
 * 组件负责执行具体的 setState 批次；本模块只决定“要不要清、清哪些组”。
 */

/** 下游状态组：主组件按这组稳定 ID 执行对应的 setState 批次。 */
export type DownstreamScopeGroup =
  | "review-navigation"
  | "safety"
  | "assessment"
  | "treatment-queue"
  | "bilateral-treatment"
  | "treatment-retest"
  | "movement-responses"
  | "chief-retest-score"
  | "training"
  | "pre-training-recheck"
  | "summary-final-retest"
  | "followup-mode"
  | "session-counter"
  | "followup-current-session"
  | "followup-review-inputs"
  | "session-history"
  | "revisions"
  | "adverse-response";

export const DOWNSTREAM_SCOPE_GROUPS = [
  "review-navigation",
  "safety",
  "assessment",
  "treatment-queue",
  "bilateral-treatment",
  "treatment-retest",
  "movement-responses",
  "chief-retest-score",
  "training",
  "pre-training-recheck",
  "summary-final-retest",
  "followup-mode",
  "session-counter",
  "followup-current-session",
  "followup-review-inputs",
  "session-history",
  "revisions",
  "adverse-response",
] as const satisfies readonly DownstreamScopeGroup[];

/** 会触发下游失效的上游变化类型。 */
export type UpstreamChangeKind =
  | "intake-change"
  | "followup-review-answer";

/**
 * 各上游变化对应的状态组。
 *
 * - intake 变化（返回修改主诉/症状描述）：全部下游组失效，历史只能追加，
 *   因此 sessionHistory 也一并重置为本组件内存态（持久化历史不受影响）。
 * - 复诊复查答案（分数/趋势）变化：只作废本次康复的复诊工作；
 *   历史康复记录与趋势基线保留，等待重新确认后重建。
 */
const INVALIDATED_GROUPS_BY_CHANGE: Record<UpstreamChangeKind, readonly DownstreamScopeGroup[]> = {
  "intake-change": DOWNSTREAM_SCOPE_GROUPS,
  "followup-review-answer": ["followup-current-session"],
};

export function resolveDownstreamInvalidation(change: UpstreamChangeKind): readonly DownstreamScopeGroup[] {
  return INVALIDATED_GROUPS_BY_CHANGE[change];
}

/**
 * 复诊复查答案变化的失效判定。
 *
 * - 分数场景：尚未确认过分数（首次输入）或与已确认值不同 → 作废；
 * - 趋势场景：调用方以 confirmed=true 传入，退化为纯值比较。
 */
export function shouldInvalidateFollowupWork(input: {
  confirmed: boolean;
  current: number | string;
  next: number | string;
}): boolean {
  return !input.confirmed || input.current !== input.next;
}

/** 只保留其它康复次数的复诊记录；本次康复的记录随作废丢弃，历史康复不受影响。 */
export function keepOtherSessionRecords<T extends { sessionNumber: number }>(
  records: readonly T[],
  sessionNumber: number,
): T[] {
  return records.filter((record) => record.sessionNumber !== sessionNumber);
}
