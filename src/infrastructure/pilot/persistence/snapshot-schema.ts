import { PilotCaseValidationError } from "@/src/infrastructure/pilot/api/case-contracts";
import { PILOT_CONSENT_VERSION } from "@/src/infrastructure/pilot/consent/consent-core";

/** REL-01：快照 schema 版本的唯一事实来源在 pilot-case-contracts，这里直接复用。 */
import { PILOT_SNAPSHOT_SCHEMA_VERSION } from "@/src/infrastructure/pilot/api/case-contracts";

export { PILOT_SNAPSHOT_SCHEMA_VERSION };

type SnapshotObject = Record<string, unknown>;

export type SnapshotMigrationResult =
  | { ok: true; snapshot: SnapshotObject }
  | { ok: false; reason: string };

type SnapshotBoundaryOptions = {
  requireConsent?: boolean;
};

function isObject(value: unknown): value is SnapshotObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function isNonNegativeInteger(value: unknown) {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isScore(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10;
}

function isStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function hasOnlyValues(value: unknown, allowed: readonly unknown[]) {
  return isObject(value) && Object.values(value).every((item) => allowed.includes(item));
}

function isMapOf(value: unknown, predicate: (item: unknown) => boolean) {
  return isObject(value) && Object.values(value).every(predicate);
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

function invalidOptionalFields(
  value: SnapshotObject,
  keys: readonly string[],
  predicate: (item: unknown) => boolean,
) {
  return keys.find((key) => value[key] !== undefined && !predicate(value[key]));
}

function validateIntake(value: unknown): string | null {
  if (!isObject(value)) return "snapshot intake is missing";
  if (typeof value.regionId !== "string") return "snapshot intake.regionId is invalid";
  const stringKey = invalidOptionalFields(value, [
    "description", "userRole", "examSetup", "productMode", "operationTarget", "spineAssessmentMode", "side",
    "prioritySide", "location", "onset", "mechanism", "symptomType", "forceDirection", "swellingLocation",
    "tendernessLocation", "sensoryLocation", "reproduction", "customAction", "professionalNotes",
    "stabbingSpread", "stabbingPalpation",
  ], (item) => typeof item === "string");
  if (stringKey) return `snapshot intake.${stringKey} is invalid`;
  const booleanKey = invalidOptionalFields(value, [
    "parsed", "capabilitiesConfirmed", "learningExplanation", "locationConfirmed", "painQualityConfirmed",
    "swellingLocationConfirmed", "tendernessLocationConfirmed", "sensoryLocationConfirmed",
    "actionSelectionConfirmed", "baselineScoreConfirmed",
  ], (item) => typeof item === "boolean");
  if (booleanKey) return `snapshot intake.${booleanKey} is invalid`;
  const arrayKey = invalidOptionalFields(value, [
    "bodyLocations", "symptoms", "provocationTypes", "swellingLocations", "tendernessLocations",
    "sensoryLocations", "reportedActions", "priorCare",
  ], Array.isArray);
  if (arrayKey) return `snapshot intake.${arrayKey} is invalid`;
  if (value.goal !== undefined && (!Number.isFinite(value.goal) || (value.goal as number) < 0)) return "snapshot intake.goal is invalid";
  if (value.baselineScore !== undefined && !isScore(value.baselineScore)) return "snapshot intake.baselineScore is invalid";
  if (value.capabilities !== undefined && !isObject(value.capabilities)) return "snapshot intake.capabilities is invalid";
  if (value.medicalGuidance !== undefined && !isObject(value.medicalGuidance)) return "snapshot intake.medicalGuidance is invalid";
  if (isObject(value.medicalGuidance)) {
    if (typeof value.medicalGuidance.reviewedByClinician !== "boolean") return "snapshot intake.medicalGuidance.reviewedByClinician is invalid";
    if (!["none-reported", "restricted", "cleared", "unknown"].includes(String(value.medicalGuidance.restrictionState))) return "snapshot intake.medicalGuidance.restrictionState is invalid";
  }
  if (value.actionAnalysis !== undefined && value.actionAnalysis !== null && !isObject(value.actionAnalysis)) return "snapshot intake.actionAnalysis is invalid";
  return null;
}

function validateAssessmentResults(value: unknown): string | null {
  if (!isObject(value)) return "snapshot assessmentResults is missing";
  const yesNo = ["yes", "no"];
  for (const [id, raw] of Object.entries(value)) {
    if (!isObject(raw)) return `snapshot assessmentResults.${id} is invalid`;
    if (raw.bilateralSideResults !== undefined) {
      if (!isObject(raw.bilateralSideResults)) return `snapshot assessmentResults.${id}.bilateralSideResults is invalid`;
      const sideKeys = Object.keys(raw.bilateralSideResults);
      if (sideKeys.some((key) => !["左侧", "右侧"].includes(key))) return `snapshot assessmentResults.${id}.bilateralSideResults is invalid`;
      if (Object.values(raw.bilateralSideResults).some((result) => !["normal", "limited"].includes(String(result)))) return `snapshot assessmentResults.${id}.bilateralSideResults is invalid`;
    }
    for (const key of ["discomfort", "passiveDiscomfort", "functionDiscomfort"] as const) {
      if (raw[key] !== undefined && !yesNo.includes(String(raw[key]))) return `snapshot assessmentResults.${id}.${key} is invalid`;
    }
    for (const key of ["symptomScore", "passiveSymptomScore", "pairedStrengthScore"] as const) {
      if (raw[key] !== undefined && !isScore(raw[key])) return `snapshot assessmentResults.${id}.${key} is invalid`;
    }
    if (raw.passiveMeasuredAngle !== undefined && typeof raw.passiveMeasuredAngle !== "string") return `snapshot assessmentResults.${id}.passiveMeasuredAngle is invalid`;
    if (raw.passiveMeasuredAngleDeg !== undefined && (typeof raw.passiveMeasuredAngleDeg !== "number" || !Number.isFinite(raw.passiveMeasuredAngleDeg) || raw.passiveMeasuredAngleDeg < 0 || raw.passiveMeasuredAngleDeg > 360)) return `snapshot assessmentResults.${id}.passiveMeasuredAngleDeg is invalid`;
    if (raw.passiveRangeMeasurement !== undefined) {
      if (!isObject(raw.passiveRangeMeasurement)) return `snapshot assessmentResults.${id}.passiveRangeMeasurement is invalid`;
      for (const key of ["measurementId", "actionId", "side", "mode", "method", "recordedAt"] as const) {
        if (typeof raw.passiveRangeMeasurement[key] !== "string" || !raw.passiveRangeMeasurement[key]) return `snapshot assessmentResults.${id}.passiveRangeMeasurement.${key} is invalid`;
      }
      if (!["active", "passive"].includes(String(raw.passiveRangeMeasurement.mode))) return `snapshot assessmentResults.${id}.passiveRangeMeasurement.mode is invalid`;
      if (!["estimated", "goniometer", "other"].includes(String(raw.passiveRangeMeasurement.method))) return `snapshot assessmentResults.${id}.passiveRangeMeasurement.method is invalid`;
      if (typeof raw.passiveRangeMeasurement.valueDeg !== "number" || !Number.isFinite(raw.passiveRangeMeasurement.valueDeg) || raw.passiveRangeMeasurement.valueDeg < 0 || raw.passiveRangeMeasurement.valueDeg > 360) return `snapshot assessmentResults.${id}.passiveRangeMeasurement.valueDeg is invalid`;
    }
    for (const key of ["compensations", "tensionLocations", "discomfortLocations", "passiveDiscomfortLocations", "pairedStrengthLocations"] as const) {
      if (raw[key] !== undefined && !Array.isArray(raw[key])) return `snapshot assessmentResults.${id}.${key} is invalid`;
    }
  }
  return null;
}

function validateBodyMarks(value: unknown): string | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return "snapshot bodyMarks is invalid";
  for (const [index, raw] of value.entries()) {
    if (!isObject(raw)) return `snapshot bodyMarks[${index}] is invalid`;
    for (const key of ["markId", "caseId", "problemThreadId", "sessionId", "symptomKind", "side", "regionId", "areaId", "surface", "humanLabel", "source", "status", "createdAt", "coordinateCompleteness"] as const) {
      if (typeof raw[key] !== "string" || !raw[key]) return `snapshot bodyMarks[${index}].${key} is invalid`;
    }
    if (!["complaint", "swelling", "bruise", "tenderness", "sensory"].includes(String(raw.symptomKind))) return `snapshot bodyMarks[${index}].symptomKind is invalid`;
    if (!["left", "right", "midline", "bilateral"].includes(String(raw.side))) return `snapshot bodyMarks[${index}].side is invalid`;
    if (!["suggested", "confirmed", "invalidated"].includes(String(raw.status))) return `snapshot bodyMarks[${index}].status is invalid`;
    if (!["point", "zone-only"].includes(String(raw.coordinateCompleteness))) return `snapshot bodyMarks[${index}].coordinateCompleteness is invalid`;
    for (const key of ["xNormalized", "yNormalized"] as const) {
      if (raw[key] !== undefined && (typeof raw[key] !== "number" || !Number.isFinite(raw[key]) || raw[key] < 0 || raw[key] > 1)) return `snapshot bodyMarks[${index}].${key} is invalid`;
    }
  }
  return null;
}

function validateScoreRecords(value: unknown): string | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return "snapshot scoreRecords is invalid";
  const states = ["unselected", "confirmed", "superseded", "not-applicable"];
  const stages = ["intake", "assessment", "treatment-retest", "training-retest", "followup"];
  const sides = ["left", "right", "bilateral", "midline"];
  for (const [index, raw] of value.entries()) {
    if (!isObject(raw)) return `snapshot scoreRecords[${index}] is invalid`;
    for (const key of ["scoreRecordId", "caseId", "problemThreadId", "sessionId", "stage", "context", "scaleVersion", "source", "recordedAt"] as const) {
      if (typeof raw[key] !== "string" || !raw[key]) return `snapshot scoreRecords[${index}].${key} is invalid`;
    }
    if (!isNonNegativeInteger(raw.assessmentRevision)) return `snapshot scoreRecords[${index}].assessmentRevision is invalid`;
    if (!states.includes(String(raw.scoreState))) return `snapshot scoreRecords[${index}].scoreState is invalid`;
    if (!stages.includes(String(raw.stage))) return `snapshot scoreRecords[${index}].stage is invalid`;
    if (raw.side !== undefined && !sides.includes(String(raw.side))) return `snapshot scoreRecords[${index}].side is invalid`;
    if (raw.value !== undefined && !isScore(raw.value)) return `snapshot scoreRecords[${index}].value is invalid`;
    if (raw.scoreState === "confirmed" && !isScore(raw.value)) return `snapshot scoreRecords[${index}].value is required for confirmed score`;
    if (raw.scoreState === "unselected" && raw.value !== undefined) return `snapshot scoreRecords[${index}].value must be absent for unselected score`;
    if (raw.supersedesScoreRecordId !== undefined && (typeof raw.supersedesScoreRecordId !== "string" || !raw.supersedesScoreRecordId)) return `snapshot scoreRecords[${index}].supersedesScoreRecordId is invalid`;
    if (raw.scaleVersion !== "nrs-0-10-v1") return `snapshot scoreRecords[${index}].scaleVersion is invalid`;
    if (!["user", "professional", "legacy-migrated"].includes(String(raw.source))) return `snapshot scoreRecords[${index}].source is invalid`;
  }
  return null;
}

