"use client";

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";

export type AssessmentFlowState<TRecord> = {
  cursor: number;
  results: Record<string, TRecord>;
  summaryOpen: boolean;
  sharedTensionOpen: boolean;
};

export function useAssessmentFlow<TRecord>() {
  const [state, setState] = useState<AssessmentFlowState<TRecord>>({
    cursor: 0,
    results: {},
    summaryOpen: false,
    sharedTensionOpen: false,
  });
  const set = useCallback(<K extends keyof AssessmentFlowState<TRecord>>(key: K, value: AssessmentFlowState<TRecord>[K] | ((current: AssessmentFlowState<TRecord>[K]) => AssessmentFlowState<TRecord>[K])) => {
    setState((current) => ({
      ...current,
      [key]: typeof value === "function"
        ? (value as (current: AssessmentFlowState<TRecord>[K]) => AssessmentFlowState<TRecord>[K])(current[key])
        : value,
    }));
  }, []);
  const actions = useMemo(() => ({
    setCursor: ((value) => set("cursor", value)) as Dispatch<SetStateAction<number>>,
    setResults: ((value) => set("results", value)) as Dispatch<SetStateAction<Record<string, TRecord>>>,
    setSummaryOpen: ((value) => set("summaryOpen", value)) as Dispatch<SetStateAction<boolean>>,
    setSharedTensionOpen: ((value) => set("sharedTensionOpen", value)) as Dispatch<SetStateAction<boolean>>,
  }), [set]);
  return { state, actions };
}
