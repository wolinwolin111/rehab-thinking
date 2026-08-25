"use client";

import { useMemo, useState } from "react";
import {
  buildKneeDecision,
  type KneeDecisionInput,
  type KneeProblem,
  type KneeTreatmentUnit,
} from "../knee-decision-core";
import styles from "./knee-decision-lab.module.css";

type LabCase = {
  id: string;
  eyebrow: string;
  title: string;
  complaint: string;
  input: KneeDecisionInput;
};

const CASES: LabCase[] = [
  {
    id: "medial-step-down",
    eyebrow: "案例 01 · 主诉优先",
    title: "右膝内侧下楼疼",
    complaint: "下楼梯时右膝内侧酸痛，6分；膝盖绷直比左侧差。",
    input: {
      role: "general",
      complaints: [{ id: "chief-medial", side: "right", location: "膝内侧", sensation: "酸痛", action: "下楼梯", score: 6 }],
      findings: [
        { id: "extension-limited", kind: "motion-range", side: "right", action: "膝盖绷直", direction: "extension", result: "limited", activeRange: "limited", passiveRange: "not-checked", locations: ["大腿外侧"] },
        { id: "medial-tender", kind: "tenderness", side: "right", result: "painful", locations: ["鹅足周围", "大腿内侧"] },
      ],
    },
  },
  {
    id: "anterior-knee",
    eyebrow: "案例 02 · 局部证据",
    title: "膝下痛并屈膝受限",
    complaint: "下台阶时膝下刺痛，蹲下和屈膝末端也不舒服。",
    input: {
      role: "general",
      complaints: [{ id: "chief-anterior", side: "right", location: "膝下", sensation: "刺痛", action: "下台阶", score: 5 }],
      findings: [
        { id: "anterior-tender", kind: "tenderness", side: "right", result: "painful", locations: ["股直肌", "大腿前侧"] },
        { id: "flexion-limited", kind: "motion-range", side: "right", action: "屈膝", direction: "flexion", result: "limited", activeRange: "limited", passiveRange: "not-checked" },
        { id: "squat-painful", kind: "motion-symptom", side: "right", action: "下蹲", result: "painful", symptomScore: 4 },
      ],
    },
  },
  {
    id: "swelling",
    eyebrow: "案例 03 · 延后复查",
    title: "急性肿胀",
    complaint: "运动后右膝周围明显肿胀，目前说不清固定疼痛动作。",
    input: {
      role: "general",
      complaints: [{ id: "chief-swelling", side: "right", location: "右膝周围", sensation: "肿胀" }],
      findings: [{ id: "swelling-knee", kind: "swelling", side: "right", result: "painful", locations: ["髌骨周围"] }],
    },
  },
  {
    id: "joint-before",
    eyebrow: "案例 04 · 关节松动门槛",
    title: "肌肉处理前",
    complaint: "专业人员确认主动、被动伸直都比健侧差，外侧链紧张。",
    input: {
      role: "rehab",
      complaints: [{ id: "chief-before", side: "right", location: "膝后侧", sensation: "牵扯感", action: "膝盖绷直", score: 4 }],
      findings: [{ id: "extension-before", kind: "motion-range", side: "right", action: "膝盖绷直", direction: "extension", result: "limited", activeRange: "limited", passiveRange: "limited", locations: ["大腿外侧"] }],
    },
  },
  {
    id: "joint-after",
    eyebrow: "案例 05 · 关节松动门槛",
    title: "一组相关肌肉处理后",
    complaint: "外侧链已处理，但主动、被动伸直仍比健侧差。",
    input: {
      role: "rehab",
      complaints: [{ id: "chief-after", side: "right", location: "膝后侧", sensation: "牵扯感", action: "膝盖绷直", score: 3 }],
      findings: [{ id: "extension-after", kind: "motion-range", side: "right", action: "膝盖绷直", direction: "extension", result: "limited", activeRange: "limited", passiveRange: "limited", locations: ["大腿外侧"] }],
      completedTreatments: [{ unitId: "lateral-done", dedupKey: "right:muscle:lateral-chain", completedAt: 1, relatedActionIds: ["knee-extension"] }],
      observations: [{
        id: "extension-after-lateral",
        actionId: "knee-extension",
        treatmentSequence: 1,
        problemIds: ["problem:extension-after"],
        values: { "active-range": "limited", "passive-range": "limited" },
      }],
    },
  },
  {
    id: "vague-complaint",
    eyebrow: "案例 06 · 信息不清",
    title: "只能说出膝内侧不适",
    complaint: "右膝内侧不舒服，但说不清哪个动作最明显。",
    input: {
      role: "general",
      complaints: [{ id: "chief-vague", side: "right", location: "膝内侧", sensation: "不舒服" }],
      findings: [],
    },
  },
  {
    id: "posterior-flexion",
    eyebrow: "案例 07 · 局部支持",
    title: "膝后弯曲受限",
    complaint: "右膝弯到末端时膝后牵扯，膝后和小腿上端更紧。",
    input: {
      role: "general",
      complaints: [{ id: "chief-flexion", side: "right", location: "膝后", sensation: "牵扯感", action: "弯膝", score: 4 }],
      findings: [{ id: "flexion-posterior", kind: "motion-range", side: "right", action: "弯膝", direction: "flexion", result: "limited", activeRange: "limited", passiveRange: "not-checked", locations: ["膝后", "小腿上端"] }],
    },
  },
  {
    id: "control-training",
    eyebrow: "案例 08 · 转入训练",
    title: "下台阶不稳且大腿前侧弱",
    complaint: "右腿下台阶时膝盖控制不稳，大腿前侧力量比左侧弱。",
    input: {
      role: "general",
      complaints: [{ id: "chief-control", side: "right", location: "右膝", sensation: "不稳", action: "下台阶" }],
      findings: [
        { id: "step-control", kind: "function-control", side: "right", action: "下台阶", result: "unstable" },
        { id: "quadriceps-weak", kind: "strength", side: "right", result: "weak", locations: ["股四头肌"] },
      ],
    },
  },
  {
    id: "chief-improved",
    eyebrow: "案例 09 · 主诉已改善",
    title: "下楼好转但伸直仍受限",
    complaint: "下楼由6分降到3分；膝盖绷直仍比左侧差。",
    input: {
      role: "general",
      complaints: [{ id: "chief-improved", side: "right", location: "膝内侧", sensation: "酸痛", action: "下楼梯", score: 6 }],
      findings: [{ id: "extension-remains", kind: "motion-range", side: "right", action: "膝盖绷直", direction: "extension", result: "limited", activeRange: "limited", passiveRange: "not-checked", locations: ["大腿外侧"] }],
      observations: [
        { id: "step-improved", actionId: "step-down", treatmentSequence: 1, problemIds: [], values: { score: 3 } },
        { id: "extension-remains", actionId: "knee-extension", treatmentSequence: 1, problemIds: [], values: { "active-range": "limited" } },
      ],
    },
  },
  {
    id: "final-chief-retest",
    eyebrow: "案例 10 · 最后统一复测",
    title: "其他问题已经处理完",
    complaint: "下楼曾由6分降到3分；膝盖伸直已经恢复到和左侧接近。",
    input: {
      role: "general",
      complaints: [{ id: "chief-final", side: "right", location: "膝内侧", sensation: "酸痛", action: "下楼梯", score: 6 }],
      findings: [{ id: "extension-restored", kind: "motion-range", side: "right", action: "膝盖绷直", direction: "extension", result: "limited", activeRange: "limited", passiveRange: "not-checked", locations: ["大腿外侧"] }],
      observations: [
        { id: "step-improved-final", actionId: "step-down", treatmentSequence: 2, problemIds: [], values: { score: 3 } },
        { id: "extension-matches-final", actionId: "knee-extension", treatmentSequence: 2, problemIds: [], values: { "active-range": "matches" } },
      ],
    },
  },
];