function validateSpecialTestRecords(value: unknown): string | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return "snapshot specialTestRecords is invalid";
  const results = ["negative", "positive", "painful-indeterminate", "not-tested", "stopped"];
  const familiar = ["yes", "no", "unsure", "not-applicable"];
  const stopReasons = ["pain", "fear", "cannot-perform", "safety-signal", "equipment", "other"];
  for (const [index, raw] of value.entries()) {
    if (!isObject(raw)) return `snapshot specialTestRecords[${index}] is invalid`;
    for (const key of ["specialTestRecordId", "assessmentId", "capabilitySnapshotId", "operationTarget", "result", "familiarSymptom", "recordedAt"] as const) {
      if (typeof raw[key] !== "string" || !raw[key]) return `snapshot specialTestRecords[${index}].${key} is invalid`;
    }
    if (!isObject(raw.triggerSnapshot) || typeof raw.triggerSnapshot.ruleId !== "string" || !isStringArray(raw.triggerSnapshot.matchedEvidenceIds)) return `snapshot specialTestRecords[${index}].triggerSnapshot is invalid`;
    if (!["self", "other", "study"].includes(String(raw.operationTarget))) return `snapshot specialTestRecords[${index}].operationTarget is invalid`;
    if (!results.includes(String(raw.result))) return `snapshot specialTestRecords[${index}].result is invalid`;
    if (!familiar.includes(String(raw.familiarSymptom))) return `snapshot specialTestRecords[${index}].familiarSymptom is invalid`;
    if (raw.stopReason !== undefined && !stopReasons.includes(String(raw.stopReason))) return `snapshot specialTestRecords[${index}].stopReason is invalid`;
    if (raw.note !== undefined && typeof raw.note !== "string") return `snapshot specialTestRecords[${index}].note is invalid`;
  }
  return null;
}

