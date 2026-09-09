import { ActionButton } from "./action-button";
import styles from "./stage-transition.module.css";

type StageTransitionProps = {
  /** Stage ordinal shown as calm meta text ("第 03 阶段"), never as a big tile. */
  number: string;
  title: string;
  message: string;
  button: string;
  onContinue: () => void;
  onBack: () => void;
};

/**
 * Stage transition card (plan §7.6): two DOM sections — what was completed and
 * what comes next, then the action row. No decorative number tile; the card
 * height is content-driven. ui-primitives re-exports this with the original
 * signature so the workbench call site stays unchanged.
 */
export function StageTransition({ number, title, message, button, onContinue, onBack }: StageTransitionProps) {
  return (
    <section className={styles.transition} data-present="stage-transition" aria-live="polite">
      <div className={styles.copy}>
        <span className={styles.eyebrow}>第 {number} 阶段 · 下一阶段</span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message}>下一步：{message}</p>
      </div>
      <div className={styles.actions}>
        <ActionButton variant="secondary" onClick={onBack} aria-label="返回查看上一阶段">返回查看</ActionButton>
        <ActionButton variant="primary" onClick={onContinue}>{button}</ActionButton>
      </div>
    </section>
  );
}
