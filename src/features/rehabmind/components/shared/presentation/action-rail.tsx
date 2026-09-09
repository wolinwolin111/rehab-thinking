export type RailAction = {
  id: string;
  label: string;
  /** Slot contract: exactly one primary per rail; capacity 3 (plan §7.7). */
  placement: "primary" | "secondary" | "tertiary";
  /** Visual tone; defaults from placement (primary→primary, others→secondary). */
  variant?: "primary" | "secondary" | "quiet" | "danger";
  disabled?: boolean;
  describedBy?: string;
  onClick: () => void;
};

import type { ReactNode } from "react";
import { ActionButton } from "./action-button";
import styles from "./action-rail.module.css";

// Visual slot order in the three-column grid: secondary, tertiary, primary
// (widest column last). DOM order MUST equal visual order (plan §7.7 — Tab
// must not jump in a different sequence than the eye reads).
const PLACEMENT_ORDER: Record<RailAction["placement"], number> = { secondary: 0, tertiary: 1, primary: 2 };

/**
 * ActionRail (plan §7.7): the fixed bottom action bar owner. The stage adapter
 * decides WHICH legal actions belong here; the rail decides layout and skin.
 * Same-slot duplicates and over-capacity lists are development-time errors,
 * reported instead of silently dropping buttons.
 */
export function ActionRail({ actions, ariaLabel = "当前步骤操作", className, as = "div", note }: {
  actions: RailAction[];
  ariaLabel?: string;
  /** Extra container class (e.g. page-specific desktop column ratios). */
  className?: string;
  /** Render as <nav> for semantic question navigation. */
  as?: "div" | "nav";
  /** Optional muted helper line rendered after the actions (inside the rail). */
  note?: ReactNode;
}) {
  if (process.env.NODE_ENV !== "production") {
    const slots = new Map<string, number>();
    for (const action of actions) slots.set(action.placement, (slots.get(action.placement) ?? 0) + 1);
    for (const [slot, count] of slots) {
      if (count > 1) console.error(`[ActionRail] duplicate placement "${slot}" (${count} actions) — one slot, one action.`);
    }
    if (actions.length > 3) console.error(`[ActionRail] ${actions.length} actions exceed rail capacity 3 — move overflow to an inline alternative exit.`);
    if (slots.has("primary") && slots.get("primary")! > 1) console.error("[ActionRail] more than one primary action.");
  }

  const ordered = [...actions].sort((left, right) => PLACEMENT_ORDER[left.placement] - PLACEMENT_ORDER[right.placement]);
  const layout = ordered.length === 1 ? "single" : ordered.length === 2 ? "split" : "three";
  const rootClass = [styles.rail, className].filter(Boolean).join(" ");
  const content = (
    <>
      {ordered.map((action) => (
        <ActionButton
          key={action.id}
          variant={action.variant ?? (action.placement === "primary" ? "primary" : "secondary")}
          fullWidth
          disabled={action.disabled}
          aria-describedby={action.describedBy}
          onClick={action.onClick}
        >
          {action.label}
        </ActionButton>
      ))}
      {note ? <small className={styles.note}>{note}</small> : null}
    </>
  );
  if (as === "nav") {
    return (
      <nav className={rootClass} data-present="action-rail" data-action-layout={layout} aria-label={ariaLabel}>{content}</nav>
    );
  }
  return (
    <div className={rootClass} data-present="action-rail" data-action-layout={layout} aria-label={ariaLabel}>{content}</div>
  );
}
