import styles from "./task-heading.module.css";

type TaskHeadingProps = {
  /** Small kicker above the title ("第2步 · 开始前确认"). */
  eyebrow: string;
  title: string;
  note?: string;
  /** Current sub-task progress; always rendered with explicit labels. */
  current?: number;
  total?: number;
  /** Tutorial anchor passthrough. */
  tutorialTarget?: string;
  id?: string;
};

/**
 * TaskHeading (plan §7.5): title, progress and note each get their own slot.
 * Progress renders exactly once with readable labels ("第2步，共6步"); empty
 * slots render nothing. Replaces StepHeading internals (ui-primitives keeps
 * the original export signature).
 */
export function TaskHeading({ eyebrow, title, note, current, total, tutorialTarget, id }: TaskHeadingProps) {
  const stepMatch = eyebrow.match(/第(\d+)步/);
  const stepNum = stepMatch ? Number(stepMatch[1]) : null;
  const hasBadge = typeof current === "number" && typeof total === "number";
  return (
    <header id={id} className={styles.heading} data-present="task-heading" data-rehabmind-tutorial={tutorialTarget}>
      <div className={styles.main}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1 className={styles.title}>{title}</h1>
        {note ? <p className={styles.note}>{note}</p> : null}
        {stepNum ? (
          <div className={styles.progress} role="img" aria-label={`第${stepNum}步，共6步`}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <i key={n} className={n < stepNum ? styles.done : n === stepNum ? styles.current : undefined} />
            ))}
          </div>
        ) : null}
      </div>
      {hasBadge ? (
        <b className={styles.badge}>
          <span className={styles.badgeLabel}>当前第 {current + 1} 项</span>
          <small>／共 {total} 项</small>
        </b>
      ) : null}
    </header>
  );
}
