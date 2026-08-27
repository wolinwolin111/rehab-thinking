import {
  buildPendingQueueAdvance,
  resolveDynamicQueueAdvanceForTargets,
  type PendingQueueAdvance,
  type StableQueueTarget,
} from "@/src/domain/rehab/shared/workflow-state-core";
import {
  resolveTreatmentQueueAdvance,
  type TreatmentQueueAdvanceInput,
  type TreatmentQueueTarget,
} from "@/src/domain/rehab/treatment/treatment-queue-core";
import { resolveTrainingStageGate } from "@/src/domain/rehab/training/training-stage-gate-core";
import type { WorkflowCommand } from "./workflow-commands";
import type { WorkflowNavigationEvent, WorkflowTimelineEvent, WorkflowTransition } from "./workflow-events";
import { WORKFLOW_STAGE_BY_STEP, type WorkflowProjection, type WorkflowProjectionInput, type WorkflowStep } from "./workflow-state";

export type WorkflowDecision<TExtra extends object = object> = TExtra & {
  ruleIds: string[];
  transition: WorkflowTransition;
  commands: WorkflowCommand[];
  timelineEvents: WorkflowTimelineEvent[];
};

/**
 * Unique workflow entry after a treatment result and its required retest have
 * been captured. Clinical eligibility remains in the existing cores; this
 * function owns the resulting state transition, command, and audit evidence.
 */
export function orchestrateTreatmentRetest<
  TCandidate,
  TTarget extends TreatmentQueueTarget<TCandidate>,
>(input: TreatmentQueueAdvanceInput<TCandidate, TTarget>) {
  const queueAdvance = resolveTreatmentQueueAdvance(input);
  let transition: WorkflowTransition;
  let commands: WorkflowCommand[];

  if (queueAdvance.stopped) {
    transition = { from: "treatment-retest", to: "treatment-stopped" };
    commands = [{ type: "stop-treatment", reason: "worsened" }];
  } else if (queueAdvance.nextCandidateIndex >= 0) {
    transition = { from: "treatment-retest", to: "treatment-candidate" };
    commands = [{ type: "select-treatment-candidate", candidateIndex: queueAdvance.nextCandidateIndex }];
  } else if (queueAdvance.nextTargetPosition) {
    transition = { from: "treatment-retest", to: "treatment-candidate" };
    commands = [{
      type: "select-treatment-target",
      targetIndex: queueAdvance.nextTargetPosition.targetIndex,
      candidateIndex: queueAdvance.nextTargetPosition.candidateIndex,
    }];
  } else {
    transition = { from: "treatment-retest", to: "treatment-queue-recompute" };
    commands = [{ type: "advance-treatment-target" }];
  }

  return {
    queueAdvance,
    ruleIds: ["RETEST-GATE", "QUEUE-GATE"],
    transition,
    commands,
    timelineEvents: [{
      type: "treatment_retest_recorded",
      ruleId: "QUEUE-GATE",
      ...transition,
      details: {
        stopped: queueAdvance.stopped,
        nextCandidateIndex: queueAdvance.nextCandidateIndex,
      },
    }],
  } satisfies WorkflowDecision<{ queueAdvance: typeof queueAdvance }>;
}

export function createPendingTreatmentQueueAdvance(
  completedTarget: StableQueueTarget,
  nextTarget?: StableQueueTarget,
) {
  return buildPendingQueueAdvance(completedTarget, nextTarget);
}

/** Resolve the post-render queue only by stable target identity. */
export function orchestrateTreatmentQueueRecomputed<TTarget extends StableQueueTarget>(input: {
  currentIndex: number;
  targets: TTarget[];
  pending: PendingQueueAdvance;
}) {
  const resolvedIndex = resolveDynamicQueueAdvanceForTargets(input.currentIndex, input.targets, input.pending);
  const hasTarget = resolvedIndex < input.targets.length;
  const transition: WorkflowTransition = {
    from: "treatment-queue-recompute",
    to: hasTarget ? "treatment-candidate" : "treatment",
  };
  const commands: WorkflowCommand[] = [
    ...(hasTarget ? [{ type: "select-treatment-target", targetIndex: resolvedIndex, candidateIndex: 0 } as const] : []),
    { type: "clear-pending-queue-advance" },
  ];
  return {
    resolvedIndex,
    ruleIds: ["QUEUE-GATE"],
    transition,
    commands,
    timelineEvents: [{
      type: "treatment_queue_recomputed",
      ruleId: "QUEUE-GATE",
      ...transition,
      details: { resolvedIndex, queueLength: input.targets.length },
    }],
  } satisfies WorkflowDecision<{ resolvedIndex: number }>;
}

/**
 * Single projection for treatment completion, training entry, and summary
 * unlock. Page components consume these facts and do not rebuild the gates.
 */
