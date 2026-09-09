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

import { ActionButton } from "./action-button";
import styles from "./action-rail.module.css";

/**
 * ActionRail (plan §7.7): the fixed bottom action bar owner. The stage adapter
 * decides WHICH legal actions belong here; the rail decides layout and skin.
 * Same-slot duplicates and over-capacity lists are development-time errors,
 * reported instead of silently dropping buttons.
 */
export function ActionRail({ actions, ariaLabel = "当前步骤操作", className }: {
  actions: RailAction[];
  ariaLabel?: string;
  className?: string;
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

  const layout = actions.length === 1 ? "single" : actions.length === 2 ? "split" : "three";
  const rootClass = [styles.rail, className].filter(Boolean).join(" ");
  return (
    <div className={rootClass} data-action-layout={layout} aria-label={ariaLabel}>
      {actions.map((action) => (
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
    </div>
  );
}
