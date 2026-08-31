/**
 * 「本阶段成果」共享展示区块。
 *
 * 处理复测结束后的阶段成果页在「仍有待处理」与「处理完成」两个分支中复用同一组
 * 展示区块：有效处理、活动范围变化、后续观察、力量/控制问题。抽成组件避免两处
 * 重复的 JSX。只接收已归一化的标签数组，与页面状态解耦。
 *
 * 展示上采用「一张清单表」：各信息平铺成行（类别 | 名称 | 状态），共用容器，
 * 避免三张等权空卡堆叠。分类词与类名保持不变，仅供样式与测试定位。
 */

export type ChiefOutcomeSummaryProps = {
  chiefScoreComparable: boolean;
  chiefImproved: boolean;
  noImmediateTreatmentResponse: boolean;
  baselineScore: number;
  lastChiefScore: number;
  /** 主诉动作降级行展示的动作名，来自 reportedActionSummary。 */
  reportedActions: Array<string | undefined>;
  hasClearChiefAction: boolean;
  /** 双侧主诉不可比分时显示「已分别记录两侧的整体感受」。 */
  bilateralNoScore?: boolean;
  /** 没有固定加重动作时的兜底文案。 */
  noActionCopy: string;
};

/**
 * 主诉结论标题 + 分数/降级行。「本轮处理已完成」与 guided 链路「本阶段成果」
 * 两个完成面板共用，标题只陈述复查结论，不再用主诉动作清单冒充已处理项。
 */
export function ChiefOutcomeSummary(props: ChiefOutcomeSummaryProps) {
  const { chiefScoreComparable, chiefImproved, noImmediateTreatmentResponse, baselineScore, lastChiefScore, reportedActions, hasClearChiefAction, bilateralNoScore = false, noActionCopy } = props;
  return <>
    <h2>{chiefScoreComparable && noImmediateTreatmentResponse ? "主诉暂无明显变化" : chiefImproved ? "主诉变轻" : "主诉动作已复查"}</h2>
    {chiefScoreComparable
      ? <div className="rm-final-score"><b>{baselineScore}</b><i>→</i><strong>{lastChiefScore}</strong><small>下降 {Math.max(0, baselineScore - lastChiefScore)} 分</small></div>
      : bilateralNoScore && hasClearChiefAction
        ? <div className="rm-no-score-summary"><strong>已分别记录两侧的整体感受</strong></div>
        : hasClearChiefAction
          ? <p className="rm-chief-action-line">主诉动作：{reportedActions.join("、")}</p>
          : <p>{noActionCopy}</p>}
  </>;
}

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
  const hasEffective = effectiveFocusLabels.length > 0 || effectiveControlLabels.length > 0;
  const hasRange = recoveredRangeLabels.length > 0 || improvedRangeLabels.length > 0;
  const hasObservation = trackObservationLabels.length > 0;
  const hasStrength = strengthProblemTitles.length > 0;
  if (!hasEffective && !hasRange && !hasObservation && !hasStrength) return null;
  return <>
    {hasEffective || hasRange || hasObservation ? <section className="rm-stage-outcome-table">
      {hasEffective ? <section className="rm-stage-outcome-effective">
        <span className="rm-stage-outcome-kind">有效处理</span>
        <div className="rm-stage-outcome-rows">
          {effectiveFocusLabels.map((label) => <div className="rm-stage-outcome-row" key={`focus-${label}`}><strong>{label}</strong><small>主诉变轻</small></div>)}
          {effectiveControlLabels.map((label) => <div className="rm-stage-outcome-row" key={`control-${label}`}><strong>{label}</strong><small>主诉变轻</small></div>)}
        </div>
      </section> : null}
      {hasRange ? <section className="rm-stage-outcome-range">
        <span className="rm-stage-outcome-kind">活动范围变化</span>
        <div className="rm-stage-outcome-rows">
          {recoveredRangeLabels.map((label) => <div className="rm-stage-outcome-row" key={`recover-${label}`}><strong>{label}</strong><small>已接近健侧</small></div>)}
          {improvedRangeLabels.map((label) => <div className="rm-stage-outcome-row" key={`improve-${label}`}><strong>{label}</strong><small>有改善，仍小于健侧</small></div>)}
        </div>
      </section> : null}
      {hasObservation ? <section className="rm-stage-outcome-track">
        <span className="rm-stage-outcome-kind">后续观察</span>
        <div className="rm-stage-outcome-rows">
          {trackObservationLabels.map((label) => <div className="rm-stage-outcome-row" key={`track-${label}`}><strong>{label}</strong></div>)}
        </div>
      </section> : null}
    </section> : null}
    {hasStrength ? <section className="rm-strength-handoff"><strong>还有力量或控制问题</strong><span>{strengthProblemTitles.join("、")}</span><small>训练阶段会安排对应练习。</small></section> : null}
  </>;
}
