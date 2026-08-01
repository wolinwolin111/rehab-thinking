"use client";

import { useMemo, useState } from "react";
import {
  GENERAL_RED_FLAGS,
  IMAGING_OPTIONS,
  REGIONS,
  detectFromText,
  type CheckItem,
  type Exercise,
  type Region,
} from "./rehab-library";

type Step = 0 | 1 | 2 | 3 | 4;
type Result = "normal" | "limited" | "painful" | "weak" | "positive" | "skip";
type AssessmentGroup = "movement" | "strength" | "function" | "special";

const STEPS = ["症状信息", "先确认", "评估检查", "处理与复测", "训练与复查"];
const RESULT_LABELS: Array<{ value: Result; label: string }> = [
  { value: "normal", label: "正常" },
  { value: "limited", label: "受限" },
  { value: "painful", label: "疼痛" },
  { value: "weak", label: "偏弱" },
  { value: "skip", label: "未做" },
];

const EMPTY_SYMPTOMS = {
  swelling: false,
  bruising: false,
  tenderness: false,
  motion: false,
  painfulAction: false,
  weakness: false,
  numbness: false,
  loadLimited: false,
};

const SYMPTOM_OPTIONS: Array<{ key: keyof typeof EMPTY_SYMPTOMS; label: string }> = [
  { key: "swelling", label: "有肿胀" },
  { key: "bruising", label: "有淤青" },
  { key: "tenderness", label: "按压会痛" },
  { key: "motion", label: "活动受限" },
  { key: "painfulAction", label: "有疼痛动作" },
  { key: "weakness", label: "感觉力量不足" },
  { key: "numbness", label: "有麻、刺、电感" },
  { key: "loadLimited", label: "承重或日常使用受限" },
];

const PAIN_NATURES = ["酸痛", "胀痛", "刺痛", "牵拉痛", "麻/电感", "说不清"];
const PAIN_TIMES = ["今天/昨天", "2–7天", "1–6周", "超过6周", "反复出现"];

function accessLabel(access: "self" | "assisted" | "trained") {
  if (access === "self") return "可以单人完成";
  if (access === "assisted") return "需要同伴协助";
  return "需要受过训练的操作者";
}

function SummaryPill({ children }: { children: React.ReactNode }) {
  return <span className="summary-pill">{children}</span>;
}

