import type { WorkflowProjection, WorkflowProjectionInput } from "./workflow-state";

export const PILOT_WORKFLOW_INVARIANT_CODES = [
  "INV-WORKFLOW-STAGE-BYPASS",
  "INV-RETEST-SKIPPED",
  "INV-QUEUE-EARLY-END",
  "INV-TRAINING-GATE-BYPASS",
  "INV-TIMELINE-SEQUENCE",
  "INV-REVISION-REGRESSION",
  "INV-DELETED-CASE-RESUMED",
  "INV-FEEDBACK-EVENT-CROSSCASE",
  "INV-FEEDBACK-SESSION-MISMATCH",
] as const;

export type PilotWorkflowInvariantCode = (typeof PILOT_WORKFLOW_INVARIANT_CODES)[number];

const BOOLEAN_PROJECTION_KEYS = [
  "intakeComplete", "safetyComplete", "adverseResponse", "planIsCurrent",
  "assessmentReadyForTreatment", "assessmentNeedsReferral", "queueRefreshing",
  "pendingAssessmentCheck", "bilateral", "assessmentComplete", "safetySignal",
  "treatmentWorsened", "trainingComplete", "trainingPlanSaved",
] as const;
const NUMBER_PROJECTION_KEYS = ["queueLength", "queueIndex"] as const;

export function parseWorkflowProjectionObservation(value: unknown): WorkflowProjectionInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (BOOLEAN_PROJECTION_KEYS.some((key) => typeof candidate[key] !== "boolean")) return null;
  if (NUMBER_PROJECTION_KEYS.some((key) => !Number.isInteger(candidate[key]) || Number(candidate[key]) < 0)) return null;
  return candidate as WorkflowProjectionInput;
}

export function inspectWorkflowProjectionInvariants(input: {
  snapshotStep: number;
  projection: WorkflowProjection;
}): PilotWorkflowInvariantCode[] {
  const codes: PilotWorkflowInvariantCode[] = [];
  const { snapshotStep, projection } = input;
  if (snapshotStep > projection.maxUnlocked) codes.push("INV-WORKFLOW-STAGE-BYPASS");
  if (snapshotStep >= 4 && !projection.treatmentComplete) codes.push("INV-RETEST-SKIPPED");
  if (snapshotStep >= 4 && projection.input.queueLength > 0 && projection.input.queueIndex < projection.input.queueLength) {
    codes.push("INV-QUEUE-EARLY-END");
  }
  if (snapshotStep >= 5 && !projection.trainingStageClosed) codes.push("INV-TRAINING-GATE-BYPASS");
  return codes;
}

type TimelineEvent = {
  id: string;
  sequence: number;
  type: string;
  payload: unknown;
};

type FeedbackReference = {
  eventId?: string | null;
  sourceEventId?: string | null;
  sessionNumber?: number | null;
  sourceSessionNumber?: number | null;
};

function payloadObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function baseRevision(event: TimelineEvent) {
  const technical = payloadObject(payloadObject(event.payload).technical);
  return Number.isInteger(technical.baseRevision) ? technical.baseRevision as number : null;
}

export function inspectPilotTimelineInvariants(input: {
  caseStatus: string;
  snapshotRevision: number;
  caseSessionCount?: number;
  events: TimelineEvent[];
  feedback: FeedbackReference[];
}): PilotWorkflowInvariantCode[] {
  const codes: PilotWorkflowInvariantCode[] = [];
  const events = [...input.events].sort((left, right) => left.sequence - right.sequence);
  if (events.some((event, index) => event.sequence !== index + 1)) codes.push("INV-TIMELINE-SEQUENCE");

  let priorBaseRevision: number | null = null;
  let highestBaseRevision = -1;
  for (const event of events) {
    const revision = baseRevision(event);
    if (revision === null) continue;
    if (priorBaseRevision !== null && revision < priorBaseRevision) {
      codes.push("INV-REVISION-REGRESSION");
      break;
    }
    priorBaseRevision = revision;
    highestBaseRevision = Math.max(highestBaseRevision, revision);
  }
  if (!codes.includes("INV-REVISION-REGRESSION") && highestBaseRevision >= input.snapshotRevision) {
    codes.push("INV-REVISION-REGRESSION");
  }

  const deletedAt = events.findIndex((event) => event.type === "case_deleted");
  if (input.caseStatus === "deleted" && deletedAt >= 0 && deletedAt < events.length - 1) {
    codes.push("INV-DELETED-CASE-RESUMED");
  }

  const eventIds = new Set(events.map((event) => event.id));
  if (input.feedback.some((item) => (item.eventId && !eventIds.has(item.eventId)) || (item.sourceEventId && !eventIds.has(item.sourceEventId)))) {
    codes.push("INV-FEEDBACK-EVENT-CROSSCASE");
  }
  const maximumSession = Math.max(1, input.caseSessionCount ?? 1);
  if (input.feedback.some((item) =>
    (item.sessionNumber !== null && item.sessionNumber !== undefined && item.sessionNumber > maximumSession)
    || (item.sourceSessionNumber !== null && item.sourceSessionNumber !== undefined && item.sourceSessionNumber > maximumSession)
  )) {
    codes.push("INV-FEEDBACK-SESSION-MISMATCH");
  }
  return codes;
}

export function buildPilotInvariantAlert(input: {
  codes: PilotWorkflowInvariantCode[];
  requestId: string;
  caseId: string;
  sessionId: string;
}) {
  return {
    codes: [...input.codes],
    requestId: input.requestId,
    caseId: input.caseId,
    sessionId: input.sessionId,
  };
}
