export type CoverageResponseRole =
  | "partial-contribution"
  | "key-completion"
  | "independent-completion"
  | "range-contribution"
  | "no-change"
  | "worsened"
  | "not-immediately-testable";

export type CoverageRecord = {
  treatmentKey: string;
  result: "better" | "partial" | "same" | "worse";
  responseRole?: CoverageResponseRole;
  directionIds?: string[];
  /** A range result can improve even when the chief score is also recorded. */
  rangeImproved?: boolean;
  reviewOnly?: boolean;
  retestOnly?: boolean;
  timeBased?: boolean;
};

export type CoverageCandidate = {
  treatmentKey: string;
  directionIds?: string[];
};

export type TreatmentCoverageDecision =
  | "no-treatment"
  | "stop-worsened"
  | "continue-new-coverage"
  | "complete-with-effect"
  | "stop-covered-no-effect";

const EFFECTIVE_ROLES = new Set<CoverageResponseRole>([
  "partial-contribution",
  "key-completion",
  "independent-completion",
  "range-contribution",
]);

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

/**
 * Progress by supported treatment coverage, not an arbitrary attempt count.
 * The same region counts once even when several findings point to it, while
 * all movement directions affected by that region remain in the retest set.
 */
export function summarizeTreatmentCoverage(records: CoverageRecord[], candidates: CoverageCandidate[]) {
  const attempts = records.filter((record) => !record.reviewOnly && !record.retestOnly && !record.timeBased);
  const coveredTreatmentKeys = unique(attempts.map((record) => record.treatmentKey));
  const coveredDirectionIds = unique(attempts.flatMap((record) => record.directionIds ?? []));
  const remainingTreatmentKeys = unique(candidates
    .map((candidate) => candidate.treatmentKey)
    .filter((key) => !coveredTreatmentKeys.includes(key)));
  const remainingDirectionIds = unique(candidates
    .filter((candidate) => remainingTreatmentKeys.includes(candidate.treatmentKey))
    .flatMap((candidate) => candidate.directionIds ?? []));
  const hasEffectiveChange = attempts.some((record) =>
    EFFECTIVE_ROLES.has(record.responseRole ?? "no-change")
    || record.result === "better"
    || record.result === "partial");
  // Do not infer range progress only from responseRole. When a batch retest
  // records both a lower chief score and a partly improved range, the response
  // is correctly classified as partial-contribution, but the range still has
  // to remain visible as an unresolved problem until it reaches the target.
  const hasRangeImprovement = attempts.some((record) => record.rangeImproved || record.responseRole === "range-contribution");
  const hasWorsened = attempts.some((record) => record.result === "worse" || record.responseRole === "worsened");

  let decision: TreatmentCoverageDecision;
  if (!attempts.length) decision = "no-treatment";
  else if (hasWorsened) decision = "stop-worsened";
  else if (remainingTreatmentKeys.length) decision = "continue-new-coverage";
  else if (hasEffectiveChange) decision = "complete-with-effect";
  else decision = "stop-covered-no-effect";

  return {
    decision,
    coveredTreatmentKeys,
    coveredDirectionIds,
    remainingTreatmentKeys,
    remainingDirectionIds,
    hasEffectiveChange,
    hasRangeImprovement,
    hasWorsened,
  };
}
