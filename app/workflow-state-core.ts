export type PendingQueueAdvance = {
  completedKey: string;
  nextKey: string;
  /** Stable target identity used when the first candidate changes after a result is saved. */
  nextTargetId?: string;
  completedTargetId?: string;
};

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
