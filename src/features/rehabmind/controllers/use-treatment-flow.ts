"use client";

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { CompletedRangeRetestAnswer, RangeRetestAnswer, TrialRecord, YesNo } from "@/src/domain/rehab/treatment/trial-record-types";
import type { PendingQueueAdvance } from "@/src/domain/rehab/shared/workflow-state-core";
import type { BilateralSide } from "@/src/domain/rehab/shared/bilateral-flow-core";

export type TreatmentFlowState<TRetestPlan> = {
  targetCursor: number;
  candidateCursor: number;
  pendingQueueAdvance: PendingQueueAdvance | null;
  selectedOptionalCandidateIds: string[];
  bilateralNeedsReferral: boolean;
  midpointDecisionDone: boolean;
  bilateralTreatmentSides: Record<string, BilateralSide[]>;
  bilateralRetestResponses: Record<string, "better" | "same" | "worse">;
  records: TrialRecord[];
  postScore: number;
  postScoreConfirmed: boolean;
  postDiscomfort: YesNo | "";
  readyToRetest: boolean;
  retestPlan: TRetestPlan | null;
  movementResponse: RangeRetestAnswer;
  movementResponses: Record<string, CompletedRangeRetestAnswer>;
  movementDiscomforts: Record<string, YesNo>;
  movementScores: Record<string, number>;
  movementScoreConfirmed: Record<string, boolean>;
};

export function useTreatmentFlow<TRetestPlan>() {
  const [state, setState] = useState<TreatmentFlowState<TRetestPlan>>({
    targetCursor: 0,
    candidateCursor: 0,
    pendingQueueAdvance: null,
    selectedOptionalCandidateIds: [],
    bilateralNeedsReferral: false,
    midpointDecisionDone: false,
    bilateralTreatmentSides: {},
    bilateralRetestResponses: {},
    records: [],
    postScore: 0,
    postScoreConfirmed: false,
    postDiscomfort: "",
    readyToRetest: false,
    retestPlan: null,
    movementResponse: "",
    movementResponses: {},
    movementDiscomforts: {},
    movementScores: {},
    movementScoreConfirmed: {},
  });
  const set = useCallback(<K extends keyof TreatmentFlowState<TRetestPlan>>(key: K, value: TreatmentFlowState<TRetestPlan>[K] | ((current: TreatmentFlowState<TRetestPlan>[K]) => TreatmentFlowState<TRetestPlan>[K])) => {
    setState((current) => ({
      ...current,
      [key]: typeof value === "function"
        ? (value as (current: TreatmentFlowState<TRetestPlan>[K]) => TreatmentFlowState<TRetestPlan>[K])(current[key])
        : value,
    }));
  }, []);
  const actions = useMemo(() => ({
    setTargetCursor: ((value) => set("targetCursor", value)) as Dispatch<SetStateAction<number>>,
    setCandidateCursor: ((value) => set("candidateCursor", value)) as Dispatch<SetStateAction<number>>,
    setPendingQueueAdvance: ((value) => set("pendingQueueAdvance", value)) as Dispatch<SetStateAction<PendingQueueAdvance | null>>,
    setSelectedOptionalCandidateIds: ((value) => set("selectedOptionalCandidateIds", value)) as Dispatch<SetStateAction<string[]>>,
    setBilateralNeedsReferral: ((value) => set("bilateralNeedsReferral", value)) as Dispatch<SetStateAction<boolean>>,
    setMidpointDecisionDone: ((value) => set("midpointDecisionDone", value)) as Dispatch<SetStateAction<boolean>>,
    setBilateralTreatmentSides: ((value) => set("bilateralTreatmentSides", value)) as Dispatch<SetStateAction<Record<string, BilateralSide[]>>>,
    setBilateralRetestResponses: ((value) => set("bilateralRetestResponses", value)) as Dispatch<SetStateAction<Record<string, "better" | "same" | "worse">>>,
    setRecords: ((value) => set("records", value)) as Dispatch<SetStateAction<TrialRecord[]>>,
    setPostScore: ((value) => set("postScore", value)) as Dispatch<SetStateAction<number>>,
    setPostScoreConfirmed: ((value) => set("postScoreConfirmed", value)) as Dispatch<SetStateAction<boolean>>,
    setPostDiscomfort: ((value) => set("postDiscomfort", value)) as Dispatch<SetStateAction<YesNo | "">>,
    setReadyToRetest: ((value) => set("readyToRetest", value)) as Dispatch<SetStateAction<boolean>>,
    setRetestPlan: ((value) => set("retestPlan", value)) as Dispatch<SetStateAction<TRetestPlan | null>>,
    setMovementResponse: ((value) => set("movementResponse", value)) as Dispatch<SetStateAction<RangeRetestAnswer>>,
    setMovementResponses: ((value) => set("movementResponses", value)) as Dispatch<SetStateAction<Record<string, CompletedRangeRetestAnswer>>>,
    setMovementDiscomforts: ((value) => set("movementDiscomforts", value)) as Dispatch<SetStateAction<Record<string, YesNo>>>,
    setMovementScores: ((value) => set("movementScores", value)) as Dispatch<SetStateAction<Record<string, number>>>,
    setMovementScoreConfirmed: ((value) => set("movementScoreConfirmed", value)) as Dispatch<SetStateAction<Record<string, boolean>>>,
  }), [set]);
  return { state, actions };
}
