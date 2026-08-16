/**
 * 处理目标编排核心。
 *
 * 处理目标（TrialTarget）在进入队列前需要按「处理身份」合并：同一区域/侧别/
 * 类型的处理只保留一次，方向清单合并去重，复测 finding 按物理动作去重。
 * 这里集中目标合并与跨问题复用规则，供动态队列编排复用。
 */

import { candidateTreatmentKey, type CandidateTreatmentInput } from "./candidate-treatment-core";
import { dedupeAssessmentIdsByAction, dedupeRetestFindingsByAction, motionIdFromFinding, samePhysicalAction, type MotionFindingInput } from "./action-identity-core";

export type TrialTargetCandidate = CandidateTreatmentInput & { retestIds?: string[] };

export type TrialTargetInput = {
  id: string;
  finding: { side?: string };
  candidates: TrialTargetCandidate[];
  retestFindings?: MotionFindingInput[];
  optionalCandidates?: TrialTargetCandidate[];
  chain?: string;
  retestLabel?: string;
  sourceCaseIds?: string[];
};

export function treatmentCanCarryAcrossProblems(candidate: CandidateTreatmentInput) {
  // One joint intervention may serve multiple linked motion directions.
  // Carry its record forward so multi-positive ankle cases do not repeat it.
  return ["muscle", "control", "joint", "neural"].includes(candidate.type);
}

export function consolidateTrialTargetsByTreatment<T extends TrialTargetInput>(targets: T[]): T[] {
  const consolidated = targets.map((target) => ({
    ...target,
    candidates: target.candidates.map((candidate) => ({ ...candidate, retestIds: [...(candidate.retestIds ?? [])] })),
    retestFindings: dedupeRetestFindingsByAction([...(target.retestFindings ?? [])]),
  }));
  const owners = new Map<string, { targetIndex: number; candidateIndex: number }>();

  consolidated.forEach((target, targetIndex) => {
    target.candidates.forEach((candidate, candidateIndex) => {
      const key = candidateTreatmentKey(candidate, target.finding.side);
      const owner = owners.get(key);
      if (!owner) {
        owners.set(key, { targetIndex, candidateIndex });
        return;
      }
      const ownerTarget = consolidated[owner.targetIndex];
      const ownerCandidate = ownerTarget.candidates[owner.candidateIndex];
      const mergedDirectionIds = dedupeAssessmentIdsByAction([...(ownerCandidate.retestIds ?? []), ...(candidate.retestIds ?? [])]);
      ownerTarget.candidates[owner.candidateIndex] = { ...ownerCandidate, retestIds: mergedDirectionIds };
      ownerTarget.retestFindings = dedupeRetestFindingsByAction([...new Map([
        ...(ownerTarget.retestFindings ?? []),
        ...(target.retestFindings ?? []),
      ].filter((finding) => mergedDirectionIds.some((id) => samePhysicalAction(id, motionIdFromFinding(finding)))).map((finding) => [finding.id, finding])).values()]);
    });
  });

  return consolidated
    .map((target, targetIndex) => ({
      ...target,
      candidates: target.candidates.filter((candidate, candidateIndex) => {
        const owner = owners.get(candidateTreatmentKey(candidate, target.finding.side));
        return owner?.targetIndex === targetIndex && owner.candidateIndex === candidateIndex;
      }),
    }))
    .filter((target) => target.candidates.length > 0);
}
