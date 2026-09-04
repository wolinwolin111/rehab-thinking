import { StepHeading } from "@/src/features/rehabmind/components/shared/ui-primitives";
import type { PostOpRouting } from "@/src/domain/rehab/safety/postop-routing-core";

type YesNo = "yes" | "no";
type BoneAnswer = YesNo | "unsure";

type SafetyItem = {
  id: string;
  text: string;
  note: string;
};

type ConfirmationStageProps = {
  safetyStage: 0 | 1 | 2;
  safetyAnswered: boolean;
  needsBoneQuestions: boolean;
  boneQuestionsAnswered: boolean;
  boneImagingSuggested: boolean;
  hasSafetySignal: boolean;
  hasClearance: boolean;
  structuralImagingSignal: boolean;
  canContinueSafety: boolean;
  priorCare: string[];
  activeSafetyItems: SafetyItem[];
  safety: Record<string, YesNo>;
  boneRisk: Record<string, BoneAnswer>;
  imaging: string[];
  imagingOptions: readonly string[];
  backLabel: string;
  continueLabel: string;
  /** 术后分流：仅自助模式提问；转介动作由纯核心投影。 */
  showSurgeryQuestion: boolean;
  surgeryHad: string;
  surgeryProcedure: string;
  surgeryTiming: string;
  surgeryProcedures: readonly { id: string; label: string }[];
  surgeryTimings: readonly { id: string; label: string }[];
  postopRouting: PostOpRouting;
  consultationUrl: string;
  onSafetyAnswer: (id: string, answer: YesNo) => void;
  onBoneRiskAnswer: (id: string, answer: BoneAnswer) => void;
  onImagingToggle: (option: string) => void;
  onSurgeryHad: (value: string) => void;
  onSurgeryProcedure: (value: string) => void;
  onSurgeryTiming: (value: string) => void;
  onSaveReferral: () => void;
  onBack: () => void;
  onContinue: () => void;
  onSaveMedicalReview: () => void;
};

const boneQuestions = [
  { id: "boneSpot", title: "最明显的压痛是否集中在脚踝两侧突出的骨头、足外侧骨头突起或足弓内侧骨头突起？", note: "普通软组织压痛、肿胀和淤青不算；分不清就选“不确定”。" },
  { id: "walkThen", title: "刚受伤后，你当时能否自己连续走四步？", note: "可以跛行；这里回忆当时的承重能力，不要现在重新强行测试。" },
  { id: "walkNow", title: "现在能否在安全扶持下连续走四步？", note: "不能因为明显疼痛承重时选“不能”；不需要硬走来证明可以。" },
] as const;

