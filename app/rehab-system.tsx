"use client";

import { useMemo, useState } from "react";
import {
  FIRST_BATCH_MODULES,
  inferModule,
  type Exercise,
  type FunctionCheck,
  type MotionCheck,
  type SimpleCheck,
  type TreatmentCandidate,
} from "./first-batch-modules";
import { buildChiefComplaintPlan, buildHomeCare, candidateStrengthTags } from "./chief-complaint-rules";

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
  priority: "chief" | "support";
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

function candidateLabel(type: TreatmentCandidate["type"]) {
  if (type === "muscle") return "肌肉反应测试";
  if (type === "joint") return "关节调整 · 受训人员";
  if (type === "neural") return "神经分布与滑动 · 受训人员";
  if (type === "irritability") return "局部刺激与负荷管理";
  return "主动控制";
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
  const [candidateResults, setCandidateResults] = useState<Record<string, "better" | "partial" | "same" | "worse">>({});
  const [phase, setPhase] = useState<Phase>("restore");
  const [followup, setFollowup] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");

  const selectedModule = FIRST_BATCH_MODULES.find((item) => item.id === moduleId);
  const chiefPlan = useMemo(() => selectedModule ? buildChiefComplaintPlan(selectedModule.id, location, painAction, description, painType, mechanism, symptoms, onset, side) : undefined, [selectedModule, location, painAction, description, painType, mechanism, symptoms, onset, side]);
  const inferred = inferModule(`${description} ${location}`);
  const combinedText = `${description} ${location} ${painAction} ${mechanism} ${painType}`;
  const assessments = useMemo<AssessmentItem[]>(() => {
    if (!selectedModule || !chiefPlan) return [];
    const profileCheck: AssessmentItem = {
      kind: "local",
      check: chiefPlan.profile === "muscle-load"
        ? { id: "profile-muscle", title: "相关肌肉张力与力量", how: "围绕主诉位置比较相关肌肉的紧张、压痛、主动发力和健侧力量；一次只比较一个区域。", observe: "哪块肌肉紧、弱或发力时能重现熟悉症状。" }
        : chiefPlan.profile === "irritable"
          ? { id: "profile-irritable", title: "局部刺激程度与可能原因", how: "确认外伤时间、肿胀、皮温、静息反应和负荷规律；再观察是否有肌肉反复牵拉或关节轨迹反复碰撞。", observe: "局部反应是否正在加重，以及哪个动作和负荷最相关。" }
          : chiefPlan.profile === "neural"
            ? { id: "profile-neural", title: "麻电分布、感觉与力量", how: "画出麻、电或放射范围，比较两侧轻触感觉，以及伸膝、勾脚、外翻和脚趾等相关力量。", observe: "症状是否沿固定路径、是否伴感觉下降或进行性无力。" }
            : { id: "profile-mixed", title: "疼痛性质补充检查", how: "结合位置、动作、局部反应、活动度和力量共同比较。", observe: "找出最能重复主诉的检查。" },
    };
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
    if (chiefPlan.profile === "muscle-load") return [profileCheck, ...locals, ...strengths, ...motions, ...functions, ...specials];
    if (chiefPlan.profile === "neural") return [profileCheck, ...specials, ...motions, ...strengths, ...functions, ...locals];
    if (chiefPlan.profile === "irritable") return [profileCheck, ...locals, ...motions, ...specials, ...strengths, ...functions];
    return [profileCheck, ...locals, ...motions, ...strengths, ...functions, ...specials];
  }, [selectedModule, chiefPlan, symptoms, combinedText]);

  const intakeComplete = Boolean(description.trim() && moduleId && location.trim() && painAction.trim() && onset && painType && mechanism && side && symptoms.length);
  const safetyAnswered = SAFETY_QUESTIONS.every((item) => safety[item.id]);
  const hasSafetySignal = SAFETY_QUESTIONS.some((item) => safety[item.id] === "yes");
  const safetyComplete = safetyAnswered && imaging.length > 0 && (!hasSafetySignal || imaging.includes("医生已评估，可按建议康复"));
  const assessmentComplete = assessments.length > 0 && assessments.every((item) => item.kind === "motion" ? Boolean(motionResults[item.check.id]?.active && (motionResults[item.check.id].active === "same" || motionResults[item.check.id].passive)) : Boolean(simpleResults[item.check.id]));

  const findings = useMemo<Finding[]>(() => {
    if (!selectedModule || !chiefPlan) return [];
    const support: Finding[] = [];
    const supportCandidates: TreatmentCandidate[] = [];
    const supportTags: string[] = [];
    if (symptoms.includes("swelling")) support.push({ id: "swelling", title: "肿胀仍需跟踪", route: "track", short: "观察轮廓是否逐次消退，不要求当场消失。", retest: "同位置、同角度观察肿胀范围和轮廓。", candidates: [], tags: ["mobility"], priority: "support" });
    if (symptoms.includes("tenderness")) support.push({ id: "tenderness", title: "局部压痛", route: "track", short: "用于帮助定位，不单独追着压痛点处理。", retest: "下次轻按同一点，记录程度和范围。", candidates: [], tags: [], priority: "support" });
    const profileId = `profile-${chiefPlan.profile === "muscle-load" ? "muscle" : chiefPlan.profile}`;
    if (simpleResults[profileId] === "present" || simpleResults[profileId] === "painful") {
      support.push({ id: profileId, title: chiefPlan.profile === "muscle-load" ? "肌肉张力或发力存在相关线索" : chiefPlan.profile === "irritable" ? "局部刺激程度需要优先管理" : chiefPlan.profile === "neural" ? "麻电分布、感觉或力量存在相关线索" : "疼痛性质存在补充线索", route: chiefPlan.profile === "neural" ? "review" : "track", short: chiefPlan.assessmentFocus, retest: painAction, candidates: [], tags: chiefPlan.trainingTags, priority: "support" });
    }
    selectedModule.motions.forEach((motion) => {
      const result = motionResults[motion.id];
      if (!result?.active || result.active === "same") return;
      supportTags.push(...motion.trainingTags);
      if (result.active === "painful") {
        support.push({ id: motion.id, title: `${motion.title}会诱发疼痛`, route: "pain-action", short: "主诉改善后，再处理这个相关动作。", retest: motion.retest, candidates: [...motion.muscles, ...motion.joints], tags: motion.trainingTags, priority: "support" });
        supportCandidates.push(...motion.muscles, ...motion.joints);
      } else if (result.passive === "same") {
        support.push({ id: motion.id, title: `${motion.title}主动控制不足`, route: "training", short: "被动接近健侧，留到训练阶段补主动控制。", retest: motion.retest, candidates: [], tags: motion.trainingTags, priority: "support" });
      } else if (result.passive === "limited") {
        support.push({ id: motion.id, title: `${motion.title}主动和被动都受限`, route: "joint-muscle", short: "主诉改善后，继续先肌肉、再关节。", retest: motion.retest, candidates: [...motion.muscles, ...motion.joints], tags: motion.trainingTags, priority: "support" });
        supportCandidates.push(...motion.muscles, ...motion.joints);
      } else if (result.passive === "painful") {
        support.push({ id: motion.id, title: `${motion.title}被动活动也会疼`, route: "pain-action", short: "主诉改善后先看肌肉反应，关节处理保持轻柔。", retest: motion.retest, candidates: [...motion.muscles, ...motion.joints], tags: motion.trainingTags, priority: "support" });
        supportCandidates.push(...motion.muscles, ...motion.joints);
      } else support.push({ id: motion.id, title: `${motion.title}需要补充被动检查`, route: "review", short: "暂不判断关节还是肌肉。", retest: painAction, candidates: [], tags: motion.trainingTags, priority: "support" });
    });
    selectedModule.strengths.forEach((check) => {
      if (["weak", "painful"].includes(simpleResults[check.id])) {
        supportTags.push(...(check.trainingTags || []));
        support.push({ id: check.id, title: `${check.title}${simpleResults[check.id] === "weak" ? "偏弱" : "发力疼痛"}`, route: "training", short: "影响训练选择，不抢主诉优先级。", retest: "下次康复再与健侧比较力量和动作质量。", candidates: [], tags: check.trainingTags || [], priority: "support" });
      }
    });
    selectedModule.functions.forEach((check) => {
      if (["painful", "limited"].includes(simpleResults[check.id])) {
        supportTags.push(...(check.trainingTags || []));
        supportCandidates.push(...check.muscleCandidates, ...check.jointCandidates);
        support.push({ id: check.id, title: `${check.title}异常`, route: "pain-action", short: "作为主诉的相关功能线索。", retest: painAction, candidates: [], tags: check.trainingTags || [], priority: "support" });
      }
    });
    selectedModule.specialChecks.forEach((check) => {
      if (simpleResults[check.id] === "positive") support.push({ id: check.id, title: `${check.title}出现阳性线索`, route: "review", short: check.next, retest: "结合专业评估或影像后，再回到本次记录继续。", candidates: [], tags: [], priority: "support" });
    });
    const seen = new Set<string>();
    const rankedCandidates = [...chiefPlan.candidates.slice(0, 4), ...supportCandidates, ...chiefPlan.candidates.slice(4)];
    const candidates = rankedCandidates.filter((item) => {
      const key = item.title.replace(/[、，与及＋\s]/g, "");
      return !seen.has(key) && seen.add(key);
    }).slice(0, 12);
    const chief: Finding = { id: "chief-complaint", title: `主诉：${chiefPlan.title}`, route: "pain-action", short: `最高优先级 · ${chiefPlan.matchedBy.join("＋")}`, retest: painAction, candidates, tags: [...new Set([...chiefPlan.trainingTags, ...supportTags])], priority: "chief" };
    return [chief, ...support];
  }, [selectedModule, chiefPlan, symptoms, motionResults, simpleResults, painAction]);

  const treatmentFindings = findings.filter((item) => item.candidates.length > 0);
  const activeFinding = treatmentFindings[findingIndex];
  const activeCandidate = activeFinding?.candidates[candidateIndex];
  const treatmentComplete = treatmentFindings.length === 0 || findingIndex >= treatmentFindings.length;
  const maxUnlocked: Step = !intakeComplete ? 0 : !safetyComplete ? 1 : !assessmentComplete ? 2 : !treatmentComplete ? 3 : 4;
  const tags = Array.from(new Set(findings.flatMap((item) => item.tags)));
  const retainedMuscles = treatmentFindings.flatMap((finding) => finding.candidates.map((item) => ({ finding, item }))).filter(({ finding, item }) => item.type === "muscle" && ["better", "partial"].includes(candidateResults[`${finding.id}:${item.id}`]));
  const homeDecisions = retainedMuscles.map(({ item }) => {
    const relatedTags = candidateStrengthTags(item);
    const relatedChecks = selectedModule?.strengths.filter((check) => check.trainingTags?.some((tag) => relatedTags.includes(tag))) || [];
    const results = relatedChecks.map((check) => simpleResults[check.id]).filter(Boolean);
    const mode = results.includes("weak") ? "strengthen" : results.includes("painful") ? "graded" : results.length > 0 && results.every((result) => result === "normal") ? "release" : "recheck";
    return { item, mode, care: mode === "release" ? buildHomeCare(item) : undefined, relatedChecks: relatedChecks.map((check) => check.title) };
  }).filter((decision, index, items) => items.findIndex((item) => item.item.title === decision.item.title) === index);
  const strengthFindings = selectedModule?.strengths.filter((check) => ["weak", "painful"].includes(simpleResults[check.id])) || [];
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

  function finishCandidate(result: "better" | "partial" | "same" | "worse") {
    if (!activeFinding || !activeCandidate) return;
    setCandidateResults((items) => ({ ...items, [`${activeFinding.id}:${activeCandidate.id}`]: result }));
    if (result === "better" || candidateIndex >= activeFinding.candidates.length - 1) {
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
        <div className="form-section"><strong>疼痛更像哪一种</strong><Options options={PAIN_TYPES} value={painType} onChange={setPainType} />{painType && chiefPlan && <div className={`profile-preview ${chiefPlan.profile}`}><b>{chiefPlan.profile === "muscle-load" ? "优先检查肌肉张力与力量" : chiefPlan.profile === "irritable" ? "优先判断局部刺激程度与原因" : chiefPlan.profile === "neural" ? "优先检查神经分布、感觉与力量" : "结合动作与查体判断"}</b><span>{chiefPlan.assessmentFocus}</span></div>}</div>
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
        <Heading eyebrow="处理" title="先解决主诉，查体结果用于帮助它" />
        <div className="treatment-sequence"><b className={activeFinding?.priority === "chief" ? "current" : "done"}>1 主诉反应测试</b><b className={activeFinding?.priority === "support" ? "current" : treatmentComplete ? "done" : ""}>2 补齐肌肉与关节</b><b className={treatmentComplete ? "current" : ""}>3 开始针对性训练</b></div>
        <div className="finding-overview">{findings.map((item) => <article key={item.id} className={`${item.priority === "chief" ? "chief" : ""} ${item.id === activeFinding?.id ? "active" : ""}`}><em>{item.priority === "chief" ? "最高优先" : "支持线索"}</em><b>{item.title}</b><span>{item.short}</span></article>)}</div>
        {activeFinding && activeCandidate ? <>
          <div className="pain-baseline"><span>{activeFinding.priority === "chief" ? "先复测主诉" : "主诉已处理，现复测查体问题"}</span><strong>{activeFinding.priority === "chief" ? painAction : activeFinding.retest}</strong></div>
          <article className="candidate-card"><span>{candidateLabel(activeCandidate.type)} · {candidateIndex + 1}/{activeFinding.candidates.length}</span><h2>{activeCandidate.title}</h2><div><strong>做什么</strong><p>{activeCandidate.do}</p></div><div><strong>观察什么</strong><p>{activeCandidate.watch}</p></div><div><strong>{activeCandidate.type === "irritability" ? "后续比较" : "做完复测"}</strong><p>{activeCandidate.type === "irritability" ? "记录今天的肿胀、皮温和负重反应，下次在相同时间与条件下比较；不要求当场消失。" : activeFinding.priority === "chief" ? `保持相同条件重复主诉：${painAction}` : `先复测：${activeFinding.retest}；再确认主诉“${painAction}”没有反跳。`}</p></div>{activeCandidate.type === "irritability" ? <div className="candidate-actions one-action"><button type="button" className="better" onClick={() => finishCandidate("same")}>已安排负荷管理，继续排查原因</button></div> : <div className="candidate-actions complaint-actions"><button type="button" className="better" onClick={() => finishCandidate("better")}>明显改善，保留并进入下一问题</button><button type="button" className="better" onClick={() => finishCandidate("partial")}>部分改善，保留后继续</button><button type="button" onClick={() => finishCandidate("same")}>没变化，换下一项</button><button type="button" className="worse" onClick={() => finishCandidate("worse")}>加重，停止本方向</button></div>}</article>
        </> : <div className="treatment-done"><b>{treatmentComplete ? "主诉和需要处理的查体问题已完成" : "这些问题不需要当场反复处理"}</b><p>接下来根据力量不足安排强化；有效肌肉方向是否居家放松，要再看对应力量结果。</p><button type="button" onClick={() => setStep(4)}>进入训练与居家安排</button></div>}
      </section>}

      {step === 4 && selectedModule && <section className="guide-page training-page">
        <Heading eyebrow="训练复查" title="继续处理未解决的问题，再推进训练" />
        {strengthFindings.length > 0 && <div className="training-reasons"><span>力量评估决定强化方向</span>{strengthFindings.map((check) => <b key={check.id}>{check.title}：{simpleResults[check.id] === "weak" ? "偏弱，安排强化" : "发力疼痛，从不诱发症状的低负荷开始"}</b>)}</div>}
        {homeDecisions.length > 0 && <section className="home-decisions"><header><span>居家肌肉安排</span><h2>有效方向还要结合力量结果</h2></header>{homeDecisions.map(({ item, mode, care, relatedChecks }) => <article key={item.id}><div><b>{item.title}</b><span>{relatedChecks.length ? `对应力量：${relatedChecks.join("、")}` : "尚无直接对应力量测试"}</span></div>{mode === "strengthen" && <strong className="decision-strength">力量偏弱 · 进入下方强化训练，不单纯拉伸</strong>}{mode === "graded" && <strong className="decision-graded">发力会疼 · 先做不诱发症状的低负荷训练</strong>}{mode === "recheck" && <strong className="decision-recheck">先补力量比较 · 暂不自动安排放松或强化</strong>}{mode === "release" && care && <div className="home-care"><strong>力量接近健侧 · 保留轻柔放松/拉伸</strong><b>{care.name} · {care.groups} × {care.reps}</b><p>{care.how}</p><span>观察：{care.observe}</span></div>}</article>)}</section>}
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
