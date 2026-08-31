import type {
  FunctionRetestObligation,
  FunctionRetestRecord,
  FunctionUnableReason,
  TrialRecord,
  TrialResult,
} from "@/src/domain/rehab/treatment/trial-record-types";

export type FunctionRetestAnswerInput = {
  completion: "" | "complete" | "unable";
  unableReason?: FunctionUnableReason;
  score?: number;
  scoreConfirmed?: boolean;
};

export type FunctionRetestTargetInput = {
  candidates: Array<{ id: string }>;
  functionRetestObligations?: FunctionRetestObligation[];
};

export type PendingFunctionRetest = FunctionRetestObligation & {
  candidateIds: string[];
};

export function functionRetestAnswerKey(assessmentId: string, side?: string) {
  return side ? `${assessmentId}::${side}` : assessmentId;
}

function answerResult(obligation: FunctionRetestObligation, answer: FunctionRetestAnswerInput): TrialResult | null {
  if (!answer.completion) return null;
  if (answer.completion === "unable" && !answer.unableReason) return null;
  if (obligation.mode === "ordinary" && answer.completion === "complete" && !answer.scoreConfirmed) return null;
  // completion-status 带疼痛基线时，疼痛分是复测的另一半答案：
  // 能完成（或做不完但仍因疼）时必须打分，否则“忍着做完”和“不疼做完”无法区分。
  const flareNeedsScore = obligation.mode === "completion-status"
    && typeof obligation.baselineScore === "number"
    && (answer.completion === "complete" || answer.completion === "unable" && answer.unableReason === "pain");
  if (flareNeedsScore && !answer.scoreConfirmed) return null;
  if (obligation.baselineCompletion === "unable") {
    if (flareNeedsScore && typeof answer.score === "number" && typeof obligation.baselineScore === "number") {
      if (answer.completion === "complete") {
        if (answer.score < obligation.baselineScore) return "better";
        if (answer.score > obligation.baselineScore) return "worse";
        return "partial";
      }
      return answer.score < obligation.baselineScore ? "partial" : "same";
    }
    return answer.completion === "complete" ? "better" : "same";
  }
  if (answer.completion === "unable") return "worse";
  if (typeof obligation.baselineScore === "number" && typeof answer.score === "number") {
    if (answer.score < obligation.baselineScore) return "better";
    if (answer.score > obligation.baselineScore) return "worse";
  }
  return "same";
}

export function summarizeFunctionRetestObligations(input: {
  obligations: FunctionRetestObligation[];
  answers: Record<string, FunctionRetestAnswerInput>;
}) {
  const records: Record<string, FunctionRetestRecord> = {};
  const results: TrialResult[] = [];
  let ready = input.obligations.length > 0;

  input.obligations.forEach((obligation) => {
    const sides = obligation.sides?.length ? obligation.sides : [undefined];
    const sideAnswers = sides.map((side) => ({
      side,
      answer: input.answers[functionRetestAnswerKey(obligation.assessmentId, side)],
    }));
    const sideResults = sideAnswers.map(({ answer }) => answer ? answerResult(obligation, answer) : null);
    if (sideAnswers.some(({ answer }) => !answer) || sideResults.some((result) => !result)) {
      ready = false;
      return;
    }
    results.push(...sideResults as TrialResult[]);
    const aggregateAnswer = sideAnswers.some(({ answer }) => answer!.completion === "unable")
      ? sideAnswers.find(({ answer }) => answer!.completion === "unable")!.answer!
      : sideAnswers[0].answer!;
    records[obligation.assessmentId] = {
      ...obligation,
      afterCompletion: aggregateAnswer.completion as "complete" | "unable",
      unableReason: aggregateAnswer.completion === "unable" ? aggregateAnswer.unableReason : undefined,
      afterScore: aggregateAnswer.scoreConfirmed ? aggregateAnswer.score : undefined,
      ...(obligation.sides?.length ? {
        sideResults: Object.fromEntries(sideAnswers.map(({ side, answer }) => [side, {
          afterCompletion: answer!.completion,
          unableReason: answer!.completion === "unable" ? answer!.unableReason : undefined,
          afterScore: answer!.scoreConfirmed ? answer!.score : undefined,
        }])),
      } : {}),
    };
  });

  const result: TrialResult = results.includes("worse")
    ? "worse"
    : results.length > 0 && results.every((item) => item === "better")
      ? "better"
      : results.includes("better") || results.includes("partial")
        ? "partial"
        : "same";

  return {
    ready,
    result,
    records: ready ? records : undefined,
    worsened: results.includes("worse"),
  };
}