function validateProfessionalNoteRecords(value: unknown): string | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return "snapshot professionalNoteRecords is invalid";
  for (const [index, raw] of value.entries()) {
    if (!isObject(raw)) return `snapshot professionalNoteRecords[${index}] is invalid`;
    for (const key of ["noteId", "caseId", "problemThreadId", "sessionId", "authorType", "text", "createdAt", "updatedAt"] as const) {
      if (typeof raw[key] !== "string" || !raw[key]) return `snapshot professionalNoteRecords[${index}].${key} is invalid`;
    }
    if (!["professional", "owner"].includes(String(raw.authorType))) return `snapshot professionalNoteRecords[${index}].authorType is invalid`;
    if (raw.supersedesNoteId !== undefined && (typeof raw.supersedesNoteId !== "string" || !raw.supersedesNoteId)) return `snapshot professionalNoteRecords[${index}].supersedesNoteId is invalid`;
  }
  return null;
}

function validateDecisionTraces(value: unknown): string | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return "snapshot decisionTraces is invalid";
  for (const [index, raw] of value.entries()) {
    if (!isObject(raw)) return `snapshot decisionTraces[${index}] is invalid`;
    for (const key of ["traceId", "caseId", "problemThreadId", "sessionId", "knowledgeVersion", "decisionVersion", "recordedAt"] as const) {
      if (typeof raw[key] !== "string" || !raw[key]) return `snapshot decisionTraces[${index}].${key} is invalid`;
    }
    for (const key of ["findingIds", "relationIds", "ruleIds", "sourceCaseIds"] as const) {
      if (!isStringArray(raw[key])) return `snapshot decisionTraces[${index}].${key} is invalid`;
    }
  }
  return null;
}

