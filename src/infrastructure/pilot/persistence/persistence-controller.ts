export type PilotDraftPersistenceState = "local-saving" | "local-saved" | "error";

export type PilotDraftPersistenceController<T> = {
  schedule(value: T): void;
  flush(): Promise<void>;
  cancel(): void;
  dispose(): void;
};

type PilotDraftPersistenceOptions<T> = {
  delayMs?: number;
  save(value: T): Promise<unknown>;
  onState?(state: PilotDraftPersistenceState): void;
};

/** Debounces local draft writes while keeping an explicit flush for navigation and unload boundaries. */
export function createPilotDraftPersistenceController<T>({ delayMs = 800, save, onState }: PilotDraftPersistenceOptions<T>): PilotDraftPersistenceController<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: T | undefined;
  let chain = Promise.resolve();
  let disposed = false;

  function schedule(value: T) {
    if (disposed) return;
    pending = value;
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
    const value = pending;
    pending = undefined;
    const operation = chain.then(async () => {
      try {
        await save(value);
        onState?.("local-saved");
      } catch (error) {
        onState?.("error");
        throw error;
      }
    });
    chain = operation.catch(() => undefined);
    return operation;
  }

  function cancel() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    pending = undefined;
  }

  function dispose() {
    disposed = true;
    cancel();
  }

  return { schedule, flush, cancel, dispose };
}

