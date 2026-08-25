import { CSSProperties, FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { scoreGuideLabel } from "./score-guide-copy";

/** 处理流程路线图：已完成 / 正在做 / 接下来。 */
export function TreatmentRoadmap({ completed, current, upcoming }: { completed: Array<{ label: string; summary?: string }>; current: string; upcoming: string[] }) {
  return <section className="rm-treatment-roadmap">
    <header><span>现在做</span><strong>{current}</strong></header>
    <details>
      <summary><span>查看本轮进度</span><b>已完成 {completed.length} 项</b></summary>
      <div className="rm-roadmap-stage is-done">
        <span className="rm-roadmap-status">已完成</span>
        <ul>{completed.length ? completed.slice(-4).map((item) => <li key={item.label}><i>✓</i><span>{item.label}{item.summary ? <small>{item.summary}</small> : null}</span></li>) : <li><i>✓</i>评估检查</li>}</ul>
      </div>
      <div className="rm-roadmap-stage is-next">
        <span className="rm-roadmap-status">接下来</span>
        <ol>{upcoming.length ? upcoming.map((label, index) => <li key={`${label}:${index}`}><em>{index + 1}</em>{label}</li>) : <li><em>1</em>针对性训练</li>}</ol>
      </div>
    </details>
  </section>;
}

/** 单选胶囊选项。 */
export function PillOptions({ options, value, onChange, columns = 2 }: { options: string[]; value: string; onChange: (value: string) => void; columns?: number }) {
  return <div className="rm-options" style={{ "--columns": columns } as CSSProperties}>{options.map((option) => <button type="button" key={option} className={value === option ? "is-selected" : ""} onClick={() => onChange(option)}>{option}</button>)}</div>;
}

/**
 * 评估和复测共用的结果选项：按钮第一行只放结论，第二行再给很短的说明。
 * 这样不会把“结果、原因和下一步决策”全部挤在同一行，也不会改变原有值域。
 */
export function AnswerChoiceGrid<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: ReadonlyArray<readonly [T, string]>;
  value?: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return <div className={`rm-result-grid rm-answer-grid ${className}`.trim()}>
    {options.map(([optionValue, label]) => {
      const [title, hint] = label.split("｜", 2);
      return <button type="button" key={optionValue} className={value === optionValue ? "is-selected" : ""} onClick={() => onChange(optionValue)}>
        <strong>{title}</strong>
        {hint ? <small>{hint}</small> : null}
      </button>;
    })}
  </div>;
}

