import styles from "./choice-button.module.css";

export type ChoiceButtonProps = {
  children: React.ReactNode;
  /** Current selection state; drives the visible mark AND aria-pressed. */
  selected: boolean;
  /** Danger-tinted choice (e.g. 安全信号"有"); mark + border stay readable. */
  alert?: boolean;
  disabled?: boolean;
  onClick: () => void;
  "data-rehabmind-test"?: string;
  id?: string;
};

/**
 * ChoiceButton (plan §7.2): an answer option, distinct from action buttons.
 * Selection is expressed by a visible mark + border + aria-pressed — never by
 * background color alone (F-5). Same group must use the same semantics.
 */
export function ChoiceButton({ children, selected, alert = false, disabled = false, onClick, id, ...rest }: ChoiceButtonProps) {
  const classes = [styles.choice, alert ? styles.alert : ""].filter(Boolean).join(" ");
  return (
    <button
      type="button"
      id={id}
      className={classes}
      data-present="choice-button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      <span className={styles.mark} aria-hidden="true">{selected ? "✓" : ""}</span>
      <span className={styles.label}>{children}</span>
    </button>
  );
}

/** Multi-select group; the caller owns the array state and toggle handler. */
export function ChoiceGroup({ label, note, children, role = "group", labelVisible = true }: {
  label: React.ReactNode;
  note?: React.ReactNode;
  children: React.ReactNode;
  role?: "group" | "radiogroup";
  /** false = label stays for screen readers but renders visually hidden
   * (use when the question text already shows right above). */
  labelVisible?: boolean;
}) {
  return (
    <div className={styles.group} data-present="choice-group" role={role} aria-label={typeof label === "string" ? label : undefined}>
      <div className={labelVisible ? styles.groupHead : styles.groupHeadHidden}>
        <span className={styles.groupLabel}>{label}</span>
        {note && labelVisible ? <span className={styles.groupNote}>{note}</span> : null}
      </div>
      <div className={styles.options}>{children}</div>
    </div>
  );
}
