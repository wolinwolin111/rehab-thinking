export type TreatmentQueueEligibilityInput<TCandidate, TTarget, TOutcome extends string = string> = {
  candidate: TCandidate;
  target: TTarget;
  preferredTypes: string[];
  trackedDirectionIds: Set<string>;
  mergedOutcomes: Record<string, TOutcome>;
  chiefStillSymptomatic: boolean;
  getCandidateType: (candidate: TCandidate) => string | undefined;
  getCandidateRetestIds: (candidate: TCandidate) => string[];
  getTargetDirectionId: (target: TTarget) => string | undefined;
  samePhysicalAction: (left: string, right: string) => boolean;
  directionNeedsCandidate: (candidate: TCandidate, directionId: string, outcomes: Record<string, TOutcome>) => boolean;
};

/**
 * 把页面上下文转换为队列可消费的候选资格。
 * 队列核心不参与临床判断；方向是否仍需处理由调用方显式提供。
 */
export function isTreatmentQueueCandidateEligible<TCandidate, TTarget, TOutcome extends string = string>(input: TreatmentQueueEligibilityInput<TCandidate, TTarget, TOutcome>) {
  const candidateType = input.getCandidateType(input.candidate);
  if (input.preferredTypes.length && !input.preferredTypes.includes(candidateType ?? "")) return false;

  const candidateRetestIds = input.getCandidateRetestIds(input.candidate);
  const trackedCandidateDirections = candidateRetestIds.filter((directionId) => input.trackedDirectionIds.has(directionId));
  if (trackedCandidateDirections.length) {
    return trackedCandidateDirections.some((directionId) => input.directionNeedsCandidate(input.candidate, directionId, input.mergedOutcomes));
  }

  const candidateDirectionsWithRecordedOutcome = candidateRetestIds.filter((directionId) => Object.keys(input.mergedOutcomes)
    .some((recordedId) => input.samePhysicalAction(recordedId, directionId)));
  if (candidateDirectionsWithRecordedOutcome.length) {
    return candidateDirectionsWithRecordedOutcome.some((directionId) => input.directionNeedsCandidate(input.candidate, directionId, input.mergedOutcomes));
  }

  const targetDirectionId = input.getTargetDirectionId(input.target);
  return Boolean(targetDirectionId && input.directionNeedsCandidate(input.candidate, targetDirectionId, input.mergedOutcomes))
    || input.chiefStillSymptomatic;
}
