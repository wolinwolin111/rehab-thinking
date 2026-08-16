export type AdverseSource = "treatment" | "training" | "after-session";
export type AdverseTiming = "during" | "immediate" | "later" | "next-day";
export type AdverseAnswer = "" | "yes" | "no" | "unsure";

export type AdverseResponseEvent = {
  id: string;
  source: AdverseSource;
  sourceId: string;
  sourceLabel: string;
  timing: AdverseTiming;
  beforeScore: number;
  afterScore: number;
  afterScoreConfirmed: boolean;
  settledAfterStopping: AdverseAnswer;
  locationChanged: AdverseAnswer;
  symptomChanged: AdverseAnswer;
  neuralOrWeakness: AdverseAnswer;
  relatedAssessmentIds: string[];
  assessmentRevision: number;
  regressionAttempted?: boolean;
  returnMode?: "initial" | "followup";
  returnFollowupStage?: "review" | "treatment" | "training" | "summary";
};

export type AdverseResolution = "capture" | "regress-training" | "focused-reassessment" | "stop-and-refer";

export function createAdverseResponse(input: Omit<AdverseResponseEvent, "id" | "afterScoreConfirmed" | "settledAfterStopping" | "locationChanged" | "symptomChanged" | "neuralOrWeakness">): AdverseResponseEvent {
  return {
    ...input,
    id: `${input.source}:${input.sourceId}:${input.assessmentRevision + 1}`,
    afterScoreConfirmed: false,
    settledAfterStopping: "",
    locationChanged: "",
    symptomChanged: "",
    neuralOrWeakness: "",
    relatedAssessmentIds: [...new Set(input.relatedAssessmentIds)].slice(0, 3),
  };
}

export function adverseCaptureComplete(event: AdverseResponseEvent) {
  return event.afterScoreConfirmed
    && Boolean(event.settledAfterStopping)
    && Boolean(event.locationChanged)
    && Boolean(event.symptomChanged)
    && Boolean(event.neuralOrWeakness);
}

export function resolveAdverseResponse(event: AdverseResponseEvent): AdverseResolution {
  if (!adverseCaptureComplete(event)) return "capture";
  const persistentIncrease = event.afterScore > event.beforeScore && event.settledAfterStopping !== "yes";
  if (event.neuralOrWeakness === "yes" || persistentIncrease && event.afterScore >= 7) return "stop-and-refer";
  const unchangedPattern = event.locationChanged === "no" && event.symptomChanged === "no";
  if (event.source === "training" && !event.regressionAttempted && event.settledAfterStopping === "yes" && unchangedPattern) return "regress-training";
  return "focused-reassessment";
}

export function focusedReassessmentIds(event: AdverseResponseEvent, chiefAssessmentId?: string) {
  return [...new Set([chiefAssessmentId, ...event.relatedAssessmentIds].filter(Boolean) as string[])].slice(0, 3);
}

export function focusedReassessmentComplete(event: AdverseResponseEvent, confirmedAssessmentIds: string[]) {
  const required = event.relatedAssessmentIds;
  return required.length > 0 && required.every((id) => confirmedAssessmentIds.includes(id));
}

export function nextAssessmentRevision(current: number) {
  return current + 1;
}

export function canExecutePlan(planRevision: number, assessmentRevision: number) {
  return planRevision === assessmentRevision;
}
