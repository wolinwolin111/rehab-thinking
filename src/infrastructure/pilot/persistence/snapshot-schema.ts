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
  if (value.actionAnalysis !== undefined && value.actionAnalysis !== null && !isObject(value.actionAnalysis)) return "snapshot intake.actionAnalysis is invalid";
  return null;
}

function validateAssessmentResults(value: unknown): string | null {
  if (!isObject(value)) return "snapshot assessmentResults is missing";
  const yesNo = ["yes", "no"];
  for (const [id, raw] of Object.entries(value)) {
    if (!isObject(raw)) return `snapshot assessmentResults.${id} is invalid`;
    for (const key of ["discomfort", "passiveDiscomfort", "functionDiscomfort"] as const) {
      if (raw[key] !== undefined && !yesNo.includes(String(raw[key]))) return `snapshot assessmentResults.${id}.${key} is invalid`;
    }
    for (const key of ["symptomScore", "passiveSymptomScore", "pairedStrengthScore"] as const) {
      if (raw[key] !== undefined && !isScore(raw[key])) return `snapshot assessmentResults.${id}.${key} is invalid`;
    }
    for (const key of ["compensations", "tensionLocations", "discomfortLocations", "passiveDiscomfortLocations", "pairedStrengthLocations"] as const) {
      if (raw[key] !== undefined && !Array.isArray(raw[key])) return `snapshot assessmentResults.${id}.${key} is invalid`;
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
  if (!hasOnlyValues(value.safety, ["yes", "no"])) return "snapshot safety is invalid";
  for (const key of ["exerciseFeedback", "followupExerciseChoices", "followupTrends"] as const) {
    if (!isObject(value[key])) return `snapshot ${key} is invalid`;
  }
  if (value.sessionHistory !== undefined && !Array.isArray(value.sessionHistory)) return "snapshot sessionHistory is invalid";
  if (Array.isArray(value.sessionHistory) && value.sessionHistory.some((item) => !isObject(item) || !Number.isInteger(item.sessionNumber) || (item.sessionNumber as number) < 1)) {
    return "snapshot sessionHistory item is invalid";
  }
  return null;
}

function validateOptionalWorkflowFields(value: SnapshotObject): string | null {
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

export function migratePilotSnapshot(value: unknown): SnapshotMigrationResult {
  if (!isObject(value)) return { ok: false, reason: "snapshot must be an object" };
  if (jsonDepth(value) > 24) return { ok: false, reason: "snapshot is too deeply nested or cyclic" };
  const schemaVersion = value.schemaVersion === undefined ? 1 : value.schemaVersion;
  if (schemaVersion !== 1) return { ok: false, reason: "unsupported snapshot schema version" };
  if (!isNonNegativeInteger(value.step) || (value.step as number) > 5) return { ok: false, reason: "invalid snapshot step" };
  const intakeError = validateIntake(value.intake);
  if (intakeError) return { ok: false, reason: intakeError };
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
  return { ok: true, snapshot: { ...value, schemaVersion: PILOT_SNAPSHOT_SCHEMA_VERSION } };
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
