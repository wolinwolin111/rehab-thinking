export type PendingQueueAdvance = {
  completedKey: string;
  nextKey: string;
  /** Stable target identity used when the first candidate changes after a result is saved. */
  nextTargetId?: string;
  completedTargetId?: string;
};

export type StableQueueTarget = {
  id: string;
  candidates: Array<{ id: string }>;
};

/** 目标身份只依赖稳定目标 id 和当前首候选，不依赖页面数组下标。 */
export function stableQueueTargetKey(target: StableQueueTarget) {
  return `${target.id}:${target.candidates[0]?.id ?? ""}`;
}

export function buildPendingQueueAdvance(
  completedTarget: StableQueueTarget,
  nextTarget?: StableQueueTarget,
): PendingQueueAdvance {
  return {
    completedKey: stableQueueTargetKey(completedTarget),
    nextKey: nextTarget ? stableQueueTargetKey(nextTarget) : "",
    nextTargetId: nextTarget?.id,
    completedTargetId: completedTarget.id,
  };
}

export type QueueCandidateAdvanceInput<TCandidate> = {
  candidates: TCandidate[];
  startIndex: number;
  preferredTypes?: string[];
  getType?: (candidate: TCandidate) => string | undefined;
  isEligible?: (candidate: TCandidate, candidateIndex: number) => boolean;
};

export type QueueTargetCandidateAdvanceInput<TTarget, TCandidate> = {
  targets: TTarget[];
  startTargetIndex: number;
  getCandidates: (target: TTarget) => TCandidate[];
  preferredTypes?: string[];
  getType?: (candidate: TCandidate) => string | undefined;
  isEligible?: (candidate: TCandidate, target: TTarget, targetIndex: number, candidateIndex: number) => boolean;
};

function candidateTypeAllowed<TCandidate>(
  candidate: TCandidate,
  preferredTypes: string[],
  getType: (candidate: TCandidate) => string | undefined,
) {
  return !preferredTypes.length || preferredTypes.includes(getType(candidate) ?? "");
}

/**
 * 在同一处理目标中，从当前候选之后寻找下一个符合条件的候选。
 * 类型过滤和临床资格判断由调用方提供，队列核心只负责稳定遍历。
 */
export function findNextCandidateIndex<TCandidate>(input: QueueCandidateAdvanceInput<TCandidate>) {
  const preferredTypes = input.preferredTypes ?? [];
  const getType = input.getType ?? (() => undefined);
  for (let index = input.startIndex + 1; index < input.candidates.length; index += 1) {
    const candidate = input.candidates[index];
    if (!candidateTypeAllowed(candidate, preferredTypes, getType)) continue;
    if (input.isEligible && !input.isEligible(candidate, index)) continue;
    return index;
  }
  return -1;
}

/**
 * 当前目标没有合适候选时，在后续目标中按稳定目标顺序寻找候选。
 * 不把“找到下一个”写成旧数组下标加一，避免动态重建后跳过新目标。
 */
export function findNextCandidateAcrossTargets<TTarget, TCandidate>(input: QueueTargetCandidateAdvanceInput<TTarget, TCandidate>) {
  const preferredTypes = input.preferredTypes ?? [];
  const getType = input.getType ?? (() => undefined);
  for (let targetIndex = input.startTargetIndex + 1; targetIndex < input.targets.length; targetIndex += 1) {
    const target = input.targets[targetIndex];
    const candidates = input.getCandidates(target);
    for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
      const candidate = candidates[candidateIndex];
      if (!candidateTypeAllowed(candidate, preferredTypes, getType)) continue;
      if (input.isEligible && !input.isEligible(candidate, target, targetIndex, candidateIndex)) continue;
      return { targetIndex, candidateIndex };
    }
  }
  return undefined;
}

export function resolveDynamicQueueAdvance(
  currentIndex: number,
  currentKeys: string[],
  pending: PendingQueueAdvance,
) {
  if (!currentKeys.length) return 0;
  // Completing one candidate may open another candidate under the same
  // clinical problem. Run that replacement before the old queue's next
  // problem so one treatment + retest cannot prematurely finish the session.
  const sameTargetReplacementIndex = pending.completedTargetId
    ? currentKeys.findIndex((key) => key.startsWith(`${pending.completedTargetId}:`) && key !== pending.completedKey)
    : -1;
  if (sameTargetReplacementIndex >= 0) return sameTargetReplacementIndex;
  const stableTargetIndex = pending.nextTargetId
    ? currentKeys.findIndex((key) => key.startsWith(`${pending.nextTargetId}:`))
    : -1;
  if (stableTargetIndex >= 0) return stableTargetIndex;
  const explicitNextIndex = pending.nextKey ? currentKeys.indexOf(pending.nextKey) : -1;
  if (explicitNextIndex >= 0) return explicitNextIndex;

  const completedStillExists = currentKeys.includes(pending.completedKey);
  if (completedStillExists) return currentKeys.length;

  // 当前处理已经从动态队列移除，后面的处理会占据原位置。
  // The queue changed without exposing a stable next key. Restart from the
  // first stable pending item instead of guessing with the old array index;
  // the old index could skip a newly opened treatment unit.
  return 0;
}

/** 将页面目标数组转换为稳定 key 后再执行动态重排，避免各页面重复拼接身份。 */
export function resolveDynamicQueueAdvanceForTargets<TTarget extends StableQueueTarget>(
  currentIndex: number,
  targets: TTarget[],
  pending: PendingQueueAdvance,
) {
  return resolveDynamicQueueAdvance(currentIndex, targets.map(stableQueueTargetKey), pending);
}
