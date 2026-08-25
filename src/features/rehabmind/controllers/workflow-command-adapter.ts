import type { WorkflowCommand } from "@/src/features/rehabmind/workflow/workflow-commands";

export type WorkflowCommandPorts = {
  selectTreatmentCandidate?: (candidateIndex: number) => void;
  selectTreatmentTarget?: (targetIndex: number, candidateIndex: number) => void;
  advanceTreatmentTarget?: () => void;
  stopTreatment?: (reason: "worsened") => void;
  clearPendingQueueAdvance?: () => void;
  navigateToStep?: (step: 0 | 1 | 2 | 3 | 4 | 5) => void;
  openReadonlyReview?: (step: 0 | 1 | 2 | 3 | 4 | 5) => void;
  openExplicitEdit?: (step: 0 | 1 | 2 | 3 | 4 | 5) => void;
  startFollowup?: (sessionNumber: number) => void;
  captureAdverseResponse?: (source: "treatment" | "training" | "after-session") => void;
};

/** Translate workflow commands into page operations without deriving business decisions. */
export function executeWorkflowCommands(commands: WorkflowCommand[], ports: WorkflowCommandPorts) {
  for (const command of commands) {
    switch (command.type) {
      case "select-treatment-candidate":
        ports.selectTreatmentCandidate?.(command.candidateIndex);
        break;
      case "select-treatment-target":
        ports.selectTreatmentTarget?.(command.targetIndex, command.candidateIndex);
        break;
      case "advance-treatment-target":
        ports.advanceTreatmentTarget?.();
        break;
      case "stop-treatment":
        ports.stopTreatment?.(command.reason);
        break;
      case "clear-pending-queue-advance":
        ports.clearPendingQueueAdvance?.();
        break;
      case "navigate-to-step":
        ports.navigateToStep?.(command.step);
        break;
      case "open-readonly-review":
        ports.openReadonlyReview?.(command.step);
        break;
      case "open-explicit-edit":
        ports.openExplicitEdit?.(command.step);
        break;
      case "start-followup":
        ports.startFollowup?.(command.sessionNumber);
        break;
      case "capture-adverse-response":
        ports.captureAdverseResponse?.(command.source);
        break;
    }
  }
}
