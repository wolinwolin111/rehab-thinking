"use client";

import { useMemo, useState } from "react";
import { buildLocalLimbDecision, LOCAL_LIMB_LAB_CASES } from "@/src/domain/rehab/shared/local-limb-decision-core";
import styles from "./knee-decision-lab.module.css";

const LABELS: Record<string, string> = {
  "thigh-front-length": "大腿前侧拉长", "thigh-front-strength": "大腿前侧发力", "thigh-front-release": "大腿前侧轻柔松解", "thigh-front-control": "大腿前侧低负荷发力",
  "thigh-back-length": "大腿后侧拉长", "thigh-back-strength": "大腿后侧发力", "thigh-back-release": "大腿后侧轻柔松解", "thigh-back-control": "大腿后侧低负荷发力",
  "thigh-medial-length": "大腿内侧拉长", "thigh-medial-strength": "大腿内侧发力", "thigh-medial-release": "大腿内侧轻柔松解", "thigh-medial-control": "大腿内侧低负荷发力",
  "thigh-lateral-load": "大腿外侧活动", "thigh-lateral-strength": "大腿外侧发力", "thigh-lateral-release": "大腿外侧轻柔松解", "thigh-lateral-control": "大腿外侧低负荷发力",
  "thigh-walk": "走路", "thigh-sit-stand": "坐站", "thigh-jog": "慢跑准备", "thigh-local-isometric": "局部低负荷保持", "thigh-bridge": "臀桥", "thigh-step": "台阶与单腿", "thigh-run-return": "跑步回归",
  "calf-dorsiflexion": "小腿前侧活动", "calf-dorsiflexor-strength": "小腿前侧发力", "calf-front-release": "小腿前侧轻柔松解", "calf-front-control": "勾脚主动控制",
  "calf-plantarflexion": "小腿后侧两种膝位拉长", "calf-heel-raise-strength": "小腿后侧发力", "calf-back-release": "小腿后侧轻柔松解", "calf-back-control": "低负荷提踵",
  "calf-inversion": "小腿内侧活动", "calf-invertor-strength": "小腿内侧发力", "calf-medial-release": "小腿内侧轻柔松解", "calf-medial-control": "内翻与足弓控制",
  "calf-eversion": "小腿外侧活动", "calf-evertor-strength": "小腿外侧发力", "calf-lateral-release": "小腿外侧轻柔松解", "calf-lateral-control": "外翻主动控制",
  "calf-walk": "走路", "calf-heel-raise": "提踵", "calf-jog": "慢跑准备", "calf-local-control": "对应方向低负荷控制", "calf-heel-raise-progress": "提踵进阶", "calf-gait": "步态", "calf-step-single-leg": "台阶与单腿", "calf-run-hop": "跑跳回归",
  "thigh-front-isometric": "大腿前侧绷紧保持", "thigh-front-extension-control": "坐姿伸膝控制", "thigh-back-isometric": "脚跟后拉保持", "thigh-medial-isometric": "夹枕保持", "thigh-medial-active": "侧向收腿控制", "thigh-lateral-isometric": "侧向抬腿保持", "thigh-lateral-stability": "单腿骨盆稳定", "thigh-hip-hinge": "站立屈髋", "thigh-lateral-step": "侧向迈步",
  "calf-front-active": "主动勾脚", "calf-front-endurance": "脚跟走耐力", "calf-back-seated-raise": "坐姿提踵", "calf-back-standing-raise": "双脚站姿提踵", "calf-medial-active": "小幅内翻控制", "calf-medial-arch": "足弓保持与提踵", "calf-lateral-active": "小幅外翻控制", "calf-lateral-stability": "单腿外侧稳定",
};

function itemLabel(id: string) { return LABELS[id] ?? id; }

export default function LocalLimbDecisionLab() {
  const [activeId, setActiveId] = useState(LOCAL_LIMB_LAB_CASES[0].id);
  const active = LOCAL_LIMB_LAB_CASES.find((item) => item.id === activeId) ?? LOCAL_LIMB_LAB_CASES[0];
  const decision = useMemo(() => buildLocalLimbDecision(active.input), [active]);
  return <main className={styles.shell}>
    <header className={styles.header}><div><p className={styles.kicker}>REHABMIND · LOCAL MUSCLE PILOT</p><h1>大腿 / 小腿决策对照页</h1></div><div className={styles.headerMeta}><span>当前阶段</span><strong>{decision.phaseLabel}</strong></div></header>
    <nav className={styles.caseRail} aria-label="选择大腿小腿测试案例">{LOCAL_LIMB_LAB_CASES.map((item) => <button key={item.id} type="button" className={item.id === active.id ? styles.activeCase : ""} onClick={() => setActiveId(item.id)}><span>{item.input.sessionNumber ? `第${item.input.sessionNumber}次康复` : "首次康复"}</span><strong>{item.title}</strong></button>)}</nav>
    <section className={styles.complaintCard}><div className={styles.stepNumber}>01</div><div><span className={styles.sectionLabel}>测试主诉</span><p>{active.complaint}</p></div></section>
    <section className={styles.traceGrid}>
      <article className={styles.traceColumn}><div className={styles.columnHead}><span>02</span><div><small>评估或复查</small><h2>{active.input.sessionNumber && active.input.sessionNumber > 1 ? "本次快速复查" : "首轮检查"}</h2></div></div><div className={styles.cardStack}>{(decision.reviewIds.length ? decision.reviewIds : decision.assessmentIds).map((id) => <div className={styles.problemCard} key={id}><div className={styles.cardTop}><span>{id.includes("strength") ? "发力" : id.includes("walk") || id.includes("sit") || id.includes("heel-raise") ? "功能" : "拉长 / 活动"}</span><b>需要记录</b></div><strong>{itemLabel(id)}</strong></div>)}</div></article>
      <article className={styles.traceColumn}><div className={styles.columnHead}><span>03</span><div><small>阶段决策</small><h2>今天怎么处理</h2></div></div><div className={styles.cardStack}>{decision.treatmentIds.length ? decision.treatmentIds.map((id, index) => <div className={`${styles.treatmentCard} ${index === 0 ? styles.currentTreatment : ""}`} key={id}><div className={styles.cardTop}><span>{id.includes("release") ? "肌肉处理" : "主动训练"}</span><b>{index === 0 ? "现在做" : "随后做"}</b></div><strong>{itemLabel(id)}</strong></div>) : <div className={styles.emptyCard}>本阶段不安排当场手法处理。</div>}<div className={styles.checkRecord}>{decision.summary}</div></div></article>
      <article className={styles.traceColumn}><div className={styles.columnHead}><span>04</span><div><small>复测与训练</small><h2>之后做什么</h2></div></div><div className={styles.cardStack}>{decision.retestIds.length ? decision.retestIds.map((id) => <div className={styles.retestCard} key={id}><div className={styles.cardTop}><span>{decision.retestTiming === "same-session" ? "当场统一复测" : "稍后复查"}</span></div><strong>{itemLabel(id)}</strong></div>) : <div className={styles.emptyCard}>{decision.retestTiming === "later" ? "本次不追求当场变化，稍后或下次复查。" : "不安排当场反复复测。"}</div>}<div className={styles.actionChips}>{decision.trainingIds.map((id) => <span key={id}>{itemLabel(id)}</span>)}</div></div></article>
    </section>
    <footer className={styles.auditBar}><div><span>预期结果</span><strong>{active.expected}</strong></div><div className={styles.ruleStatus}><i /> 同一局部决策核心输出</div></footer>
  </main>;
}
