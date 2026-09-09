import styles from "./task-card.module.css";

type TaskCardProps = {
  children: React.ReactNode;
  /** Optional header slot (small kicker + status label row). */
  head?: React.ReactNode;
  /** Stable DOM target for jump-to-missing (plan §7.8). */
  answerId?: string;
  answered?: boolean;
  /** Local status edge/label tone; not a full-card gradient (plan §7.5). */
  tone?: "neutral" | "caution" | "alert";
  testId?: string;
  onClick?: () => void;
};

const TONE_CLASS: Record<NonNullable<TaskCardProps["tone"]>, string> = {
  neutral: styles.neutral,
  caution: styles.caution,
  alert: styles.alert,
};

/**
 * TaskCard (plan §7.5): white surface, light border, one layer. Status color
 * lives on a local edge line, never as a saturated full-card theme. Stage
 * pages compose their specialized content inside; this frame only owns the
 * shared outer skin.
 */
export function TaskCard({ children, head, answerId, answered, tone = "neutral", testId, onClick }: TaskCardProps) {
  return (
    <article
      className={`${styles.card} ${TONE_CLASS[tone]}`}
      data-present="task-card"
      data-tone={tone}
      {...(answerId ? { "data-answer-id": answerId } : {})}
      {...(typeof answered === "boolean" ? { "data-answered": answered ? "yes" : "no" } : {})}
      {...(testId ? { "data-rehabmind-test": testId } : {})}
      onClick={onClick}
    >
      {head ? <div className={styles.head}>{head}</div> : null}
      {children}
    </article>
  );
}
