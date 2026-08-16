/**
 * 「本阶段成果」共享展示区块。
 *
 * 处理复测结束后的阶段成果页在「仍有待处理」与「处理完成」两个分支中复用同一组
 * 展示区块：有效处理、活动范围变化、后续观察、力量/控制问题。抽成组件避免两处
 * 重复的 JSX。只接收已归一化的标签数组，与页面状态解耦。
 */

export type StageOutcomeSectionsProps = {
  effectiveFocusLabels: string[];
  effectiveControlLabels: string[];
  recoveredRangeLabels: string[];
  improvedRangeLabels: string[];
  trackObservationLabels: string[];
  strengthProblemTitles: string[];
};

export function StageOutcomeSections(props: StageOutcomeSectionsProps) {
  const { effectiveFocusLabels, effectiveControlLabels, recoveredRangeLabels, improvedRangeLabels, trackObservationLabels, strengthProblemTitles } = props;
  return <>
    {effectiveFocusLabels.length || effectiveControlLabels.length ? <section className="rm-stage-outcome-effective"><strong>有效处理</strong><div>{effectiveFocusLabels.map((label) => <article key={label}><strong>{label}</strong><small>本轮后主诉变轻，可保留轻柔放松</small></article>)}{effectiveControlLabels.map((label) => <article key={label}><strong>{label}</strong><small>本轮后主诉变轻，可保留练习</small></article>)}</div></section> : null}
    {recoveredRangeLabels.length || improvedRangeLabels.length ? <section className="rm-stage-outcome-range"><strong>活动范围变化</strong><div>{recoveredRangeLabels.map((label) => <article key={label}><strong>{label}</strong><small>已接近健侧</small></article>)}{improvedRangeLabels.map((label) => <article key={label}><strong>{label}</strong><small>有改善，仍小于健侧</small></article>)}</div></section> : null}
    {trackObservationLabels.length ? <section className="rm-stage-outcome-track"><strong>后续观察</strong><span>{trackObservationLabels.join("、")}</span></section> : null}
    {strengthProblemTitles.length ? <section className="rm-strength-handoff"><strong>还有力量或控制问题</strong><span>{strengthProblemTitles.join("、")}</span><small>训练阶段会安排对应练习。</small></section> : null}
  </>;
}