function validateHistoryProjection(value: SnapshotObject): string | null {
  if (value.problemThreads !== undefined) {
    if (!Array.isArray(value.problemThreads)) return "snapshot problemThreads is invalid";
    for (const [index, raw] of value.problemThreads.entries()) {
      if (!isObject(raw)) return `snapshot problemThreads[${index}] is invalid`;
      for (const key of ["problemThreadId", "caseId", "status", "createdAt", "lastActiveAt"] as const) {
        if (typeof raw[key] !== "string" || !raw[key]) return `snapshot problemThreads[${index}].${key} is invalid`;
      }
      if (!["active", "resolved", "archived", "superseded"].includes(String(raw.status))) return `snapshot problemThreads[${index}].status is invalid`;
      for (const key of ["regionId", "location", "title", "closedAt", "supersedesProblemThreadId"] as const) {
        if (raw[key] !== undefined && (typeof raw[key] !== "string" || !raw[key])) return `snapshot problemThreads[${index}].${key} is invalid`;
      }
    }
  }
  if (value.sessionIndex !== undefined) {
    if (!Array.isArray(value.sessionIndex)) return "snapshot sessionIndex is invalid";
    for (const [index, raw] of value.sessionIndex.entries()) {
      if (!isObject(raw)) return `snapshot sessionIndex[${index}] is invalid`;
      for (const key of ["sessionId", "problemThreadId", "caseId", "status", "startedAt"] as const) {
        if (typeof raw[key] !== "string" || !raw[key]) return `snapshot sessionIndex[${index}].${key} is invalid`;
      }
      if (!Number.isInteger(raw.sessionNumber) || (raw.sessionNumber as number) < 1) return `snapshot sessionIndex[${index}].sessionNumber is invalid`;
      if (!["draft", "completed", "abandoned"].includes(String(raw.status))) return `snapshot sessionIndex[${index}].status is invalid`;
      for (const key of ["lastDraftSavedAt", "completedAt", "completionReason", "location"] as const) {
        if (raw[key] !== undefined && (typeof raw[key] !== "string" || !raw[key])) return `snapshot sessionIndex[${index}].${key} is invalid`;
      }
    }
  }
  return null;
}