export function combineRetestResults(rangeResult: TrialResult, functionResult?: TrialResult): TrialResult {
  if (!functionResult) return rangeResult;
  if (rangeResult === "worse" || functionResult === "worse") return "worse";
  if (rangeResult === "same" && functionResult === "same") return "same";
  if (rangeResult === "better" && functionResult === "better") return "better";
  return "partial";
}

function functionRetestAnswerKeyDone(obligation: { mode?: string; baselineScore?: number }, completion: "complete" | "unable", unableReason: FunctionUnableReason | undefined, afterScore: number | undefined) {
  if (obligation.mode === "ordinary" && completion === "complete" && typeof afterScore !== "number") return false;
  // completion-status 的作答完整性与 answerResult 的必答门保持一致。
  if (obligation.mode === "completion-status" && typeof obligation.baselineScore === "number"
    && (completion === "complete" || unableReason === "pain")
    && typeof afterScore !== "number") return false;
  return true;
}

export function completedFunctionRetestIds(records: Array<Pick<TrialRecord, "functionRetests" | "functionRetestMode" | "functionAfterCompletion" | "targetId">>) {
  const completed = new Set<string>();
  records.forEach((record) => {
    Object.entries(record.functionRetests ?? {}).forEach(([assessmentId, retest]) => {
      const sidesComplete = retest.sides?.length
        ? retest.sides.every((side) => {
          const result = retest.sideResults?.[side];
          if (!result || result.afterCompletion === "unable" && !result.unableReason) return false;
          return functionRetestAnswerKeyDone(retest, result.afterCompletion, result.unableReason, result.afterScore);
        })
        : retest.afterCompletion
          && functionRetestAnswerKeyDone(retest, retest.afterCompletion, retest.unableReason, retest.afterScore);
      if (sidesComplete) completed.add(assessmentId);
    });
    if (record.functionRetestMode && record.functionAfterCompletion && record.targetId.startsWith("target:function:")) {
      completed.add(record.targetId.replace(/^target:/, ""));
    }
  });
  return completed;
}

/**
 * A completed treatment may disappear from the live candidate queue. Derive
 * unresolved function retests from the unfiltered targets and persisted
 * treatment records so that queue reordering cannot erase the obligation.
 */
export function pendingFunctionRetests(input: {
  targets: FunctionRetestTargetInput[];
  records: Array<Pick<TrialRecord, "candidateId" | "reviewOnly" | "retestOnly" | "timeBased" | "functionRetests" | "functionRetestMode" | "functionAfterCompletion" | "targetId">>;
}) {
  const completed = completedFunctionRetestIds(input.records);
  const executedCandidateIds = new Set(input.records
    .filter((record) => !record.reviewOnly && !record.retestOnly && !record.timeBased)
    .map((record) => record.candidateId));
  const pending = new Map<string, PendingFunctionRetest>();

  input.targets.forEach((target) => {
    const candidateIds = target.candidates.map((candidate) => candidate.id);
    if (!candidateIds.some((candidateId) => executedCandidateIds.has(candidateId))) return;
    (target.functionRetestObligations ?? []).forEach((obligation) => {
      if (completed.has(obligation.assessmentId)) return;
      const previous = pending.get(obligation.assessmentId);
      pending.set(obligation.assessmentId, {
        ...obligation,
        candidateIds: Array.from(new Set([...(previous?.candidateIds ?? []), ...candidateIds])),
      });
    });
  });

  return [...pending.values()];
}
