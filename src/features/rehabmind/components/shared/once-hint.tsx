"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

const STORAGE_PREFIX = "rehabmind-once-hint:";
const STORAGE_EVENT = "rehabmind-once-hint-change";

export function OnceHint({ id, active = true, children, className = "", autoDismissMs }: {
  id: string;
  active?: boolean;
  children: ReactNode;
  className?: string;
  /** 传入则展示该毫秒后自动消失并记为已读；不传则仅手动关闭。 */
  autoDismissMs?: number;
}) {
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [autoHidden, setAutoHidden] = useState(false);
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

  useEffect(() => {
    if (!active || alreadySeen || autoDismissMs == null) return;
    const timer = window.setTimeout(() => {
      setAutoHidden(true);
      try {
        window.localStorage.setItem(storageKey, "seen");
        window.dispatchEvent(new Event(STORAGE_EVENT));
      } catch {
        // 存储不可用时本次会话仍隐藏。
      }
    }, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [active, alreadySeen, autoDismissMs, storageKey]);

  if (!active || alreadySeen || dismissedId === id || autoHidden) return null;
  return <aside className={`rm-once-hint ${className}`.trim()} role="note">
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