export function ConfirmationStage(props: ConfirmationStageProps) {
  const {
    safetyStage, safetyAnswered, needsBoneQuestions, boneQuestionsAnswered, boneImagingSuggested,
    hasSafetySignal, hasClearance, structuralImagingSignal, canContinueSafety, priorCare,
    activeSafetyItems, safety, boneRisk, imaging, imagingOptions, backLabel, continueLabel,
    showSurgeryQuestion, surgeryHad, surgeryProcedure, surgeryTiming, surgeryProcedures, surgeryTimings,
    postopRouting, consultationUrl,
    onSafetyAnswer, onBoneRiskAnswer, onImagingToggle, onSurgeryHad, onSurgeryProcedure, onSurgeryTiming, onSaveReferral,
    onBack, onContinue, onSaveMedicalReview,
  } = props;

  return <section className="rm-page">
    <StepHeading eyebrow="第2步 · 开始前确认" title="先确认能否安全开始检查" />
    <nav className="rm-safety-stages"><span className={safetyStage === 0 ? "is-current" : safetyAnswered ? "is-done" : ""}>1 安全信号</span>{needsBoneQuestions ? <span className={safetyStage === 1 ? "is-current" : safetyStage > 1 ? "is-done" : ""}>2 骨性风险</span> : null}<span className={safetyStage === 2 ? "is-current" : ""}>{needsBoneQuestions ? "3" : "2"} 影像结论</span></nav>
    {priorCare.length ? <details className="rm-prior-care-note">
      <summary><span>已记录既往处理</span><strong>{priorCare.join("、")}</strong></summary>
      {imaging.includes("未见骨折") ? <p>描述中提到拍片未见骨折，已经带入影像结论；最后一步仍可修改。</p> : priorCare.includes("拍过片") ? <p>请在影像结论中选择报告写明的情况，不需要贴报告原文。</p> : priorCare.includes("看过医生") && imaging.includes("医生有限制") ? <p>已记录医生限制；后续只在医生允许的负重、活动范围和时间内进行。</p> : priorCare.includes("看过医生") && imaging.includes("医生已允许按建议康复") ? <p>已记录医生允许按建议康复；后续仍以最新医嘱为准。</p> : priorCare.includes("看过医生") ? <p>看过医生不等于一定存在活动限制。请在下方选择医生是否允许康复；不清楚时先不进行高负荷训练。</p> : null}
      {priorCare.includes("用过冰敷") ? <p>冰敷不作为恢复必做项；目前证据不能确认它能改善急性踝扭伤的肿胀、活动度或恢复。</p> : null}
    </details> : null}
    {safetyStage === 0 && activeSafetyItems.length ? <div className="rm-safety-list">
      <header><span>安全确认</span><strong>{activeSafetyItems.length} 项</strong></header>
      {activeSafetyItems.map((item) => <article key={item.id}><div><strong>{item.text}</strong><span>{item.note}</span></div><div>{(["no", "yes"] as YesNo[]).map((answer) => <button type="button" key={answer} className={`${safety[item.id] === answer ? "is-selected" : ""} ${answer === "yes" ? "is-alert" : ""}`} onClick={() => onSafetyAnswer(item.id, answer)}>{answer === "no" ? "没有" : "有"}</button>)}</div>{safety[item.id] === "yes" ? <p className="rm-question-alert">已记录这项安全信号。完成其余确认后，页面会直接给出停止或线下评估提示。</p> : null}</article>)}
    </div> : null}

    {safetyStage === 1 && needsBoneQuestions ? <section className="rm-bone-check">
      <header><span>急性崴脚后，是否建议优先拍片？</span><p>共 {boneQuestions.length} 项</p></header>
      {boneQuestions.map((question) => <article key={question.id}><div><strong>{question.title}</strong><span>{question.note}</span></div><div>{(["yes", "no", "unsure"] as const).map((answer) => <button type="button" key={answer} className={boneRisk[question.id] === answer ? "is-selected" : ""} onClick={() => onBoneRiskAnswer(question.id, answer)}>{answer === "yes" ? question.id === "boneSpot" ? "是" : "能" : answer === "no" ? question.id === "boneSpot" ? "不是" : "不能" : "不确定"}</button>)}</div></article>)}
      {boneQuestionsAnswered ? <div className={boneImagingSuggested ? "is-review" : "is-clear"}><strong>{boneImagingSuggested ? "建议优先结合影像确认" : "目前没有明显的拍片优先线索"}</strong><span>{boneImagingSuggested ? "这不等于骨折。没有明显错位或其他危险信号时，可以先做轻柔检查；暂不跳跃、不强压。" : "疼痛或承重能力持续变差时重新评估。"}</span></div> : null}
    </section> : null}

    {safetyStage === 2 ? <div className="rm-form-block"><div className="rm-label"><span>已有影像或医生结论</span><b>不要求贴报告原文</b></div><div className="rm-imaging">{imagingOptions.map((option) => <button type="button" key={option} className={imaging.includes(option) ? "is-selected" : ""} onClick={() => onImagingToggle(option)}>{option}</button>)}</div></div> : null}

    {showSurgeryQuestion ? (() => {
      const hadLabel = surgeryHad === "yes" ? "做过" : surgeryHad === "no" ? "没做过" : surgeryHad === "unsure" ? "不确定" : "";
      const procedureLabel = surgeryProcedures.find((item) => item.id === surgeryProcedure)?.label ?? "";
      const timingLabel = surgeryTimings.find((item) => item.id === surgeryTiming)?.label ?? "";
      const fullyAnswered = surgeryHad === "no" || surgeryHad === "unsure" || (surgeryHad === "yes" && Boolean(surgeryProcedure) && Boolean(surgeryTiming));
      if (fullyAnswered) return <section className="rm-form-block" data-rehabmind-test="surgery-question">
        <div className="rm-surgery-confirmed"><span>这个部位做过手术吗？</span><strong>{surgeryHad === "yes" ? `做过 · ${procedureLabel} · ${timingLabel}` : hadLabel}</strong><button type="button" data-rehabmind-test="surgery-edit" onClick={() => onSurgeryHad("")}>修改</button></div>
      </section>;
      return <section className="rm-form-block" data-rehabmind-test="surgery-question">
      <div className="rm-label"><span>这个部位做过手术吗？</span><b>术后恢复以手术医生的方案为先</b></div>
      <div className="rm-imaging">{([["no", "没做过"], ["yes", "做过"], ["unsure", "不确定"]] as const).map(([value, label]) => <button type="button" key={value} data-rehabmind-test={`surgery-had-${value}`} className={surgeryHad === value ? "is-selected" : ""} onClick={() => onSurgeryHad(value)}>{label}</button>)}</div>
      {surgeryHad === "yes" ? <>
        <div className="rm-label"><span>哪个手术？</span></div>
        <div className="rm-imaging">{surgeryProcedures.map((item) => <button type="button" key={item.id} data-rehabmind-test={`surgery-procedure-${item.id}`} className={surgeryProcedure === item.id ? "is-selected" : ""} onClick={() => onSurgeryProcedure(item.id)}>{item.label}</button>)}</div>
        <div className="rm-label"><span>距手术多久？</span></div>
        <div className="rm-imaging">{surgeryTimings.map((item) => <button type="button" key={item.id} data-rehabmind-test={`surgery-timing-${item.id}`} className={surgeryTiming === item.id ? "is-selected" : ""} onClick={() => onSurgeryTiming(item.id)}>{item.label}</button>)}</div>
      </> : null}
    </section>;
    })() : null}
    {postopRouting.action === "proceed-recorded" ? <p className="rm-inline-note" data-rehabmind-test="postop-recorded-note">已记录：{postopRouting.procedureLabel}（{postopRouting.timingLabel}）——已过该术式的专项指导期，按普通流程继续；范围内活动仍以医生允许为准。</p> : null}

    {safetyStage === 2 && hasSafetySignal && !hasClearance ? <section className="rm-route-note is-waiting"><span>接下来</span><h2>先完成针对性医学评估</h2><p>明显错位、远端感觉或循环异常、力量持续下降以及发热伴快速加重，不适合继续普通检查。本次信息会保存。</p><button type="button" onClick={onSaveMedicalReview}>保存本次信息</button></section> : safetyStage === 2 && structuralImagingSignal && !hasClearance ? <section className="rm-route-note is-waiting"><span>先确认医生意见</span><h2>影像提示结构异常</h2><p>先明确允许的负重、活动范围和训练时间。获得医生允许后，可以回到本次记录继续评估。</p><button type="button" onClick={onSaveMedicalReview}>保存本次信息</button></section> : safetyStage === 2 && safetyAnswered && boneQuestionsAnswered && imaging.length > 0 ? <section className="rm-route-note is-clear"><span>接下来</span><h2>{boneImagingSuggested && imaging.includes("没有做影像") ? "先做轻柔检查，同时安排影像确认" : "开始本次功能检查"}</h2></section> : null}

    {(structuralImagingSignal || imaging.includes("医生有限制")) && <p className="rm-inline-note">后续只在医生允许的负重、活动范围和时间内进行，并以最新医嘱为准。</p>}

    {postopRouting.action === "refer" ? <section className="rm-route-note is-waiting" data-rehabmind-test="postop-referral">
      <span>术后专项指导</span>
      <h2>这个应用不提供术后恢复方案</h2>
      <p>{postopRouting.procedureLabel ? `${postopRouting.procedureLabel}${postopRouting.timingLabel ? `（${postopRouting.timingLabel}）` : ""}还在按专项指南恢复的阶段。` : "先确认手术情况，再决定这里能帮到什么。"}</p>
      <p>配套的术后恢复指导站有分阶段的专项内容；任何与手术医生要求冲突的地方，都以医生意见为先。</p>
      <div className="rm-page-actions split"><button type="button" className="rm-primary" data-rehabmind-test="postop-referral-open" onClick={() => window.open(postopRouting.guideUrl ?? consultationUrl, "_blank", "noopener")}>去术后指导站查看</button><button type="button" onClick={onSaveReferral}>保存本次信息</button></div>
      <p><a href={consultationUrl} target="_blank" rel="noreferrer">没有匹配的专项指南？预约线上讲解人工沟通</a></p>
    </section> : <div className="rm-page-actions split">
      <button type="button" onClick={onBack}>{backLabel}</button>
      <button type="button" className="rm-primary" disabled={safetyStage === 0 ? !safetyAnswered : safetyStage === 1 ? !boneQuestionsAnswered : !canContinueSafety} onClick={onContinue}>{continueLabel}</button>
    </div>}
  </section>;
}
