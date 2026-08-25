export type WorkflowCommand =
  | { type: "select-treatment-candidate"; candidateIndex: number }
  | { type: "select-treatment-target"; targetIndex: number; candidateIndex: number }
  | { type: "advance-treatment-target" }
  | { type: "stop-treatment"; reason: "worsened" }
  | { type: "clear-pending-queue-advance" }
  | { type: "enter-training" }
  | { type: "remain-in-treatment" }
  | { type: "navigate-to-step"; step: 0 | 1 | 2 | 3 | 4 | 5 }
  | { type: "open-readonly-review"; step: 0 | 1 | 2 | 3 | 4 | 5 }
  | { type: "open-explicit-edit"; step: 0 | 1 | 2 | 3 | 4 | 5 }
  | { type: "start-followup"; sessionNumber: number }
  | { type: "capture-adverse-response"; source: "treatment" | "training" | "after-session" };
