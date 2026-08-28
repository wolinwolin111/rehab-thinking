import { PILOT_SNAPSHOT_SCHEMA_VERSION, PilotCaseValidationError } from "@/src/infrastructure/pilot/api/case-contracts";
import { PILOT_CONSENT_VERSION } from "@/src/infrastructure/pilot/consent/consent-core";

export { PILOT_SNAPSHOT_SCHEMA_VERSION };

type SnapshotObject = Record<string, unknown>;

export type SnapshotValidationResult =
  | { ok: true; snapshot: SnapshotObject }
  | { ok: false; reason: string };

type SnapshotBoundaryOptions = { requireConsent?: boolean };

function isObject(value: unknown): value is SnapshotObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function nonEmptyString(value: unknown) {
  return typeof value === "string" && Boolean(value.trim());
}

function nonNegativeInteger(value: unknown) {
  return Number.isInteger(value) && (value as number) >= 0;
}

function score(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10;
}

function stringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function mapValues(value: unknown, predicate: (item: unknown) => boolean) {
  return isObject(value) && Object.values(value).every(predicate);
}

function optionalFields(
  value: SnapshotObject,
  keys: readonly string[],
  predicate: (item: unknown) => boolean,
) {
  return keys.find((key) => value[key] !== undefined && !predicate(value[key]));
}

function jsonDepth(value: unknown, depth = 0, seen = new WeakSet<object>()): number {
  if (value === null || typeof value !== "object") return depth;
  if (seen.has(value)) return Number.POSITIVE_INFINITY;
  seen.add(value);
  const children = Array.isArray(value) ? value : Object.values(value as SnapshotObject);
  const maximum = children.reduce((current, child) => Math.max(current, jsonDepth(child, depth + 1, seen)), depth);
  seen.delete(value);
  return maximum;
}

function requireObject(parent: SnapshotObject, key: string): SnapshotObject | null {
  return isObject(parent[key]) ? parent[key] as SnapshotObject : null;
}

function validateIdentity(identity: SnapshotObject): string | null {
  for (const key of ["caseId", "localCaseId", "problemThreadId", "sessionId", "sessionStatus", "sessionStartedAt"] as const) {
    if (!nonEmptyString(identity[key])) return `snapshot identity.${key} is invalid`;
  }
  if (!nonNegativeInteger(identity.sessionNumber) || (identity.sessionNumber as number) < 1) return "snapshot identity.sessionNumber is invalid";
  if (!["draft", "completed", "abandoned"].includes(String(identity.sessionStatus))) return "snapshot identity.sessionStatus is invalid";
  if (!Array.isArray(identity.problemThreads)) return "snapshot identity.problemThreads is invalid";
  if (!Array.isArray(identity.sessionIndex)) return "snapshot identity.sessionIndex is invalid";
  for (const [index, raw] of identity.problemThreads.entries()) {
    if (!isObject(raw)) return `snapshot identity.problemThreads[${index}] is invalid`;
    for (const key of ["problemThreadId", "caseId", "status", "createdAt", "lastActiveAt"] as const) {
      if (!nonEmptyString(raw[key])) return `snapshot identity.problemThreads[${index}].${key} is invalid`;
    }
    if (!["active", "resolved", "archived", "superseded"].includes(String(raw.status))) return `snapshot identity.problemThreads[${index}].status is invalid`;
    const optionalKey = optionalFields(raw, ["regionId", "location", "title", "closedAt", "supersedesProblemThreadId"], nonEmptyString);
    if (optionalKey) return `snapshot identity.problemThreads[${index}].${optionalKey} is invalid`;
  }
  for (const [index, raw] of identity.sessionIndex.entries()) {
    if (!isObject(raw)) return `snapshot identity.sessionIndex[${index}] is invalid`;
    for (const key of ["sessionId", "problemThreadId", "caseId", "status", "startedAt"] as const) {
      if (!nonEmptyString(raw[key])) return `snapshot identity.sessionIndex[${index}].${key} is invalid`;
    }
    if (!Number.isInteger(raw.sessionNumber) || (raw.sessionNumber as number) < 1) return `snapshot identity.sessionIndex[${index}].sessionNumber is invalid`;
    if (!["draft", "completed", "abandoned"].includes(String(raw.status))) return `snapshot identity.sessionIndex[${index}].status is invalid`;
    const optionalKey = optionalFields(raw, ["lastDraftSavedAt", "completedAt", "completionReason", "location"], nonEmptyString);
    if (optionalKey) return `snapshot identity.sessionIndex[${index}].${optionalKey} is invalid`;
  }
  return null;
}

