export type TreatmentResponseRole =
  | "partial-contribution"
  | "key-completion"
  | "independent-completion"
  | "range-contribution"
  | "no-change"
  | "worsened"
  | "not-immediately-testable";

export type TreatmentResponseInput = {
  beforeScore: number;
  afterScore: number;
  result: "better" | "partial" | "same" | "worse";
  chiefRetested?: boolean;
  rangeImproved?: boolean;
  priorImprovingTreatmentCount?: number;
  timeBased?: boolean;
};

export function classifyTreatmentResponse(input: TreatmentResponseInput): TreatmentResponseRole {
  if (input.timeBased || !input.chiefRetested && !input.rangeImproved) return "not-immediately-testable";
  if (input.result === "worse" || input.afterScore > input.beforeScore) return "worsened";
  if (input.chiefRetested && input.afterScore === 0 && input.beforeScore > 0) {
    return (input.priorImprovingTreatmentCount ?? 0) > 0 ? "key-completion" : "independent-completion";
  }
  if (input.chiefRetested && input.afterScore < input.beforeScore) return "partial-contribution";
  if (input.rangeImproved) return "range-contribution";
  return "no-change";
}

export function treatmentResponsePriority(role?: TreatmentResponseRole) {
  return ({
    "independent-completion": 6,
    "key-completion": 5,
    "partial-contribution": 4,
    "range-contribution": 3,
    "not-immediately-testable": 2,
    "no-change": 1,
    worsened: 0,
  } as const)[role ?? "no-change"];
}

export function resolvedTreatmentCombination<T extends { treatmentKey?: string; candidateId: string; responseRole?: TreatmentResponseRole }>(records: T[]) {
  const completionIndex = records.findLastIndex((record) => ["key-completion", "independent-completion"].includes(record.responseRole ?? ""));
  if (completionIndex < 0) return [];
  const relevant = records.slice(0, completionIndex + 1).filter((record) => ["partial-contribution", "key-completion", "independent-completion"].includes(record.responseRole ?? ""));
  return relevant.filter((record, index, list) => list.findIndex((item) => (item.treatmentKey ?? item.candidateId) === (record.treatmentKey ?? record.candidateId)) === index);
}