const KIND_LABEL: Record<KneeProblem["kind"], string> = {
  "chief-symptom": "主诉",
  "motion-range": "活动受限",
  "motion-symptom": "动作不适",
  strength: "力量",
  "function-control": "动作控制",
  swelling: "肿胀",
  tenderness: "按压异常",
  sensory: "感觉异常",
  boundary: "需确认",
};

const TREATMENT_LABEL: Record<KneeTreatmentUnit["kind"], string> = {
  "symptom-management": "症状管理",
  muscle: "肌肉处理",
  joint: "关节松动",
  control: "主动控制",
};

const STATUS_LABEL: Partial<Record<KneeProblem["status"], string>> = {
  improved: "已有改善",
  resolved: "已完成",
  "still-present": "仍需处理",
  "handoff-to-training": "进入训练",
  "review-later": "之后复查",
};

const ACTION_LABEL: Record<string, string> = {
  "knee-extension": "膝盖绷直",
  "knee-flexion": "屈膝",
  "step-down": "下台阶",
  "step-up": "上台阶",
  squat: "下蹲",
  "sit-to-stand": "坐下再站起",
  walk: "走路",
  run: "跑步",
  "jump-land": "跳跃落地",
  "single-leg-balance": "单腿站",
  "single-leg-squat": "单腿下蹲",
  "hip-hinge": "站立屈髋",
  "unknown-task": "原症状位置",
};

function roleName(role: KneeDecisionInput["role"]) {
  return role === "rehab" ? "康复专业人员" : role === "coach" ? "教练" : "普通用户";
}

