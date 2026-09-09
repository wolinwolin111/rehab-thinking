import styles from "./status-notice.module.css";

export type StatusNoticeTone = "neutral" | "success" | "warning" | "danger";

type StatusNoticeProps = {
  tone?: StatusNoticeTone;
  /** role=status announces content politely; omit for static explanation. */
  live?: boolean;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** At most one nearby helper action, rendered as an ActionButton (plan §7.4). */
  action?: React.ReactNode;
  id?: string;
  "data-rehabmind-test"?: string;
};

const TONE_CLASS: Record<StatusNoticeTone, string> = {
  neutral: styles.neutral,
  success: styles.success,
  warning: styles.warning,
  danger: styles.danger,
};

export function StatusNotice({
  tone = "neutral",
  live = false,
  title,
  children,
  action,
  id,
  ...rest
}: StatusNoticeProps) {
  return (
    <section
      id={id}
      className={`${styles.notice} ${TONE_CLASS[tone]}`}
      data-present="status-notice"
      data-tone={tone}
      role={live ? "status" : undefined}
      {...rest}
    >
      {title ? <strong className={styles.title}>{title}</strong> : null}
      {children ? <div className={styles.body}>{children}</div> : null}
      {action ? <div className={styles.actionRow}>{action}</div> : null}
    </section>
  );
}
