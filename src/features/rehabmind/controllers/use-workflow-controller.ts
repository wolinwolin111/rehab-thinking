"use client";

import { useMemo } from "react";
import {
  createPendingTreatmentQueueAdvance,
  orchestrateTreatmentQueueRecomputed,
  orchestrateTreatmentRetest,
  orchestrateWorkflowNavigation,
  projectWorkflowState,
  resolveReturnEditGate,
  resolveWorkflowSafetyGate,
} from "@/src/features/rehabmind/workflow/workflow-orchestrator";
import { executeWorkflowCommands } from "./workflow-command-adapter";

export function createWorkflowController() {
  return Object.freeze({
    createPendingQueueAdvance: createPendingTreatmentQueueAdvance,
    recordTreatmentRetest: orchestrateTreatmentRetest,
    recomputeTreatmentQueue: orchestrateTreatmentQueueRecomputed,
    project: projectWorkflowState,
    execute: executeWorkflowCommands,
    navigate: orchestrateWorkflowNavigation,
    resolveReturnEdit: resolveReturnEditGate,
    resolveSafety: resolveWorkflowSafetyGate,
  });
}

/** React binding only; all decisions remain in the pure production orchestrator. */
export function useWorkflowController() {
  return useMemo(() => createWorkflowController(), []);
}
