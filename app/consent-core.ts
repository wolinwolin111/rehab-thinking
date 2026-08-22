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
  return { version: PILOT_CONSENT_VERSION, confirmedAt };
}

export function readPilotConsent(storage: ConsentStorage): PilotConsentRecord | null {
  try {
    const raw = storage.getItem(PILOT_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const version = (parsed as Record<string, unknown>).version;
    const confirmedAt = (parsed as Record<string, unknown>).confirmedAt;
    if (typeof version !== "string" || !version) return null;
    if (typeof confirmedAt !== "string" || !confirmedAt) return null;
    return { version, confirmedAt };
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
): T & { consent: PilotConsentRecord } {
  return { ...snapshot, consent: record };
}
