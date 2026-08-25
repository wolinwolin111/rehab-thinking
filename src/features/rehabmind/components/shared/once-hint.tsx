"use client";

import { useCallback, useState, useSyncExternalStore, type ReactNode } from "react";

const STORAGE_PREFIX = "rehabmind-once-hint:";
const STORAGE_EVENT = "rehabmind-once-hint-change";

export function OnceHint({ id, active = true, children, className = "" }: {
  id: string;
  active?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const storageKey = `${STORAGE_PREFIX}${id}`;
  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener(STORAGE_EVENT, onStoreChange);
    return () => {
      window.removeEventListener("storage", onStoreChange);
      window.removeEventListener(STORAGE_EVENT, onStoreChange);
    };
  }, []);
  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(storageKey) === "seen";
    } catch {
      return false;
    }
  }, [storageKey]);
  const alreadySeen = useSyncExternalStore(subscribe, getSnapshot, () => false);

  if (!active || alreadySeen || dismissedId === id) return null;
  return <aside className={`rm-once-hint ${className}`.trim()} role="status">
    <span>{children}</span>
    <button type="button" aria-label="关闭提示" onClick={() => {
      setDismissedId(id);
      try {
        window.localStorage.setItem(storageKey, "seen");
        window.dispatchEvent(new Event(STORAGE_EVENT));
      } catch {
        // The hint still closes for the current session when storage is unavailable.
      }
    }}>关闭</button>
  </aside>;
}