function validateTrialRecords(value: unknown, label: "trialRecords" | "followupTrialRecords"): string | null {
  if (!Array.isArray(value)) return `snapshot ${label} is missing`;
  for (const [index, raw] of value.entries()) {
    if (!isObject(raw)) return `snapshot ${label}[${index}] is invalid`;
    for (const key of ["candidateId", "candidateTitle"] as const) {
      if (typeof raw[key] !== "string" || !raw[key]) return `snapshot ${label}[${index}].${key} is invalid`;
    }
    if (label === "trialRecords" && (typeof raw.targetId !== "string" || !raw.targetId)) {
      return `snapshot ${label}[${index}].targetId is invalid`;
    }
    if (raw.result !== undefined && !["better", "partial", "same", "worse"].includes(String(raw.result))) {
      return `snapshot ${label}[${index}].result is invalid`;
    }
    for (const key of ["beforeScore", "afterScore"] as const) {
      if (!isScore(raw[key])) return `snapshot ${label}[${index}].${key} is invalid`;
    }
    for (const key of ["decisionTraceId", "beforeScoreRecordId", "afterScoreRecordId"] as const) {
      if (raw[key] !== undefined && (typeof raw[key] !== "string" || !raw[key])) return `snapshot ${label}[${index}].${key} is invalid`;
    }
    if (label === "trialRecords" && !["smoother", "same", "worse"].includes(String(raw.movement))) {
      return `snapshot ${label}[${index}].movement is invalid`;
    }
  }
  return null;
}

function validateSnapshotCollections(value: SnapshotObject): string | null {
  if (!isStringArray(value.imaging)) return "snapshot imaging is invalid";
  if (!Array.isArray(value.followupScoreHistory) || !value.followupScoreHistory.every(isScore)) return "snapshot followupScoreHistory is invalid";
  const trialError = validateTrialRecords(value.trialRecords, "trialRecords")
    ?? validateTrialRecords(value.followupTrialRecords, "followupTrialRecords");
  if (trialError) return trialError;
  const scoreError = validateScoreRecords(value.scoreRecords);
  if (scoreError) return scoreError;
  const specialTestError = validateSpecialTestRecords(value.specialTestRecords);
  if (specialTestError) return specialTestError;
  const noteError = validateProfessionalNoteRecords(value.professionalNoteRecords);
  if (noteError) return noteError;
  const traceError = validateDecisionTraces(value.decisionTraces);
  if (traceError) return traceError;
  const historyError = validateHistoryProjection(value);
  if (historyError) return historyError;
  if (!hasOnlyValues(value.safety, ["yes", "no"])) return "snapshot safety is invalid";
  for (const key of ["exerciseFeedback", "followupExerciseChoices", "followupTrends"] as const) {
    if (!isObject(value[key])) return `snapshot ${key} is invalid`;
  }
  for (const key of ["sessionHistory", "archivedSessionHistory"] as const) {
    if (value[key] !== undefined && !Array.isArray(value[key])) return `snapshot ${key} is invalid`;
    if (Array.isArray(value[key]) && value[key].some((item) => !isObject(item) || !Number.isInteger(item.sessionNumber) || (item.sessionNumber as number) < 1)) {
      return `snapshot ${key} item is invalid`;
    }
  }
  return null;
}

