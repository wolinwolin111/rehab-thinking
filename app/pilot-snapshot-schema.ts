export const PILOT_SNAPSHOT_SCHEMA_VERSION = 1;

type SnapshotObject = Record<string, unknown>;

export type SnapshotMigrationResult =
  | { ok: true; snapshot: SnapshotObject }
  | { ok: false; reason: string };

function isObject(value: unknown): value is SnapshotObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isNonNegativeInteger(value: unknown) {
  return Number.isInteger(value) && (value as number) >= 0;
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
  const schemaVersion = value.schemaVersion === undefined ? 1 : value.schemaVersion;
  if (schemaVersion !== 1) return { ok: false, reason: "unsupported snapshot schema version" };
  if (!isNonNegativeInteger(value.step) || (value.step as number) > 5) return { ok: false, reason: "invalid snapshot step" };
  if (!isObject(value.intake)) return { ok: false, reason: "snapshot intake is missing" };
  if (!isObject(value.safety)) return { ok: false, reason: "snapshot safety is missing" };
  for (const key of REQUIRED_OBJECTS) {
    if (!isObject(value[key])) return { ok: false, reason: `snapshot ${key} is missing` };
  }
  for (const key of REQUIRED_ARRAYS) {
    if (!Array.isArray(value[key])) return { ok: false, reason: `snapshot ${key} is missing` };
  }
  for (const key of REQUIRED_NUMBERS) {
    if (typeof value[key] !== "number" || !Number.isFinite(value[key])) return { ok: false, reason: `snapshot ${key} is invalid` };
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
  return { ok: true, snapshot: { ...value, schemaVersion: PILOT_SNAPSHOT_SCHEMA_VERSION } };
}