function validateConsent(value: unknown, required: boolean): string | null {
  if (value === undefined && !required) return null;
  if (!isObject(value)) return required ? "snapshot domain.consent is required" : "snapshot domain.consent is invalid";
  if (value.version !== PILOT_CONSENT_VERSION) return "snapshot domain.consent.version is invalid";
  if (!nonEmptyString(value.confirmedAt) || !Number.isFinite(Date.parse(value.confirmedAt as string))) return "snapshot domain.consent.confirmedAt is invalid";
  return null;
}

function validateIntake(value: SnapshotObject): string | null {
  if (typeof value.regionId !== "string") return "snapshot domain.intake.regionId is invalid";
  const stringKey = optionalFields(value, [
    "description", "userRole", "examSetup", "productMode", "operationTarget", "spineAssessmentMode", "side",
    "prioritySide", "location", "onset", "mechanism", "symptomType", "forceDirection", "swellingLocation",
    "tendernessLocation", "sensoryLocation", "reproduction", "customAction", "professionalNotes",
    "stabbingSpread", "stabbingPalpation",
  ], (item) => typeof item === "string");
  if (stringKey) return `snapshot domain.intake.${stringKey} is invalid`;
  const booleanKey = optionalFields(value, [
    "parsed", "capabilitiesConfirmed", "learningExplanation", "locationConfirmed", "painQualityConfirmed",
    "swellingLocationConfirmed", "tendernessLocationConfirmed", "sensoryLocationConfirmed",
    "actionSelectionConfirmed", "noFixedAction", "baselineScoreConfirmed",
  ], (item) => typeof item === "boolean");
  if (booleanKey) return `snapshot domain.intake.${booleanKey} is invalid`;
  const arrayKey = optionalFields(value, [
    "bodyLocations", "symptoms", "provocationContexts", "provocationTypes", "swellingLocations", "tendernessLocations",
    "sensoryLocations", "reportedActions", "priorCare",
  ], Array.isArray);
  if (arrayKey) return `snapshot domain.intake.${arrayKey} is invalid`;
  if (value.goal !== undefined && (!Number.isFinite(value.goal) || (value.goal as number) < 0)) return "snapshot domain.intake.goal is invalid";
  if (value.baselineScore !== undefined && !score(value.baselineScore)) return "snapshot domain.intake.baselineScore is invalid";
  if (value.capabilities !== undefined && !isObject(value.capabilities)) return "snapshot domain.intake.capabilities is invalid";
  if (value.medicalGuidance !== undefined && !isObject(value.medicalGuidance)) return "snapshot domain.intake.medicalGuidance is invalid";
  if (isObject(value.medicalGuidance)) {
    if (typeof value.medicalGuidance.reviewedByClinician !== "boolean") return "snapshot domain.intake.medicalGuidance.reviewedByClinician is invalid";
    if (!["none-reported", "restricted", "cleared", "unknown"].includes(String(value.medicalGuidance.restrictionState))) return "snapshot domain.intake.medicalGuidance.restrictionState is invalid";
  }
  if (value.actionAnalysis !== undefined && value.actionAnalysis !== null && !isObject(value.actionAnalysis)) return "snapshot domain.intake.actionAnalysis is invalid";
  return null;
}

function validateAssessmentResults(value: SnapshotObject): string | null {
  for (const [id, raw] of Object.entries(value)) {
    if (!isObject(raw)) return `snapshot domain.assessments.results.${id} is invalid`;
    if (raw.bilateralSideResults !== undefined) {
      if (!isObject(raw.bilateralSideResults)) return `snapshot domain.assessments.results.${id}.bilateralSideResults is invalid`;
      if (Object.keys(raw.bilateralSideResults).some((key) => !["左侧", "右侧"].includes(key))) return `snapshot domain.assessments.results.${id}.bilateralSideResults is invalid`;
      if (Object.values(raw.bilateralSideResults).some((result) => !["normal", "limited"].includes(String(result)))) return `snapshot domain.assessments.results.${id}.bilateralSideResults is invalid`;
    }
    for (const key of ["discomfort", "passiveDiscomfort", "functionDiscomfort"] as const) {
      if (raw[key] !== undefined && !["yes", "no"].includes(String(raw[key]))) return `snapshot domain.assessments.results.${id}.${key} is invalid`;
    }
    for (const key of ["symptomScore", "passiveSymptomScore", "pairedStrengthScore"] as const) {
      if (raw[key] !== undefined && !score(raw[key])) return `snapshot domain.assessments.results.${id}.${key} is invalid`;
    }
    for (const key of ["compensations", "tensionLocations", "discomfortLocations", "passiveDiscomfortLocations", "pairedStrengthLocations"] as const) {
      if (raw[key] !== undefined && !Array.isArray(raw[key])) return `snapshot domain.assessments.results.${id}.${key} is invalid`;
    }
  }
  return null;
}

