export type LocalCaseIdentityRecord = {
  localCaseId?: string;
  caseKey?: string;
  id?: string;
};

export function createLocalCaseId() {
  const randomId = globalThis.crypto?.randomUUID?.();
  return randomId ? `local-${randomId}` : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function savedRecordIdentity(record: LocalCaseIdentityRecord) {
  return record.localCaseId ?? record.caseKey ?? record.id ?? "";
}

/** Resolve a record from the explicit active identity, never from array order or complaint text. */
export function findLocalCaseRecord<T extends LocalCaseIdentityRecord>(records: readonly T[], identity: string): T | undefined {
  if (!identity) return undefined;
  return records.find((record) => savedRecordIdentity(record) === identity);
}
