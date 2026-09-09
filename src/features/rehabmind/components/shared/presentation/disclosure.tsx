import styles from "./disclosure.module.css";

type DisclosureProps = {
  children: React.ReactNode;
  summary: React.ReactNode;
  /** "boxed" draws the bordered container (records manage, more actions);
   * "quiet" renders a bare row for inline helper sections. */
  tone?: "quiet" | "boxed";
  defaultOpen?: boolean;
  /** Fired after the native toggle with the new open state. Focus stays on
   * the summary row — no global state store is involved (plan §7.3). */
  onToggle?: (open: boolean) => void;
  id?: string;
};

export function Disclosure({
  children,
  summary,
  tone = "boxed",
  defaultOpen = false,
  onToggle,
  id,
}: DisclosureProps) {
  return (
    <details
      id={id}
      className={tone === "boxed" ? styles.boxed : styles.quiet}
      data-present="disclosure"
      open={defaultOpen ? true : undefined}
      onToggle={(event) => {
        if (!onToggle) return;
        onToggle((event.target as HTMLDetailsElement).open);
      }}
    >
      <summary className={styles.summary}>
        <span className={styles.summaryText}>{summary}</span>
        <span className={styles.chevron} aria-hidden="true" />
      </summary>
      <div className={styles.content}>{children}</div>
    </details>
  );
}
