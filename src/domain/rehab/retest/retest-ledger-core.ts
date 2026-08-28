import type { FunctionRetestRecord, TrialRecord, TrialResult } from "@/src/domain/rehab/treatment/trial-record-types";

export type RetestObligationKind = "range" | "function" | "chief" | "training-safety";
export type RetestObligationStatus = "pending" | "completed" | "deferred" | "cancelled";
export type RetestSide = "左侧" | "右侧";

/**
 * v3 复查义务台账。它记录业务上仍欠什么，不承担页面排序职责。
 * 页面队列可以随时重算，但 obligationId 在同一会话中必须稳定。
 */
export type RetestObligation = {
  obligationId: string;
  caseId: string;
  problemThreadId: string;
  sessionId: string;
  kind: RetestObligationKind;
  targetId: string;
  label: string;
  sourceAssessmentId?: string;
  treatmentRecordIds: string[];
  side?: RetestSide;
  required: boolean;
  status: RetestObligationStatus;
  createdAt: string;
  completedAt?: string;
};

export type RetestRecord = {
  retestRecordId: string;
  obligationId: string;
  caseId: string;
  problemThreadId: string;
  sessionId: string;
  recordedAt: string;
  result: TrialResult;
  completion?: "complete" | "unable";
  unableReason?: "pain" | "weak" | "fear" | "instruction";
  score?: number;
  rangeOutcome?: "both-match" | "passive-match-active-limited" | "better-passive-limited" | "passive-limited" | "worse";
};

export function retestObligationId(input: {
  sessionId: string;
  kind: RetestObligationKind;
  targetId: string;
  side?: RetestSide;
}) {
  return ["retest", input.sessionId, input.kind, input.targetId, input.side ?? "overall"]
    .map((part) => encodeURIComponent(part))
    .join(":");
}

export function pendingRequiredRetests(obligations: RetestObligation[]) {
  return obligations.filter((item) => item.required && item.status === "pending");
}

export function projectRetestLedger(input: {
  obligations: RetestObligation[];
  records: RetestRecord[];
}) {
  const completedIds = new Set(input.records.map((record) => record.obligationId));
  const obligations = input.obligations.map((obligation) => completedIds.has(obligation.obligationId)
    ? { ...obligation, status: "completed" as const }
    : obligation);
  return {
    obligations,
    records: input.records,
    pendingRequiredCount: pendingRequiredRetests(obligations).length,
  };
}

type PendingFunctionInput = {
  assessmentId: string;
  label: string;
  sides?: RetestSide[];
  candidateIds: string[];
};

function resultFromFunctionRetest(record: FunctionRetestRecord): TrialResult {
  const results = record.sides?.length
    ? record.sides.map((side) => record.sideResults?.[side]).filter(Boolean)
    : [record];
  if (results.some((item) => item?.afterCompletion === "unable")) return "worse";
  if (typeof record.baselineScore === "number" && results.some((item) => typeof item?.afterScore === "number" && item.afterScore! < record.baselineScore!)) return "better";
  if (record.baselineCompletion === "unable" && results.every((item) => item?.afterCompletion === "complete")) return "better";
  return "same";
}

