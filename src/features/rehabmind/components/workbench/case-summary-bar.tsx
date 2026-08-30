import { getGoalLabel, type IntakeState } from "@/src/features/rehabmind/components/workbench/workbench-support";

/** 案例栏：主诉摘要与安全状态；数据全部来自现有 intake，不新增事实源。 */
export function CaseSummaryBar({ intake, needsOfflineReview, onEditComplaint }: {
  intake: IntakeState;
  needsOfflineReview: boolean;
  onEditComplaint: () => void;
}) {
  const facts = [
    { label: "部位", value: [intake.location, intake.side].filter(Boolean).join(" · ") || "待补充" },
    { label: "性质", value: intake.symptomType || "待补充" },
    { label: "时间", value: [intake.onset, intake.mechanism].filter((item) => item && item !== "没有明确受伤").join(" · ") || "待补充" },
    { label: "安全", value: needsOfflineReview ? "需线下确认" : "无明显风险" },
    { label: "目标", value: getGoalLabel(intake.goal) },
  ];
  return <section className="rm-case-bar" data-testid="case-summary-bar">
    <div className="rm-case-bar-complaint"><span>主诉原话</span><strong>{intake.description || "未记录"}</strong></div>
    <dl className="rm-case-bar-facts">{facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
    <button type="button" onClick={onEditComplaint}>修改主诉</button>
  </section>;
}
