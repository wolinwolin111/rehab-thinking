import { CSSProperties, FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

/** 处理流程路线图：已完成 / 正在做 / 接下来。 */
export function TreatmentRoadmap({ completed, current, upcoming }: { completed: string[]; current: string; upcoming: string[] }) {
  return <section className="rm-treatment-roadmap">
    <header><div><span>本次流程</span></div><b>已完成 {completed.length} 项</b></header>
    <ol>
      <li className="is-done"><i>✓</i><div><span>已完成</span><section>{completed.length ? completed.slice(-4).map((label) => <b key={label}>{label}</b>) : <b>评估检查</b>}</section></div></li>
      <li className="is-current"><i>现在</i><div><span>正在做</span><strong>{current}</strong></div></li>
      <li className="is-next"><i>{upcoming.length}</i><div><span>接下来</span><section>{upcoming.length ? upcoming.map((label, index) => <b key={`${label}:${index}`}><em>{index + 1}</em>{label}</b>) : <b><em>1</em>针对性训练</b>}</section></div></li>
    </ol>
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
  return <section className={`rm-score ${compact ? "is-compact" : ""} ${selected && !currentDraft.dirty ? "is-recorded" : ""}`}>
    <div className="rm-score-head"><div><span>{label}</span>{context ? <strong>{context}</strong> : null}</div><output>{selected || currentDraft.dirty ? displayedValue : "—"}<small>/10</small></output></div>
    <input aria-label={label} type="range" min="0" max="10" step="1" value={displayedValue} onInput={handleSliderChange} onChange={commitDraft} onBlur={commitDraft} onPointerUp={commitDraft} onMouseUp={commitDraft} onTouchEnd={commitDraft} onKeyDown={handleSliderKeyDown} style={{ "--score": `${displayedValue * 10}%` } as CSSProperties} />
    <div className="rm-score-scale"><span>0 · 没有疼痛或不适</span><span>10 · 极重，无法继续当前动作</span></div>
    <div className="rm-score-guide"><span><b>1～3</b>轻微，基本不影响动作</span><span><b>4～6</b>明显，会影响动作</span><span><b>7～9</b>很重，难以继续</span></div>
    <p className="rm-score-status">{selected && !currentDraft.dirty ? "已记录" : "拖动后松手即可记录"}</p>
  </section>;
}

export function ScoreHistory({ scores, condition }: { scores: number[]; condition: string }) {
  return <section className="rm-score-history">
    <header><span>之前的评分参考</span><strong>{condition || "同一个动作 · 同样条件"}</strong></header>
    <div>{scores.map((score, index, list) => <article key={`${index}:${score}`}><i>{index + 1}</i><span>{index === 0 ? "初次评估" : `第${index}次康复结束`}</span><b>{score}<small>/10</small></b>{index < list.length - 1 ? <em>→</em> : null}</article>)}</div>
  </section>;
}

export function StepHeading({ eyebrow, title, note, current, total }: { eyebrow: string; title: string; note?: string; current?: number; total?: number }) {
  return <header className="rm-heading"><div><span>{eyebrow}</span><h1>{title}</h1>{note ? <p>{note}</p> : null}</div>{typeof current === "number" && total ? <b>{current + 1}<small>/{total}</small></b> : null}</header>;
}
