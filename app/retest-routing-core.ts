import { canonicalActionIdFromAssessmentId } from "./action-identity-core";

export type RetestCandidateType = "control" | "joint" | undefined;
export type RetestOutcome = "both-match" | "passive-match-active-limited" | "better-passive-limited" | "passive-limited" | "worse";

/**
 * Convert a range retest result into the next intervention class.
 * PROM limitation after a professional muscle round is a joint candidate;
 * a normal user's same result stays on the active-control path.
 */
export function nextRangeCandidateType(outcome: RetestOutcome | "", canAssessPassive: boolean): RetestCandidateType {
  if (outcome === "passive-match-active-limited") return "control";
  if (outcome === "better-passive-limited" || outcome === "passive-limited") {
    return canAssessPassive ? "joint" : "control";
  }
  return undefined;
}

/**
 * A local-limb target can still contain the exact physical action named by the
 * complaint. Only that matching action's score may update the chief score.
 */
export function capturesChiefRetestScore(
  _targetId: string,
  retestDirectionId: string | undefined,
  chiefDirectionId: string | undefined,
  scoreConfirmed: boolean,
) {
  if (!scoreConfirmed || !retestDirectionId) return false;
  return Boolean(chiefDirectionId
    && canonicalActionIdFromAssessmentId(retestDirectionId) === canonicalActionIdFromAssessmentId(chiefDirectionId));
}
