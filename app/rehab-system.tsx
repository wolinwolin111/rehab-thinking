"use client";

import { useMemo, useState } from "react";
import {
  FIRST_BATCH_MODULES,
  inferModule,
  type Exercise,
  type FunctionCheck,
  type MotionCheck,
  type RehabModule,
  type SimpleCheck,
  type TreatmentCandidate,
} from "./first-batch-modules";

type Step = 0 | 1 | 2 | 3 | 4;
type Answer = "yes" | "no";
type Symptom = "swelling" | "tenderness" | "motion" | "pain-action" | "weakness" | "numbness";
type SimpleResult = "normal" | "present" | "painful" | "weak" | "limited" | "skip" | "positive";
type ActiveResult = "same" | "limited" | "painful" | "unable";
type PassiveResult = "same" | "limited" | "painful" | "skip";
type Phase = "restore" | "rebuild" | "return";
type AssessmentItem =
  | { kind: "local" | "strength" | "special"; check: SimpleCheck; next?: string }
  | { kind: "motion"; check: MotionCheck }
  | { kind: "function"; check: FunctionCheck };
type Finding = {
  id: string;
  title: string;
  route: "track" | "control" | "joint-muscle" | "pain-action" | "training" | "review";
  short: string;
  retest: string;
  candidates: TreatmentCandidate[];
  tags: string[];
};

const STEPS = ["症状", "先确认", "检查", "处理", "训练复查"];
const ONSETS = ["今天或昨天", "2—7天", "1—6周", "超过6周", "反复出现"];
const PAIN_TYPES = ["酸痛", "胀痛", "刺痛", "牵拉痛", "麻或电感", "说不清"];
const MECHANISMS = ["没有明确受伤", "扭转/崴伤", "跌倒/碰撞", "跑跳或拉伤", "逐渐出现", "其他"];
const SYMPTOMS: Array<{ id: Symptom; name: string }> = [
  { id: "swelling", name: "肿胀或淤血" },
  { id: "tenderness", name: "按压痛" },
  { id: "motion", name: "活动受限" },
  { id: "pain-action", name: "动作疼痛" },
  { id: "weakness", name: "力量不足" },
  { id: "numbness", name: "麻、刺或电感" },
];
const SAFETY_QUESTIONS = [
  { id: "shape", text: "有明显错位、异常轮廓或开放伤口" },
  { id: "vascular", text: "整段肢体持续发白/发紫、冰冷或感觉明显下降" },
  { id: "systemic", text: "发热，同时局部红、热、肿快速加重" },
  { id: "neuro", text: "力量进行性下降，或出现大小便/会阴感觉异常" },
];
const IMAGING = ["没有影像", "未见骨折", "有骨折异常", "韧带或肌腱损伤", "骨挫伤/骨髓水肿", "积液或软组织肿胀", "医生已评估，可按建议康复", "医生有限制"];

function Options({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="guide-options compact-options">{options.map((option) => <button type="button" key={option} className={value === option ? "selected" : ""} onClick={() => onChange(option)}>{option}</button>)}</div>;
}

function Heading({ eyebrow, title, current, total }: { eyebrow: string; title: string; current?: number; total?: number }) {
  return <header className="guide-heading"><div><span>{eyebrow}</span><h1>{title}</h1></div>{current !== undefined && total ? <b>{current + 1}/{total}</b> : null}</header>;
}

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const [open, setOpen] = useState(false);
  return <article className="simple-exercise">
    <button type="button" className="exercise-open" onClick={() => setOpen(!open)}><span>动作</span><strong>{exercise.name}</strong><b>{exercise.groups} × {exercise.reps}</b></button>
    {open && <div className="exercise-detail"><p>{exercise.how}</p><dl><div><dt>观察</dt><dd>{exercise.observe}</dd></div><div><dt>做不了</dt><dd>{exercise.easier}</dd></div><div><dt>太轻松</dt><dd>{exercise.harder}</dd></div></dl><button type="button" disabled>视频演示 · 后续上传</button></div>}
  </article>;
}

