export const PILOT_SOURCE_CHANNELS = [
  "douyin_fan_group",
  "douyin_comment",
  "xiaohongshu",
  "friend",
  "studio",
  "other",
] as const;

export type PilotSourceChannel = (typeof PILOT_SOURCE_CHANNELS)[number];
export type PilotCaseSourceChannel = PilotSourceChannel | "internal_test";
export type PilotSourceRecord = { channel: PilotCaseSourceChannel; detail: string | null };

export const PILOT_SOURCE_STORAGE_KEY = "rehabmind-pilot-source";
export const PILOT_SOURCE_DETAIL_MAX_LENGTH = 40;
export const PILOT_SOURCE_OPTIONS: ReadonlyArray<{ value: PilotSourceChannel; label: string }> = [
  { value: "douyin_fan_group", label: "抖音粉丝群" },
  { value: "douyin_comment", label: "抖音评论区" },
  { value: "xiaohongshu", label: "小红书" },
  { value: "friend", label: "朋友推荐" },
  { value: "studio", label: "悦舒工作室" },
  { value: "other", label: "其他" },
];

type SourceStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void };

export function parsePilotSourceRecord(value: unknown, options: { allowInternalTest?: boolean } = {}): PilotSourceRecord {
  if (!value || typeof value !== "object") throw new Error("source is required");
  const candidate = value as Record<string, unknown>;
  const isPublic = typeof candidate.channel === "string" && PILOT_SOURCE_CHANNELS.includes(candidate.channel as PilotSourceChannel);
  const isInternalTest = options.allowInternalTest === true && candidate.channel === "internal_test";
  if (!isPublic && !isInternalTest) {
    throw new Error("source channel is invalid");
  }
  const rawDetail = typeof candidate.detail === "string" ? candidate.detail.trim() : "";
  if (rawDetail.length > PILOT_SOURCE_DETAIL_MAX_LENGTH) throw new Error("source detail is too long");
  return {
    channel: candidate.channel as PilotCaseSourceChannel,
    detail: candidate.channel === "other" && rawDetail ? rawDetail : null,
  };
}

export function readPilotSource(storage: Pick<SourceStorage, "getItem">): PilotSourceRecord | null {
  try {
    const raw = storage.getItem(PILOT_SOURCE_STORAGE_KEY);
    return raw ? parsePilotSourceRecord(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writePilotSource(storage: Pick<SourceStorage, "setItem">, record: PilotSourceRecord): void {
  storage.setItem(PILOT_SOURCE_STORAGE_KEY, JSON.stringify(parsePilotSourceRecord(record)));
}
