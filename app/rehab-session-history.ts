/**
 * `unknown` and `unable` are real review states. They must survive saving so a
 * later session can ask again without treating the previous abnormal result as
 * if it had just been reconfirmed.
 */
export type SessionTrend = "better" | "same" | "worse" | "unknown" | "unable";
export type SavedTreatmentResponseRole = "partial-contribution" | "key-completion" | "independent-completion" | "range-contribution" | "no-change" | "worsened" | "not-immediately-testable";

export type RehabSessionSummary = {
  sessionNumber: number;
  completedAt?: string;
  startedScore?: number;
  endingScore?: number;
  reviewResults: Array<{ id: string; label: string; result: SessionTrend }>;
  treatments: Array<{ id: string; label: string; result: "better" | "partial" | "same" | "worse"; responseRole?: SavedTreatmentResponseRole }>;
  effectiveCombination?: string[];
  continuedEffectiveTreatments: string[];
  stoppedTreatments: string[];
  resolvedProblems: string[];
  training: Array<{ id: string; label: string; adjustment: "reduce" | "hold" | "progress" }>;
  nextFocus: string[];
};

export function upsertSessionSummary(history: RehabSessionSummary[], summary: RehabSessionSummary) {
  return [...history.filter((item) => item.sessionNumber !== summary.sessionNumber), summary]
    .sort((a, b) => a.sessionNumber - b.sessionNumber);
}

export function latestSessionSummary(history: RehabSessionSummary[]) {
  return [...history].sort((a, b) => b.sessionNumber - a.sessionNumber)[0];
}

export function sessionScoreTrend(history: RehabSessionSummary[]) {
  return history
    .filter((item) => typeof item.endingScore === "number")
    .sort((a, b) => a.sessionNumber - b.sessionNumber)
    .map((item) => ({ sessionNumber: item.sessionNumber, score: item.endingScore as number }));
}

export function buildNextFocus(input: {
  unresolvedReviewLabels: string[];
  effectiveTreatmentLabels: string[];
  stoppedTreatmentLabels: string[];
  trainingLabels: string[];
}) {
  return [
    ...input.unresolvedReviewLabels.map((label) => `复查${label}`),
    ...input.effectiveTreatmentLabels.map((label) => `继续${label}`),
    ...input.stoppedTreatmentLabels.map((label) => `不要自动重复${label}，必要时重新评估`),
    ...(input.trainingLabels.length ? ["检查训练完成情况和次日反应"] : []),
  ].filter((item, index, list) => list.indexOf(item) === index).slice(0, 4);
}
