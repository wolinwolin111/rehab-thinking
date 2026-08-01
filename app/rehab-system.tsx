"use client";

import { useMemo, useState } from "react";
import { DIRECTION_RULES, getDirectionRule, type DirectionRule } from "./direction-rules";
import {
  GENERAL_RED_FLAGS,
  REGIONS,
  detectFromText,
  type Exercise,
  type InjuryPattern,
  type Region,
  type RegionId,
} from "./rehab-library";

type Step = 0 | 1 | 2 | 3 | 4;
type Result = "normal" | "limited" | "painful" | "weak" | "skip" | "positive";
type Answer = "yes" | "no";
type SymptomKey = "swelling" | "tenderness" | "motion" | "painfulAction" | "weakness" | "numbness";
type Finding = {
  id: string;
  title: string;
  kind: "immediate" | "delayed" | "training";
  rule?: DirectionRule;
  note: string;
};

const STEP_LABELS = ["症状", "先确认", "检查", "处理", "训练复查"];
const ONSETS = ["今天或昨天", "2–7天", "1–6周", "超过6周", "反复出现"];
const PAIN_TYPES = ["酸痛", "胀痛", "刺痛", "牵拉痛", "麻或电感", "说不清"];
const SYMPTOMS: Array<{ key: SymptomKey; label: string }> = [
  { key: "swelling", label: "有肿胀" },
  { key: "tenderness", label: "按压会痛" },
  { key: "motion", label: "活动受限" },
  { key: "painfulAction", label: "做动作会痛" },
  { key: "weakness", label: "力量不足" },
  { key: "numbness", label: "有麻、刺或电感" },
];

const REGION_WORDS: Record<RegionId, string[]> = {
  neck: ["颈", "脖子", "落枕"], shoulder: ["肩", "抬手", "肩胛"], elbow: ["肘", "网球肘"], wrist: ["腕", "手腕", "手指", "拇指"],
  thoracic: ["胸椎", "上背", "肋骨", "肩胛内侧"], back: ["腰", "下背", "坐骨"], hip: ["髋", "腹股沟", "大腿", "臀"],
  knee: ["膝", "髌骨", "半月板"], ankle: ["踝", "崴脚", "跟腱", "脚脖"], foot: ["足底", "脚底", "前脚掌", "脚趾", "足背"],
};

function inferRegion(text: string): RegionId | "" {
  for (const [id, words] of Object.entries(REGION_WORDS) as Array<[RegionId, string[]]>) {
    if (words.some((word) => text.includes(word))) return id;
  }
  return "";
}

function makeCustomPattern(region: Region, text: string): InjuryPattern {
  const samples = region.injuries;
  const uniqueExercises = (phase: "early" | "rebuild" | "return") => {
    const seen = new Set<string>();
    return samples.flatMap((item) => item[phase]).filter((item) => !seen.has(item.name) && seen.add(item.name)).slice(0, 3);
  };
  return {
    id: `${region.id}-custom`, name: "自定义症状", type: "overuse", keywords: [], typical: text,
    ask: [], palpation: [], special: [], softTissue: [], mobilization: [],
    early: uniqueExercises("early"), rebuild: uniqueExercises("rebuild"), return: uniqueExercises("return"),
  };
}

function OptionRow({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="guide-options">{options.map((option) => <button type="button" key={option} className={value === option ? "selected" : ""} onClick={() => onChange(option)}>{option}</button>)}</div>;
}

function StepHeader({ eyebrow, title, current, total }: { eyebrow: string; title: string; current?: number; total?: number }) {
  return <header className="guide-heading"><div><span>{eyebrow}</span><h1>{title}</h1></div>{current && total ? <b>{current} / {total}</b> : null}</header>;
}

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const [open, setOpen] = useState(false);
  return <article className="simple-exercise">
    <button type="button" className="exercise-open" onClick={() => setOpen((value) => !value)}><span>动作</span><strong>{exercise.name}</strong><b>{exercise.groups} · {exercise.reps}</b></button>
    {open && <div className="exercise-detail"><p>{exercise.how}</p><dl><div><dt>观察</dt><dd>{exercise.observe}</dd></div><div><dt>做不了</dt><dd>{exercise.easier}</dd></div><div><dt>太轻松</dt><dd>{exercise.harder}</dd></div></dl><button type="button" disabled>视频演示 · 后续上传</button></div>}
  </article>;
}

