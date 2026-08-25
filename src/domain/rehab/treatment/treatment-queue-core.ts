import { findNextCandidateAcrossTargets, findNextCandidateIndex } from "@/src/domain/rehab/shared/workflow-state-core";
import type { TrialResult } from "@/src/domain/rehab/treatment/trial-record-types";

export type TreatmentQueueTarget<TCandidate> = {
  id: string;
  candidates: TCandidate[];
};

export type TreatmentQueueAdvanceInput<TCandidate, TTarget extends TreatmentQueueTarget<TCandidate>> = {
  candidates: TCandidate[];
  startIndex: number;
  preferredTypes?: string[];
  getType?: (candidate: TCandidate) => string | undefined;
  isEligible?: (candidate: TCandidate, candidateIndex: number) => boolean;
  result: TrialResult;
  activityWorsened: boolean;
  targets?: TTarget[];
  startTargetIndex?: number;
  isEligibleAcrossTargets?: (candidate: TCandidate, target: TTarget, targetIndex: number, candidateIndex: number) => boolean;
};

export type TreatmentQueueAdvance = {
  stopped: boolean;
  nextCandidateIndex: number;
  nextTargetPosition?: { targetIndex: number; candidateIndex: number };
  advanceToNextTarget: boolean;
};

/**
 * 处理完成后的队列编排。
 *
 * 这个核心不判断候选的临床适应证，只消费调用方传入的 isEligible；它只保证
 * 加重停止、同目标优先、后续目标按稳定身份遍历，以及动态队列不会用旧下标跳过项目。
 */
export function resolveTreatmentQueueAdvance<TCandidate, TTarget extends TreatmentQueueTarget<TCandidate>>(
  input: TreatmentQueueAdvanceInput<TCandidate, TTarget>,
): TreatmentQueueAdvance {
  const stopped = input.result === "worse" || input.activityWorsened;
  const preferredTypes = input.preferredTypes ?? [];
  const nextCandidateIndex = stopped ? -1 : findNextCandidateIndex({
    candidates: input.candidates,
    startIndex: input.startIndex,
    preferredTypes,
    getType: input.getType,
    isEligible: input.isEligible,
  });
  const nextTargetPosition = !stopped
    && nextCandidateIndex < 0
    && preferredTypes.length
    && input.targets
    && typeof input.startTargetIndex === "number"
    ? findNextCandidateAcrossTargets({
      targets: input.targets,
      startTargetIndex: input.startTargetIndex,
      getCandidates: (target) => target.candidates,
      preferredTypes,
      getType: input.getType,
      isEligible: input.isEligibleAcrossTargets,
    })
    : undefined;

  return {
    stopped,
    nextCandidateIndex,
    nextTargetPosition,
    advanceToNextTarget: !stopped && nextCandidateIndex < 0 && !nextTargetPosition,
  };
}