export default function KneeDecisionLab() {
  const [activeCaseId, setActiveCaseId] = useState(CASES[0].id);
  const activeCase = CASES.find((item) => item.id === activeCaseId) ?? CASES[0];
  const decision = useMemo(() => buildKneeDecision(activeCase.input), [activeCase]);
  const current = decision.currentTreatment;
  const displayedRetests = decision.retestPlan.length ? decision.retestPlan : decision.finalRetestPlan;
  const isFinalRetest = !decision.retestPlan.length && decision.finalRetestPlan.length > 0;

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>REHABMIND · KNEE PILOT</p>
          <h1>膝关节决策对照页</h1>
        </div>
        <div className={styles.headerMeta}>
          <span>内部审核</span>
          <strong>{roleName(activeCase.input.role)}</strong>
        </div>
      </header>

      <nav className={styles.caseRail} aria-label="选择测试案例">
        {CASES.map((item) => (
          <button key={item.id} type="button" className={item.id === activeCase.id ? styles.activeCase : ""} onClick={() => setActiveCaseId(item.id)}>
            <span>{item.eyebrow}</span>
            <strong>{item.title}</strong>
          </button>
        ))}
      </nav>

      <section className={styles.complaintCard}>
        <div className={styles.stepNumber}>01</div>
        <div>
          <span className={styles.sectionLabel}>收集到的信息</span>
          <p>{activeCase.complaint}</p>
        </div>
      </section>

      <section className={styles.traceGrid}>
        <article className={styles.traceColumn}>
          <div className={styles.columnHead}>
            <span>02</span>
            <div><small>识别结果</small><h2>需要处理的问题</h2></div>
          </div>
          <div className={styles.cardStack}>
            {decision.problems.map((problem) => (
              <div className={`${styles.problemCard} ${problem.id === decision.currentProblemId ? styles.primaryProblem : ""}`} key={problem.id}>
                <div className={styles.cardTop}><span>{KIND_LABEL[problem.kind]}</span><b>{STATUS_LABEL[problem.status] ?? (problem.id === decision.currentProblemId ? "当前优先" : "后续跟进")}</b></div>
                <strong>{problem.title}</strong>
                <p>{problem.metrics.map((metric) => ({ score: "不适分数", "active-range": "主动范围", "passive-range": "被动范围", control: "动作稳定", strength: "力量", swelling: "肿胀", tenderness: "按压位置" })[metric]).join(" · ") || "已记录位置"}</p>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.traceColumn}>
          <div className={styles.columnHead}>
            <span>03</span>
            <div><small>决策输出</small><h2>处理顺序</h2></div>
          </div>
          <div className={styles.cardStack}>
            {decision.treatmentUnits.length ? decision.treatmentUnits.map((unit) => (
              <div className={`${styles.treatmentCard} ${unit.id === current?.id ? styles.currentTreatment : ""}`} key={unit.id}>
                <div className={styles.cardTop}>
                  <span>{TREATMENT_LABEL[unit.kind]}</span>
                  <b>{unit.id === current?.id && unit.mode === "retest-only" ? "现在复测" : unit.mode === "retest-only" ? "已处理" : unit.id === current?.id ? "现在做" : "待处理"}</b>
                </div>
                <strong>{unit.site}</strong>
                <p>{unit.action}</p>
                {!!unit.relatedActionIds.length && <div className={styles.actionChips}>{unit.relatedActionIds.map((id) => <span key={id}>{ACTION_LABEL[id]}</span>)}</div>}
              </div>
            )) : decision.assessmentChecks.length ? decision.assessmentChecks.map((check) => (
              <div className={`${styles.treatmentCard} ${styles.currentTreatment}`} key={check.id}>
                <div className={styles.cardTop}><span>下一项检查</span><b>现在做</b></div>
                <strong>{check.title}</strong>
                <p>{check.instruction}</p>
                <div className={styles.checkRecord}>{check.record}</div>
              </div>
            )) : <div className={styles.emptyCard}>当前没有需要继续执行的处理。</div>}
          </div>
        </article>

        <article className={styles.traceColumn}>
          <div className={styles.columnHead}>
            <span>04</span>
            <div><small>当前处理之后</small><h2>只复测这些</h2></div>
          </div>
          <div className={styles.cardStack}>
            {displayedRetests.length ? displayedRetests.map((item) => (
              <div className={styles.retestCard} key={`${item.actionId}-${item.problemIds.join("-")}`}>
                <div className={styles.cardTop}><span>{isFinalRetest ? "最后统一复测" : item.timing === "later" ? "稍后/下次" : "当场"}</span>{item.reuseObservationId && <b>复用已有结果</b>}</div>
                <strong>{ACTION_LABEL[item.actionId] ?? item.title}</strong>
                <p>{item.metrics.map((metric) => ({ score: "重新选不适分数", "active-range": "与健侧比较", "passive-range": "与健侧比较", control: "看动作是否更稳", strength: "记录力量", swelling: "观察肿胀变化", tenderness: "记录按压范围" })[metric]).join(" · ")}</p>
              </div>
            )) : <div className={styles.emptyCard}>{current ? "这项处理不安排当场重复检查。" : "完成评估后再生成复测。"}</div>}
          </div>
        </article>
      </section>

      <footer className={styles.auditBar}>
        <div><span>本页核对重点</span><strong>是否漏掉处理 · 是否重复处理 · 是否重复复测</strong></div>
        <div className={styles.ruleStatus}><i /> 决策引擎实时输出</div>
      </footer>
    </main>
  );
}
