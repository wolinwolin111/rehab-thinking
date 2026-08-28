const DATABASE_NAME = "rehabmind-local-cases";
const DATABASE_VERSION = 4;
const STORE_NAME = "case-records";
const STORE_KEY = "all";
const DRAFT_STORE_NAME = "active-draft";
const DRAFT_STORE_KEY = "current";
export const LEGACY_LOCAL_CASES_KEY = "rehabmind-complete-demo-records-v4";
export const LOCAL_CASES_MIGRATION_KEY = "rehabmind-local-cases-initialized-v4";
export const LOCAL_DRAFT_KEY = "rehabmind-active-draft-v4";
/** Cross-tab notification contains only an identity and a fingerprint, never the draft body. */
export const LOCAL_DRAFT_SIGNAL_KEY = "rehabmind-active-draft-signal-v4";
export type LocalCaseStorageScope = "user" | "test";

export type LocalDraftStorageSignal = {
  version: 1;
  tabId: string;
  scope: LocalCaseStorageScope;
  action: "saved" | "cleared";
  localCaseId?: string;
  fingerprint?: string;
  emittedAt: string;
};

export type LocalCaseStorageBackend = "indexeddb" | "localStorage";

export type LocalCaseLoadResult<T> = {
  records: T[];
  backend: LocalCaseStorageBackend;
  migrated: boolean;
  diagnostic?: LocalCaseStorageDiagnostic;
};

export type LocalCaseStorageDiagnostic = {
  code: "corrupt-local-records" | "corrupt-local-draft";
  storageKey: string;
  byteLength: number;
};

export type LocalDraftLoadResult<T> = {
  draft: T | null;
  backend: LocalCaseStorageBackend;
  diagnostic?: LocalCaseStorageDiagnostic;
};

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? String(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

/** 与同步核心保持同一确定性指纹算法；本文件故意自包含，保证受限浏览器兜底模块可独立加载。 */
function contentFingerprint(value: unknown) {
  const text = stableSerialize(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function canUseIndexedDb() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

/**
 * DEF-CONSENT-01 分支修复：IndexedDB 操作可能永久挂起（open 的 blocked 态、
 * 事务不落定等浏览器调度问题，多上下文/长会话下可复现）。给 IDB 操作加
 * 3s 超时——超时按失败处理，走各调用点既有的 localStorage 兜底，
 * 不再让上层 await 永久卡死（曾导致同意门建案后不关闭）。
 */
const IDB_OPERATION_TIMEOUT_MS = 3000;

function withIdbTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("IndexedDB operation timed out")), IDB_OPERATION_TIMEOUT_MS);
    }),
  ]);
}

function diagnostic(code: LocalCaseStorageDiagnostic["code"], storageKey: string, raw: string): LocalCaseStorageDiagnostic {
  return { code, storageKey, byteLength: new TextEncoder().encode(raw).byteLength };
}

function scopedKey(key: string, scope: LocalCaseStorageScope) {
  return scope === "user" ? key : `${key}-${scope}`;
}

const OBSOLETE_LOCAL_KEYS = [
  "rehabmind-complete-demo-records",
  "rehabmind-local-cases-migrated-v1",
  "rehabmind-active-draft-v1",
  "rehabmind-active-draft-signal-v1",
  "rehabmind-complete-demo-records-v3",
  "rehabmind-local-cases-initialized-v3",
  "rehabmind-active-draft-v3",
  "rehabmind-active-draft-signal-v3",
] as const;

function clearObsoleteLocalStorage(scope: LocalCaseStorageScope) {
  for (const key of OBSOLETE_LOCAL_KEYS) window.localStorage.removeItem(scopedKey(key, scope));
}

let cachedTabId: string | null = null;

/** One identifier per browser tab; sessionStorage keeps reloads in the same tab identifiable. */
export function createLocalTabId() {
  if (cachedTabId) return cachedTabId;
  try {
    const existing = window.sessionStorage.getItem("rehabmind-tab-id");
    if (existing) {
      cachedTabId = existing;
      return existing;
    }
  } catch {
    // sessionStorage can be disabled; the in-memory fallback still separates live tabs.
  }
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  cachedTabId = `tab-${randomId}`;
  try {
    window.sessionStorage.setItem("rehabmind-tab-id", cachedTabId);
  } catch {
    // The tab id remains valid for this page lifetime.
  }
  return cachedTabId;
}

export function localDraftContentFingerprint(draft: unknown) {
  if (draft && typeof draft === "object" && "snapshot" in draft) {
    return contentFingerprint((draft as { snapshot?: unknown }).snapshot);
  }
  return contentFingerprint(draft);
}

