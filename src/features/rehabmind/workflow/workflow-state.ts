import type { TrainingStageGate } from "@/src/domain/rehab/training/training-stage-gate-core";

export type WorkflowStep = 0 | 1 | 2 | 3 | 4 | 5;

export type WorkflowStage =
  | "intake"
  | "safety"
  | "assessment"
  | "treatment"
  | "training"
  | "summary"
  | "followup-review"
  | "focused-reassessment";

export type WorkflowTransitionState =
  | WorkflowStage
  | "treatment-retest"
  | "treatment-candidate"
  | "treatment-queue-recompute"
  | "treatment-stopped";

export type WorkflowProjectionInput = {
  intakeComplete: boolean;
  safetyComplete: boolean;
  adverseResponse: boolean;
  planIsCurrent: boolean;
  assessmentReadyForTreatment: boolean;
  assessmentNeedsReferral: boolean;
  queueRefreshing: boolean;
  pendingAssessmentCheck: boolean;
  queueLength: number;
  queueIndex: number;
  bilateral: boolean;
  assessmentComplete: boolean;
  safetySignal: boolean;
  treatmentWorsened: boolean;
  trainingComplete: boolean;
  trainingPlanSaved: boolean;
};

export type WorkflowProjection = {
  input: Readonly<WorkflowProjectionInput>;
  ruleIds: string[];
  treatmentComplete: boolean;
  trainingStageGate: TrainingStageGate;
  trainingStageClosed: boolean;
  canEnterTraining: boolean;
  maxUnlocked: WorkflowStep;
};

export const WORKFLOW_STAGE_BY_STEP: Record<WorkflowStep, WorkflowStage> = {
  0: "intake",
  1: "safety",
  2: "assessment",
  3: "treatment",
  4: "training",
  5: "summary",
};
