export const SNAPSHOT_FRESHNESS_THRESHOLDS = Object.freeze({
  reminderMs: 24 * 60 * 60 * 1000,
  reconfirmationMs: 7 * 24 * 60 * 60 * 1000,
});

export type SnapshotFreshnessBand = "fresh" | "stale" | "very-stale" | "unknown";

export type SnapshotFreshness = {
  ageMs: number | null;
  ageHours: number | null;
  ageDays: number | null;
  band: SnapshotFreshnessBand;
  showReminder: boolean;
  requiresReconfirmation: boolean;
};

type TimeValue = string | number | Date | undefined | null;

function timestampOf(value: TimeValue) {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

/** 返回非负的实际经过时间；时间缺失或来自未来时按未知处理。 */
export function snapshotAgeMs(savedAt: TimeValue, now: TimeValue) {
  const savedTimestamp = timestampOf(savedAt);
  const nowTimestamp = timestampOf(now);
  if (savedTimestamp === null || nowTimestamp === null || savedTimestamp > nowTimestamp) return null;
  return nowTimestamp - savedTimestamp;
}

export function classifySnapshotFreshness(input: {
  savedAt: TimeValue;
  now: TimeValue;
  timeSensitive: boolean;
}): SnapshotFreshness {
  const ageMs = snapshotAgeMs(input.savedAt, input.now);
  const band: SnapshotFreshnessBand = ageMs === null
    ? "unknown"
    : ageMs < SNAPSHOT_FRESHNESS_THRESHOLDS.reminderMs
      ? "fresh"
      : ageMs < SNAPSHOT_FRESHNESS_THRESHOLDS.reconfirmationMs
        ? "stale"
        : "very-stale";
  return {
    ageMs,
    ageHours: ageMs === null ? null : Math.floor(ageMs / (60 * 60 * 1000)),
    ageDays: ageMs === null ? null : Math.floor(ageMs / (24 * 60 * 60 * 1000)),
    band,
    showReminder: band !== "fresh",
    requiresReconfirmation: input.timeSensitive && (band === "very-stale" || band === "unknown"),
  };
}

export function isTimeSensitiveOnset(onset?: string) {
  return ["今天或昨天", "2～7天"].includes(onset ?? "");
}

export function formatSnapshotAge(freshness: SnapshotFreshness) {
  if (freshness.ageDays !== null && freshness.ageDays >= 1) return `${freshness.ageDays}天`;
  if (freshness.ageHours !== null && freshness.ageHours >= 1) return `${freshness.ageHours}小时`;
  if (freshness.ageMs !== null) return "不到1小时";
  return "时间不明";
}