function validateOptionalWorkflowFields(value: SnapshotObject): string | null {
  const identityStringKey = invalidOptionalFields(value, ["localCaseId", "problemThreadId", "sessionId", "capabilitySnapshotId", "sessionStartedAt", "draftSavedAt", "completedAt"], (item) => typeof item === "string" && Boolean(item.trim()));
  if (identityStringKey) return `snapshot ${identityStringKey} is invalid`;
  if (value.sessionStatus !== undefined && !["draft", "completed", "abandoned"].includes(String(value.sessionStatus))) return "snapshot sessionStatus is invalid";
  const booleanKey = invalidOptionalFields(value, [
    "bilateralNeedsReferral", "midpointDecisionDone", "postScoreConfirmed", "readyToRetest",
    "trainingPlanSaved", "treatmentFinalRetestConfirmed", "trainingReadyForFinalRetest",
    "finalRetestConfirmed", "followupScoreConfirmed", "followupPostScoreConfirmed",
    "followupReadyToRetest", "followupTrainingReadyForRetest", "followupFinalScoreConfirmed",
  ], (item) => typeof item === "boolean");
  if (booleanKey) return `snapshot ${booleanKey} is invalid`;
  const scoreKey = invalidOptionalFields(value, [
    "treatmentFinalRetestScore", "finalRetestScore", "followupFinalScore",
  ], isScore);
  if (scoreKey) return `snapshot ${scoreKey} is invalid`;
  const revisionKey = invalidOptionalFields(value, ["assessmentRevision", "treatmentPlanRevision"], isNonNegativeInteger);
  if (revisionKey) return `snapshot ${revisionKey} is invalid`;
  const stringArrayKey = invalidOptionalFields(value, ["selectedOptionalCandidateIds", "followupTensionLocations", "adverseConfirmedAssessmentIds"], isStringArray);
  if (stringArrayKey) return `snapshot ${stringArrayKey} is invalid`;
  if (value.confirmedIntakeMulti !== undefined && !isMapOf(value.confirmedIntakeMulti, (item) => typeof item === "boolean")) return "snapshot confirmedIntakeMulti is invalid";
  if (value.boneRisk !== undefined && !hasOnlyValues(value.boneRisk, ["yes", "no", "unsure"])) return "snapshot boneRisk is invalid";
  if (value.bilateralTreatmentSides !== undefined && !isMapOf(value.bilateralTreatmentSides, isStringArray)) return "snapshot bilateralTreatmentSides is invalid";
  if (value.bilateralRetestResponses !== undefined && !hasOnlyValues(value.bilateralRetestResponses, ["better", "same", "worse"])) return "snapshot bilateralRetestResponses is invalid";
  if (value.postDiscomfort !== undefined && !["", "yes", "no"].includes(String(value.postDiscomfort))) return "snapshot postDiscomfort is invalid";
  if (value.followupPostDiscomfort !== undefined && !["", "yes", "no"].includes(String(value.followupPostDiscomfort))) return "snapshot followupPostDiscomfort is invalid";
  const hasNewSymptom = value.hasNewSymptom;
  if (hasNewSymptom !== undefined && typeof hasNewSymptom !== "boolean" && !["", "yes", "no"].includes(String(hasNewSymptom))) return "snapshot hasNewSymptom is invalid";
  const movementAnswers = ["both-match", "passive-match-active-limited", "better-passive-limited", "passive-limited", "worse"];
  if (value.movementResponses !== undefined && !isMapOf(value.movementResponses, (item) => movementAnswers.includes(String(item)))) return "snapshot movementResponses is invalid";
  if (value.followupMovementResponses !== undefined && !isMapOf(value.followupMovementResponses, (item) => movementAnswers.includes(String(item)))) return "snapshot followupMovementResponses is invalid";
  for (const key of ["movementDiscomforts", "followupMovementDiscomforts"] as const) {
    if (value[key] !== undefined && !hasOnlyValues(value[key], ["yes", "no"])) return `snapshot ${key} is invalid`;
  }
  for (const key of ["movementScores", "followupMovementScores"] as const) {
    if (value[key] !== undefined && !isMapOf(value[key], isScore)) return `snapshot ${key} is invalid`;
  }
  for (const key of ["movementScoreConfirmed", "followupMovementScoreConfirmed"] as const) {
    if (value[key] !== undefined && !isMapOf(value[key], (item) => typeof item === "boolean")) return `snapshot ${key} is invalid`;
  }
  for (const key of ["retestPlan", "followupRetestPlan"] as const) {
    if (value[key] !== undefined && value[key] !== null && !isObject(value[key])) return `snapshot ${key} is invalid`;
  }
  if (value.adverseResponse !== undefined && value.adverseResponse !== null && !isObject(value.adverseResponse)) return "snapshot adverseResponse is invalid";
  return null;
}

const REQUIRED_OBJECTS = [
  "intake",
  "safety",
  "assessmentResults",
  "exerciseFeedback",
  "followupExerciseChoices",
  "followupTrends",
];

const REQUIRED_ARRAYS = [
  "imaging",
  "trialRecords",
  "followupScoreHistory",
  "followupTrialRecords",
];

const REQUIRED_NUMBERS = [
  "step",
  "assessmentIndex",
  "trialTargetIndex",
  "candidateIndex",
  "postScore",
  "sessionNumber",
  "followupScore",
  "followupPostScore",
];

