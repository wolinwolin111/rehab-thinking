const DATABASE_NAME = "rehabmind-local-cases";
const DATABASE_VERSION = 2;
const STORE_NAME = "case-records";
const STORE_KEY = "all";
const DRAFT_STORE_NAME = "active-draft";
const DRAFT_STORE_KEY = "current";
export const LEGACY_LOCAL_CASES_KEY = "rehabmind-complete-demo-records";
export const LOCAL_CASES_MIGRATION_KEY = "rehabmind-local-cases-migrated-v1";
export const LOCAL_DRAFT_KEY = "rehabmind-active-draft-v1";

export type LocalCaseStorageBackend = "indexeddb" | "localStorage";

export type LocalCaseLoadResult<T> = {
  records: T[];
  backend: LocalCaseStorageBackend;
  migrated: boolean;
};

function canUseIndexedDb() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function readLegacyRecords<T>(): T[] {
  const raw = window.localStorage.getItem(LEGACY_LOCAL_CASES_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed as T[] : [];
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB is unavailable"));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      if (!request.result.objectStoreNames.contains(DRAFT_STORE_NAME)) request.result.createObjectStore(DRAFT_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function readDraft<T>(database: IDBDatabase): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DRAFT_STORE_NAME, "readonly");
    const request = transaction.objectStore(DRAFT_STORE_NAME).get(DRAFT_STORE_KEY);
    request.onerror = () => reject(request.error ?? new Error("Could not read local draft"));
    request.onsuccess = () => resolve((request.result ?? null) as T | null);
  });
}

function writeDraft<T>(database: IDBDatabase, draft: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DRAFT_STORE_NAME, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save local draft"));
    transaction.objectStore(DRAFT_STORE_NAME).put(draft, DRAFT_STORE_KEY);
  });
}

function deleteDraft(database: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DRAFT_STORE_NAME, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not clear local draft"));
    transaction.objectStore(DRAFT_STORE_NAME).delete(DRAFT_STORE_KEY);
  });
}

function readAll<T>(database: IDBDatabase): Promise<T[] | null> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(STORE_KEY);
    request.onerror = () => reject(request.error ?? new Error("Could not read local cases"));
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result as T[] : null);
  });
}

function writeAll<T>(database: IDBDatabase, records: T[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save local cases"));
    transaction.objectStore(STORE_NAME).put(records, STORE_KEY);
  });
}

function deleteAll(database: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not clear local cases"));
    transaction.objectStore(STORE_NAME).delete(STORE_KEY);
  });
}

export async function loadLocalCaseRecords<T>(): Promise<LocalCaseLoadResult<T>> {
  if (!canUseIndexedDb()) {
    return { records: readLegacyRecords<T>(), backend: "localStorage", migrated: false };
  }

  try {
    const database = await openDatabase();
    const stored = await readAll<T>(database);
    if (stored) return { records: stored, backend: "indexeddb", migrated: false };

    const legacy = readLegacyRecords<T>();
    if (legacy.length) {
      await writeAll(database, legacy);
      window.localStorage.removeItem(LEGACY_LOCAL_CASES_KEY);
      window.localStorage.setItem(LOCAL_CASES_MIGRATION_KEY, "complete");
      return { records: legacy, backend: "indexeddb", migrated: true };
    }
    return { records: [], backend: "indexeddb", migrated: false };
  } catch {
    return { records: readLegacyRecords<T>(), backend: "localStorage", migrated: false };
  }
}

export async function saveLocalCaseRecords<T>(records: T[]): Promise<LocalCaseStorageBackend> {
  if (canUseIndexedDb()) {
    try {
      const database = await openDatabase();
      await writeAll(database, records);
      window.localStorage.removeItem(LEGACY_LOCAL_CASES_KEY);
      window.localStorage.setItem(LOCAL_CASES_MIGRATION_KEY, "complete");
      return "indexeddb";
    } catch {
      // The fallback below keeps the local copy available when IndexedDB is blocked.
    }
  }
  window.localStorage.setItem(LEGACY_LOCAL_CASES_KEY, JSON.stringify(records));
  return "localStorage";
}

export async function clearLocalCaseRecords(): Promise<void> {
  if (canUseIndexedDb()) {
    try {
      const database = await openDatabase();
      await deleteAll(database);
    } catch {
      // Remove the legacy copy below even when an old browser blocks IndexedDB.
    }
  }
  window.localStorage.removeItem(LEGACY_LOCAL_CASES_KEY);
  window.localStorage.removeItem(LOCAL_CASES_MIGRATION_KEY);
}

export async function loadLocalDraft<T>(): Promise<T | null> {
  if (!canUseIndexedDb()) {
    const raw = window.localStorage.getItem(LOCAL_DRAFT_KEY);
    return raw ? JSON.parse(raw) as T : null;
  }

  try {
    const database = await openDatabase();
    const draft = await readDraft<T>(database);
    if (draft) return draft;
  } catch {
    // Fall through to the localStorage copy when IndexedDB is blocked or unavailable.
  }
  const raw = window.localStorage.getItem(LOCAL_DRAFT_KEY);
  return raw ? JSON.parse(raw) as T : null;
}

export async function saveLocalDraft<T>(draft: T): Promise<LocalCaseStorageBackend> {
  if (canUseIndexedDb()) {
    try {
      const database = await openDatabase();
      await writeDraft(database, draft);
      window.localStorage.removeItem(LOCAL_DRAFT_KEY);
      return "indexeddb";
    } catch {
      // The fallback below keeps the active draft available when IndexedDB is blocked.
    }
  }
  window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft));
  return "localStorage";
}

export async function clearLocalDraft(): Promise<void> {
  if (canUseIndexedDb()) {
    try {
      const database = await openDatabase();
      await deleteDraft(database);
    } catch {
      // Remove the fallback copy below even when IndexedDB is unavailable.
    }
  }
  window.localStorage.removeItem(LOCAL_DRAFT_KEY);
}