export function projectWorkflowState(input: WorkflowProjectionInput): WorkflowProjection {
  const treatmentComplete = !input.queueRefreshing
    && !input.pendingAssessmentCheck
    && (input.pendingRetestCount ?? 0) === 0
    && (input.queueLength === 0 || input.queueIndex >= input.queueLength);
  const trainingStageGate = resolveTrainingStageGate({
    bilateral: input.bilateral,
    assessmentComplete: input.assessmentComplete,
    safetySignal: input.safetySignal,
    treatmentWorsened: input.treatmentWorsened,
    trainingComplete: input.trainingComplete,
    trainingPlanSaved: input.trainingPlanSaved,
  });
  const trainingStageClosed = trainingStageGate.closed;
  const canEnterTraining = treatmentComplete && !trainingStageGate.blocked;
  const maxUnlocked: WorkflowStep = !input.intakeComplete
    ? 0
    : !input.safetyComplete
      ? 1
      : input.adverseResponse || !input.planIsCurrent
        ? 2
        : !input.assessmentReadyForTreatment || input.assessmentNeedsReferral
          ? 2
          : !treatmentComplete
            ? 3
            : !trainingStageClosed
              ? 4
              : 5;

  return {
    input: Object.freeze({ ...input }),
    ruleIds: ["WORKFLOW-HANDOFF", "TRAINING-GATE"],
    treatmentComplete,
    trainingStageGate,
    trainingStageClosed,
    canEnterTraining,
    maxUnlocked,
  };
}

export type WorkflowNavigationDecision = WorkflowDecision<{
  allowed: boolean;
  reason?: "locked" | "edit-not-explicit" | "missing-prior-session";
}>;

export type SafetyGateInput = {
  answersComplete: boolean;
  imagingSelected: boolean;
  safetySignal: boolean;
  structuralSignal: boolean;
  medicalClearance: boolean;
};

export function resolveWorkflowSafetyGate(input: SafetyGateInput) {
  const canContinue = input.answersComplete
    && input.imagingSelected
    && (!input.safetySignal || input.medicalClearance)
    && (!input.structuralSignal || input.medicalClearance);
  return {
    ruleId: "SAFE-GATE",
    outcome: canContinue ? "continue-assessment" : "stop-and-save",
    canContinue,
  } as const;
}

export type ReturnEditGateInput = {
  targetIsCompleted: boolean;
  editExplicitlyEnabled: boolean;
  answersChanged: boolean;
};

export function resolveReturnEditGate(input: ReturnEditGateInput) {
  if (!input.targetIsCompleted) return "denied" as const;
  if (!input.editExplicitlyEnabled) return "read-only-review" as const;
  return input.answersChanged ? "edit-and-invalidate-downstream" as const : "edit-without-invalidation" as const;
}

/** Own all cross-stage navigation and return/edit permissions. */
export function orchestrateWorkflowNavigation(input: {
  currentStep: WorkflowStep;
  maxUnlocked: WorkflowStep;
  event: WorkflowNavigationEvent;
}): WorkflowNavigationDecision {
  const from = WORKFLOW_STAGE_BY_STEP[input.currentStep];
  let allowed = false;
  let reason: WorkflowNavigationDecision["reason"];
  let to = from;
  let commands: WorkflowCommand[] = [];
  let ruleIds = ["STAGE-GATE"];

  switch (input.event.type) {
    case "navigate-requested": {
      allowed = input.event.targetStep <= input.maxUnlocked || input.event.targetStep <= input.currentStep;
      to = allowed ? WORKFLOW_STAGE_BY_STEP[input.event.targetStep] : from;
      reason = allowed ? undefined : "locked";
      commands = allowed ? [{ type: "navigate-to-step", step: input.event.targetStep }] : [];
      break;
    }
    case "review-requested": {
      const outcome = resolveReturnEditGate({
        targetIsCompleted: input.event.targetStep <= input.maxUnlocked,
        editExplicitlyEnabled: false,
        answersChanged: false,
      });
      allowed = outcome === "read-only-review";
      to = allowed ? WORKFLOW_STAGE_BY_STEP[input.event.targetStep] : from;
      reason = allowed ? undefined : "locked";
      commands = allowed ? [{ type: "open-readonly-review", step: input.event.targetStep }] : [];
      ruleIds = ["RETURN-EDIT-GATE"];
      break;
    }
    case "edit-requested": {
      const outcome = resolveReturnEditGate({
        targetIsCompleted: input.event.targetStep <= input.maxUnlocked,
        editExplicitlyEnabled: input.event.explicitlyEnabled,
        answersChanged: false,
      });
      allowed = outcome === "edit-without-invalidation";
      to = allowed ? WORKFLOW_STAGE_BY_STEP[input.event.targetStep] : from;
      reason = allowed ? undefined : input.event.explicitlyEnabled ? "locked" : "edit-not-explicit";
      commands = allowed ? [{ type: "open-explicit-edit", step: input.event.targetStep }] : [];
      ruleIds = ["RETURN-EDIT-GATE"];
      break;
    }
    case "followup-started": {
      allowed = input.event.priorSessionExists && input.event.sessionNumber > 1;
      to = allowed ? "followup-review" : from;
      reason = allowed ? undefined : "missing-prior-session";
      commands = allowed ? [{ type: "start-followup", sessionNumber: input.event.sessionNumber }] : [];
      ruleIds = ["FOLLOWUP-ENTRY-GATE"];
      break;
    }
    case "adverse-reported": {
      allowed = true;
      to = "focused-reassessment";
      commands = [{ type: "capture-adverse-response", source: input.event.source }];
      ruleIds = ["ADVERSE-RESPONSE-GATE"];
      break;
    }
  }

  const transition = { from, to };
  return {
    allowed,
    reason,
    ruleIds,
    transition,
    commands,
    timelineEvents: [{
      type: "workflow_navigation_decided",
      ruleId: ruleIds[0],
      ...transition,
      details: { allowed, event: input.event.type },
    }],
  };
}