/** 把现有处理事实投影成 v3 复查台账；不读取页面队列位置。 */
export function buildRetestLedgerFromTrials(input: {
  caseId: string;
  problemThreadId: string;
  sessionId: string;
  recordedAt: string;
  trials: TrialRecord[];
  pendingFunctions: PendingFunctionInput[];
  pendingRangeDirectionIds?: string[];
}) {
  const obligations = new Map<string, RetestObligation>();
  const records = new Map<string, RetestRecord>();
  const treatmentRecordId = (trial: TrialRecord, index: number) => `treatment:${input.sessionId}:${encodeURIComponent(trial.candidateId)}:${index}`;
  const addCompleted = (obligation: RetestObligation, record: Omit<RetestRecord, "retestRecordId" | "obligationId" | "caseId" | "problemThreadId" | "sessionId" | "recordedAt">) => {
    obligations.set(obligation.obligationId, { ...obligation, status: "completed", completedAt: input.recordedAt });
    records.set(obligation.obligationId, {
      retestRecordId: `result:${obligation.obligationId}`,
      obligationId: obligation.obligationId,
      caseId: input.caseId,
      problemThreadId: input.problemThreadId,
      sessionId: input.sessionId,
      recordedAt: input.recordedAt,
      ...record,
    });
  };

  input.trials.forEach((trial, index) => {
    Object.entries(trial.functionRetests ?? {}).forEach(([assessmentId, functionRecord]) => {
      const sides = functionRecord.sides?.length ? functionRecord.sides : [undefined];
      sides.forEach((side) => {
        const obligationId = retestObligationId({ sessionId: input.sessionId, kind: "function", targetId: assessmentId, side });
        const sideResult = side ? functionRecord.sideResults?.[side] : functionRecord;
        if (!sideResult) return;
        addCompleted({
          obligationId,
          caseId: input.caseId,
          problemThreadId: input.problemThreadId,
          sessionId: input.sessionId,
          kind: "function",
          targetId: assessmentId,
          label: functionRecord.label,
          sourceAssessmentId: assessmentId,
          treatmentRecordIds: [treatmentRecordId(trial, index)],
          side,
          required: true,
          status: "completed",
          createdAt: input.recordedAt,
        }, {
          result: resultFromFunctionRetest(functionRecord),
          completion: sideResult.afterCompletion,
          unableReason: sideResult.unableReason,
          score: sideResult.afterScore,
        });
      });
    });
    Object.entries(trial.rangeOutcomes ?? {}).forEach(([directionId, outcome]) => {
      const obligationId = retestObligationId({ sessionId: input.sessionId, kind: "range", targetId: directionId });
      addCompleted({
        obligationId,
        caseId: input.caseId,
        problemThreadId: input.problemThreadId,
        sessionId: input.sessionId,
        kind: "range",
        targetId: directionId,
        label: trial.targetTitle ?? trial.candidateTitle,
        sourceAssessmentId: directionId,
        treatmentRecordIds: [treatmentRecordId(trial, index)],
        required: true,
        status: "completed",
        createdAt: input.recordedAt,
      }, { result: trial.result, rangeOutcome: outcome });
    });
  });

  input.pendingFunctions.forEach((item) => {
    const sides = item.sides?.length ? item.sides : [undefined];
    sides.forEach((side) => {
      const obligationId = retestObligationId({ sessionId: input.sessionId, kind: "function", targetId: item.assessmentId, side });
      if (records.has(obligationId)) return;
      obligations.set(obligationId, {
        obligationId,
        caseId: input.caseId,
        problemThreadId: input.problemThreadId,
        sessionId: input.sessionId,
        kind: "function",
        targetId: item.assessmentId,
        label: item.label,
        sourceAssessmentId: item.assessmentId,
        treatmentRecordIds: item.candidateIds.map((candidateId) => `treatment:${input.sessionId}:${encodeURIComponent(candidateId)}`),
        side,
        required: true,
        status: "pending",
        createdAt: input.recordedAt,
      });
    });
  });
  (input.pendingRangeDirectionIds ?? []).forEach((directionId) => {
    const obligationId = retestObligationId({ sessionId: input.sessionId, kind: "range", targetId: directionId });
    if (records.has(obligationId)) return;
    obligations.set(obligationId, {
      obligationId,
      caseId: input.caseId,
      problemThreadId: input.problemThreadId,
      sessionId: input.sessionId,
      kind: "range",
      targetId: directionId,
      label: directionId,
      sourceAssessmentId: directionId,
      treatmentRecordIds: [],
      required: true,
      status: "pending",
      createdAt: input.recordedAt,
    });
  });
  return projectRetestLedger({ obligations: [...obligations.values()], records: [...records.values()] });
}
