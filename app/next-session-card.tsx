import { useState } from "react";
import { formatRecommendedDateRange, type NextSessionRecommendation } from "./next-session-recommendation-core";

export function NextSessionCard({ recommendation, nextSessionNumber, completedAt, onStart, onReportWorsening }: { recommendation: NextSessionRecommendation; nextSessionNumber: number; completedAt?: string; onStart?: () => void; onReportWorsening?: () => void }) {
  const [renderedAt] = useState(() => Date.now());
  const completedDate = completedAt ? new Date(completedAt) : new Date(renderedAt);
  const dateLabel = formatRecommendedDateRange(completedDate, recommendation);
  const earliestStart = recommendation.earliestDays === undefined ? null : new Date(completedDate.getTime() + recommendation.earliestDays * 86_400_000);
  const startingEarly = Boolean(earliestStart && renderedAt < earliestStart.getTime());
  const start = () => {
    if (startingEarly && !window.confirm("还没到建议复查时间。只有出现新变化、明显加重或专业人员另有安排时才建议提前开始。仍要开始吗？")) return;
    onStart?.();
  };
  return <section className={`rm-next-session-card is-${recommendation.mode}`}>
    <header><div><span>下次康复建议</span><h2>{recommendation.label}</h2></div><strong>{dateLabel}</strong></header>
    <div className="rm-next-session-grid">
      <article><span>这几天</span><ul>{recommendation.interimChecks.map((item) => <li key={item}>{item}</li>)}</ul></article>
      <article><span>可以开始时</span><p>{recommendation.startCondition}</p></article>
      <article><span>提前复查</span><p>{recommendation.earlyReviewTriggers.join("、")}</p></article>
    </div>
    <footer><small>当天和第二天的反应记录不算新的一次康复。</small><div>{onReportWorsening ? <button type="button" onClick={onReportWorsening}>记录加重反应</button> : null}{recommendation.mode === "scheduled" && onStart ? <button type="button" className="rm-primary" onClick={start}>{startingEarly ? "提前开始" : "开始"}第{nextSessionNumber}次康复</button> : null}</div></footer>
  </section>;
}