const REQUIRED_BOOLEANS = ["trainingComplete", "followupMode"];

function migrateHistoryProjection(value: SnapshotObject): SnapshotObject {
  const caseId = typeof value.localCaseId === "string" && value.localCaseId.trim() ? value.localCaseId : "legacy-case";
  const activeThreadId = typeof value.problemThreadId === "string" && value.problemThreadId.trim()
    ? value.problemThreadId
    : `thread-legacy-${caseId}`;
  const threadCreatedAt = typeof value.sessionStartedAt === "string" && value.sessionStartedAt.trim()
    ? value.sessionStartedAt
    : new Date(0).toISOString();
  const existingThreads = Array.isArray(value.problemThreads) ? value.problemThreads : [];
  const problemThreads = existingThreads.length
    ? [...existingThreads]
    : [{
        problemThreadId: activeThreadId,
        caseId,
        status: "active",
        createdAt: threadCreatedAt,
        lastActiveAt: typeof value.draftSavedAt === "string" && value.draftSavedAt.trim() ? value.draftSavedAt : threadCreatedAt,
        regionId: isObject(value.intake) ? nonEmptyString(value.intake.regionId) : undefined,
        location: isObject(value.intake) ? nonEmptyString(value.intake.location) : undefined,
      }];
  const archived = Array.isArray(value.archivedSessionHistory) ? value.archivedSessionHistory : [];
  const archivedThreadId = `thread-legacy-archived-${caseId}`;
  if (archived.length && !problemThreads.some((thread) => isObject(thread) && thread.problemThreadId === archivedThreadId)) {
    problemThreads.push({
      problemThreadId: archivedThreadId,
      caseId,
      status: "archived",
      createdAt: nonEmptyString(archived[0]?.completedAt) ?? threadCreatedAt,
      lastActiveAt: nonEmptyString(archived.at(-1)?.completedAt) ?? threadCreatedAt,
      closedAt: nonEmptyString(archived.at(-1)?.completedAt) ?? threadCreatedAt,
      title: "旧版历史档案",
    });
  }
  const existingIndex = Array.isArray(value.sessionIndex) ? [...value.sessionIndex] : [];
  const sessionIndex = existingIndex.length ? existingIndex : [];
  const addSummary = (summary: unknown, fallbackThreadId: string) => {
    if (!isObject(summary) || !Number.isInteger(summary.sessionNumber) || (summary.sessionNumber as number) < 1) return;
    const sessionNumber = summary.sessionNumber as number;
    const sessionId = typeof summary.sessionId === "string" && summary.sessionId.trim()
      ? summary.sessionId
      : `session-legacy-${caseId}-${sessionNumber}`;
    if (sessionIndex.some((item) => isObject(item) && item.sessionId === sessionId)) return;
    sessionIndex.push({
      sessionId,
      problemThreadId: typeof summary.problemThreadId === "string" && summary.problemThreadId.trim() ? summary.problemThreadId : fallbackThreadId,
      caseId,
      sessionNumber,
      status: summary.status === "abandoned" ? "abandoned" : summary.status === "draft" ? "draft" : summary.completedAt ? "completed" : "draft",
      startedAt: typeof summary.startedAt === "string" && summary.startedAt.trim() ? summary.startedAt : typeof summary.completedAt === "string" && summary.completedAt.trim() ? summary.completedAt : threadCreatedAt,
      lastDraftSavedAt: nonEmptyString(summary.lastDraftSavedAt),
      completedAt: nonEmptyString(summary.completedAt),
      completionReason: nonEmptyString(summary.completionReason),
      location: nonEmptyString(summary.location),
    });
  };
  if (!existingIndex.length) {
    (Array.isArray(value.sessionHistory) ? value.sessionHistory : []).forEach((summary) => addSummary(summary, activeThreadId));
    archived.forEach((summary) => addSummary(summary, archivedThreadId));
    addSummary({
      sessionId: value.sessionId,
      problemThreadId: activeThreadId,
      sessionNumber: value.sessionNumber,
      status: value.sessionStatus,
      startedAt: value.sessionStartedAt,
      lastDraftSavedAt: value.draftSavedAt,
      completedAt: value.completedAt,
      completionReason: value.completionReason,
      location: isObject(value.intake) ? nonEmptyString(value.intake.location) : undefined,
    }, activeThreadId);
  }
  return { ...value, problemThreads, sessionIndex };
}