export default function RehabSystem() {
  const [step, setStep] = useState<Step>(0);
  const [intakePart, setIntakePart] = useState(0);
  const [description, setDescription] = useState("");
  const [regionId, setRegionId] = useState<RegionId | "">("");
  const [matchedInjuryId, setMatchedInjuryId] = useState("");
  const [useMatch, setUseMatch] = useState(false);
  const [location, setLocation] = useState("");
  const [scene, setScene] = useState("");
  const [side, setSide] = useState("");
  const [onset, setOnset] = useState("");
  const [painType, setPainType] = useState("");
  const [symptoms, setSymptoms] = useState<Record<SymptomKey, boolean>>({ swelling: false, tenderness: false, motion: false, painfulAction: false, weakness: false, numbness: false });
  const [safetyIndex, setSafetyIndex] = useState(0);
  const [safety, setSafety] = useState<Record<number, Answer>>({});
  const [imaging, setImaging] = useState("");
  const [assessmentIndex, setAssessmentIndex] = useState(0);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [treatmentFinding, setTreatmentFinding] = useState(0);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [candidateResults, setCandidateResults] = useState<Record<string, "better" | "same" | "worse">>({});
  const [treatmentDone, setTreatmentDone] = useState(false);
  const [trainingPhase, setTrainingPhase] = useState<"early" | "rebuild" | "return">("early");
  const [followup, setFollowup] = useState<Record<string, "better" | "same" | "worse">>({});
  const [toast, setToast] = useState("");

  const region = useMemo(() => REGIONS.find((item) => item.id === regionId), [regionId]);
  const matchedPattern = useMemo(() => region?.injuries.find((item) => item.id === matchedInjuryId), [region, matchedInjuryId]);
  const pattern = useMemo(() => region ? (useMatch && matchedPattern ? matchedPattern : makeCustomPattern(region, description)) : null, [region, useMatch, matchedPattern, description]);

  const intakeComplete = Boolean(description.trim().length >= 4 && region && location.trim() && scene.trim() && side && onset && painType && intakePart >= 6);
  const hasSafetyConcern = Object.values(safety).includes("yes");
  const safetyAnswered = GENERAL_RED_FLAGS.every((_, index) => Boolean(safety[index]));
  const safetyComplete = Boolean(safetyAnswered && imaging && (!hasSafetyConcern || imaging !== "none"));

  const assessmentItems = useMemo(() => {
    if (!region || !pattern) return [];
    return [
      ...region.movements.map((item) => ({ id: item.id, group: "活动度", title: item.name, how: item.how, observe: item.observe })),
      ...region.strength.map((item) => ({ id: item.id, group: "力量", title: item.name, how: item.how, observe: item.observe })),
      ...region.functions.map((item) => ({ id: item.id, group: "功能", title: item.name, how: item.how, observe: item.observe })),
      ...pattern.special.map((item, index) => ({ id: `special-${index}`, group: "特殊检查", title: item.name, how: item.how, observe: `阳性表现：${item.positive}` })),
    ];
  }, [region, pattern]);
  const assessmentComplete = assessmentItems.length > 0 && assessmentItems.every((item) => Boolean(results[item.id]));

  const findings = useMemo<Finding[]>(() => {
    if (!region) return [];
    const list: Finding[] = [];
    if (symptoms.swelling) list.push({ id: "swelling", title: "肿胀", kind: "delayed", note: "先处理和观察肿胀；不要求当场消失。" });
    region.movements.forEach((movement) => {
      if (results[movement.id] === "limited" || results[movement.id] === "painful") {
        const response = getDirectionRule(region.id, movement.id, movement.name);
        list.push({ id: response.id, title: response.finding, kind: "immediate", rule: response, note: response.retest });
      }
    });
    region.functions.forEach((item) => {
      if (results[item.id] === "painful" || results[item.id] === "limited") {
        const preferred = region.id === "knee" ? DIRECTION_RULES.find((rule) => rule.id === "knee-load-flex") : undefined;
        const response = preferred ?? getDirectionRule(region.id, item.id, item.name);
        list.push({ id: `${response.id}-${item.id}`, title: `${item.name}疼痛或受限`, kind: "immediate", rule: response, note: response.retest });
      }
    });
    if (symptoms.tenderness) list.push({ id: "tenderness", title: "按压痛", kind: "delayed", note: "只记录范围，避免反复按压；24–48小时后再比较。" });
    if (Object.entries(results).some(([id, value]) => id.startsWith("special-") && value === "positive")) list.push({ id: "positive-special", title: "特殊检查阳性", kind: "delayed", note: "记录具体阳性表现；结合影像或专业评估确认，不把单项检查当作诊断。" });
    const weakness = region.strength.some((item) => results[item.id] === "weak" || results[item.id] === "painful") || symptoms.weakness;
    if (weakness) list.push({ id: "weakness", title: "力量或控制不足", kind: "training", note: "直接安排训练，下次与健侧比较，不做当场反复测试。" });
    if (symptoms.numbness) list.push({ id: "nerve", title: "麻、刺或电感", kind: "immediate", rule: getDirectionRule(region.id, "nerve", "神经相关动作"), note: "只保留不让症状向手脚末端扩散的方向。" });
    return list.length ? list : [{ id: "no-clear", title: "暂未发现明确异常", kind: "training", note: "从基础能力训练开始，下次出现具体问题时再补查。" }];
  }, [region, results, symptoms]);

  const maxUnlocked: Step = !intakeComplete ? 0 : !safetyComplete ? 1 : !assessmentComplete ? 2 : !treatmentDone ? 3 : 4;
  const currentAssessment = assessmentItems[Math.min(assessmentIndex, Math.max(0, assessmentItems.length - 1))];
  const currentFinding = findings[Math.min(treatmentFinding, findings.length - 1)];
  const candidates = currentFinding?.rule ? [
    ...currentFinding.rule.muscleCandidates.map((name) => ({ type: "肌肉处理", name })),
    ...currentFinding.rule.jointCandidates.map((name) => ({ type: "关节处理 · 受训人员", name })),
  ] : [];
  const currentCandidate = candidates[candidateIndex];

  const summary = [region?.name, location, side, onset, painType].filter(Boolean) as string[];
  const exercises = pattern ? pattern[trainingPhase] : [];

  function analyzeDescription() {
    if (description.trim().length < 4) { setToast("请先用一句话描述问题"); return; }
    const detected = detectFromText(description);
    const detectedRegion = detected?.regionId ?? inferRegion(description);
    setRegionId(detectedRegion);
    setMatchedInjuryId(detected?.id ?? "");
    setUseMatch(Boolean(detected));
    if (/左/.test(description) && /右/.test(description)) setSide("双侧"); else if (/左/.test(description)) setSide("左侧"); else if (/右/.test(description)) setSide("右侧");
    setSymptoms((current) => ({ ...current, swelling: /肿|积液/.test(description), tenderness: /压痛|按压/.test(description), motion: /受限|僵|不能伸|不能弯/.test(description), painfulAction: /痛|疼/.test(description), weakness: /无力|力弱/.test(description), numbness: /麻|电|放射/.test(description) }));
    setIntakePart(1);
  }

  function goTo(next: Step) {
    if (next > maxUnlocked) { setToast(`请先完成“${STEP_LABELS[maxUnlocked]}”`); return; }
    setStep(next);
  }

  function recordAssessment(value: Result) {
    if (!currentAssessment) return;
    setResults((current) => ({ ...current, [currentAssessment.id]: value }));
    if (assessmentIndex < assessmentItems.length - 1) setAssessmentIndex((index) => index + 1);
  }

  function recordCandidate(value: "better" | "same" | "worse") {
    if (!currentFinding || !currentCandidate) return;
    const key = `${currentFinding.id}-${candidateIndex}`;
    setCandidateResults((current) => ({ ...current, [key]: value }));
    if (value !== "better" && candidateIndex < candidates.length - 1) setCandidateIndex((index) => index + 1);
  }

  function nextFinding() {
    if (treatmentFinding < findings.length - 1) { setTreatmentFinding((index) => index + 1); setCandidateIndex(0); }
    else { setTreatmentDone(true); setStep(4); }
  }

  function saveCase() {
    const record = { savedAt: new Date().toISOString(), description, regionId, location, scene, side, onset, painType, symptoms, safety, imaging, results, candidateResults, followup };
    let saved: unknown[] = [];
    try { saved = JSON.parse(window.localStorage.getItem("rehabmind-cases") ?? "[]") as unknown[]; } catch { saved = []; }
    window.localStorage.setItem("rehabmind-cases", JSON.stringify([record, ...saved].slice(0, 20)));
    setToast("记录已保存到当前设备");
  }

  return <main className="guided-app">
    <header className="guided-topbar"><button type="button" onClick={() => goTo(0)}><b>R</b><strong>RehabMind</strong></button><span>{region ? `${side || ""}${region.name}` : "新症状"}</span><button type="button" onClick={saveCase}>保存</button></header>

    <nav className="locked-steps" aria-label="康复流程">
      {STEP_LABELS.map((label, index) => <button type="button" key={label} className={`${step === index ? "active" : ""} ${index <= maxUnlocked ? "available" : "locked"}`} onClick={() => goTo(index as Step)} disabled={index > maxUnlocked}><i>{index < maxUnlocked ? "✓" : index + 1}</i><span>{label}</span></button>)}
    </nav>

    {summary.length > 0 && <div className="case-summary"><span>已收集</span><div>{summary.map((item) => <b key={item}>{item}</b>)}</div></div>}

    <section className="guided-workspace">
      {step === 0 && <div className="guide-page">
        {intakePart === 0 && <>
          <StepHeader eyebrow="症状信息收集" title="先用自己的话，说清楚哪里不舒服" />
          <div className="hero-input"><textarea autoFocus value={description} onChange={(event) => setDescription(event.target.value)} placeholder="例如：昨天打球落地崴了右脚，外侧肿，走路时疼……&#10;也可以输入系统里没有的情况。" /><button type="button" onClick={analyzeDescription}>开始询问</button></div>
          <p className="input-promise">系统会保留你的原话。识别不到现成类型，也可以继续建立自定义评估。</p>
        </>}
        {intakePart === 1 && <>
          <StepHeader eyebrow="问题 1" title="最接近哪个部位？" current={1} total={6} />
          <select className="large-select" value={regionId} onChange={(event) => { setRegionId(event.target.value as RegionId); setMatchedInjuryId(""); setUseMatch(false); }}><option value="">请选择部位</option>{REGIONS.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
          {matchedPattern && <div className="match-suggestion"><span>从原话暂时匹配到</span><strong>{matchedPattern.name}</strong><div><button type="button" className={useMatch ? "selected" : ""} onClick={() => setUseMatch(true)}>基本符合</button><button type="button" className={!useMatch ? "selected" : ""} onClick={() => setUseMatch(false)}>不符合，按自定义症状继续</button></div></div>}
          <button className="next-question" type="button" disabled={!regionId} onClick={() => setIntakePart(2)}>下一题</button>
        </>}
        {intakePart === 2 && <>
          <StepHeader eyebrow="问题 2" title="最具体是哪里？" current={2} total={6} />
          <input className="large-text" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="例如：右膝外侧、髌骨下方、左外踝前下方" />
          <button className="next-question" type="button" disabled={!location.trim()} onClick={() => setIntakePart(3)}>下一题</button>
        </>}
        {intakePart === 3 && <>
          <StepHeader eyebrow="问题 3" title="什么时候、做什么会出现？" current={3} total={6} />
          <textarea className="large-text area" value={scene} onChange={(event) => setScene(event.target.value)} placeholder="例如：下楼时痛；跑步20分钟后出现；早上第一步最明显" />
          <button className="next-question" type="button" disabled={!scene.trim()} onClick={() => setIntakePart(4)}>下一题</button>
        </>}
        {intakePart === 4 && <>
          <StepHeader eyebrow="问题 4" title="出现多久了？" current={4} total={6} />
          <OptionRow options={ONSETS} value={onset} onChange={(value) => { setOnset(value); setIntakePart(5); }} />
        </>}
        {intakePart === 5 && <>
          <StepHeader eyebrow="问题 5" title="最接近哪种感觉？" current={5} total={6} />
          <OptionRow options={PAIN_TYPES} value={painType} onChange={(value) => { setPainType(value); setIntakePart(6); }} />
        </>}
        {intakePart === 6 && <>
          <StepHeader eyebrow="最后一题" title="现在还有哪些表现？" current={6} total={6} />
          <div className="symptom-checks">{SYMPTOMS.map((item) => <button type="button" key={item.key} className={symptoms[item.key] ? "selected" : ""} onClick={() => setSymptoms((current) => ({ ...current, [item.key]: !current[item.key] }))}><i>{symptoms[item.key] ? "✓" : ""}</i><span>{item.label}</span></button>)}</div>
          <div className="side-question"><strong>哪一侧？</strong><OptionRow options={["左侧", "右侧", "双侧", "中间/不分侧"]} value={side} onChange={setSide} /></div>
          <button className="next-question" type="button" disabled={!intakeComplete} onClick={() => setStep(1)}>完成症状收集</button>
        </>}
      </div>}

      {step === 1 && <div className="guide-page">
        {safetyIndex < GENERAL_RED_FLAGS.length ? <>
          <StepHeader eyebrow="先确认" title={GENERAL_RED_FLAGS[safetyIndex]} current={safetyIndex + 1} total={GENERAL_RED_FLAGS.length + 1} />
          {safetyIndex === 1 && <p className="plain-note">伤后局部淤青不算这里的异常颜色；这里指整只手或脚持续发凉、苍白或发紫。</p>}
          <div className="yes-no"><button type="button" className={safety[safetyIndex] === "no" ? "selected" : ""} onClick={() => { setSafety((current) => ({ ...current, [safetyIndex]: "no" })); setSafetyIndex((index) => index + 1); }}>没有</button><button type="button" className={safety[safetyIndex] === "yes" ? "selected alert" : ""} onClick={() => { setSafety((current) => ({ ...current, [safetyIndex]: "yes" })); setSafetyIndex((index) => index + 1); }}>有</button></div>
        </> : <>
          <StepHeader eyebrow="先确认" title="是否有影像或医生给出的限制？" current={GENERAL_RED_FLAGS.length + 1} total={GENERAL_RED_FLAGS.length + 1} />
          <div className="imaging-choices"><button type="button" className={imaging === "none" ? "selected" : ""} onClick={() => setImaging("none")}>没有做过影像</button><button type="button" className={imaging === "clear" ? "selected" : ""} onClick={() => setImaging("clear")}>做过，没有骨折或明确限制</button><button type="button" className={imaging === "finding" ? "selected" : ""} onClick={() => setImaging("finding")}>有骨折、韧带/肌腱或骨髓水肿等结果</button><button type="button" className={imaging === "restricted" ? "selected" : ""} onClick={() => setImaging("restricted")}>医生给了固定、负重或训练限制</button></div>
          {hasSafetyConcern && imaging === "none" && <div className="stop-note"><strong>这次先保存</strong><span>完成相应医学或影像确认后，从这个案例继续，不会丢失前面的信息。</span></div>}
          <button className="next-question" type="button" disabled={!safetyComplete} onClick={() => setStep(2)}>进入检查</button>
        </>}
        {safetyIndex > 0 && <button className="back-question" type="button" onClick={() => setSafetyIndex((index) => Math.max(0, index - 1))}>返回上一题</button>}
      </div>}

      {step === 2 && currentAssessment && <div className="guide-page assessment-page">
        <StepHeader eyebrow={currentAssessment.group} title={currentAssessment.title} current={assessmentIndex + 1} total={assessmentItems.length} />
        <article className="one-check"><div><span>怎么做</span><p>{currentAssessment.how}</p></div><div><span>观察什么</span><p>{currentAssessment.observe}</p></div></article>
        {assessmentIndex === 0 && <p className="plain-note">有健侧时先做健侧，再用相同姿势和速度做患侧。明显肿胀挡住动作时选择“暂不检查”。</p>}
        {currentAssessment.group === "特殊检查" ? <div className="result-options special-results"><button type="button" onClick={() => recordAssessment("normal")}>阴性</button><button type="button" onClick={() => recordAssessment("positive")}>阳性</button><button type="button" onClick={() => recordAssessment("skip")}>未做</button></div> : <div className="result-options"><button type="button" onClick={() => recordAssessment("normal")}>正常</button><button type="button" onClick={() => recordAssessment("limited")}>受限</button><button type="button" onClick={() => recordAssessment("painful")}>会痛</button><button type="button" onClick={() => recordAssessment("weak")}>偏弱</button><button type="button" onClick={() => recordAssessment("skip")}>暂不检查</button></div>}
        <div className="question-controls"><button type="button" disabled={assessmentIndex === 0} onClick={() => setAssessmentIndex((index) => Math.max(0, index - 1))}>上一项</button>{assessmentComplete && <button type="button" className="primary" onClick={() => setStep(3)}>完成检查</button>}</div>
      </div>}

      {step === 3 && currentFinding && <div className="guide-page treatment-page">
        <StepHeader eyebrow={`需要处理或跟踪 · ${treatmentFinding + 1}/${findings.length}`} title={currentFinding.title} />
        {currentFinding.kind !== "immediate" ? <>
          <div className="delayed-finding"><strong>{currentFinding.kind === "training" ? "直接安排训练" : "留到下次比较"}</strong><p>{currentFinding.note}</p></div>
          <button className="next-question" type="button" onClick={nextFinding}>{treatmentFinding < findings.length - 1 ? "看下一个问题" : "进入训练"}</button>
        </> : <>
          {currentFinding.rule && <div className="check-first"><span>处理前先看</span>{currentFinding.rule.firstChecks.map((item) => <p key={item}>{item}</p>)}</div>}
          {currentCandidate ? <article className="candidate-card"><span>{currentCandidate.type}</span><h2>{currentCandidate.name}</h2><div><b>处理后复测</b><p>{currentFinding.rule?.retest}</p></div><div className="candidate-actions"><button type="button" className="better" onClick={() => recordCandidate("better")}>有改善，保留</button><button type="button" onClick={() => recordCandidate("same")}>没变化，试下一个</button><button type="button" className="worse" onClick={() => recordCandidate("worse")}>加重，停止并换方向</button></div></article> : <div className="delayed-finding"><strong>候选已经尝试完</strong><p>没有找到明确的即时改变时，不继续堆叠处理；保留训练或补充影像/专业评估。</p></div>}
          {currentCandidate && candidateResults[`${currentFinding.id}-${candidateIndex}`] === "better" && <div className="keep-result"><strong>保留这个方向</strong><span>{currentFinding.rule?.keep}</span></div>}
          <button className="next-question" type="button" disabled={Boolean(currentCandidate) && !candidateResults[`${currentFinding.id}-${candidateIndex}`]} onClick={nextFinding}>{treatmentFinding < findings.length - 1 ? "记录并看下一个问题" : "完成处理，进入训练"}</button>
        </>}
      </div>}

      {step === 4 && pattern && <div className="guide-page training-page">
        <StepHeader eyebrow="训练与复查" title="本次做什么，下次回来查什么" />
        <div className="phase-switch"><button type="button" className={trainingPhase === "early" ? "selected" : ""} onClick={() => setTrainingPhase("early")}>先恢复日常</button><button type="button" className={trainingPhase === "rebuild" ? "selected" : ""} onClick={() => setTrainingPhase("rebuild")}>补回力量控制</button><button type="button" className={trainingPhase === "return" ? "selected" : ""} onClick={() => setTrainingPhase("return")}>回到运动</button></div>
        <div className="exercise-list">{exercises.map((exercise) => <ExerciseCard key={exercise.name} exercise={exercise} />)}</div>
        <section className="followup-simple"><header><span>二次、三次康复</span><h2>只复查上次留下的问题</h2></header>{findings.map((finding) => <article key={finding.id}><strong>{finding.title}</strong><div><button type="button" className={followup[finding.id] === "better" ? "selected" : ""} onClick={() => setFollowup((current) => ({ ...current, [finding.id]: "better" }))}>改善</button><button type="button" className={followup[finding.id] === "same" ? "selected" : ""} onClick={() => setFollowup((current) => ({ ...current, [finding.id]: "same" }))}>一样</button><button type="button" className={followup[finding.id] === "worse" ? "selected alert" : ""} onClick={() => setFollowup((current) => ({ ...current, [finding.id]: "worse" }))}>加重</button></div></article>)}<footer><p><b>肿胀、疼痛或活动受限还在：</b>继续对应处理，同时保留能完成的训练。</p><p><b>出现新症状：</b>回到检查，增加相关项目。</p><p><b>只是力量仍不足：</b>继续训练，下次再与健侧比较。</p></footer></section>
        <button className="next-question" type="button" onClick={saveCase}>完成并保存</button>
      </div>}
    </section>

    {toast && <button type="button" className="guided-toast" onClick={() => setToast("")}>{toast}</button>}
  </main>;
}