function validateTreatmentRecords(value: unknown[]): string | null {
  for (const [index, raw] of value.entries()) {
    if (!isObject(raw) || !nonEmptyString(raw.sessionId) || !Number.isInteger(raw.sessionNumber) || (raw.sessionNumber as number) < 1 || !isObject(raw.record)) {
      return `snapshot domain.treatments[${index}] is invalid`;
    }
    const record = raw.record;
    for (const key of ["treatmentRecordId", "sessionId", "recordedAt", "candidateId", "candidateTitle"] as const) {
      if (!nonEmptyString(record[key])) return `snapshot domain.treatments[${index}].record.${key} is invalid`;
    }
    if (record.sessionId !== raw.sessionId) return `snapshot domain.treatments[${index}].record.sessionId does not match treatment session`;
    if (!nonNegativeInteger(record.assessmentRevision)) return `snapshot domain.treatments[${index}].record.assessmentRevision is invalid`;
    if (record.supersededByAssessmentRevision !== undefined) {
      if (!nonNegativeInteger(record.supersededByAssessmentRevision)
        || !nonEmptyString(record.supersededAt)
        || !["assessment-updated", "adverse-reassessment"].includes(String(record.invalidationReason))) {
        return `snapshot domain.treatments[${index}].record supersession is invalid`;
      }
    }
    if (record.result !== undefined && !["better", "partial", "same", "worse"].includes(String(record.result))) return `snapshot domain.treatments[${index}].record.result is invalid`;
    for (const key of ["beforeScore", "afterScore"] as const) {
      if (!score(record[key])) return `snapshot domain.treatments[${index}].record.${key} is invalid`;
    }
    if (record.functionRetests !== undefined && !isObject(record.functionRetests)) return `snapshot domain.treatments[${index}].record.functionRetests is invalid`;
  }
  return null;
}

function validateRetests(value: SnapshotObject): string | null {
  if (!Array.isArray(value.obligations) || !Array.isArray(value.records)) return "snapshot domain.retests is invalid";
  const obligationIds = new Set<string>();
  for (const [index, raw] of value.obligations.entries()) {
    if (!isObject(raw)) return `snapshot domain.retests.obligations[${index}] is invalid`;
    for (const key of ["obligationId", "caseId", "problemThreadId", "sessionId", "kind", "targetId", "label", "status", "createdAt"] as const) {
      if (!nonEmptyString(raw[key])) return `snapshot domain.retests.obligations[${index}].${key} is invalid`;
    }
    if (obligationIds.has(raw.obligationId as string)) return `snapshot domain.retests.obligations[${index}].obligationId is duplicated`;
    obligationIds.add(raw.obligationId as string);
    if (!["range", "function", "chief", "training-safety"].includes(String(raw.kind))) return `snapshot domain.retests.obligations[${index}].kind is invalid`;
    if (!["pending", "completed", "deferred", "cancelled", "superseded"].includes(String(raw.status))) return `snapshot domain.retests.obligations[${index}].status is invalid`;
    if (typeof raw.required !== "boolean" || !stringArray(raw.treatmentRecordIds)) return `snapshot domain.retests.obligations[${index}] is invalid`;
    if (raw.side !== undefined && !["左侧", "右侧"].includes(String(raw.side))) return `snapshot domain.retests.obligations[${index}].side is invalid`;
  }
  const recordIds = new Set<string>();
  for (const [index, raw] of value.records.entries()) {
    if (!isObject(raw)) return `snapshot domain.retests.records[${index}] is invalid`;
    for (const key of ["retestRecordId", "obligationId", "caseId", "problemThreadId", "sessionId", "recordedAt", "result"] as const) {
      if (!nonEmptyString(raw[key])) return `snapshot domain.retests.records[${index}].${key} is invalid`;
    }
    if (recordIds.has(raw.retestRecordId as string)) return `snapshot domain.retests.records[${index}].retestRecordId is duplicated`;
    recordIds.add(raw.retestRecordId as string);
    if (!obligationIds.has(raw.obligationId as string)) return `snapshot domain.retests.records[${index}].obligationId is missing`;
    if (!["better", "partial", "same", "worse"].includes(String(raw.result))) return `snapshot domain.retests.records[${index}].result is invalid`;
    if (raw.score !== undefined && !score(raw.score)) return `snapshot domain.retests.records[${index}].score is invalid`;
  }
  return null;
}

