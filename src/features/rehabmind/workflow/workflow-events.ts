import type { WorkflowTransitionState } from "./workflow-state";

export type WorkflowNavigationEvent =
  | { type: "navigate-requested"; targetStep: 0 | 1 | 2 | 3 | 4 | 5 }
  | { type: "review-requested"; targetStep: 0 | 1 | 2 | 3 | 4 | 5 }
  | { type: "edit-requested"; targetStep: 0 | 1 | 2 | 3 | 4 | 5; explicitlyEnabled: boolean }
  | { type: "followup-started"; sessionNumber: number; priorSessionExists: boolean }
  | { type: "adverse-reported"; source: "treatment" | "training" | "after-session" };

export type WorkflowTimelineEvent = {
  type: "treatment_retest_recorded" | "treatment_queue_recomputed" | "workflow_gate_projected" | "workflow_navigation_decided";
  ruleId: string;
  from: WorkflowTransitionState;
  to: WorkflowTransitionState;
  details?: Record<string, string | number | boolean>;
};

export type WorkflowTransition = {
  from: WorkflowTransitionState;
  to: WorkflowTransitionState;
};