function emitLocalDraftSignal(draft: unknown, scope: LocalCaseStorageScope, action: LocalDraftStorageSignal["action"]) {
  try {
    const source = draft && typeof draft === "object" ? draft as Record<string, unknown> : {};
    const signal: LocalDraftStorageSignal = {
      version: 1,
      tabId: createLocalTabId(),
      scope,
      action,
      localCaseId: typeof source.localCaseId === "string" ? source.localCaseId : undefined,
      fingerprint: action === "saved" ? localDraftContentFingerprint(draft) : undefined,
      emittedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(LOCAL_DRAFT_SIGNAL_KEY, JSON.stringify(signal));
  } catch {
    // A failed notification must not turn a successful local save into a false failure.
  }
}

function readLegacyRecords<T>(scope: LocalCaseStorageScope): { records: T[]; diagnostic?: LocalCaseStorageDiagnostic } {
  const key = scopedKey(LEGACY_LOCAL_CASES_KEY, scope);
  const raw = window.localStorage.getItem(key);
  if (!raw) return { records: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return { records: parsed as T[] };
  } catch {
    // Return a diagnostic while leaving the original value untouched for recovery/export.
  }
  return { records: [], diagnostic: diagnostic("corrupt-local-records", key, raw) };
}

function openDatabase(scope: LocalCaseStorageScope): Promise<IDBDatabase> {
  return withIdbTimeout(new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(scope === "user" ? DATABASE_NAME : `${DATABASE_NAME}-${scope}`, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB is unavailable"));
    // blocked 态（旧版本连接未释放）若不处理会让 open 的 Promise 永不落定。
    request.onblocked = () => reject(new Error("IndexedDB open is blocked by another connection"));
    request.onupgradeneeded = (event) => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      if (!request.result.objectStoreNames.contains(DRAFT_STORE_NAME)) request.result.createObjectStore(DRAFT_STORE_NAME);
      // v3 合同修订 2 是干净切换；旧案例和草稿没有可恢复的事实归属。
      if (event.oldVersion > 0 && event.oldVersion < 4) {
        request.transaction?.objectStore(STORE_NAME).clear();
        request.transaction?.objectStore(DRAFT_STORE_NAME).clear();
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  }));
}

function readDraft<T>(database: IDBDatabase): Promise<T | null> {
  return withIdbTimeout(new Promise((resolve, reject) => {
    const transaction = database.transaction(DRAFT_STORE_NAME, "readonly");
    const request = transaction.objectStore(DRAFT_STORE_NAME).get(DRAFT_STORE_KEY);
    request.onerror = () => reject(request.error ?? new Error("Could not read local draft"));
    request.onsuccess = () => resolve((request.result ?? null) as T | null);
  }));
}

function writeDraft<T>(database: IDBDatabase, draft: T): Promise<void> {
  return withIdbTimeout(new Promise((resolve, reject) => {
    const transaction = database.transaction(DRAFT_STORE_NAME, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save local draft"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Could not save local draft (aborted)"));
    transaction.objectStore(DRAFT_STORE_NAME).put(draft, DRAFT_STORE_KEY);
  }));
}

function deleteDraft(database: IDBDatabase): Promise<void> {
  return withIdbTimeout(new Promise((resolve, reject) => {
    const transaction = database.transaction(DRAFT_STORE_NAME, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not clear local draft"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Could not clear local draft (aborted)"));
    transaction.objectStore(DRAFT_STORE_NAME).delete(DRAFT_STORE_KEY);
  }));
}

function readAll<T>(database: IDBDatabase): Promise<T[] | null> {
  return withIdbTimeout(new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(STORE_KEY);
    request.onerror = () => reject(request.error ?? new Error("Could not read local cases"));
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result as T[] : null);
  }));
}

function writeAll<T>(database: IDBDatabase, records: T[]): Promise<void> {
  return withIdbTimeout(new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save local cases"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Could not save local cases (aborted)"));
    transaction.objectStore(STORE_NAME).put(records, STORE_KEY);
  }));
}

function deleteAll(database: IDBDatabase): Promise<void> {
  return withIdbTimeout(new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not clear local cases"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Could not clear local cases (aborted)"));
    transaction.objectStore(STORE_NAME).delete(STORE_KEY);
  }));
}

export async function loadLocalCaseRecords<T>(scope: LocalCaseStorageScope = "user"): Promise<LocalCaseLoadResult<T>> {
  clearObsoleteLocalStorage(scope);
  if (!canUseIndexedDb()) {
    const legacy = readLegacyRecords<T>(scope);
    return { ...legacy, backend: "localStorage", migrated: false };
  }

  let database: IDBDatabase | undefined;
  try {
    database = await openDatabase(scope);
    const stored = await readAll<T>(database);
    if (stored) return { records: stored, backend: "indexeddb", migrated: false };

    const legacy = readLegacyRecords<T>(scope);
    if (legacy.records.length) {
      await writeAll(database, legacy.records);
      window.localStorage.removeItem(scopedKey(LEGACY_LOCAL_CASES_KEY, scope));
      window.localStorage.setItem(scopedKey(LOCAL_CASES_MIGRATION_KEY, scope), "complete");
      return { records: legacy.records, backend: "indexeddb", migrated: true };
    }
    return { records: [], backend: "indexeddb", migrated: false, diagnostic: legacy.diagnostic };
  } catch {
    const legacy = readLegacyRecords<T>(scope);
    return { ...legacy, backend: "localStorage", migrated: false };
  } finally {
    database?.close();
  }
}

