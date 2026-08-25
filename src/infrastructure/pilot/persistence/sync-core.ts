export type PilotLocalSyncState = {
  serverRevision: number;
  dirty: boolean;
  localContentFingerprint?: string;
};

export type PilotRemoteSyncState = {
  revision: number;
  contentFingerprint?: string;
};

export type PilotRestoreDecision = "use-local" | "use-remote" | "conflict";

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

/** A deterministic equality fingerprint, not a security hash. */
export function contentFingerprint(value: unknown) {
  const text = stableSerialize(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function decidePilotRestoreSource(
  local: PilotLocalSyncState | null,
  remote: PilotRemoteSyncState,
): PilotRestoreDecision {
  if (!local) return "use-remote";
  if (!local.dirty) return remote.revision >= local.serverRevision ? "use-remote" : "use-local";
  if (local.localContentFingerprint && remote.contentFingerprint === local.localContentFingerprint) return "use-remote";
  if (remote.revision < local.serverRevision) return "use-local";
  return "conflict";
}
