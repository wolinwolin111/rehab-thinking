"use client";

import { useCallback, useState } from "react";
import type { SessionRuntimeState } from "@/src/features/rehabmind/workflow/session-runtime-types";

export function useRehabSession<TRetestPlan>() {
  const [state, setState] = useState<SessionRuntimeState<TRetestPlan>>({
    sessionNumber: 1,
    isLaterSession: false,
    reviewScore: 0,
    reviewScoreConfirmed: false,
    scoreHistory: [],
    phase: "review",
    postScore: 0,
    postScoreConfirmed: false,
    postDiscomfort: "",
    candidateId: "",
    treatmentRecords: [],
    readyToRetest: false,
    retestPlan: null,
    movementResponses: {},
    movementDiscomforts: {},
    movementScores: {},
    movementScoreConfirmed: {},
    tensionLocations: [],
    exerciseChoices: {},
    trainingReadyForRetest: false,
    finalScore: 0,
    finalScoreConfirmed: false,
    finalRetestRecordedAt: undefined,
    hasNewSymptom: "",
    reviewResults: {},
    history: [],
  });
  const set = useCallback(<K extends keyof SessionRuntimeState<TRetestPlan>>(key: K, value: SessionRuntimeState<TRetestPlan>[K] | ((current: SessionRuntimeState<TRetestPlan>[K]) => SessionRuntimeState<TRetestPlan>[K])) => {
    setState((current) => ({
      ...current,
      [key]: typeof value === "function"
        ? (value as (current: SessionRuntimeState<TRetestPlan>[K]) => SessionRuntimeState<TRetestPlan>[K])(current[key])
        : value,
    }));
  }, []);
  return { state, set };
}