function resultName(value?: SimpleResult) {
  return ({ normal: "基本正常", present: "存在", painful: "疼痛", weak: "偏弱", limited: "受限", skip: "未检查", positive: "阳性" } as Record<string, string>)[value || ""] || "";
}

export default function RehabSystem() {
  const [step, setStep] = useState<Step>(0);
  const [description, setDescription] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [location, setLocation] = useState("");
  const [painAction, setPainAction] = useState("");
  const [onset, setOnset] = useState("");
  const [painType, setPainType] = useState("");
  const [mechanism, setMechanism] = useState("");
  const [side, setSide] = useState("");
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [safety, setSafety] = useState<Record<string, Answer>>({});
  const [imaging, setImaging] = useState<string[]>([]);
  const [assessmentIndex, setAssessmentIndex] = useState(0);
  const [simpleResults, setSimpleResults] = useState<Record<string, SimpleResult>>({});
  const [motionResults, setMotionResults] = useState<Record<string, { active?: ActiveResult; passive?: PassiveResult }>>({});
  const [findingIndex, setFindingIndex] = useState(0);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [candidateResults, setCandidateResults] = useState<Record<string, "better" | "same" | "worse">>({});
  const [phase, setPhase] = useState<Phase>("restore");
  const [followup, setFollowup] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");

  const selectedModule = FIRST_BATCH_MODULES.find((item) => item.id === moduleId);
  const inferred = inferModule(`${description} ${location}`);
  const combinedText = `${description} ${location} ${painAction} ${mechanism} ${painType}`;
  const assessments = useMemo<AssessmentItem[]>(() => {
    if (!selectedModule) return [];
    const locals = selectedModule.localChecks.filter((check) => {
      if (check.id.includes("swelling")) return symptoms.includes("swelling");
      if (check.id.includes("tender")) return symptoms.includes("tenderness");
      if (check.id.includes("neural")) return symptoms.includes("numbness");
      return true;
    }).map((check) => ({ kind: "local" as const, check }));
    const motions = selectedModule.motions.map((check) => ({ kind: "motion" as const, check }));
    const strengths = selectedModule.strengths.map((check) => ({ kind: "strength" as const, check }));
    const functions = selectedModule.functions.map((check) => ({ kind: "function" as const, check }));
    const specials = selectedModule.specialChecks.filter((check) => check.trigger.test(combinedText)).map((check) => ({ kind: "special" as const, check, next: check.next }));
    return [...locals, ...motions, ...strengths, ...functions, ...specials];
  }, [selectedModule, symptoms, combinedText]);

  const intakeComplete = Boolean(description.trim() && moduleId && location.trim() && painAction.trim() && onset && painType && mechanism && side && symptoms.length);
  const safetyAnswered = SAFETY_QUESTIONS.every((item) => safety[item.id]);
  const hasSafetySignal = SAFETY_QUESTIONS.some((item) => safety[item.id] === "yes");
  const safetyComplete = safetyAnswered && imaging.length > 0 && (!hasSafetySignal || imaging.includes("医生已评估，可按建议康复"));
  const assessmentComplete = assessments.length > 0 && assessments.every((item) => item.kind === "motion" ? Boolean(motionResults[item.check.id]?.active && (motionResults[item.check.id].active === "same" || motionResults[item.check.id].passive)) : Boolean(simpleResults[item.check.id]));

  const findings = useMemo<Finding[]>(() => {
    if (!selectedModule) return [];
    const list: Finding[] = [];
    if (symptoms.includes("swelling")) list.push({ id: "swelling", title: "肿胀仍需跟踪", route: "track", short: "先处理肿胀，再看轮廓是否消退。", retest: "同位置、同角度观察肿胀范围和轮廓。", candidates: [], tags: ["mobility"] });
    if (symptoms.includes("tenderness")) list.push({ id: "tenderness", title: "局部压痛", route: "track", short: "只用于定位，不要求当场消失。", retest: "下次轻按同一点，记录程度和范围。", candidates: [], tags: [] });
    selectedModule.motions.forEach((motion) => {
      const result = motionResults[motion.id];
      if (!result?.active || result.active === "same") return;
      if (result.active === "painful") list.push({ id: motion.id, title: `${motion.title}会诱发疼痛`, route: "pain-action", short: "以原动作变化判断候选方向。", retest: motion.retest, candidates: [...motion.muscles, ...motion.joints], tags: motion.trainingTags });
      else if (result.passive === "same") list.push({ id: motion.id, title: `${motion.title}：主动受限、被动接近健侧`, route: "control", short: "优先走肌肉控制路径。", retest: motion.retest, candidates: [motion.control], tags: motion.trainingTags });
      else if (result.passive === "limited") list.push({ id: motion.id, title: `${motion.title}：主动和被动都受限`, route: "joint-muscle", short: "走关节＋肌肉路径：先肌肉，再关节，最后主动控制。", retest: motion.retest, candidates: [...motion.muscles, ...motion.joints, motion.control], tags: motion.trainingTags });
      else list.push({ id: motion.id, title: `${motion.title}需要专业补充检查`, route: "review", short: "被动活动未完成，先不判断关节还是肌肉。", retest: motion.retest, candidates: [], tags: motion.trainingTags });
    });
    selectedModule.strengths.forEach((check) => {
      if (["weak", "painful"].includes(simpleResults[check.id])) list.push({ id: check.id, title: `${check.title}${simpleResults[check.id] === "weak" ? "偏弱" : "发力疼痛"}`, route: "training", short: "安排相应训练，不做当场反复测试。", retest: "下次康复再与健侧比较力量和动作质量。", candidates: [], tags: check.trainingTags || [] });
    });
    selectedModule.functions.forEach((check) => {
      if (["painful", "limited"].includes(simpleResults[check.id])) list.push({ id: check.id, title: `${check.title}异常`, route: "pain-action", short: `用同一个动作复测：${painAction}`, retest: check.retest, candidates: [...check.muscleCandidates, ...check.jointCandidates], tags: check.trainingTags || [] });
    });
    selectedModule.specialChecks.forEach((check) => {
      if (simpleResults[check.id] === "positive") list.push({ id: check.id, title: `${check.title}出现阳性线索`, route: "review", short: check.next, retest: "结合专业评估或影像后，再回到本次记录继续。", candidates: [], tags: [] });
    });
    return list.length ? list : [{ id: "baseline", title: "本轮未筛出明显异常", route: "training", short: "从目标动作和基础能力开始训练。", retest: painAction, candidates: [], tags: [] }];
  }, [selectedModule, symptoms, motionResults, simpleResults, painAction]);

  const treatmentFindings = findings.filter((item) => item.candidates.length > 0);
  const activeFinding = treatmentFindings[findingIndex];
  const activeCandidate = activeFinding?.candidates[candidateIndex];
  const treatmentComplete = treatmentFindings.length === 0 || findingIndex >= treatmentFindings.length;
  const maxUnlocked: Step = !intakeComplete ? 0 : !safetyComplete ? 1 : !assessmentComplete ? 2 : !treatmentComplete ? 3 : 4;
  const tags = Array.from(new Set(findings.flatMap((item) => item.tags)));
  const exercises = selectedModule ? selectedModule.training[phase].filter((item) => !tags.length || item.tags.some((tag) => tags.includes(tag))).slice(0, 5) : [];
  const shownExercises = exercises.length ? exercises : selectedModule?.training[phase].slice(0, 4) || [];
  const currentAssessment = assessments[Math.min(assessmentIndex, Math.max(assessments.length - 1, 0))];

  function resetClinicalFlow(nextModule?: string) {
    if (nextModule !== undefined) setModuleId(nextModule);
    setAssessmentIndex(0); setSimpleResults({}); setMotionResults({});
    setFindingIndex(0); setCandidateIndex(0); setCandidateResults({}); setFollowup({});
  }

  function go(next: Step) {
    if (next <= maxUnlocked) setStep(next);
  }

  function toggleSymptom(id: Symptom) {
    setSymptoms((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  }

  function toggleImaging(value: string) {
    setImaging((items) => value === "没有影像" ? (items.includes(value) ? [] : [value]) : [...items.filter((item) => item !== "没有影像" && item !== value), ...(items.includes(value) ? [] : [value])]);
  }

  function finishCandidate(result: "better" | "same" | "worse") {
    if (!activeFinding || !activeCandidate) return;
    setCandidateResults((items) => ({ ...items, [`${activeFinding.id}:${activeCandidate.id}`]: result }));
    if (result === "better" || result === "worse" || candidateIndex >= activeFinding.candidates.length - 1) {
      setFindingIndex((value) => value + 1); setCandidateIndex(0);
    } else setCandidateIndex((value) => value + 1);
  }

  function saveRecord() {
    const record = { savedAt: new Date().toISOString(), description, moduleId, location, painAction, onset, painType, mechanism, side, symptoms, imaging, safety, motionResults, simpleResults, findings, candidateResults, phase, followup };
    localStorage.setItem("rehabmind-current-record", JSON.stringify(record));
    setToast("记录已保存到当前设备");
    window.setTimeout(() => setToast(""), 2200);
  }

  return <main className="guided-app">
    <header className="guided-topbar"><button type="button" onClick={() => setStep(0)}><b>RM</b><strong>RehabMind</strong></button><span>教练康复思路助手 · 第一批模块</span><button type="button" onClick={saveRecord}>保存记录</button></header>
    <nav className="locked-steps" aria-label="康复流程">{STEPS.map((label, index) => <button type="button" key={label} className={`${index === step ? "active" : ""} ${index <= maxUnlocked ? "available" : "locked"}`} disabled={index > maxUnlocked} onClick={() => go(index as Step)}><i>{index + 1}</i><span>{label}</span></button>)}</nav>
    {(moduleId || location || painAction) && <aside className="case-summary"><span>已收集</span><div>{selectedModule && <b>{selectedModule.name}</b>}{location && <b>{location}</b>}{painAction && <b>{painAction}</b>}{onset && <b>{onset}</b>}{painType && <b>{painType}</b>}</div></aside>}

    <div className="guided-workspace">
      {step === 0 && <section className="guide-page intake-page">
        <Heading eyebrow="症状信息收集" title="先把最影响判断的信息说清楚" />
        <div className="hero-input"><textarea value={description} onChange={(event) => { setDescription(event.target.value); const guess = inferModule(event.target.value); if (guess && !moduleId) resetClinicalFlow(guess); }} placeholder="例如：昨天打球落地时右脚向内崴了，外踝前下方肿痛，走路落脚和下楼会刺痛……" /></div>
        <div className="form-section"><strong>选择主要部位</strong><div className="module-grid">{FIRST_BATCH_MODULES.map((item) => <button type="button" key={item.id} className={moduleId === item.id ? "selected" : ""} onClick={() => resetClinicalFlow(item.id)}><b>{item.name}</b><span>{item.short}</span></button>)}</div>{inferred && inferred !== moduleId && <button type="button" className="text-action" onClick={() => resetClinicalFlow(inferred)}>描述更像“{FIRST_BATCH_MODULES.find((item) => item.id === inferred)?.name}”，改为这个模块</button>}</div>
        <div className="two-fields"><label><strong>最具体的疼痛位置</strong><input className="large-text" value={location} onChange={(event) => setLocation(event.target.value)} placeholder={selectedModule?.locationPlaceholder || "例如：右侧、前方、骨点旁"} /></label><label><strong>最想改善的疼痛动作</strong><input className="large-text" value={painAction} onChange={(event) => setPainAction(event.target.value)} placeholder={selectedModule?.painActionPlaceholder || "例如：下楼、蹲起、抬手"} /></label></div>
        <div className="form-section"><strong>出现多久</strong><Options options={ONSETS} value={onset} onChange={setOnset} /></div>
        <div className="form-section"><strong>怎么出现的</strong><Options options={MECHANISMS} value={mechanism} onChange={setMechanism} /></div>
        <div className="form-section"><strong>疼痛更像哪一种</strong><Options options={PAIN_TYPES} value={painType} onChange={setPainType} /></div>
        <div className="form-section"><strong>现在有哪些问题</strong><div className="symptom-checks">{SYMPTOMS.map((item) => <button type="button" key={item.id} className={symptoms.includes(item.id) ? "selected" : ""} onClick={() => toggleSymptom(item.id)}><i>{symptoms.includes(item.id) ? "✓" : ""}</i>{item.name}</button>)}</div></div>
        <div className="form-section"><strong>哪一侧</strong><Options options={["左侧", "右侧", "双侧/中间"]} value={side} onChange={setSide} /></div>
        <button type="button" className="next-question" disabled={!intakeComplete} onClick={() => setStep(1)}>进入先确认</button>
        <p className="input-promise">也可以输入系统里没有的情况。自由描述用于选择模块和后续问题，不会被当成诊断。</p>
      </section>}

      {step === 1 && <section className="guide-page">
        <Heading eyebrow="先确认" title="只确认会改变后续路线的情况" />
        <div className="safety-list">{SAFETY_QUESTIONS.map((item) => <article key={item.id}><strong>{item.text}</strong><div>{(["no", "yes"] as Answer[]).map((answer) => <button type="button" key={answer} className={`${safety[item.id] === answer ? "selected" : ""} ${answer === "yes" ? "alert" : ""}`} onClick={() => setSafety((items) => ({ ...items, [item.id]: answer }))}>{answer === "no" ? "没有" : "有"}</button>)}</div></article>)}</div>
        <div className="form-section"><strong>已有影像或医生结论</strong><div className="imaging-choices">{IMAGING.map((item) => <button type="button" key={item} className={imaging.includes(item) ? "selected" : ""} onClick={() => toggleImaging(item)}>{item}</button>)}</div></div>
        {hasSafetySignal && !imaging.includes("医生已评估，可按建议康复") && <div className="stop-note"><strong>先完成针对性医学评估</strong><span>本次记录会保留。确认当前信号已经由医生评估并允许康复后，再继续检查。</span></div>}
        {(imaging.includes("有骨折异常") || imaging.includes("医生有限制")) && <p className="plain-note">后续只在医生允许的负重、活动范围和时间内进行；系统不覆盖医生限制。</p>}
        <button type="button" className="next-question" disabled={!safetyComplete} onClick={() => setStep(2)}>开始检查</button>
      </section>}

      {step === 2 && selectedModule && currentAssessment && <section className="guide-page assessment-page">
        <Heading eyebrow={`${selectedModule.name} · ${currentAssessment.kind === "motion" ? "活动度" : currentAssessment.kind === "strength" ? "力量" : currentAssessment.kind === "function" ? "动作" : currentAssessment.kind === "special" ? "特殊检查" : "局部检查"}`} title={currentAssessment.check.title} current={assessmentIndex} total={assessments.length} />
        {currentAssessment.kind === "motion" ? <MotionAssessment check={currentAssessment.check} value={motionResults[currentAssessment.check.id] || {}} onChange={(value) => setMotionResults((items) => ({ ...items, [currentAssessment.check.id]: value }))} /> : <SimpleAssessment item={currentAssessment} value={simpleResults[currentAssessment.check.id]} onChange={(value) => setSimpleResults((items) => ({ ...items, [currentAssessment.check.id]: value }))} />}
        <div className="question-controls"><button type="button" disabled={assessmentIndex === 0} onClick={() => setAssessmentIndex((value) => value - 1)}>上一个</button>{assessmentIndex < assessments.length - 1 ? <button type="button" className="primary" disabled={currentAssessment.kind === "motion" ? !(motionResults[currentAssessment.check.id]?.active && (motionResults[currentAssessment.check.id]?.active === "same" || motionResults[currentAssessment.check.id]?.passive)) : !simpleResults[currentAssessment.check.id]} onClick={() => setAssessmentIndex((value) => value + 1)}>下一个</button> : <button type="button" className="primary" disabled={!assessmentComplete} onClick={() => { setFindingIndex(0); setCandidateIndex(0); setStep(3); }}>查看筛出的问题</button>}</div>
      </section>}

      {step === 3 && <section className="guide-page treatment-page">
        <Heading eyebrow="处理" title={`发现 ${findings.length} 个需要处理或跟踪的问题`} />
        <div className="finding-overview">{findings.map((item) => <article key={item.id} className={item.id === activeFinding?.id ? "active" : ""}><b>{item.title}</b><span>{item.short}</span></article>)}</div>
        {activeFinding && activeCandidate ? <>
          <div className="pain-baseline"><span>本轮复测</span><strong>{activeFinding.retest || painAction}</strong></div>
          <article className="candidate-card"><span>{activeCandidate.type === "muscle" ? "肌肉反应测试" : activeCandidate.type === "joint" ? "关节调整 · 受训人员" : "主动控制"}</span><h2>{activeCandidate.title}</h2><div><strong>做什么</strong><p>{activeCandidate.do}</p></div><div><strong>观察什么</strong><p>{activeCandidate.watch}</p></div><div><strong>做完复测</strong><p>{activeFinding.retest}</p></div><div className="candidate-actions"><button type="button" className="better" onClick={() => finishCandidate("better")}>原动作或范围改善</button><button type="button" onClick={() => finishCandidate("same")}>没有明显变化</button><button type="button" className="worse" onClick={() => finishCandidate("worse")}>加重，停止本方向</button></div></article>
        </> : <div className="treatment-done"><b>{treatmentComplete ? "本轮反应测试已完成" : "这些问题不需要当场反复处理"}</b><p>肿胀、按压痛和力量不足主要留到后续复查；训练根据实际异常选择。</p><button type="button" onClick={() => setStep(4)}>进入训练与复查</button></div>}
      </section>}

      {step === 4 && selectedModule && <section className="guide-page training-page">
        <Heading eyebrow="训练复查" title="继续处理未解决的问题，再推进训练" />
        <div className="phase-switch"><button type="button" className={phase === "restore" ? "selected" : ""} onClick={() => setPhase("restore")}>恢复活动与控制</button><button type="button" className={phase === "rebuild" ? "selected" : ""} onClick={() => setPhase("rebuild")}>重建力量与功能</button><button type="button" className={phase === "return" ? "selected" : ""} onClick={() => setPhase("return")}>回归日常与运动</button></div>
        <div className="exercise-list">{shownExercises.map((item) => <ExerciseCard key={item.id} exercise={item} />)}</div>
        <section className="session-roadmap"><header><span>后续康复</span><h2>每一次都先复查，再决定处理和训练</h2></header><article><i>2</i><div><b>第二次康复</b><p>复查肿胀、压痛、主动/被动活动和原疼痛动作。仍受限就继续肌肉与关节处理；当场改善的方向保留，再训练主动控制。</p></div></article><article><i>3+</i><div><b>第三次及以后</b><p>旧问题未解决就继续处理；出现新症状就重新检查。活动稳定后，再增加力量、平衡、步态和目标动作。</p></div></article></section>
        <section className="followup-simple"><header><span>本次结束前</span><h2>记录下次要复查的内容</h2></header>{findings.slice(0, 6).map((item) => <article key={item.id}><b>{item.title}</b><div>{["改善", "没变", "加重"].map((value) => <button type="button" key={value} className={`${followup[item.id] === value ? "selected" : ""} ${value === "加重" ? "alert" : ""}`} onClick={() => setFollowup((items) => ({ ...items, [item.id]: value }))}>{value}</button>)}</div></article>)}<footer><p><b>疼痛和活动受限：</b>可用当场复测判断方向。</p><p><b>力量、肿胀、刺痛和按压痛：</b>给恢复时间，下次再比较，不做当场反复测试。</p></footer></section>
        <button type="button" className="next-question" onClick={saveRecord}>保存本次记录</button>
      </section>}
    </div>
    {toast && <button type="button" className="guided-toast" onClick={() => setToast("")}>{toast}</button>}
  </main>;
}

function MotionAssessment({ check, value, onChange }: { check: MotionCheck; value: { active?: ActiveResult; passive?: PassiveResult }; onChange: (value: { active?: ActiveResult; passive?: PassiveResult }) => void }) {
  const needsPassive = value.active && value.active !== "same";
  return <div className="motion-assessment">
    <article className="assessment-stage"><header><i>1</i><b>先做主动活动</b></header><p>{check.activeHow}</p><span>观察：{check.observe}</span><div className="result-options four">{([['same','接近健侧'],['limited','比健侧受限'],['painful','范围尚可但疼'],['unable','不敢或不能做']] as Array<[ActiveResult,string]>).map(([id, label]) => <button type="button" key={id} className={value.active === id ? "selected" : ""} onClick={() => onChange({ active: id, passive: id === "same" ? undefined : value.passive })}>{label}</button>)}</div></article>
    {needsPassive && <article className="assessment-stage second"><header><i>2</i><b>{check.professionalPassive ? "再由受训人员检查被动活动" : "再轻柔比较被动活动"}</b></header><p>{check.passiveHow}</p><span>只比较角度与末端感，不强压疼痛。</span><div className="result-options four">{([['same','接近健侧'],['limited','仍比健侧受限'],['painful','被动也疼'],['skip','未做/不确定']] as Array<[PassiveResult,string]>).map(([id, label]) => <button type="button" key={id} className={value.passive === id ? "selected" : ""} onClick={() => onChange({ ...value, passive: id })}>{label}</button>)}</div></article>}
    {value.active && (value.active === "same" || value.passive) && <div className={`route-preview ${value.passive === "limited" ? "joint" : ""}`}><b>{value.active === "painful" ? "疼痛动作排查" : value.active !== "same" && value.passive === "same" ? "肌肉控制路径" : value.passive === "limited" ? "关节＋肌肉路径" : value.passive === "skip" ? "待补充检查" : "本方向基本正常"}</b><span>{value.active === "painful" ? "记录疼痛位置与程度，处理后复测同一动作。" : value.active !== "same" && value.passive === "same" ? "被动范围可以，重点训练主动控制。" : value.passive === "limited" ? "先看肌肉反应；变化不明显再考虑关节松动，随后训练主动控制。" : value.passive === "skip" ? "暂不判断关节还是肌肉。" : "继续检查其他方向。"}</span></div>}
  </div>;
}

function SimpleAssessment({ item, value, onChange }: { item: Exclude<AssessmentItem, { kind: "motion" }>; value?: SimpleResult; onChange: (value: SimpleResult) => void }) {
  const options: Array<[SimpleResult, string]> = item.kind === "strength" ? [["normal", "接近健侧"], ["weak", "明显偏弱"], ["painful", "发力会疼"], ["skip", "无法比较"]] : item.kind === "special" ? [["normal", "阴性/未诱发"], ["positive", "阳性线索"], ["painful", "只有疼痛"], ["skip", "未检查"]] : item.kind === "function" ? [["normal", "基本正常"], ["limited", "做不完整"], ["painful", "会疼"], ["skip", "目前不能做"]] : [["normal", "基本正常"], ["present", "存在异常"], ["painful", "检查会疼"], ["skip", "未检查"]];
  return <article className="one-check"><div><span>怎么做</span><p>{item.check.how}</p></div><div><span>观察什么</span><p>{item.check.observe}</p></div>{item.kind === "special" && item.next && <p className="plain-note">阳性后：{item.next}</p>}<div className="result-options four">{options.map(([id, label]) => <button type="button" key={id} className={value === id ? "selected" : ""} onClick={() => onChange(id)}>{label}</button>)}</div>{value && <div className="selected-result">已记录：{resultName(value)}</div>}</article>;
}