export async function saveLocalCaseRecords<T>(records: T[], scope: LocalCaseStorageScope = "user"): Promise<LocalCaseStorageBackend> {
  clearObsoleteLocalStorage(scope);
  if (canUseIndexedDb()) {
    let database: IDBDatabase | undefined;
    try {
      database = await openDatabase(scope);
      await writeAll(database, records);
      window.localStorage.removeItem(scopedKey(LEGACY_LOCAL_CASES_KEY, scope));
      window.localStorage.setItem(scopedKey(LOCAL_CASES_MIGRATION_KEY, scope), "complete");
      return "indexeddb";
    } catch {
      // The fallback below keeps the local copy available when IndexedDB is blocked.
    } finally {
      database?.close();
    }
  }
  window.localStorage.setItem(scopedKey(LEGACY_LOCAL_CASES_KEY, scope), JSON.stringify(records));
  return "localStorage";
}

export async function clearLocalCaseRecords(scope: LocalCaseStorageScope = "user"): Promise<void> {
  if (canUseIndexedDb()) {
    let database: IDBDatabase | undefined;
    try {
      database = await openDatabase(scope);
      await deleteAll(database);
    } catch {
      // Remove the legacy copy below even when an old browser blocks IndexedDB.
    } finally {
      database?.close();
    }
  }
  window.localStorage.removeItem(scopedKey(LEGACY_LOCAL_CASES_KEY, scope));
  window.localStorage.removeItem(scopedKey(LOCAL_CASES_MIGRATION_KEY, scope));
}

export async function loadLocalDraftWithDiagnostics<T>(scope: LocalCaseStorageScope = "user"): Promise<LocalDraftLoadResult<T>> {
  clearObsoleteLocalStorage(scope);
  const draftKey = scopedKey(LOCAL_DRAFT_KEY, scope);
  if (!canUseIndexedDb()) {
    const raw = window.localStorage.getItem(draftKey);
    if (!raw) return { draft: null, backend: "localStorage" };
    try {
      return { draft: JSON.parse(raw) as T, backend: "localStorage" };
    } catch {
      return { draft: null, backend: "localStorage", diagnostic: diagnostic("corrupt-local-draft", draftKey, raw) };
    }
  }

  let database: IDBDatabase | undefined;
  try {
    database = await openDatabase(scope);
    const draft = await readDraft<T>(database);
    if (draft) return { draft, backend: "indexeddb" };
  } catch {
    // Fall through to the localStorage copy when IndexedDB is blocked or unavailable.
  } finally {
    database?.close();
  }
  const raw = window.localStorage.getItem(draftKey);
  if (!raw) return { draft: null, backend: "localStorage" };
  try {
    return { draft: JSON.parse(raw) as T, backend: "localStorage" };
  } catch {
    return { draft: null, backend: "localStorage", diagnostic: diagnostic("corrupt-local-draft", draftKey, raw) };
  }
}

export async function loadLocalDraft<T>(scope: LocalCaseStorageScope = "user"): Promise<T | null> {
  return (await loadLocalDraftWithDiagnostics<T>(scope)).draft;
}

export async function saveLocalDraft<T>(draft: T, scope: LocalCaseStorageScope = "user"): Promise<LocalCaseStorageBackend> {
  const draftKey = scopedKey(LOCAL_DRAFT_KEY, scope);
  if (canUseIndexedDb()) {
    let database: IDBDatabase | undefined;
    try {
      database = await openDatabase(scope);
      await writeDraft(database, draft);
      window.localStorage.removeItem(draftKey);
      emitLocalDraftSignal(draft, scope, "saved");
      return "indexeddb";
    } catch {
      // The fallback below keeps the active draft available when IndexedDB is blocked.
    } finally {
      database?.close();
    }
  }
  window.localStorage.setItem(draftKey, JSON.stringify(draft));
  emitLocalDraftSignal(draft, scope, "saved");
  return "localStorage";
}

export async function clearLocalDraft(scope: LocalCaseStorageScope = "user"): Promise<void> {
  if (canUseIndexedDb()) {
    let database: IDBDatabase | undefined;
    try {
      database = await openDatabase(scope);
      await deleteDraft(database);
    } catch {
      // Remove the fallback copy below even when IndexedDB is unavailable.
    } finally {
      database?.close();
    }
  }
  window.localStorage.removeItem(scopedKey(LOCAL_DRAFT_KEY, scope));
  emitLocalDraftSignal(null, scope, "cleared");
}