function ResultChooser({ value, onChange }: { value?: Result; onChange: (value: Result) => void }) {
  return (
    <div className="result-chooser" aria-label="记录检查结果">
      {RESULT_LABELS.map((item) => (
        <button
          type="button"
          key={item.value}
          className={value === item.value ? `selected ${item.value}` : ""}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ExerciseCard({ item }: { item: Exercise }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="training-card">
      <button className="motion-placeholder" type="button" onClick={() => setOpen(true)} aria-label={`查看${item.name}动作方法`}>
        <span className="motion-figure" aria-hidden="true"><i /><b /><em /></span>
        <strong>动作方法</strong>
      </button>
      <div className="training-copy">
        <h3>{item.name}</h3>
        <div className="sets-reps"><b>{item.groups}</b><b>{item.reps}</b></div>
        <p><span>观察</span>{item.observe}</p>
      </div>
      {open && (
        <div className="demo-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <section className="demo-sheet" role="dialog" aria-modal="true" aria-label={`${item.name}动作说明`} onClick={(event) => event.stopPropagation()}>
            <header><div><span>动作演示</span><h2>{item.name}</h2></div><button type="button" onClick={() => setOpen(false)}>关闭</button></header>
            <div className="demo-stage">
              <span className="motion-figure large" aria-hidden="true"><i /><b /><em /></span>
              <div className="video-reserved"><strong>视频位置已保留</strong><span>后续可直接上传自有拍摄视频</span></div>
            </div>
            <ol className="demo-instructions">
              <li><b>摆好位置</b><span>{item.how}</span></li>
              <li><b>完成数量</b><span>{item.groups}，{item.reps}</span></li>
              <li><b>边做边看</b><span>{item.observe}</span></li>
            </ol>
            <div className="level-switch"><div><span>做不了</span><strong>{item.easier}</strong></div><div><span>太轻松</span><strong>{item.harder}</strong></div></div>
          </section>
        </div>
      )}
    </article>
  );
}

function CheckCard({ item, value, onChange }: { item: CheckItem; value?: Result; onChange: (value: Result) => void }) {
  return (
    <article className="check-card">
      <div className="check-number" aria-hidden="true">✓</div>
      <div className="check-copy"><h3>{item.name}</h3><p>{item.how}</p><strong>观察：{item.observe}</strong></div>
      <ResultChooser value={value} onChange={onChange} />
    </article>
  );
}

export default function RehabSystem() {
  const [step, setStep] = useState<Step>(0);
  const [regionId, setRegionId] = useState("ankle");
  const [injuryId, setInjuryId] = useState("ankle-lateral");
  const [input, setInput] = useState("昨天打球落地时崴了右脚，外侧肿痛，走路有点跛");
  const [side, setSide] = useState("右侧");
  const [painTime, setPainTime] = useState("2–7天");
  const [painNature, setPainNature] = useState("刺痛");
  const [painScore, setPainScore] = useState(5);
  const [symptoms, setSymptoms] = useState(EMPTY_SYMPTOMS);
  const [redFlags, setRedFlags] = useState<Record<number, boolean>>({});
  const [imaging, setImaging] = useState(IMAGING_OPTIONS[0]);
  const [assessmentGroup, setAssessmentGroup] = useState<AssessmentGroup>("movement");
  const [results, setResults] = useState<Record<string, Result>>({});
  const [activeTreatment, setActiveTreatment] = useState(0);
  const [treatmentResult, setTreatmentResult] = useState<Record<number, "better" | "same" | "worse">>({});
  const [trainingPhase, setTrainingPhase] = useState<"early" | "rebuild" | "return">("early");
  const [followup, setFollowup] = useState<Record<string, "better" | "same" | "worse">>({});
  const [savedCount, setSavedCount] = useState(0);
  const [toast, setToast] = useState("");

  const region = useMemo(() => REGIONS.find((item) => item.id === regionId) ?? REGIONS[0], [regionId]);
  const pattern = useMemo(() => region.injuries.find((item) => item.id === injuryId) ?? region.injuries[0], [region, injuryId]);

  const collected = useMemo(() => {
    const items = [`${side}${region.name}`, pattern.name, painTime, `${painScore}分`, painNature];
    SYMPTOM_OPTIONS.forEach((item) => { if (symptoms[item.key]) items.push(item.label); });
    return items;
  }, [side, region.name, pattern.name, painTime, painScore, painNature, symptoms]);

  const flagged = Object.values(redFlags).some(Boolean);
  const completedCount = Object.keys(results).length;
  const resultValues = Object.values(results);
  const hasLimited = symptoms.motion || resultValues.includes("limited");
  const hasPain = symptoms.painfulAction || resultValues.includes("painful");
  const hasWeak = symptoms.weakness || resultValues.includes("weak");
  const hasPositive = resultValues.includes("positive");

  const problems = useMemo(() => {
    const next: string[] = [];
    if (symptoms.swelling) next.push("肿胀仍存在");
    if (hasLimited) next.push("活动方向受限");
    if (hasPain) next.push("动作会诱发疼痛");
    if (symptoms.tenderness) next.push("局部按压痛");
    if (hasWeak) next.push("力量或控制不足");
    if (symptoms.numbness) next.push("麻、刺或电感需要跟踪");
    if (hasPositive) next.push("特殊检查阳性待确认");
    if (!next.length) next.push("暂未记录明确异常，先完成基础检查");
    return next;
  }, [symptoms, hasLimited, hasPain, hasWeak, hasPositive]);

  const treatmentCards = useMemo(() => {
    const cards: Array<{ label: string; title: string; do: string[]; observe: string; retest?: string; delayed?: boolean }> = [];
    if (symptoms.swelling) cards.push({ label: "肿胀", title: "先减轻肿胀对活动的影响", do: ["抬高患处并进行轻柔主动活动", "由受过训练的操作者进行近端到远端再回流方向的轻柔处理", "减少会让肿胀持续增加的活动量"], observe: "记录轮廓、皮肤褶皱和同一位置的围度变化。", delayed: true });
    if (hasLimited) cards.push({ label: "活动受限", title: `恢复${region.name}受限方向`, do: [`先处理候选肌肉：${pattern.softTissue.join("、")}`, "马上重复原受限方向", `改善不明显时，由受训人员尝试：${pattern.mobilization.join("、")}`], observe: "只看同一方向是否更顺、幅度是否增加。", retest: "用完全相同姿势重复原来的活动度测试。" });
    if (hasPain) cards.push({ label: "疼痛动作", title: "找出能改变疼痛动作的因素", do: [`先对${pattern.softTissue.slice(0, 3).join("、")}做短时放松试验`, "改变一个动作条件：幅度、支撑、速度或关节位置", "每次只改变一个因素"], observe: "疼痛是否下降，动作是否更敢做。", retest: "按原速度、原范围重复同一个疼痛动作。" });
    if (symptoms.tenderness) cards.push({ label: "按压痛", title: "减少局部刺激并观察恢复", do: ["不反复按压确认疼痛", `处理周围肌腹：${pattern.softTissue.slice(0, 2).join("、")}`, "根据受伤时间安排保护或逐步恢复活动"], observe: "观察24–48小时后压痛范围是否缩小，不要求当场消失。", delayed: true });
    if (hasWeak) cards.push({ label: "力量不足", title: "直接进入对应力量训练", do: ["不追求当场力量变化", `先从“${pattern.early[0].name}”或“${pattern.rebuild[0].name}”开始`, "下次康复再与健侧比较力量和动作质量"], observe: "记录完成的组数、个数、动作质量和次日反应。", delayed: true });
    if (symptoms.numbness) cards.push({ label: "麻刺电感", title: "先确认神经症状是否稳定", do: ["记录感觉出现的区域", "比较颈/腰与肢体动作是否改变症状", "只做不让症状向远端扩散的轻柔滑动"], observe: "症状向身体近端集中可继续；向手脚末端扩散则停止。", retest: "重复最容易改变感觉的动作，不反复拉到终点。" });
    if (hasPositive) cards.push({ label: "阳性检查", title: "补充医学或影像信息", do: ["保存具体阳性检查和发生场景", "用问答记录是否有骨折、韧带、肌腱、骨髓水肿或积液", "遵守医生给出的固定、负重和训练限制"], observe: "阳性特殊检查只提高某个方向的可能性，不单独当作诊断。", delayed: true });
    return cards.length ? cards : [{ label: "基础", title: "完成低负荷能力建立", do: ["选择最接近日常需求的动作", "从容易成功的版本开始", "下次比较完成质量"], observe: "训练中和次日均保持稳定。", delayed: true }];
  }, [symptoms, hasLimited, hasPain, hasWeak, hasPositive, pattern, region.name]);

  function chooseRegion(next: Region) {
    setRegionId(next.id);
    setInjuryId(next.injuries[0].id);
    setResults({});
    setActiveTreatment(0);
  }

  function parseInput() {
    const detected = detectFromText(input);
    if (!detected) {
      setToast("暂时没识别到明确部位，请从关节列表选择");
      return;
    }
    setRegionId(detected.regionId);
    setInjuryId(detected.id);
    const text = input;
    setSymptoms((current) => ({
      ...current,
      swelling: /肿|积液/.test(text), bruising: /淤|青紫/.test(text), tenderness: /按|压痛/.test(text),
      motion: /受限|不能动|僵/.test(text), painfulAction: /痛|疼/.test(text), weakness: /无力|力弱/.test(text),
      numbness: /麻|电|放射/.test(text), loadLimited: /不能走|跛|不能承重|抬不起/.test(text),
    }));
    setToast(`已匹配：${detected.regionName} · ${detected.name}`);
  }

  function saveCase() {
    const key = "rehabmind-cases";
    let previous: unknown[] = [];
    try { previous = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown[]; } catch { previous = []; }
    const record = { id: Date.now(), savedAt: new Date().toISOString(), input, regionId, injuryId, side, painTime, painNature, painScore, symptoms, imaging, results, treatmentResult, followup };
    const next = [record, ...previous].slice(0, 20);
    window.localStorage.setItem(key, JSON.stringify(next));
    setSavedCount(next.length);
    setToast("本次记录已保存在当前设备");
  }

  const assessmentItems = assessmentGroup === "movement" ? region.movements : assessmentGroup === "strength" ? region.strength : region.functions;
  const phaseExercises = trainingPhase === "early" ? pattern.early : trainingPhase === "rebuild" ? pattern.rebuild : pattern.return;
  const currentTreatment = treatmentCards[Math.min(activeTreatment, treatmentCards.length - 1)];

  return (
    <main className="rehab-app">
      <header className="app-header">
        <button className="brand" type="button" onClick={() => setStep(0)}><span>R</span><div><strong>RehabMind</strong><small>运动康复思路助手</small></div></button>
        <div className="header-case"><span>{region.short}</span><div><b>{side}{region.name}</b><small>{pattern.name}</small></div></div>
        <button className="save-button" type="button" onClick={saveCase}>保存本次记录{savedCount > 0 && <i>{savedCount}</i>}</button>
      </header>

      <nav className="step-rail" aria-label="康复流程">
        {STEPS.map((label, index) => (
          <button type="button" key={label} className={step === index ? "active" : step > index ? "done" : ""} onClick={() => setStep(index as Step)}>
            <i>{step > index ? "✓" : index + 1}</i><span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="collected-strip">
        <strong>已收集</strong><div>{collected.map((item) => <SummaryPill key={item}>{item}</SummaryPill>)}</div>
      </div>

      <section className="workspace">
        {step === 0 && (
          <div className="intake-layout">
            <aside className="joint-atlas">
              <header><span>10个区域</span><strong>选择症状部位</strong></header>
              <div>{REGIONS.map((item) => <button type="button" key={item.id} className={region.id === item.id ? "selected" : ""} onClick={() => chooseRegion(item)}><i>{item.short}</i><span>{item.name}</span><b>{item.injuries.length}</b></button>)}</div>
            </aside>
            <div className="intake-main">
              <div className="page-heading"><span>症状信息收集</span><h1>先把这次最困扰的问题说清楚</h1></div>
              <div className="symptom-input"><textarea value={input} onChange={(event) => setInput(event.target.value)} aria-label="描述症状" /><button type="button" onClick={parseInput}>识别症状</button></div>
              <div className="pattern-picker">
                <strong>{region.name}常见问题</strong>
                <div>{region.injuries.map((item) => <button type="button" key={item.id} className={pattern.id === item.id ? "selected" : ""} onClick={() => setInjuryId(item.id)}><b>{item.name}</b><span>{item.typical}</span></button>)}</div>
              </div>
              <div className="quick-facts">
                <section><strong>哪一侧</strong><div>{["左侧", "右侧", "双侧/中间"].map((item) => <button key={item} type="button" className={side === item ? "selected" : ""} onClick={() => setSide(item)}>{item}</button>)}</div></section>
                <section><strong>出现多久</strong><div>{PAIN_TIMES.map((item) => <button key={item} type="button" className={painTime === item ? "selected" : ""} onClick={() => setPainTime(item)}>{item}</button>)}</div></section>
                <section><strong>疼痛感觉</strong><div>{PAIN_NATURES.map((item) => <button key={item} type="button" className={painNature === item ? "selected" : ""} onClick={() => setPainNature(item)}>{item}</button>)}</div></section>
                <section className="pain-scale"><strong>最明显时有多痛</strong><div><input type="range" min="0" max="10" value={painScore} onChange={(event) => setPainScore(Number(event.target.value))} /><b>{painScore}分</b></div></section>
              </div>
              <div className="symptom-flags"><strong>现在有哪些表现</strong><div>{SYMPTOM_OPTIONS.map((item) => <button type="button" key={item.key} className={symptoms[item.key] ? "selected" : ""} onClick={() => setSymptoms((current) => ({ ...current, [item.key]: !current[item.key] }))}>{symptoms[item.key] ? "✓ " : "+ "}{item.label}</button>)}</div></div>
              <div className="ask-list"><strong>还要问清楚</strong>{pattern.ask.map((item) => <p key={item}>{item}</p>)}</div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="single-column">
            <div className="page-heading"><span>先确认</span><h1>只确认会改变今天流程的信息</h1></div>
            <div className="safety-card">
              <header><div><span>明显异常</span><h2>普通肿胀和伤后淤青，不算“明显变形或异常颜色”</h2></div><b>{flagged ? "需要先确认" : "可继续检查"}</b></header>
              <div className="safety-list">
                {GENERAL_RED_FLAGS.map((item, index) => <article key={item}><strong>{item}</strong><div><button type="button" className={redFlags[index] === false ? "selected safe" : ""} onClick={() => setRedFlags((current) => ({ ...current, [index]: false }))}>没有</button><button type="button" className={redFlags[index] === true ? "selected alert" : ""} onClick={() => setRedFlags((current) => ({ ...current, [index]: true }))}>有</button></div></article>)}
              </div>
            </div>
            <div className="imaging-card">
              <header><span>影像学信息</span><h2>不用粘贴报告，按已经知道的结果选择</h2></header>
              <div>{IMAGING_OPTIONS.map((item) => <button type="button" key={item} className={imaging === item ? "selected" : ""} onClick={() => setImaging(item)}>{item}</button>)}</div>
            </div>
            {flagged && <div className="route-notice alert"><strong>先补充医学评估</strong><p>保存这次记录。获得影像或医生意见后，从本案例继续评估；不是永久停止康复流程。</p></div>}
          </div>
        )}

        {step === 2 && (
          <div className="assessment-workspace">
            <div className="page-heading"><span>评估检查</span><h1>一次只做一项，结果直接记下来</h1></div>
            {symptoms.swelling && <div className="route-notice"><strong>当前有明显肿胀</strong><p>先记录轮廓和围度。过度肿胀时不强行测终末角度，待肿胀下降后补测。</p></div>}
            <div className="assessment-tabs">
              {([[
                "movement", "活动度", region.movements.length
              ], ["strength", "肌肉力量", region.strength.length], ["function", "功能动作", region.functions.length], ["special", "特殊检查", pattern.special.length]] as [AssessmentGroup, string, number][]).map(([id, label, count]) => <button type="button" key={id} className={assessmentGroup === id ? "active" : ""} onClick={() => setAssessmentGroup(id)}><span>{label}</span><b>{count}项</b></button>)}
            </div>
            <div className="comparison-rule"><span>比较方法</span><strong>{region.id === "back" || region.id === "neck" || region.id === "thoracic" ? "和本人平时状态、左右方向比较" : "先做健侧，再用同样姿势、速度和力量做患侧"}</strong></div>
            {assessmentGroup !== "special" ? (
              <div className="check-list">{assessmentItems.map((item) => <CheckCard key={item.id} item={item} value={results[item.id]} onChange={(value) => setResults((current) => ({ ...current, [item.id]: value }))} />)}</div>
            ) : (
              <div className="check-list special-list">{pattern.special.map((item, index) => { const id = `special-${pattern.id}-${index}`; return <article className="check-card" key={item.name}><div className="access-badge">{accessLabel(item.access)}</div><div className="check-copy"><h3>{item.name}</h3><p>{item.how}</p><strong>阳性：{item.positive}</strong><em>下一步：{item.next}</em></div><div className="binary-result"><button type="button" className={results[id] === "normal" ? "selected" : ""} onClick={() => setResults((current) => ({ ...current, [id]: "normal" }))}>阴性</button><button type="button" className={results[id] === "positive" ? "selected positive" : ""} onClick={() => setResults((current) => ({ ...current, [id]: "positive" }))}>阳性</button><button type="button" className={results[id] === "skip" ? "selected" : ""} onClick={() => setResults((current) => ({ ...current, [id]: "skip" }))}>未做</button></div></article>; })}</div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="treatment-workspace">
            <div className="page-heading"><span>处理与复测</span><h1>先处理能改变的，再用原动作验证</h1></div>
            <section className="problem-ledger"><header><span>发现 {problems.length} 个需要处理或跟踪的问题</span></header><div>{problems.map((item, index) => <article key={item}><b>{index + 1}</b><strong>{item}</strong></article>)}</div></section>
            <div className="treatment-layout">
              <nav>{treatmentCards.map((item, index) => <button type="button" key={`${item.label}-${index}`} className={activeTreatment === index ? "active" : ""} onClick={() => setActiveTreatment(index)}><i>{index + 1}</i><span>{item.label}</span></button>)}</nav>
              <article className="treatment-focus">
                <header><span>现在处理</span><h2>{currentTreatment.title}</h2></header>
                <div className="do-list"><strong>怎么做</strong><ol>{currentTreatment.do.map((item) => <li key={item}>{item}</li>)}</ol></div>
                <div className="observe-box"><span>做的时候看</span><strong>{currentTreatment.observe}</strong></div>
                {currentTreatment.retest ? <div className="retest-box"><div><span>马上复测</span><strong>{currentTreatment.retest}</strong></div><div className="three-result">{(["better", "same", "worse"] as const).map((value) => <button type="button" key={value} className={treatmentResult[activeTreatment] === value ? `selected ${value}` : ""} onClick={() => setTreatmentResult((current) => ({ ...current, [activeTreatment]: value }))}>{value === "better" ? "改善" : value === "same" ? "没变化" : "加重"}</button>)}</div></div> : <div className="delayed-box"><span>不用当场反复测</span><strong>记录今天做了什么，下次康复再比较。</strong></div>}
                <footer>{treatmentResult[activeTreatment] === "better" ? "有效：保留这个方向，进入训练。" : treatmentResult[activeTreatment] === "same" ? "没变化：换一个肌肉或由受训人员尝试关节松动。" : treatmentResult[activeTreatment] === "worse" ? "加重：停止这个方法，回到评估重新判断。" : "完成处理后选择结果。"}</footer>
              </article>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="training-workspace">
            <div className="page-heading"><span>训练与复查</span><h1>本次练什么，下次回来查什么</h1></div>
            <div className="phase-tabs">
              <button type="button" className={trainingPhase === "early" ? "active" : ""} onClick={() => setTrainingPhase("early")}><i>1</i><span>先恢复日常</span><b>疼痛、肿胀或活动仍明显</b></button>
              <button type="button" className={trainingPhase === "rebuild" ? "active" : ""} onClick={() => setTrainingPhase("rebuild")}><i>2</i><span>补回能力</span><b>日常动作基本可完成</b></button>
              <button type="button" className={trainingPhase === "return" ? "active" : ""} onClick={() => setTrainingPhase("return")}><i>3</i><span>回到运动</span><b>力量和控制接近健侧</b></button>
            </div>
            <section className="session-plan">
              <header><div><span>{trainingPhase === "early" ? "第1阶段" : trainingPhase === "rebuild" ? "第2阶段" : "第3阶段"}</span><h2>今天做这 {phaseExercises.length} 个动作</h2></div><b>视频功能已预留，当前先看动作方法</b></header>
              <div className="exercise-grid">{phaseExercises.map((item) => <ExerciseCard key={item.name} item={item} />)}</div>
            </section>
            <section className="followup-board">
              <header><span>二次、三次康复都从这里开始</span><h2>只复查上次发现的问题</h2></header>
              <div className="followup-grid">
                {problems.map((item) => <article key={item}><strong>{item}</strong><div>{(["better", "same", "worse"] as const).map((value) => <button type="button" key={value} className={followup[item] === value ? `selected ${value}` : ""} onClick={() => setFollowup((current) => ({ ...current, [item]: value }))}>{value === "better" ? "改善" : value === "same" ? "一样" : "加重"}</button>)}</div></article>)}
              </div>
              <div className="followup-decision"><div><span>还有肿胀、疼痛或活动受限</span><strong>继续对应处理，同时保留能完成的训练</strong></div><div><span>出现新的症状</span><strong>回到评估检查，增加相关测试</strong></div><div><span>力量与功能仍不足</span><strong>不反复做当场复测，继续训练并在下次比较</strong></div></div>
            </section>
          </div>
        )}
      </section>

      <footer className="action-bar">
        <button type="button" disabled={step === 0} onClick={() => setStep((Math.max(0, step - 1)) as Step)}>返回上一步</button>
        <div><span>第 {step + 1} / 5 步</span><strong>{completedCount > 0 ? `已记录 ${completedCount} 项检查` : pattern.name}</strong></div>
        {step < 4 ? <button type="button" className="primary" onClick={() => setStep((step + 1) as Step)}>继续：{STEPS[step + 1]}</button> : <button type="button" className="primary" onClick={saveCase}>完成并保存</button>}
      </footer>
      {toast && <button type="button" className="toast" onClick={() => setToast("")}>{toast}</button>}
    </main>
  );
}
