"use client";

import { useMemo, useState } from "react";

type CaseKey = "knee" | "shoulder" | "back" | "ankle" | "hamstring";
type TrendValue = "unknown" | "better" | "same" | "worse";
type DecisionKey = "progress" | "maintain" | "reduce" | "reroute";

type PlanModule = {
  id: string;
  label: string;
  title: string;
  goal: string;
  action: string;
  standardDose: string;
  gentleDose: string;
  retest: string;
};

const PHASES: Record<CaseKey, string[]> = {
  knee: ["减轻反应", "恢复活动", "增加力量", "回到训练"],
  shoulder: ["减轻反应", "恢复上举", "增加力量", "回到训练"],
  back: ["恢复活动", "增加耐受", "回到负荷", "自主训练"],
  ankle: ["保护消肿", "恢复走路", "恢复活动", "力量平衡", "楼梯与专项"],
  hamstring: ["舒适收缩", "动态力量", "跑动准备", "回到专项"],
};

const TREND_LABELS: Record<TrendValue, string> = {
  unknown: "未选",
  better: "更好",
  same: "差不多",
  worse: "更差",
};

const DECISIONS: Record<DecisionKey, { label: string; next: string }> = {
  progress: {
    label: "可以进一点",
    next: "保持当前动作，只增加一个变量。",
  },
  maintain: {
    label: "先保持",
    next: "继续当前剂量，下次仍复测同一项。",
  },
  reduce: {
    label: "先降一点",
    next: "减少范围、强度或总量，再观察一天。",
  },
  reroute: {
    label: "重新评估",
    next: "先处理新出现的情况，不沿用旧方案进阶。",
  },
};

function decide(
  results: TrendValue[],
  response: string,
  hasNewSignal: boolean,
): DecisionKey {
  if (hasNewSignal) return "reroute";
  if (response === "仍在加重" || results.some((item) => item === "worse")) {
    return "reduce";
  }
  const answered = results.filter((item) => item !== "unknown");
  const better = results.filter((item) => item === "better").length;
  if (
    answered.length > 0 &&
    better >= Math.ceil(answered.length / 2) &&
    response === "已经稳定"
  ) {
    return "progress";
  }
  return "maintain";
}

export default function FollowUpWorkspace({
  caseKey,
  retestMetrics,
  planModules,
  highIrritability,
  onFullReassessment,
}: {
  caseKey: CaseKey;
  caseLabel: string;
  routeLabel: string;
  initialPain: number;
  baselineSummary: string[];
  retestMetrics: string[];
  planModules: PlanModule[];
  highIrritability: boolean;
  onFullReassessment: () => void;
}) {
  const visibleMetrics = retestMetrics.slice(0, 2);
  const [metricResults, setMetricResults] = useState<TrendValue[]>(
    visibleMetrics.map(() => "unknown"),
  );
  const [response, setResponse] = useState("");
  const [hasNewSignal, setHasNewSignal] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [version, setVersion] = useState(1);
  const [savedMessage, setSavedMessage] = useState("");

  const phases = PHASES[caseKey];
  const decision = useMemo(
    () => decide(metricResults, response, hasNewSignal),
    [metricResults, response, hasNewSignal],
  );
  const decisionCopy = DECISIONS[decision];
  const canSave =
    hasNewSignal ||
    (response !== "" && metricResults.some((item) => item !== "unknown"));
  const currentPlan =
    planModules[Math.min(phaseIndex, Math.max(planModules.length - 1, 0))];

  function setMetric(index: number, value: TrendValue) {
    setMetricResults((current) =>
      current.map((item, itemIndex) => itemIndex === index ? value : item),
    );
  }

  function save() {
    if (!canSave) return;
    if (decision === "progress") {
      setPhaseIndex((current) => Math.min(current + 1, phases.length - 1));
    }
    setVersion((current) => current + 1);
    setSavedMessage("已保存");
    window.setTimeout(() => setSavedMessage(""), 1600);
  }

  return (
    <section className="followup-workspace compact">
      <header className="followup-compact-head">
        <div>
          <span>下次复测</span>
          <h1>只看上次这几项</h1>
        </div>
        <strong>V{version} · {phases[phaseIndex]}</strong>
      </header>

      <section className="new-signal-check compact">
        <span>有没有新情况？</span>
        <div>
          <button
            type="button"
            className={!hasNewSignal ? "selected" : ""}
            onClick={() => setHasNewSignal(false)}
          >
            没有
          </button>
          <button
            type="button"
            className={hasNewSignal ? "selected danger" : ""}
            onClick={() => setHasNewSignal(true)}
          >
            有
          </button>
        </div>
      </section>

      <section className="metric-retest compact">
        {visibleMetrics.map((metric, index) => (
          <article key={metric}>
            <strong>{metric}</strong>
            <div>
              {(["better", "same", "worse"] as TrendValue[]).map((value) => (
                <button
                  type="button"
                  key={value}
                  className={metricResults[index] === value ? `selected ${value}` : ""}
                  onClick={() => setMetric(index, value)}
                >
                  {TREND_LABELS[value]}
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="followup-reaction">
        <strong>当天或第二天</strong>
        <div>
          {["已经稳定", "有点反复", "仍在加重"].map((option) => (
            <button
              type="button"
              key={option}
              className={response === option ? "selected" : ""}
              onClick={() => setResponse(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      {canSave && (
        <section className={`decision-preview compact ${decision}`}>
          <span>下一步</span>
          <h2>{decisionCopy.label}</h2>
          <p>{decisionCopy.next}</p>
        </section>
      )}

      {currentPlan && !hasNewSignal && (
        <section className="current-action">
          <span>继续做</span>
          <h2>{currentPlan.title}</h2>
          <p>{currentPlan.action}</p>
          <strong>{highIrritability ? currentPlan.gentleDose : currentPlan.standardDose}</strong>
        </section>
      )}

      <div className="followup-actions compact">
        <button type="button" className="outline-button" onClick={onFullReassessment}>
          重新评估
        </button>
        <button type="button" className="solid-button coral" disabled={!canSave} onClick={save}>
          保存本次复测
        </button>
      </div>

      {savedMessage && <div className="journal-toast">{savedMessage}</div>}
    </section>
  );
}
