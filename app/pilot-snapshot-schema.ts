import { PilotCaseValidationError } from "./pilot-case-contracts";

/** REL-01：快照 schema 版本的唯一事实来源在 pilot-case-contracts，这里直接复用。 */
import { PILOT_SNAPSHOT_SCHEMA_VERSION } from "./pilot-case-contracts";

export { PILOT_SNAPSHOT_SCHEMA_VERSION };

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

/**
 * REL-01：仅校验快照的 schema 版本兼容性（结构深校验由 DATA-05 负责）。
 * - 缺失视为 v1（历史客户端），入库时补烙显式版本；
 * - 出现不受支持的版本立即拒绝，避免不兼容数据进入存储。
 * 返回可直接序列化的规范化载荷。
 */
export function assertAndStampPilotSnapshotSchemaVersion(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const raw = value as Record<string, unknown>;
  const version = raw.schemaVersion === undefined ? 1 : raw.schemaVersion;
  if (version !== PILOT_SNAPSHOT_SCHEMA_VERSION) {
    throw new PilotCaseValidationError(
      `${label} schema version ${String(version)} is not supported (supported: ${PILOT_SNAPSHOT_SCHEMA_VERSION})`,
    );
  }
  return { ...raw, schemaVersion: PILOT_SNAPSHOT_SCHEMA_VERSION };
}
