export type FollowupTrend = "better" | "same" | "worse" | "unknown" | "unable";

export type ReviewResult = {
  id: string;
  label: string;
  result: FollowupTrend;
};

export type RangeOutcomeRecord = {
  rangeOutcomes?: Record<string, string>;
};

export type AssessmentReviewResult = "normal" | "limited" | "painful" | "weak" | "positive" | "unknown" | "not-testable";

/** Convert the first assessment into a saved end-of-session state. */
export function trendFromAssessmentResult(result: AssessmentReviewResult): FollowupTrend {
  if (result === "normal") return "better";
  if (result === "unknown" || result === "not-testable") return "unknown";
  return "same";
}

export function previousSessionEndingScore(
  history: Array<{ sessionNumber: number; endingScore?: number }>,
  sessionNumber: number,
  fallback?: number,
) {
  return history.find((item) => item.sessionNumber === sessionNumber - 1)?.endingScore
    ?? [...history].reverse().find((item) => typeof item.endingScore === "number")?.endingScore
    ?? fallback;
}

export type FollowupComparison = "pending" | "better" | "same" | "worse";

/** Never compare the slider's numeric placeholder before the user records it. */
export function compareFollowupScore(input: {
  currentScore: number;
  currentConfirmed: boolean;
  previousScore?: number;
}): FollowupComparison {
  if (!input.currentConfirmed || typeof input.previousScore !== "number") return "pending";
  if (input.currentScore > input.previousScore + 1) return "worse";
  if (input.currentScore < input.previousScore) return "better";
  return "same";
}

export function trendFromRangeOutcome(outcome?: string): FollowupTrend | undefined {
  if (outcome === "both-match") return "better";
  if (outcome === "worse") return "worse";
  if (["passive-match-active-limited", "better-passive-limited", "passive-limited"].includes(outcome ?? "")) return "same";
  return undefined;
}

/**
 * A session review is the state at the end of that session, not merely the
 * answers collected before treatment. Later range retests therefore replace
 * the earlier quick-review answer for the same physical direction.
 */
export function mergeSessionReviewResults(
  base: ReviewResult[],
  explicitTrends: Record<string, FollowupTrend>,
  records: RangeOutcomeRecord[],
  canonicalize: (id: string) => string = (id) => id.replace(/^(motion|strength|function):/, ""),
) {
  const merged = new Map(base.map((item) => [item.id, { ...item }]));
  Object.entries(explicitTrends).forEach(([id, result]) => {
    const matchingId = [...merged.keys()].find((existingId) => canonicalize(existingId) === canonicalize(id));
    const targetId = matchingId ?? id;
    const previous = merged.get(targetId);
    merged.set(targetId, { id: targetId, label: previous?.label ?? id.replace(/^(motion|strength|function):/, ""), result });
  });
  records.forEach((record) => Object.entries(record.rangeOutcomes ?? {}).forEach(([directionId, outcome]) => {
    const result = trendFromRangeOutcome(outcome);
    if (!result) return;
    const id = `motion:${directionId}`;
    const matchingId = [...merged.keys()].find((existingId) => canonicalize(existingId) === canonicalize(id));
    const targetId = matchingId ?? id;
    const previous = merged.get(targetId);
    merged.set(targetId, { id: targetId, label: previous?.label ?? directionId, result });
  }));
  return [...merged.values()];
}

export function unresolvedReviewIds(previous?: { reviewResults: ReviewResult[] }) {
  if (!previous) return null;
  return new Set(previous.reviewResults.filter((item) => item.result !== "better").map((item) => item.id));
}