function validateDomain(domain: SnapshotObject, requireConsent: boolean): string | null {
  const consentError = validateConsent(domain.consent, requireConsent);
  if (consentError) return consentError;
  const intake = requireObject(domain, "intake");
  if (!intake) return "snapshot domain.intake is invalid";
  const intakeError = validateIntake(intake);
  if (intakeError) return intakeError;
  for (const key of ["bodyMarks", "scoreRecords", "specialTestRecords", "professionalNoteRecords", "decisionTraces", "treatments", "history"] as const) {
    if (!Array.isArray(domain[key])) return `snapshot domain.${key} is invalid`;
  }
  for (const key of ["bodyMarks", "scoreRecords", "specialTestRecords", "professionalNoteRecords", "decisionTraces", "history"] as const) {
    if ((domain[key] as unknown[]).some((item) => !isObject(item))) return `snapshot domain.${key} item is invalid`;
  }
  const treatmentError = validateTreatmentRecords(domain.treatments as unknown[]);
  if (treatmentError) return treatmentError;
  const safety = requireObject(domain, "safety");
  if (!safety || !mapValues(safety.answers, (item) => ["yes", "no"].includes(String(item))) || !mapValues(safety.boneRisk, (item) => ["yes", "no", "unsure"].includes(String(item))) || !stringArray(safety.imaging)) return "snapshot domain.safety is invalid";
  if (!Array.isArray(domain.assessments) || !domain.assessments.length) return "snapshot domain.assessments is invalid";
  const assessmentSetIds = new Set<string>();
  for (const [index, raw] of domain.assessments.entries()) {
    if (!isObject(raw)) return `snapshot domain.assessments[${index}] is invalid`;
    for (const key of ["assessmentSetId", "sessionId", "recordedAt"] as const) {
      if (!nonEmptyString(raw[key])) return `snapshot domain.assessments[${index}].${key} is invalid`;
    }
    if (!nonNegativeInteger(raw.assessmentRevision) || !isObject(raw.results)) return `snapshot domain.assessments[${index}] is invalid`;
    if (assessmentSetIds.has(raw.assessmentSetId as string)) return `snapshot domain.assessments[${index}].assessmentSetId is duplicated`;
    assessmentSetIds.add(raw.assessmentSetId as string);
    const assessmentError = validateAssessmentResults(raw.results as SnapshotObject);
    if (assessmentError) return assessmentError.replace("domain.assessments.results", `domain.assessments[${index}].results`);
  }
  const retests = requireObject(domain, "retests");
  if (!retests) return "snapshot domain.retests is invalid";
  const retestError = validateRetests(retests);
  if (retestError) return retestError;
  const training = requireObject(domain, "training");
  if (!training || !isObject(training.initialFeedback) || !isObject(training.currentSessionChoices) || typeof training.complete !== "boolean" || typeof training.planSaved !== "boolean") return "snapshot domain.training is invalid";
  if ((domain.history as unknown[]).some((item) => !Number.isInteger((item as SnapshotObject).sessionNumber) || ((item as SnapshotObject).sessionNumber as number) < 1)) return "snapshot domain.history item is invalid";
  return null;
}