export function ScoreSlider({ value, onChange, label, context, compact = false, selected = true }: { value: number; onChange: (value: number) => void; label: string; context?: string; compact?: boolean; selected?: boolean }) {
  const sourceKey = `${selected}:${value}:${context ?? ""}`;
  const initialDraft = selected ? value : 0;
  const [draftState, setDraftState] = useState({ sourceKey, value: initialDraft, dirty: false });
  const currentDraft = useMemo(
    () => draftState.sourceKey === sourceKey ? draftState : { sourceKey, value: initialDraft, dirty: false },
    [draftState, sourceKey, initialDraft],
  );
  const sliderStateRef = useRef(currentDraft);
  useEffect(() => {
    sliderStateRef.current = currentDraft;
  }, [currentDraft]);
  const handleSliderChange = (event: FormEvent<HTMLInputElement>) => {
    const nextValue = Number(event.currentTarget.value);
    // 评分条的值必须在输入事件发生时就同步到业务状态。
    // 仅依赖 pointerup/change 会让键盘、辅助技术和自动化输入出现“看得到数值、但仍未记录”的卡死。
    const next = { sourceKey, value: nextValue, dirty: false };
    sliderStateRef.current = next;
    setDraftState(next);
    onChange(nextValue);
  };
  const commitDraft = () => {
    const latest = sliderStateRef.current;
    if (latest.sourceKey !== sourceKey) return;
    if (latest.dirty) {
      sliderStateRef.current = { ...latest, dirty: false };
      setDraftState({ ...latest, dirty: false });
      onChange(latest.value);
    }
  };
  const handleSliderKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const steps: Partial<Record<string, number>> = {
      ArrowLeft: -1,
      ArrowDown: -1,
      ArrowRight: 1,
      ArrowUp: 1,
      PageDown: -2,
      PageUp: 2,
    };
    const nextValue = event.key === "Home"
      ? 0
      : event.key === "End"
        ? 10
        : Math.min(10, Math.max(0, currentDraft.value + (steps[event.key] ?? 0)));
    if (!(event.key in steps) && !["Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = { sourceKey: `${true}:${nextValue}:${context ?? ""}`, value: nextValue, dirty: false };
    sliderStateRef.current = next;
    setDraftState(next);
    onChange(nextValue);
  };
  const draft = currentDraft.value;
  const displayedValue = draft;
  const hasDisplayedScore = selected || currentDraft.dirty;
  return <section className={`rm-score ${compact ? "is-compact" : ""} ${selected && !currentDraft.dirty ? "is-recorded" : ""}`}>
    <div className="rm-score-head"><div><span>{label}</span>{context ? <strong>{context}</strong> : null}</div><output>{selected || currentDraft.dirty ? displayedValue : "—"}<small>/10</small></output></div>
    <input aria-label={label} type="range" min="0" max="10" step="1" value={displayedValue} onInput={handleSliderChange} onChange={commitDraft} onBlur={commitDraft} onPointerUp={commitDraft} onMouseUp={commitDraft} onTouchEnd={commitDraft} onKeyDown={handleSliderKeyDown} style={{ "--score": `${displayedValue * 10}%` } as CSSProperties} />
    <div className="rm-score-scale"><span>0 · 没有疼痛或不适</span><span>10 · 能想象到的最严重</span></div>
    <p className="rm-score-guide" aria-live="polite">{hasDisplayedScore ? `${displayedValue}/10 · ${scoreGuideLabel(displayedValue)}` : "拖动后显示当前程度"}</p>
    <p className="rm-score-status">{selected && !currentDraft.dirty ? "已记录" : "拖动后松手即可记录"}</p>
  </section>;
}

export function ScoreHistory({ scores, condition }: { scores: number[]; condition: string }) {
  return <section className="rm-score-history">
    <header><span>之前的评分参考</span><strong>{condition || "同一个动作 · 同样条件"}</strong></header>
    <div>{scores.map((score, index, list) => <article key={`${index}:${score}`}><i>{index + 1}</i><span>{index === 0 ? "初次评估" : `第${index}次康复结束`}</span><b>{score}<small>/10</small></b>{index < list.length - 1 ? <em>→</em> : null}</article>)}</div>
  </section>;
}

export function StepHeading({ eyebrow, title, note, current, total, tutorialTarget }: { eyebrow: string; title: string; note?: string; current?: number; total?: number; tutorialTarget?: string }) {
  const stepMatch = eyebrow.match(/第(\d+)步/);
  const stepNum = stepMatch ? Number(stepMatch[1]) : null;
  return <header className="rm-heading" data-rehabmind-tutorial={tutorialTarget}>
    <div><span>{eyebrow}</span><h1>{title}</h1>{note ? <p>{note}</p> : null}{stepNum ? <div className="rm-step-progress" aria-label={`第${stepNum}步，共6步`}>{[1, 2, 3, 4, 5, 6].map((n) => <i key={n} className={n < stepNum ? "is-done" : n === stepNum ? "is-current" : ""} />)}</div> : null}</div>
    {typeof current === "number" && total ? <b>{current + 1}<small>/{total}</small></b> : null}
  </header>;
}

/** 阶段过渡页：展示下一阶段的编号、标题、说明和操作按钮。 */
export function StageTransition({ number, title, message, button, onContinue, onBack }: {
  number: string;
  title: string;
  message: string;
  button: string;
  onContinue: () => void;
  onBack: () => void;
}) {
  return <section className="rm-stage-transition" aria-live="polite">
    <div className="rm-stage-transition-number">{number}</div>
    <div className="rm-stage-transition-copy">
      <span>下一阶段</span>
      <h1>{title}</h1>
      <p>{message}</p>
    </div>
    <div className="rm-stage-transition-actions">
      <button type="button" onClick={onBack}>返回查看</button>
      <button type="button" className="rm-primary" onClick={onContinue}>{button}</button>
    </div>
  </section>;
}
