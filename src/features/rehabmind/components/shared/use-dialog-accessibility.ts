import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable=\"true\"]",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

type FocusRef = { current: HTMLElement | null };

type DialogAccessibilityOptions = {
  open: boolean;
  onClose: () => void;
  initialFocusRef?: FocusRef;
};

/**
 * 为应用内弹层提供一致的键盘行为：打开时把焦点放进弹层，Tab 不跑到
 * 背景，Esc 关闭，关闭后把焦点还给打开它的控件。
 */
export function useDialogAccessibility<T extends HTMLElement = HTMLElement>({
  open,
  onClose,
  initialFocusRef,
}: DialogAccessibilityOptions) {
  const dialogRef = useRef<T | null>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const getFocusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && (element.offsetWidth > 0 || element.offsetHeight > 0 || element.getClientRects().length > 0);
      });
    const focusInitial = () => {
      const target = initialFocusRef?.current ?? getFocusable()[0] ?? dialog;
      target.focus();
    };
    const frame = window.requestAnimationFrame(focusInitial);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const active = document.activeElement;
      const index = active instanceof HTMLElement ? focusable.indexOf(active) : -1;
      if (event.shiftKey ? index <= 0 : index === focusable.length - 1 || index < 0) {
        event.preventDefault();
        (event.shiftKey ? focusable[focusable.length - 1] : focusable[0]).focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [initialFocusRef, open]);

  return dialogRef;
}