export function migratePilotSnapshot(value: unknown): SnapshotMigrationResult {
  if (!isObject(value)) return { ok: false, reason: "snapshot must be an object" };
  if (jsonDepth(value) > 24) return { ok: false, reason: "snapshot is too deeply nested or cyclic" };
  const schemaVersion = value.schemaVersion === undefined ? 1 : value.schemaVersion;
  if (schemaVersion !== 1 && schemaVersion !== PILOT_SNAPSHOT_SCHEMA_VERSION) return { ok: false, reason: "unsupported snapshot schema version" };
  if (!isNonNegativeInteger(value.step) || (value.step as number) > 5) return { ok: false, reason: "invalid snapshot step" };
  const intakeError = validateIntake(value.intake);
  if (intakeError) return { ok: false, reason: intakeError };
  const bodyMarkError = validateBodyMarks(value.bodyMarks);
  if (bodyMarkError) return { ok: false, reason: bodyMarkError };
  if (!isObject(value.safety)) return { ok: false, reason: "snapshot safety is missing" };
  for (const key of REQUIRED_OBJECTS) {
    if (!isObject(value[key])) return { ok: false, reason: `snapshot ${key} is missing` };
  }
  for (const key of REQUIRED_ARRAYS) {
    if (!Array.isArray(value[key])) return { ok: false, reason: `snapshot ${key} is missing` };
  }
  for (const key of REQUIRED_NUMBERS) {
    if (!isNonNegativeInteger(value[key])) return { ok: false, reason: `snapshot ${key} is invalid` };
  }
  if ((value.sessionNumber as number) < 1) return { ok: false, reason: "snapshot sessionNumber is invalid" };
  for (const key of ["postScore", "followupScore", "followupPostScore"] as const) {
    if (!isScore(value[key])) return { ok: false, reason: `snapshot ${key} is invalid` };
  }
  for (const key of REQUIRED_BOOLEANS) {
    if (typeof value[key] !== "boolean") return { ok: false, reason: `snapshot ${key} is invalid` };
  }
  if (typeof value.movementResponse !== "string" || typeof value.followupCandidateId !== "string") {
    return { ok: false, reason: "snapshot movement or follow-up fields are invalid" };
  }
  if (!isObject(value.followupTrends) || !["review", "treatment", "training", "summary"].includes(String(value.followupStage))) {
    return { ok: false, reason: "snapshot follow-up stage is invalid" };
  }
  const assessmentError = validateAssessmentResults(value.assessmentResults);
  if (assessmentError) return { ok: false, reason: assessmentError };
  const collectionError = validateSnapshotCollections(value);
  if (collectionError) return { ok: false, reason: collectionError };
  const optionalError = validateOptionalWorkflowFields(value);
  if (optionalError) return { ok: false, reason: optionalError };
  return {
    ok: true,
    snapshot: {
      ...migrateHistoryProjection(value),
      schemaVersion: PILOT_SNAPSHOT_SCHEMA_VERSION,
      ...(schemaVersion === 1 ? { legacySchemaVersion: 1 } : {}),
    },
  };
}

/**
 * REL-01：仅校验快照的 schema 版本兼容性（结构深校验由 DATA-05 负责）。
 * - 缺失视为 v1（历史客户端），入库时补烙显式版本；
 * - 出现不受支持的版本立即拒绝，避免不兼容数据进入存储。
 * 返回可直接序列化的规范化载荷。
 */
export function assertAndStampPilotSnapshotSchemaVersion(
  value: unknown,
  label: string,
  options: SnapshotBoundaryOptions = {},
): Record<string, unknown> {
  const migrated = migratePilotSnapshot(value);
  if (!migrated.ok) throw new PilotCaseValidationError(`${label} ${migrated.reason}`);
  const consent = migrated.snapshot.consent;
  const validConsent = isObject(consent)
    && typeof consent.version === "string"
    && consent.version === PILOT_CONSENT_VERSION
    && typeof consent.confirmedAt === "string"
    && Number.isFinite(Date.parse(consent.confirmedAt));
  if (consent !== undefined && !validConsent) throw new PilotCaseValidationError(`${label} consent record is invalid`);
  if (options.requireConsent && !validConsent) throw new PilotCaseValidationError(`${label} consent record is required`);
  return migrated.snapshot;
}
