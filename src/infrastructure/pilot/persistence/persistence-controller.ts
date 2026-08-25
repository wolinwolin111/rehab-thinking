export type PilotDraftPersistenceState = "local-saving" | "local-saved" | "error";

export type PilotDraftPersistenceController<T> = {
  schedule(value: T): void;
  flush(): Promise<void>;
  cancel(): void;
  dispose(): void;
};

export type PilotSerialPersistenceQueue<T> = {
  enqueue(value: T): Promise<void>;
  drain(): Promise<void>;
};

export type PilotKeyedPersistenceQueue = {
  enqueue<T>(key: string, operation: () => Promise<T>): Promise<T | undefined>;
  drain(key: string): Promise<void>;
  block(key: string): void;
  unblock(key: string): void;
  clear(key: string): void;
  clearAll(): void;
};

type PilotDraftPersistenceOptions<T> = {
  delayMs?: number;
  save(value: T): Promise<unknown>;
  onState?(state: PilotDraftPersistenceState): void;
};

/** Debounces local draft writes while keeping an explicit flush for navigation and unload boundaries. */
export function createPilotDraftPersistenceController<T>({ delayMs = 800, save, onState }: PilotDraftPersistenceOptions<T>): PilotDraftPersistenceController<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: { generation: number; value: T } | undefined;
  let chain = Promise.resolve();
  let disposed = false;
  let generation = 0;

  function schedule(value: T) {
    if (disposed) return;
    generation += 1;
    pending = { generation, value };
    onState?.("local-saving");
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      void flush();
    }, delayMs);
  }

  function flush() {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (pending === undefined) return chain;
    const operation = pending;
    pending = undefined;
    const next = chain.then(async () => {
      try {
        await save(operation.value);
        if (!disposed && operation.generation === generation && pending === undefined) onState?.("local-saved");
      } catch (error) {
        if (!disposed && operation.generation === generation) onState?.("error");
        throw error;
      }
    });
    chain = next.catch(() => undefined);
    return next;
  }

  function cancel() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    pending = undefined;
    generation += 1;
  }

  function dispose() {
    disposed = true;
    cancel();
  }

  return { schedule, flush, cancel, dispose };
}

/** Keeps record-list replacements in invocation order so a late write cannot resurrect deleted data. */
export function createPilotSerialPersistenceQueue<T>(save: (value: T) => Promise<unknown>): PilotSerialPersistenceQueue<T> {
  let chain = Promise.resolve();
  function enqueue(value: T) {
    const operation = chain.then(async () => {
      await save(value);
    });
    chain = operation.catch(() => undefined);
    return operation;
  }
  return { enqueue, drain: () => chain };
}

/** Serializes one case without blocking unrelated cases and closes deletion races. */
export function createPilotKeyedPersistenceQueue(): PilotKeyedPersistenceQueue {
  const chains = new Map<string, Promise<void>>();
  const blocked = new Set<string>();

  function enqueue<T>(key: string, operation: () => Promise<T>): Promise<T | undefined> {
    if (blocked.has(key)) return Promise.resolve(undefined);
    const previous = chains.get(key) ?? Promise.resolve();
    const result = previous.catch(() => undefined).then(operation);
    const tracked = result.then(() => undefined, () => undefined);
    chains.set(key, tracked);
    void tracked.then(() => {
      if (chains.get(key) === tracked) chains.delete(key);
    });
    return result;
  }

  return {
    enqueue,
    drain: (key) => chains.get(key) ?? Promise.resolve(),
    block: (key) => { blocked.add(key); },
    unblock: (key) => { blocked.delete(key); },
    clear: (key) => { blocked.delete(key); chains.delete(key); },
    clearAll: () => { blocked.clear(); chains.clear(); },
  };
}
