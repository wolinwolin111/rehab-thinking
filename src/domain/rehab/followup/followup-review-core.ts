export type FollowupTrend = "better" | "same" | "worse" | "unknown" | "unable";

export type ReviewResult = {
  id: string;
  label: string;
  result: FollowupTrend;
  /** T-06：被本次结果覆写前的最初记录，保证历史可追溯。 */
  overwrittenFrom?: FollowupTrend;
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
  // T-06：覆写时保留最初的记录（overwrittenFrom），链式覆写只保留最早原值。
  const withProvenance = (previous: ReviewResult | undefined, result: FollowupTrend): ReviewResult["overwrittenFrom"] => {
    if (!previous || previous.result === result) return previous?.overwrittenFrom;
    const original = previous.overwrittenFrom ?? previous.result;
    return original === result ? previous.overwrittenFrom : original;
  };
  const merged = new Map(base.map((item) => [item.id, { ...item }]));
  Object.entries(explicitTrends).forEach(([id, result]) => {
    const matchingId = [...merged.keys()].find((existingId) => canonicalize(existingId) === canonicalize(id));
    const targetId = matchingId ?? id;
    const previous = merged.get(targetId);
    const next: ReviewResult = { id: targetId, label: previous?.label ?? id.replace(/^(motion|strength|function):/, ""), result };
    const overwrittenFrom = withProvenance(previous, result);
    if (overwrittenFrom) next.overwrittenFrom = overwrittenFrom;
    merged.set(targetId, next);
  });
  records.forEach((record) => Object.entries(record.rangeOutcomes ?? {}).forEach(([directionId, outcome]) => {
    const result = trendFromRangeOutcome(outcome);
    if (!result) return;
    const id = `motion:${directionId}`;
    const matchingId = [...merged.keys()].find((existingId) => canonicalize(existingId) === canonicalize(id));
    const targetId = matchingId ?? id;
    const previous = merged.get(targetId);
    const next: ReviewResult = { id: targetId, label: previous?.label ?? directionId, result };
    const overwrittenFrom = withProvenance(previous, result);
    if (overwrittenFrom) next.overwrittenFrom = overwrittenFrom;
    merged.set(targetId, next);
  }));
  return [...merged.values()];
}

/**
 * T-06：逐项趋势与确认后的分数指向相反时提醒确认。
 * 分数未确认（pending）不算矛盾；同向或持平不报警。
 */
export function trendScoreContradiction(input: {
  trends: Array<FollowupTrend>;
  comparison: FollowupComparison;
}): "trend-better-score-worse" | "trend-worse-score-better" | null {
  if (input.comparison === "pending") return null;
  if (input.comparison === "worse" && input.trends.includes("better")) return "trend-better-score-worse";
  if (input.comparison === "better" && input.trends.includes("worse")) return "trend-worse-score-better";
  return null;
}

/**
 * T-03：复查入口的安全最小重检。只有用户明确回答「有」才触发线下确认建议；
 * 未回答或缺省不产生信号，也不阻断流程。
 */
export function followupRedFlagSignal(answers: {
  numbnessOrRadiation?: string;
  progressiveWeakness?: string;
}): { needsReferral: boolean } {
  return {
    needsReferral: answers.numbnessOrRadiation === "yes" || answers.progressiveWeakness === "yes",
  };
}

export function unresolvedReviewIds(previous?: { reviewResults: ReviewResult[] }) {
  if (!previous) return null;
  return new Set(previous.reviewResults.filter((item) => item.result !== "better").map((item) => item.id));
}
