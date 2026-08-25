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