function validateWorkflow(workflow: SnapshotObject): string | null {
  if (!nonNegativeInteger(workflow.stage) || (workflow.stage as number) > 5) return "snapshot workflow.stage is invalid";
  if (!["intake", "safety", "assessment", "treatment", "training", "summary"].includes(String(workflow.phase))) return "snapshot workflow.phase is invalid";
  for (const key of ["assessmentRevision", "treatmentPlanRevision", "pendingRetestCount"] as const) {
    if (!nonNegativeInteger(workflow[key])) return `snapshot workflow.${key} is invalid`;
  }
  if (!nonEmptyString(workflow.assessmentOwnerSessionId)) return "snapshot workflow.assessmentOwnerSessionId is invalid";
  for (const key of ["bilateralNeedsReferral", "midpointDecisionDone"] as const) {
    if (typeof workflow[key] !== "boolean") return `snapshot workflow.${key} is invalid`;
  }
  if (!Array.isArray(workflow.adverseConfirmedAssessmentIds)) return "snapshot workflow.adverseConfirmedAssessmentIds is invalid";
  if (workflow.adverseResponse !== null && workflow.adverseResponse !== undefined && !isObject(workflow.adverseResponse)) return "snapshot workflow.adverseResponse is invalid";
  return null;
}

function validateDraft(draft: SnapshotObject): string | null {
  for (const key of ["confirmedIntakeMulti", "treatmentCursor", "bilateralTreatmentSides", "bilateralRetestResponses", "initialRetest", "currentSession"] as const) {
    if (!isObject(draft[key])) return `snapshot draft.${key} is invalid`;
  }
  if (!nonNegativeInteger(draft.assessmentCursor)) return "snapshot draft.assessmentCursor is invalid";
  if (!stringArray(draft.selectedOptionalCandidateIds)) return "snapshot draft.selectedOptionalCandidateIds is invalid";
  const confirmed = draft.confirmedIntakeMulti as SnapshotObject;
  if (!Object.values(confirmed).every((item) => typeof item === "boolean")) return "snapshot draft.confirmedIntakeMulti is invalid";
  const cursor = draft.treatmentCursor as SnapshotObject;
  if (!nonNegativeInteger(cursor.target) || !nonNegativeInteger(cursor.candidate)) return "snapshot draft.treatmentCursor is invalid";
  const sides = draft.bilateralTreatmentSides as SnapshotObject;
  if (Object.values(sides).some((item) => !Array.isArray(item) || item.some((side) => !["左侧", "右侧"].includes(String(side))))) return "snapshot draft.bilateralTreatmentSides is invalid";
  const responses = draft.bilateralRetestResponses as SnapshotObject;
  if (Object.values(responses).some((item) => !["better", "same", "worse"].includes(String(item)))) return "snapshot draft.bilateralRetestResponses is invalid";
  const initial = draft.initialRetest as SnapshotObject;
  for (const key of ["postScore", "treatmentFinalScore", "finalScore"] as const) {
    if (!score(initial[key])) return `snapshot draft.initialRetest.${key} is invalid`;
  }
  for (const key of ["postScoreConfirmed", "ready", "treatmentFinalConfirmed", "trainingReadyForFinal", "finalConfirmed"] as const) {
    if (typeof initial[key] !== "boolean") return `snapshot draft.initialRetest.${key} is invalid`;
  }
  const initialRecordedAtKey = optionalFields(initial, ["treatmentFinalRecordedAt", "finalRecordedAt"], nonEmptyString);
  if (initialRecordedAtKey) return `snapshot draft.initialRetest.${initialRecordedAtKey} is invalid`;
  const current = draft.currentSession as SnapshotObject;
  if (typeof current.isLaterSession !== "boolean" || !["review", "treatment", "training", "summary"].includes(String(current.phase))) return "snapshot draft.currentSession is invalid";
  for (const key of ["reviewScore", "postScore", "finalScore"] as const) {
    if (!score(current[key])) return `snapshot draft.currentSession.${key} is invalid`;
  }
  if (!Array.isArray(current.scoreHistory) || !current.scoreHistory.every(score)) return "snapshot draft.currentSession.scoreHistory is invalid";
  const currentRecordedAtKey = optionalFields(current, ["finalRetestRecordedAt"], nonEmptyString);
  if (currentRecordedAtKey) return `snapshot draft.currentSession.${currentRecordedAtKey} is invalid`;
  return null;
}

