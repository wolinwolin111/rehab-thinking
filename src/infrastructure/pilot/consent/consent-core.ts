export const PILOT_CONSENT_VERSION = "pilot-consent-v1";
export const PILOT_CONSENT_STORAGE_KEY = "rehabmind-pilot-consent";

export type PilotConsentRecord = {
  version: string;
  confirmedAt: string;
};

type ConsentStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function buildPilotConsentRecord(confirmedAt: string): PilotConsentRecord {
  return parsePilotConsentRecord({ version: PILOT_CONSENT_VERSION, confirmedAt });
}

export function parsePilotConsentRecord(value: unknown): PilotConsentRecord {
  if (!value || typeof value !== "object") throw new Error("consent is required");
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== PILOT_CONSENT_VERSION) throw new Error("consent version is invalid");
  if (typeof candidate.confirmedAt !== "string" || !Number.isFinite(Date.parse(candidate.confirmedAt))) {
    throw new Error("consent confirmedAt is invalid");
  }
  return { version: PILOT_CONSENT_VERSION, confirmedAt: new Date(candidate.confirmedAt).toISOString() };
}

export function assertPilotConsentTimestamp(record: PilotConsentRecord, nowMs: number, allowedClockSkewMs = 5 * 60_000): void {
  if (Date.parse(record.confirmedAt) > nowMs + allowedClockSkewMs) throw new Error("consent confirmedAt is in the future");
}

export function readPilotConsent(storage: ConsentStorage): PilotConsentRecord | null {
  try {
    const raw = storage.getItem(PILOT_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsePilotConsentRecord(parsed);
  } catch {
    return null;
  }
}

export function writePilotConsent(storage: ConsentStorage, record: PilotConsentRecord): void {
  storage.setItem(PILOT_CONSENT_STORAGE_KEY, JSON.stringify(record));
}

export const PILOT_CONSENT_DECLINED_STORAGE_KEY = "rehabmind-pilot-consent-declined";

/** 拒绝后留痕，避免每次打开都重复弹窗；仍可随时清除该标记改变决定。 */
export function markPilotConsentDeclined(storage: { setItem(key: string, value: string): void }): void {
  storage.setItem(PILOT_CONSENT_DECLINED_STORAGE_KEY, "true");
}

export function isPilotConsentDeclined(storage: { getItem(key: string): string | null }): boolean {
  try {
    return storage.getItem(PILOT_CONSENT_DECLINED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * 把同意信息注入快照：随案例持久化到服务端，
 * 管理员读取快照即可追溯“哪个版本、何时确认”，无需改动 API。
 * 返回新对象，不改写原快照。
 */
export function attachPilotConsent<T extends Record<string, unknown>>(
  snapshot: T,
  record: PilotConsentRecord,
): T & { consent?: PilotConsentRecord } {
  if (snapshot.schemaVersion === 3 && snapshot.domain && typeof snapshot.domain === "object" && !Array.isArray(snapshot.domain)) {
    return {
      ...snapshot,
      domain: { ...(snapshot.domain as Record<string, unknown>), consent: record },
    };
  }
  return { ...snapshot, consent: record };
}