function validateCrossSection(identity: SnapshotObject, domain: SnapshotObject, workflow: SnapshotObject): string | null {
  const threads = identity.problemThreads as unknown[];
  const sessions = identity.sessionIndex as unknown[];
  if (!threads.some((item) => isObject(item) && item.problemThreadId === identity.problemThreadId && item.caseId === identity.caseId)) {
    return "snapshot current problem thread is missing from identity.problemThreads";
  }
  if (!sessions.some((item) => isObject(item) && item.sessionId === identity.sessionId && item.problemThreadId === identity.problemThreadId && item.caseId === identity.caseId)) {
    return "snapshot current session is missing from identity.sessionIndex";
  }
  for (const [index, item] of (domain.assessments as unknown[]).entries()) {
    const assessment = item as SnapshotObject;
    if (!sessions.some((session) => isObject(session) && session.sessionId === assessment.sessionId && session.caseId === identity.caseId)) {
      return `snapshot domain.assessments[${index}] session is missing from identity.sessionIndex`;
    }
  }
  if (!(domain.assessments as unknown[]).some((item) => isObject(item)
    && item.sessionId === workflow.assessmentOwnerSessionId
    && item.assessmentRevision === workflow.assessmentRevision)) {
    return "snapshot current assessment set is missing";
  }
  for (const [index, item] of (domain.treatments as unknown[]).entries()) {
    const treatment = item as SnapshotObject;
    if (!sessions.some((session) => isObject(session)
      && session.sessionId === treatment.sessionId
      && session.sessionNumber === treatment.sessionNumber
      && session.caseId === identity.caseId)) {
      return `snapshot domain.treatments[${index}] session is missing from identity.sessionIndex`;
    }
  }
  const retests = domain.retests as SnapshotObject;
  for (const [index, item] of (retests.obligations as unknown[]).entries()) {
    const obligation = item as SnapshotObject;
    if (obligation.caseId !== identity.caseId || obligation.problemThreadId !== identity.problemThreadId
      || !sessions.some((session) => isObject(session) && session.sessionId === obligation.sessionId)) {
      return `snapshot domain.retests.obligations[${index}] identity is invalid`;
    }
  }
  for (const [index, item] of (retests.records as unknown[]).entries()) {
    const record = item as SnapshotObject;
    if (record.caseId !== identity.caseId || record.problemThreadId !== identity.problemThreadId
      || !sessions.some((session) => isObject(session) && session.sessionId === record.sessionId)) {
      return `snapshot domain.retests.records[${index}] identity is invalid`;
    }
  }
  const pending = (retests.obligations as unknown[]).filter((item) => isObject(item)
    && item.sessionId === identity.sessionId && item.required === true && item.status === "pending").length;
  if (workflow.pendingRetestCount !== pending) return "snapshot workflow.pendingRetestCount does not match domain.retests";
  return null;
}

/** v3 是一次干净切换：这里只校验 v3，不转换或补猜 v1/v2 数据。 */
export function validatePilotSnapshotV3(value: unknown, options: SnapshotBoundaryOptions = {}): SnapshotValidationResult {
  if (!isObject(value)) return { ok: false, reason: "snapshot must be an object" };
  if (jsonDepth(value) > 24) return { ok: false, reason: "snapshot is too deeply nested or cyclic" };
  if (value.schemaVersion !== PILOT_SNAPSHOT_SCHEMA_VERSION) return { ok: false, reason: "unsupported snapshot schema version; refresh the application" };
  if (value.contractRevision !== 2) return { ok: false, reason: "unsupported v3 contract revision; refresh the application" };
  const identity = requireObject(value, "identity");
  const domain = requireObject(value, "domain");
  const workflow = requireObject(value, "workflow");
  const draft = requireObject(value, "draft");
  if (!identity || !domain || !workflow || !draft) return { ok: false, reason: "snapshot v3 sections are incomplete" };
  const error = validateIdentity(identity)
    ?? validateDomain(domain, Boolean(options.requireConsent))
    ?? validateWorkflow(workflow)
    ?? validateDraft(draft)
    ?? validateCrossSection(identity, domain, workflow);
  if (error) return { ok: false, reason: error };
  return { ok: true, snapshot: value };
}

export function assertAndStampPilotSnapshotSchemaVersion(
  value: unknown,
  label: string,
  options: SnapshotBoundaryOptions = {},
): Record<string, unknown> {
  const validated = validatePilotSnapshotV3(value, options);
  if (!validated.ok) throw new PilotCaseValidationError(`${label} ${validated.reason}`);
  return validated.snapshot;
}
