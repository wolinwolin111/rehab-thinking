import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { AnswerChoiceGrid, ScoreSlider, StepHeading } from "@/src/features/rehabmind/components/shared/ui-primitives";
import LowerLimbLocationPicker from "@/src/features/rehabmind/components/assessment/lower-limb-location-picker";
import MuscleRegionLocationPicker from "@/src/features/rehabmind/components/assessment/muscle-region-location-picker";
import type { FunctionUnableReason } from "@/src/features/rehabmind/controllers/use-function-retest";
import type { ExerciseFeedback } from "@/src/features/rehabmind/controllers/use-training-flow";
import type { YesNo, TrialRecord } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { professionalAssessmentTitle } from "@/src/knowledge/pilot/pilot-motion-muscle-knowledge";
import { shouldAskMotionDiscomfort, shouldAskPairedStrength, shouldCaptureUnableMotionSymptom, skippedChiefActionTitles, strengthAnswerResult, type StrengthUnableReason } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { anyMotionIdFromFinding, samePhysicalAction } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { adverseCaptureComplete, type AdverseResolution, type AdverseResponseEvent } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { chiefActionLabel, chiefMotionDirectionId, hasClearChiefAction, isAcuteTrauma } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { buildFindingGroups } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { functionCompletionValue, functionControlValue, functionDiscomfortValue } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { motionNeedsPassive } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { parseRangeAngle } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { assessmentRecordComplete, functionalActionMeta } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { renderOptions, unableFollowUp } from "@/src/knowledge/actions/index";
import { workbenchStageStates } from "@/src/features/rehabmind/workflow/stage-workbench-core";
import { CaseSummaryBar } from "@/src/features/rehabmind/components/workbench/case-summary-bar";
import type { BilateralPriorityResolution } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { TissuePathwayDecision } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { FullExercise, FullRegion } from "@/src/knowledge/pilot/full-demo-content";
import {
  type AssessmentItem,
  type AssessmentRecord,
  type BilateralMotionAnswer,
  type FamiliarSymptomAnswer,
  type Finding,
  type FollowupExerciseChoice,
  type FollowupStage,
  type FunctionCompletion,
  type FunctionControl,
  type IntakeState,
  type MotionAnswer,
  type SavedDemoRecord,
  type SavedDemoSnapshot,
  type SimpleAnswer,
  type Step,
  type TransitionTarget,
  BILATERAL_OBSERVE,
  PASSIVE_END_FEEL_OPTIONS,
  PATELLA_DIRECTION_IDS,
  PATELLA_DIRECTION_LABELS,
  PATELLA_DIRECTION_TITLES,
  PATELLA_GROUP_PRIMARY_ID,
  SHARED_TENSION_ASSESSMENT_ID,
  SYMPTOM_TYPES,
  activeMotionRangeOptions,
  activeMotionRangeQuestion,
  assessmentAllowsEndFeel,
  assessmentAllowsPassive,
  assessmentLocationAreas,
  assessmentObservationSentence,
  bilateralComparisonOptions,
  bilateralComparisonToSide,
  bilateralMotionOptions,
  effectiveAssessmentRecord,
  effectiveBilateralComparison,
  effectiveProvocationTypes,
  familiarSymptomRequired,
  functionCompensationOptions,
  functionSimpleAnswer,
  isPilotRegion,
  localLimbMotionRangeOptions,
  locationSelectionsLabel,
  motionActiveAnswerPatch,
  passiveMotionInstruction,
  passiveMotionOptions,
  professionalFindingLabel,
  professionalPassiveMotionInstruction,
  spinalRangeQuestion,
  strengthRelatedMotionId,
  tensionLocationOptions,
} from "@/src/features/rehabmind/components/workbench/workbench-support";

export type AssessmentStageProps = {
  step: Step;
  intake: IntakeState;
  assessmentIndex: number;
  assessmentResults: Record<string, AssessmentRecord>;
  assessmentSummaryOpen: boolean;
  sharedTensionOpen: boolean;
  thinkingWorkbenchOpen: boolean;
  adverseResponse: AdverseResponseEvent | null;
  adverseConfirmedAssessmentIds: string[];
  region?: FullRegion;
  canAssessPassive: boolean;
  canAssessResistance: boolean;
  canAssessEndFeel: boolean;
  canRunSpecialTest: boolean;
  isThinkingMode: boolean;
  assessments: AssessmentItem[];
  assessmentDisplayItems: AssessmentItem[];
  findings: Finding[];
  bilateralPriorityResolution: BilateralPriorityResolution;
  tissuePathway: TissuePathwayDecision;
  assessmentComplete: boolean;
  limitedPilotMotionItems: AssessmentItem[];
  sharedTensionRequired: boolean;
  sharedTensionRecord: AssessmentRecord;
  sharedTensionComplete: boolean;
  assessmentFlowComplete: boolean;
  assessmentReadyForTreatment: boolean;
  canContinueSafety: boolean;
  specialPositiveFindings: AssessmentItem[];
  hasSpecialPositive: boolean;
  assessmentNeuralReferral: boolean;
  sharpSpecialReferral: boolean;
  specialSafetyReferral: boolean;
  assessmentNeedsReferral: boolean;
  highIrritabilityReferral: boolean;
  adverseResolution: AdverseResolution | null;
  trialRecords: TrialRecord[];
  exercises: FullExercise[];
  treatmentComplete: boolean;
  trainingComplete: boolean;
  trainingPlanSaved: boolean;
  trainingStageClosed: boolean;
  displayAssessmentIndexForId: (id: string) => number;
  displayAssessmentComplete: (item: AssessmentItem) => boolean;
  onStepChange: Dispatch<SetStateAction<Step>>;
  onTransitionTargetChange: Dispatch<SetStateAction<TransitionTarget | null>>;
  onAssessmentIndexChange: Dispatch<SetStateAction<number>>;
  onAssessmentSummaryOpenChange: Dispatch<SetStateAction<boolean>>;
  onSharedTensionOpenChange: Dispatch<SetStateAction<boolean>>;
  onThinkingWorkbenchOpenChange: Dispatch<SetStateAction<boolean>>;
  onTrialTargetIndexChange: Dispatch<SetStateAction<number>>;
  onCandidateIndexChange: Dispatch<SetStateAction<number>>;
  onPostScoreChange: Dispatch<SetStateAction<number>>;
  onPostScoreConfirmedChange: Dispatch<SetStateAction<boolean>>;
  onPostDiscomfortChange: Dispatch<SetStateAction<"" | YesNo>>;
  onExerciseFeedbackChange: Dispatch<SetStateAction<Record<string, ExerciseFeedback>>>;
  onToastChange: Dispatch<SetStateAction<string>>;
  onFollowupExerciseChoicesChange: Dispatch<SetStateAction<Record<string, FollowupExerciseChoice>>>;
  onTreatmentPlanRevisionChange: Dispatch<SetStateAction<number>>;
  onAdverseResponseChange: Dispatch<SetStateAction<AdverseResponseEvent | null>>;
  onAdverseConfirmedAssessmentIdsChange: Dispatch<SetStateAction<string[]>>;
  onGoToStep: (next: Step) => void;
  onRestoreAdverseReturn: (event: AdverseResponseEvent, stageOverride?: FollowupStage) => void;
  onFinishFocusedReassessment: (event: AdverseResponseEvent) => void;
  onConfirmFocusedAssessment: (id: string) => void;
  onUpdateAssessment: (id: string, patch: AssessmentRecord | ((previous: AssessmentRecord) => AssessmentRecord), keepSharedTensionOpen?: boolean) => void;
  onSaveRecord: (status?: SavedDemoRecord["status"], latestScoreOverride?: number, snapshotOverrides?: Partial<SavedDemoSnapshot>) => void;
  retestLedgerItems: Array<{ obligationId: string; label: string; kindLabel: string; status: string; statusLabel: string; side?: string }>;
};

export function AssessmentStage(props: AssessmentStageProps) {
  const {
    step,
    intake,
    assessmentIndex,
    assessmentResults,
    assessmentSummaryOpen,
    sharedTensionOpen,
    thinkingWorkbenchOpen,
    adverseResponse,
    adverseConfirmedAssessmentIds,
    region,
    canAssessPassive,
    canAssessResistance,
    canAssessEndFeel,
    canRunSpecialTest,
    isThinkingMode,
    assessments,
    assessmentDisplayItems,
    findings,
    bilateralPriorityResolution,
    tissuePathway,
    assessmentComplete,
    limitedPilotMotionItems,
    sharedTensionRequired,
    sharedTensionRecord,
    sharedTensionComplete,
    assessmentFlowComplete,
    assessmentReadyForTreatment,
    canContinueSafety,
    specialPositiveFindings,
    hasSpecialPositive,
    assessmentNeuralReferral,
    sharpSpecialReferral,
    specialSafetyReferral,
    assessmentNeedsReferral,
    highIrritabilityReferral,
    adverseResolution,
    trialRecords,
    exercises,
    treatmentComplete,
    trainingComplete,
    trainingPlanSaved,
    trainingStageClosed,
    displayAssessmentIndexForId,
    displayAssessmentComplete,
    onStepChange: setStep,
    onTransitionTargetChange: setTransitionTarget,
    onAssessmentIndexChange: setAssessmentIndex,
    onAssessmentSummaryOpenChange: setAssessmentSummaryOpen,
    onSharedTensionOpenChange: setSharedTensionOpen,
    onThinkingWorkbenchOpenChange: setThinkingWorkbenchOpen,
    onTrialTargetIndexChange: setTrialTargetIndex,
    onCandidateIndexChange: setCandidateIndex,
    onPostScoreChange: setPostScore,
    onPostScoreConfirmedChange: setPostScoreConfirmed,
    onPostDiscomfortChange: setPostDiscomfort,
    onExerciseFeedbackChange: setExerciseFeedback,
    onToastChange: setToast,
    onFollowupExerciseChoicesChange: setFollowupExerciseChoices,
    onTreatmentPlanRevisionChange: setTreatmentPlanRevision,
    onAdverseResponseChange: setAdverseResponse,
    onAdverseConfirmedAssessmentIdsChange: setAdverseConfirmedAssessmentIds,
    onGoToStep: goToStep,
    onRestoreAdverseReturn: restoreAdverseReturn,
    onFinishFocusedReassessment: finishFocusedReassessment,
    onConfirmFocusedAssessment: confirmFocusedAssessment,
    onUpdateAssessment: updateAssessment,
    onSaveRecord: saveRecord,
    retestLedgerItems,
  } = props;

  // T-04：存在未确认的专项检查阳性时，进入评估结果前需要一次显式确认（会话内每处一次）。
  const [acknowledgedSpecialPositiveIds, setAcknowledgedSpecialPositiveIds] = useState<string[]>([]);
  const [batchRecordOpen, setBatchRecordOpen] = useState(false);
  const openAssessmentSummary = () => {
    const unacknowledged = specialPositiveFindings.filter((entry) => !acknowledgedSpecialPositiveIds.includes(entry.id));
    if (unacknowledged.length && !window.confirm(`有 ${unacknowledged.length} 项特殊检查结果阳性，建议线下评估确认。确定继续吗？`)) return;
    if (unacknowledged.length) setAcknowledgedSpecialPositiveIds((current) => [...current, ...unacknowledged.map((entry) => entry.id)]);
    setAssessmentSummaryOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  function renderThinkingWorkbench() {
    
  const completedAssessmentIds = new Set(assessmentDisplayItems.filter((item) => displayAssessmentComplete(item)).map((item) => item.id));
  const groupedSpecials = [
    { key: "localization", label: "定位筛查" },
    { key: "response", label: "反应实验" },
    { key: "safety", label: "安全分流" },
    { key: "professional-special", label: "专项检查" },
  ] as const;
  const unresolved = findings.filter((finding) => !finding.internal && !["track:swelling", "track:tender"].includes(finding.id));
  const pendingRetestItems = retestLedgerItems.filter((item) => item.status === "pending");
  const stageStates = workbenchStageStates({
    canContinueSafety,
    assessmentFlowComplete: assessmentReadyForTreatment,
    completedAssessmentCount: completedAssessmentIds.size,
    totalAssessmentCount: assessmentDisplayItems.length,
    unresolvedProblemCount: unresolved.length,
    trialRecordCount: trialRecords.length,
    trainingComplete,
    trainingPlanSaved,
    exerciseCount: exercises.length,
    isSummaryStep: step === 5,
  });
  const stageItems = [
    { label: "症状与安全", state: stageStates[0], detail: `${intake.location || "未定位"} · ${intake.symptomType || "感觉待确认"}`, onClick: () => goToStep(1) },
    { label: "评估", state: stageStates[1], detail: "活动度、力量、功能和必要专项检查", onClick: () => { setThinkingWorkbenchOpen(false); const next = assessmentDisplayItems.findIndex((item) => !displayAssessmentComplete(item)); setAssessmentIndex(next >= 0 ? next : 0); } },
    { label: "问题台账", state: stageStates[2], detail: "按活动度、肌肉、控制和局部体征分组", onClick: () => { setThinkingWorkbenchOpen(false); setAssessmentSummaryOpen(true); } },
    { label: "处理与复测", state: stageStates[3], detail: "同类双侧处理合并展示，左右分别记录反应", onClick: () => { if (assessmentReadyForTreatment) { setTransitionTarget("treatment"); setThinkingWorkbenchOpen(false); } } },
    { label: "训练", state: stageStates[4], detail: "按力量、控制和功能目标安排进阶", onClick: () => { if (treatmentComplete) { setTransitionTarget("training"); setThinkingWorkbenchOpen(false); } } },
    { label: "总结", state: stageStates[5], detail: "保留有效方向、未解决问题和下次重点", onClick: () => { if (trainingStageClosed) { setTransitionTarget("summary"); setThinkingWorkbenchOpen(false); } } },
  ];
  const openAssessmentItem = (id: string) => { setThinkingWorkbenchOpen(false); setAssessmentIndex(assessmentDisplayItems.findIndex((entry) => entry.id === id)); };
  const renderAssessmentRow = (item: AssessmentItem) => <button type="button" key={item.id} className={displayAssessmentComplete(item) ? "is-done" : ""} onClick={() => openAssessmentItem(item.id)}><i>{displayAssessmentComplete(item) ? "✓" : "·"}</i><span>{item.id === PATELLA_GROUP_PRIMARY_ID ? "髌骨四方向被动活动" : professionalAssessmentTitle(item.id, item.title)}</span><b>{displayAssessmentComplete(item) ? "已记录" : "待记录"}</b></button>;
  const batchItems = assessmentDisplayItems.filter((item) => item.kind === "motion"
    && item.id !== PATELLA_GROUP_PRIMARY_ID
    && !item.spinal
    && item.testMode !== "passive"
    && !(item.id === "motion:knee-extension" && !canAssessResistance && intake.side !== "双侧/中间")
    && !(item.id === "motion:ankle-plantarflexion" && !canAssessResistance));
  const batchOptionsFor = (item: AssessmentItem): Array<[MotionAnswer | BilateralMotionAnswer, string]> => intake.side === "双侧/中间" ? bilateralMotionOptions
    : ["thigh-local", "calf-local"].includes(region?.id ?? "") ? localLimbMotionRangeOptions(canAssessResistance)
    : activeMotionRangeOptions(item.comparison, item.spinal, intake.spineAssessmentMode, canAssessResistance);
  const renderBatchRecordPanel = () => <section className="rm-batch-record">
    <header><div><span>集中记录</span><strong>活动度检查一屏录入主动范围</strong></div><button type="button" onClick={() => setBatchRecordOpen(false)}>返回工作台</button></header>
    {batchItems.length ? <div className="rm-batch-record-rows">{batchItems.map((item) => {
      const record = assessmentResults[item.id] ?? {};
      return <article key={item.id}>
        <div><strong>{professionalAssessmentTitle(item.id, item.title)}</strong><span>{displayAssessmentComplete(item) ? "已记录" : record.active ? "需逐项补充" : "未记录"}</span></div>
        <div className="rm-batch-record-options">{batchOptionsFor(item).map(([value, label]) => <button type="button" key={value} className={record.active === value ? "is-selected" : ""} onClick={() => updateAssessment(item.id, motionActiveAnswerPatch(record, value))}>{label}</button>)}</div>
      </article>;
    })}</div> : <p className="rm-workbench-empty">本次没有可批量录入的活动度检查。</p>}
    <footer>这里只记主动范围；需要追问不适或力量的项目，回到逐项检查补全。</footer>
  </section>;
  const pendingAssessmentItems = assessmentDisplayItems.filter((item) => !displayAssessmentComplete(item));
  const doneAssessmentItems = assessmentDisplayItems.filter((item) => displayAssessmentComplete(item));
  return <section className="rm-page rm-thinking-workbench">
    <CaseSummaryBar intake={intake} needsOfflineReview={!canContinueSafety || assessmentNeedsReferral} onEditComplaint={() => goToStep(0)} />
    <StepHeading eyebrow="康复思路模式 · 阶段工作台" title="按阶段查看这次康复" note="先完成当前阶段，再进入下一阶段；可直接打开需要记录的项目。" />
    <section className="rm-workbench-stage-rail">{stageItems.map((stage, index) => <button type="button" key={stage.label} className={`rm-workbench-stage ${stage.state === "已完成" ? "is-done" : index === 1 ? "is-current" : ""}`} disabled={index > 1 && stage.state === "待开始"} onClick={stage.onClick}><span>{String(index + 1).padStart(2, "0")}</span><strong>{stage.label}</strong><b>{stage.state}</b></button>)}</section>
    {batchRecordOpen ? renderBatchRecordPanel() : <section className="rm-workbench-columns">
      <article className="rm-workbench-module is-assessment"><header><div><span>本次评估</span><strong>{completedAssessmentIds.size}/{assessmentDisplayItems.length}</strong></div><div className="rm-workbench-header-actions"><button type="button" onClick={() => setBatchRecordOpen(true)}>集中记录</button><button type="button" onClick={() => { const next = assessmentDisplayItems.findIndex((item) => !displayAssessmentComplete(item)); setThinkingWorkbenchOpen(false); setAssessmentIndex(next >= 0 ? next : 0); }}>打开检查</button></div></header>
        <div className="rm-workbench-list">{pendingAssessmentItems.map(renderAssessmentRow)}</div>
        {doneAssessmentItems.length ? <details className="rm-workbench-done"><summary>已完成 {doneAssessmentItems.length} 项</summary><div className="rm-workbench-list">{doneAssessmentItems.map(renderAssessmentRow)}</div></details> : null}
        <section className="rm-workbench-appendable"><header><b>可追加检查</b><span className={`rm-workbench-capability ${canRunSpecialTest ? "" : "is-limited"}`}>{canRunSpecialTest ? "已开放" : canAssessEndFeel ? "按权限" : "未开放"}</span></header>{groupedSpecials.map((group) => { const items = assessments.filter((item) => item.kind === "special" && item.specialCategory === group.key); return items.length ? <section className="rm-workbench-special-group" key={group.key}><b>{group.label}</b><span>{items.map((item) => professionalAssessmentTitle(item.id, item.title)).join("、")}</span></section> : null; })}{!assessments.some((item) => item.kind === "special") ? <p className="rm-workbench-empty">当前主诉没有需要追加的专项检查。</p> : null}</section>
      </article>
      <article className="rm-workbench-module"><header><div><span>当前异常</span><strong>{unresolved.length}项</strong></div><button type="button" disabled={!assessmentFlowComplete} onClick={() => { setThinkingWorkbenchOpen(false); setAssessmentSummaryOpen(true); }}>查看</button></header>{unresolved.length ? <div className="rm-workbench-ledger">{buildFindingGroups(unresolved).map((group) => <section key={group.key}><b>{group.label}</b><ul>{group.items.slice(0, 6).map((finding) => <li key={finding.id}>{professionalFindingLabel(finding)}</li>)}</ul></section>)}</div> : <p className="rm-workbench-empty">完成评估后，这里会按类别显示需要处理的问题。</p>}</article>
      <article className="rm-workbench-module"><header><div><span>待复查项目</span><strong>{pendingRetestItems.length}项</strong></div></header>{pendingRetestItems.length ? <div className="rm-workbench-list">{pendingRetestItems.map((item) => <div className="rm-workbench-retest-row" key={item.obligationId}><i>·</i><span>{item.label}</span><b>{item.kindLabel}{item.side ? ` · ${item.side}` : ""}</b></div>)}</div> : <p className="rm-workbench-empty">处理后，这里会列出需要复查的项目。</p>}</article>
    </section>}
    <div className="rm-page-actions split"><button type="button" onClick={() => goToStep(1)}>返回安全确认</button><button type="button" className="rm-primary" disabled={!assessmentReadyForTreatment} onClick={() => { setTransitionTarget("treatment"); setThinkingWorkbenchOpen(false); }}>评估完成，进入处理</button></div>
  </section>;
  }

  
  if (adverseResponse && (!adverseCaptureComplete(adverseResponse) || !adverseConfirmedAssessmentIds.includes("__capture__"))) {
    const updateEvent = (patch: Partial<AdverseResponseEvent>) => setAdverseResponse((current) => current ? { ...current, ...patch } : current);
    const answerButtons = (field: "settledAfterStopping" | "locationChanged" | "symptomChanged" | "neuralOrWeakness", labels: [string, string]) => <div className="rm-adverse-options">{(["yes", "no"] as const).map((value) => <button type="button" key={value} className={adverseResponse[field] === value ? "is-selected" : ""} onClick={() => updateEvent({ [field]: value })}>{value === "yes" ? labels[0] : labels[1]}</button>)}</div>;
    return <section className="rm-page rm-adverse-page">
      <StepHeading eyebrow="异常反应确认" title={`${adverseResponse.sourceLabel}后更不舒服`} />
      <section className="rm-adverse-source"><span>{adverseResponse.source === "training" ? "训练动作" : adverseResponse.source === "treatment" ? "针对性处理" : "稍后反应"}</span><strong>{adverseResponse.sourceLabel}</strong><p>先停止这项内容，再确认现在的变化。</p></section>
      <ScoreSlider value={adverseResponse.afterScore} selected={adverseResponse.afterScoreConfirmed} onChange={(afterScore) => updateEvent({ afterScore, afterScoreConfirmed: true })} label="停止后，现在有多不舒服？" context={`之前 ${adverseResponse.beforeScore}/10`} />
      <div className="rm-adverse-questions">
        <article><strong>停止后是否逐渐回到之前的程度？</strong>{answerButtons("settledAfterStopping", ["是，逐渐回落", "没有，仍然更重"])}</article>
        <article><strong>不舒服的位置有没有改变？</strong>{answerButtons("locationChanged", ["位置变了", "位置没变"])}</article>
        <article><strong>感觉的性质有没有改变？</strong>{answerButtons("symptomChanged", ["感觉变了", "感觉没变"])}</article>
        <article><strong>有没有新出现麻、电感或明显无力？</strong>{answerButtons("neuralOrWeakness", ["有", "没有"])}</article>
      </div>
      <div className="rm-page-actions split"><button type="button" onClick={() => saveRecord("待复查")}>保存，稍后继续</button><button type="button" className="rm-primary" disabled={!adverseCaptureComplete(adverseResponse)} onClick={() => setAdverseConfirmedAssessmentIds(["__capture__"])}>确认并继续</button></div>
    </section>;
  }
  if (adverseResponse && adverseResolution === "stop-and-refer") {
    const adverseIsNeural = adverseResponse.neuralOrWeakness === "yes";
    return <section className="rm-page rm-adverse-page">
    <StepHeading eyebrow="异常反应" title="本次先停止" />
    <section className="rm-complete-panel is-referral"><span>{adverseResponse.sourceLabel}</span><h2>{adverseIsNeural ? "停止后出现新的麻、电感或无力" : "停止后仍持续加重，疼痛还在升高"}</h2><p>{adverseIsNeural ? "先由专业人员检查感觉范围和力量变化，再决定是否适合继续处理。" : "停下来仍没有缓解、疼痛还在升高，本次不继续增加处理或训练，保存当前记录并安排专业评估。"}</p><div className="rm-page-actions split"><button type="button" onClick={() => saveRecord("待医学评估")}>保存并结束</button><button type="button" className="rm-primary" onClick={() => goToStep(0)}>补充症状变化</button></div></section>
  </section>;
  }
  if (adverseResponse && adverseResolution === "regress-training") return <section className="rm-page rm-adverse-page">
    <StepHeading eyebrow="训练调整" title="先降低一个难度变量" />
    <section className="rm-adverse-source"><span>先停止刚才的做法</span><strong>{adverseResponse.sourceLabel}</strong><p>减小范围、减少个数或换成更稳定的姿势，只试一小组。</p></section>
    <div className="rm-page-actions split"><button type="button" onClick={() => setAdverseResponse((current) => current ? { ...current, regressionAttempted: true, settledAfterStopping: "no" } : current)}>退阶后仍然加重</button><button type="button" className="rm-primary" onClick={() => {
      // T-11：不再把 symptom 从 worse 改写为 same；原始加重保留，仅叠加退阶处置标记。
      setExerciseFeedback((current) => {
        const previous = current[adverseResponse.sourceId] ?? { completed: 1, formChanged: false, symptom: "worse" as const, reserve: 0 };
        return { ...current, [adverseResponse.sourceId]: { ...previous, formChanged: true, followUpAction: "regress-training" as const } };
      });
      setFollowupExerciseChoices((current) => current[adverseResponse.sourceId] ? { ...current, [adverseResponse.sourceId]: "reduce" } : current);
      setTreatmentPlanRevision(adverseResponse.assessmentRevision);
      restoreAdverseReturn(adverseResponse, "training");
      setAdverseResponse(null);
      setAdverseConfirmedAssessmentIds([]);
      setStep(4);
      setToast("已记录这次加重，后面只保留更简单的做法");
      window.setTimeout(() => setToast(""), 2800);
    }}>改用更简单的做法</button></div>
  </section>;
  if (isThinkingMode && thinkingWorkbenchOpen && !assessmentSummaryOpen && !sharedTensionOpen) return renderThinkingWorkbench();
  const visibleAssessmentIndex = Math.min(assessmentIndex, Math.max(assessmentDisplayItems.length - 1, 0));
  const item = assessmentDisplayItems[visibleAssessmentIndex];
  const focusedReassessmentActive = Boolean(adverseResponse && adverseResolution === "focused-reassessment");
  const focusedAssessmentIds = adverseResponse?.relatedAssessmentIds.filter((id) => assessments.some((entry) => entry.id === id)) ?? [];
  const focusedAssessmentPosition = focusedAssessmentIds.indexOf(item?.id ?? "");
  if (!item) return <section className="rm-page"><StepHeading eyebrow="第3步 · 评估检查" title="先确认身体区域" /><button type="button" className="rm-primary" onClick={() => goToStep(0)}>返回补充信息</button></section>;
  if (sharedTensionOpen && sharedTensionRequired) {
    const tensionComparisonLabel = intake.side === "双侧/中间" ? "两侧感觉接近" : "没有明显差别";
    const tensionContext = `${intake.location} ${intake.description} ${intake.symptomType} ${effectiveProvocationTypes(intake).join(" ")}`;
    const locations = [...new Set(limitedPilotMotionItems.flatMap((motionItem) => tensionLocationOptions(motionItem.id.replace(/^motion:/, ""), tensionContext)))];
    const selectedLocations = sharedTensionRecord.tensionLocations ?? [];
    const tensionExitLabels = intake.side === "双侧/中间" ? ["两侧感觉接近", "暂不判断"] : ["没有明显差别", "暂不判断"];
    const toggleSharedTensionLocation = (location: string) => {
      updateAssessment(SHARED_TENSION_ASSESSMENT_ID, (latestRecord) => {
        const latestLocations = latestRecord.tensionLocations ?? [];
        const alreadySelected = latestLocations.includes(location);
        const specialLabels = tensionExitLabels;
        const next = specialLabels.includes(location)
          ? alreadySelected ? [] : [location]
          : alreadySelected
            ? latestLocations.filter((entry) => entry !== location)
            : [...latestLocations.filter((entry) => !specialLabels.includes(entry)), location];
        return { tensionChecked: true, tensionLocations: next };
      }, true);
    };
    return <section className="rm-page">
      <StepHeading eyebrow={`第3步 · 评估检查 ${assessments.length + 1}/${assessments.length + 1}`} title="肌肉紧张度对比" />
      <article className="rm-check-card rm-shared-tension-check">
        <header><i>触</i><div><strong>轻按两侧，看看哪里差别更明显</strong></div></header>
        <MuscleRegionLocationPicker locations={locations} selectedLocations={selectedLocations} comparisonLabel={tensionComparisonLabel} professional={isThinkingMode} bilateral={intake.side === "双侧/中间"} side={intake.side} onToggle={toggleSharedTensionLocation} />
      </article>
      <div className="rm-page-actions split"><button type="button" onClick={() => setSharedTensionOpen(false)}>返回活动检查</button><button type="button" className="rm-primary" disabled={!sharedTensionComplete} onClick={() => {
        setSharedTensionOpen(false);
        if (focusedReassessmentActive && adverseResponse) finishFocusedReassessment(adverseResponse);
        else {
          setAssessmentSummaryOpen(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}>{focusedReassessmentActive ? "确认复查结果" : "查看评估结果"}</button></div>
    </section>;
  }
  if (assessmentSummaryOpen && assessmentReadyForTreatment) {
    const chiefDirection = region ? chiefMotionDirectionId(intake, region.id) : undefined;
     const discovered = findings.filter((finding) => (!finding.internal || finding.id.startsWith("strength:")) && finding.id !== "chief" && finding.priority !== "track");
     const tracking = findings.filter((finding) => (!finding.internal || finding.id.startsWith("strength:")) && finding.priority === "track");
    const assessmentFindingGroups = buildFindingGroups([...discovered, ...tracking]);
    const findingRow = (finding: Finding, short: string) => {
      const related = Boolean(chiefDirection && samePhysicalAction(anyMotionIdFromFinding(finding), chiefDirection));
      return <li key={finding.id} className={related ? "is-chief-related" : ""}><i>{short}</i><div><strong>{finding.title}</strong>{related ? <span>主诉相关</span> : null}{isThinkingMode && intake.learningExplanation && finding.note ? <small className="rm-finding-explanation">{finding.note}</small> : null}</div></li>;
    };
    return <section className="rm-page rm-assessment-summary">
      <StepHeading eyebrow="第3步 · 评估结果" title="先看清问题，再开始处理" />
      <article><span>你最开始说的</span><strong>{intake.description}</strong></article>
      {intake.side === "双侧/中间" ? <section className="rm-bilateral-order" data-testid="bilateral-priority-summary" data-priority-side={intake.prioritySide}><b>本次优先处理：{intake.prioritySide || "尚未选择"}</b><span>另一侧仍保留独立评估和复测记录。</span></section> : null}
      {bilateralPriorityResolution.needsConfirmation && bilateralPriorityResolution.conflictSide ? <section className="rm-route-note is-waiting"><span>评估结果提醒</span><h2>{bilateralPriorityResolution.conflictSide}的问题更多</h2><p>仍按你选择的{intake.prioritySide}先处理；想改顺序，可以返回症状信息修改。</p></section> : null}
      <section className="rm-finding-board"><header><span>本次发现的问题</span><strong>{discovered.length + tracking.length}项</strong></header>{assessmentFindingGroups.length ? <div>{assessmentFindingGroups.map((group) => <section key={group.key} className={`is-${group.key}`}><header><i aria-hidden="true" /><div><strong>{group.label}</strong><span>{group.items.length}项</span></div></header><ul>{group.items.map((finding) => findingRow(finding, group.short))}</ul></section>)}</div> : <p>本次没有找到需要现场处理的明确问题。</p>}</section>
      {skippedChiefActionTitles(findings).length ? <p className="rm-choice-hint" role="status">你的主诉动作{skippedChiefActionTitles(findings).map((title) => `「${title}」`).join("、")}这次没有评估，下次康复建议先补上。</p> : null}
      {tissuePathway.id !== "standard" ? <section className="rm-route-note"><span>{tissuePathway.title}</span><h2>{tissuePathway.immediateActions[0]}</h2><p>{tissuePathway.blockedActions[0]}</p></section> : null}
      {(intake.priorCare ?? []).some((item) => ["用过口服药", "做过针灸或理疗"].includes(item)) ? <section className="rm-route-note"><span>既往处理提示</span><h2>{[
        (intake.priorCare ?? []).includes("用过口服药") ? "吃过止痛或消炎药，疼痛分可能比实际偏轻，以做动作时的真实感受为准" : "",
        (intake.priorCare ?? []).includes("做过针灸或理疗") ? "之前做过松解或理疗，这次可换位置、加长时间或换方法，仍无变化再考虑其他处理" : "",
      ].filter(Boolean).join("；")}</h2></section> : null}
      {assessmentNeedsReferral ? <section className="rm-route-note is-waiting">
        <span>先不要继续自助处理</span>
        <h2>{assessmentNeuralReferral ? "检查动作出现麻或电感" : sharpSpecialReferral ? "轻按刺痛并伴随特殊检查异常" : specialSafetyReferral ? "特殊筛查出现异常信号" : highIrritabilityReferral ? "多项检查出现明显疼痛" : "多项检查因明显疼痛无法完成"}</h2>
        <p>{assessmentNeuralReferral ? "先由专业人员检查感觉范围和力量变化，再决定是否适合继续处理。" : sharpSpecialReferral ? "先别再按压，也别加重负荷或往上加难度，建议先线下评估。" : specialSafetyReferral ? "其中一项结构性筛查出现异常信号。本次不继续加强刺激或负重，建议先由专业人员确认，再决定是否适合继续处理。" : highIrritabilityReferral ? "刚才的动作你能做完，但疼痛已经很重。建议先由专业人员线下评估，再决定适合的松解、关节处理和训练内容。" : "建议先由专业人员线下评估，再决定适合的松解、关节处理和训练内容。"}</p>
      </section> : <article><span>接下来</span><strong>{discovered.length === 0 && !tracking.some((finding) => ["track:swelling", "track:tender"].includes(finding.id)) ? "当前没有明确异常需要即时处理；下一步查看基础活动。" : hasClearChiefAction(intake) ? `先处理“${chiefActionLabel(intake)}”和仍存在的活动受限；力量或稳定问题放到训练。` : "按刚才复现的熟悉症状和活动问题开始处理；没有判断清楚的项目暂不处理。"}</strong></article>}
      <div className="rm-page-actions split"><button type="button" onClick={() => { setAssessmentSummaryOpen(false); if (sharedTensionRequired) setSharedTensionOpen(true); }}>查看 / 修改检查</button>{assessmentNeedsReferral ? <button type="button" className="rm-primary" onClick={() => saveRecord("待医学评估")}>保存并结束本次</button> : <button type="button" className="rm-primary" onClick={() => { setTrialTargetIndex(0); setCandidateIndex(0); setPostScore(0); setPostScoreConfirmed(false); setPostDiscomfort(""); setTransitionTarget("treatment"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>评估完成，继续</button>}</div>
    </section>;
  }
  const record = assessmentResults[item.id] ?? {};
  const effectiveRecord = effectiveAssessmentRecord(item, assessmentResults[item.id], intake, region?.id ?? "") ?? {};
  const relatedMotionRecord = item.kind === "strength" ? assessmentResults[strengthRelatedMotionId(item.id)] : undefined;
  const reuseRelatedMotionSymptom = Boolean(relatedMotionRecord?.discomfort === "yes" && relatedMotionRecord.discomfortLocation && relatedMotionRecord.discomfortType);
  const passiveOnly = item.kind === "motion" && item.testMode === "passive";
  const itemCanAssessPassive = assessmentAllowsPassive(item, canAssessPassive);
  const itemCanAssessEndFeel = assessmentAllowsEndFeel(item, canAssessEndFeel);
  const needsPassive = item.kind === "motion" && motionNeedsPassive(item, record, itemCanAssessPassive);
  const itemComplete = displayAssessmentComplete(item);
  const functionCompletion = item.kind === "function" ? functionCompletionValue(effectiveRecord) : undefined;
  const functionControl = item.kind === "function" ? functionControlValue(effectiveRecord) : undefined;
  const functionDiscomfort = item.kind === "function" ? functionDiscomfortValue(effectiveRecord) : undefined;
  const functionMeta = item.kind === "function" ? functionalActionMeta(item.id.replace(/^function:/, "")) : undefined;
  const isRangeFunction = item.kind === "function" && functionMeta?.kind === "functional-rom";
  const isCustomAction = item.id === "function:custom-action";
  const customActionBlocked = isCustomAction && (isAcuteTrauma(intake) || (intake.symptoms ?? []).includes("肿胀或淤青"));
  const updateFunctionAssessment = (patch: Partial<AssessmentRecord>) => {
    // 主诉重合动作只把已知疼痛作为默认值，不应在每次点击时重新写入整份
    // 默认记录。否则用户选择“做不完”后再选原因，默认的“可以做完”会把
    // 刚才的选择覆盖。这里必须在 React 最新记录上合并并计算派生结果，
    // 不能使用当前页面渲染时的 record 快照。
    updateAssessment(item.id, (latestRecord) => {
      const nextRecord = { ...latestRecord, ...patch };
      return { ...patch, simple: functionSimpleAnswer(nextRecord) };
    });
  };
  const bilateralSideLedgerEnabled = intake.side === "双侧/中间"
    && (item.kind === "function" || item.kind === "motion")
    && record.bilateralSideResults !== undefined;
  const updateBilateralSideResult = (side: "左侧" | "右侧", result: "normal" | "limited") => {
    updateAssessment(item.id, (latestRecord) => {
      const bilateralSideResults = { ...(latestRecord.bilateralSideResults ?? {}), [side]: result };
      const left = bilateralSideResults["左侧"];
      const right = bilateralSideResults["右侧"];
      if (!left || !right) {
        const incompleteRecord: AssessmentRecord = {
          ...latestRecord,
          bilateralSideResults,
          active: undefined,
          discomfort: undefined,
          pairedStrength: undefined,
          bilateralComparison: undefined,
          worseSide: undefined,
        };
        if (item.kind === "function") return {
          ...incompleteRecord,
          functionCompletion: undefined,
          functionControl: undefined,
          functionDiscomfort: undefined,
          compensations: undefined,
          simple: undefined,
        };
        return incompleteRecord;
      }
      const hasLimitedSide = left === "limited" || right === "limited";
      const bilateralComparison = left === right
        ? left === "limited" ? "两侧异常" : "两侧接近"
        : left === "limited" ? "左侧更差" : "右侧更差";
      if (item.kind === "motion") {
        const active: AssessmentRecord["active"] = left === right
          ? left === "limited" ? "both-limited" : "same"
          : left === "limited" ? "left-limited" : "right-limited";
        return {
          ...latestRecord,
          bilateralSideResults,
          active,
          discomfort: "no",
          pairedStrength: item.pairedStrengthId ? "normal" : undefined,
          bilateralComparison,
          worseSide: bilateralComparisonToSide(bilateralComparison),
        };
      }
      const nextRecord: AssessmentRecord = {
        ...latestRecord,
        bilateralSideResults,
        functionCompletion: "complete",
        functionControl: hasLimitedSide ? "compensated" : "stable",
        functionDiscomfort: "no",
        compensations: hasLimitedSide ? [functionCompensationOptions(item.id)[0]] : undefined,
        bilateralComparison,
        worseSide: bilateralComparisonToSide(bilateralComparison),
      };
      return { ...nextRecord, simple: functionSimpleAnswer(nextRecord) };
    });
  };
  // 恐动与疼痛/没力可并存：单选会互相挤掉，因此在“疼/没力”后正交确认一次。
  const renderSymptomDetails = (scoreLabel: string, context?: string) => <div className="rm-motion-symptom-detail rm-assessment-symptom-capture">
    <LowerLimbLocationPicker
      compact
      mode="assessment"
      allowedAreaIds={assessmentLocationAreas(item.id)}
      value={record.discomfortLocations ?? []}
      initialRegionId={region?.id}
      initialSide={(record.worseSide === "左侧" || record.worseSide === "右侧") ? record.worseSide : intake.side}
      initialLocation={record.discomfortLocation || intake.location}
      onChange={(discomfortLocations) => updateAssessment(item.id, {
        discomfortLocations,
        discomfortLocation: locationSelectionsLabel(discomfortLocations),
      })}
    />
    {(record.discomfortLocations?.length ?? 0) > 0 ? <>
      <label className="rm-assessment-feeling"><span>刚才是什么感觉？</span><select value={record.discomfortType ?? ""} onChange={(event) => updateAssessment(item.id, { discomfortType: event.target.value })}><option value="">请选择</option>{SYMPTOM_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
      <ScoreSlider compact value={record.symptomScore ?? 0} selected={typeof record.symptomScore === "number"} onChange={(symptomScore) => updateAssessment(item.id, { symptomScore })} label={scoreLabel} context={context} />
      {familiarSymptomRequired(record, hasClearChiefAction(intake)) ? <section className="rm-familiar-symptom-question">
        <h3>这是平时困扰你的那种感觉吗？</h3>
        <div className="rm-result-grid is-three">{([[
          "yes", "是，就是这种感觉"], ["no", "不是，是新出现的"], ["unsure", "说不清"]] as Array<[FamiliarSymptomAnswer, string]>).map(([value, label]) => <button type="button" key={value} className={record.familiarSymptom === value ? "is-selected" : ""} onClick={() => updateAssessment(item.id, { familiarSymptom: value })}>{label}</button>)}</div>
        <p>{record.familiarSymptom === "yes" ? `后面会复测“${assessmentObservationSentence(item, record)}”。` : record.familiarSymptom === "no" ? "这项只记入检查发现，不当作主诉反复处理。" : record.familiarSymptom === "unsure" ? "先记录活动范围或动作表现，不强行建立疼痛复测。" : "这一步决定刚才的动作是否进入后续复测。"}</p>
      </section> : null}
    </> : null}
  </div>;
  // 新流程只根据能力快照决定抗阻还是自助保持；examSetup 仅由旧快照迁移读取。
  // 髌骨四方向是同一项 PROM 筛查。后台仍保留四个方向键，页面合并为一张卡，
  // 只让用户完成一次检查并分别记录真正异常的方向。
  if (item.id === PATELLA_GROUP_PRIMARY_ID) {
    const patellaItems = PATELLA_DIRECTION_IDS
      .map((id) => assessments.find((entry) => entry.id === id))
      .filter((entry): entry is AssessmentItem => Boolean(entry));
    const renderPatellaDirection = (subItem: AssessmentItem) => {
      const subRecord = assessmentResults[subItem.id] ?? {};
      const subItemCanAssessPassive = assessmentAllowsPassive(subItem, canAssessPassive);
      const subItemCanAssessEndFeel = assessmentAllowsEndFeel(subItem, canAssessEndFeel);
      const complete = assessmentRecordComplete(subItem, subRecord, subItemCanAssessPassive, intake.side === "双侧/中间", !hasClearChiefAction(intake), subItemCanAssessEndFeel);
      return <article className={`rm-check-card rm-patella-direction ${complete ? "is-done" : ""}`} key={subItem.id}>
        <header><i>{PATELLA_DIRECTION_LABELS[subItem.id]}</i><div><span>髌骨被动滑动</span><strong>{PATELLA_DIRECTION_TITLES[subItem.id]}</strong></div>{complete ? <b>已记录</b> : null}</header>
        <section><b>检查方法</b><p>{subItem.professionalHow ?? subItem.how}</p></section>
        <section className="rm-motion-answer-block"><h3>{intake.side === "双侧/中间" ? "左右两侧比较，活动范围如何？" : "与对侧相比，活动范围如何？"}</h3><AnswerChoiceGrid options={passiveMotionOptions("contralateral", false, intake.side === "双侧/中间")} value={subRecord.passive} onChange={(value) => updateAssessment(subItem.id, value === "skip"
          ? { passive: value, passiveEndFeel: undefined, passiveDiscomfort: undefined, passiveDiscomfortLocation: undefined, passiveDiscomfortLocations: undefined, passiveDiscomfortType: undefined, passiveSymptomScore: undefined }
          : { passive: value, ...(subRecord.passive !== value ? { passiveEndFeel: undefined, passiveDiscomfort: undefined, passiveDiscomfortLocation: undefined, passiveDiscomfortLocations: undefined, passiveDiscomfortType: undefined, passiveSymptomScore: undefined } : {}) })} /></section>
        {subItemCanAssessEndFeel && subRecord.passive && subRecord.passive !== "skip" ? <section className="rm-motion-answer-block is-passive-end-feel"><h3>记录被动活动的终末感</h3><AnswerChoiceGrid options={PASSIVE_END_FEEL_OPTIONS} value={subRecord.passiveEndFeel} onChange={(passiveEndFeel) => updateAssessment(subItem.id, { passiveEndFeel })} /></section> : null}
        {subRecord.passive && subRecord.passive !== "skip" ? <section className="rm-motion-answer-block is-symptom"><h3>被动滑动时有不适吗？</h3><div className="rm-result-grid is-two">{(["no", "yes"] as YesNo[]).map((value) => <button type="button" key={value} className={subRecord.passiveDiscomfort === value ? "is-selected" : ""} onClick={() => updateAssessment(subItem.id, value === "yes" ? { passiveDiscomfort: value } : { passiveDiscomfort: value, passiveDiscomfortLocation: undefined, passiveDiscomfortLocations: undefined, passiveDiscomfortType: undefined, passiveSymptomScore: undefined })}>{value === "yes" ? "有不适" : "没有不适"}</button>)}</div>{subRecord.passiveDiscomfort === "yes" ? <div className="rm-motion-symptom-detail"><LowerLimbLocationPicker compact mode="assessment" allowedAreaIds={assessmentLocationAreas(subItem.id)} value={subRecord.passiveDiscomfortLocations ?? []} initialRegionId={region?.id} initialSide={(subRecord.worseSide === "左侧" || subRecord.worseSide === "右侧") ? subRecord.worseSide : intake.side} initialLocation={subRecord.passiveDiscomfortLocation || intake.location} onChange={(passiveDiscomfortLocations) => updateAssessment(subItem.id, { passiveDiscomfortLocations, passiveDiscomfortLocation: locationSelectionsLabel(passiveDiscomfortLocations) })} />{(subRecord.passiveDiscomfortLocations?.length ?? 0) > 0 ? <><label className="rm-assessment-feeling"><span>不适是什么感觉？</span><select value={subRecord.passiveDiscomfortType ?? ""} onChange={(event) => updateAssessment(subItem.id, { passiveDiscomfortType: event.target.value })}><option value="">请选择</option>{SYMPTOM_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><ScoreSlider compact value={subRecord.passiveSymptomScore ?? 0} selected={typeof subRecord.passiveSymptomScore === "number"} onChange={(passiveSymptomScore) => updateAssessment(subItem.id, { passiveSymptomScore })} label="被动滑动时有多不舒服？" /></> : null}</div> : null}</section> : null}
      </article>;
    };
    return <section className="rm-page">
      <StepHeading eyebrow={`第3步 · 评估检查 ${visibleAssessmentIndex + 1}/${assessmentDisplayItems.length + (sharedTensionRequired ? 1 : 0)}`} title="髌骨四方向被动活动" current={visibleAssessmentIndex} total={assessmentDisplayItems.length + (sharedTensionRequired ? 1 : 0)} />
      <p className="rm-comparison-anchor"><b>膝盖完全放松</b>，由专业人员分别比较髌骨向上、向下、向内、向外的活动；只记录与对侧有差异的方向。</p>
      <section className="rm-patella-group">{patellaItems.map(renderPatellaDirection)}</section>
      <div className="rm-page-actions split"><button type="button" onClick={() => visibleAssessmentIndex === 0 ? goToStep(1) : setAssessmentIndex(visibleAssessmentIndex - 1)}>上一个检查</button>{visibleAssessmentIndex < assessmentDisplayItems.length - 1 ? <button type="button" className="rm-primary" disabled={!itemComplete} onClick={() => setAssessmentIndex(visibleAssessmentIndex + 1)}>下一个检查</button> : sharedTensionRequired ? <button type="button" className="rm-primary" disabled={!assessmentComplete} onClick={() => { setSharedTensionOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>检查相关肌肉</button> : <button type="button" className="rm-primary" disabled={!assessmentReadyForTreatment} onClick={openAssessmentSummary}>查看评估结果</button>}</div>
    </section>;
  }

  const localLimbStrengthOptions: Array<[SimpleAnswer, string]> = canAssessResistance
    ? [["normal", "抗阻接近"], ["weak", "患侧偏弱｜加一点阻力就撑不住"], ["painful", "抗阻不适"], ["unable", "无法完成｜暂时不能安全检查"], ["skip", "暂不检查｜今天先跳过"]]
    : [["normal", "保持稳定｜两侧控制接近"], ["weak", "控制偏弱｜容易掉下或发抖"], ["painful", "持续保持时会疼｜越用力越明显"], ["unable", "无法完成｜暂时不能安全检查"], ["skip", "暂不检查｜今天先跳过"]];
  const options: Array<[SimpleAnswer, string]> = item.kind === "strength"
    ? ["thigh-local", "calf-local"].includes(region?.id ?? "")
      ? localLimbStrengthOptions
      : item.comparison === "midline"
      ? [["normal", "完成质量正常"], ["weak", "控制偏弱｜耐力或保持不足"], ["painful", "发力不适｜动作诱发症状"], ["unable", "无法完成｜不会做或不安全"], ["skip", "暂不检查｜今天先跳过"]]
      : intake.side === "双侧/中间"
        ? [["normal", "两侧接近"], ["weak", "一侧或两侧偏弱｜保持不足"], ["painful", "发力不适｜动作诱发症状"], ["unable", "无法完成｜不会做或不安全"], ["skip", "暂不检查｜今天先跳过"]]
        : [["normal", "力量接近"], ["weak", "患侧偏弱｜不舒服这侧更差"], ["painful", "发力不适｜动作诱发症状"], ["unable", "无法完成｜不会做或不安全"], ["skip", "暂不检查｜今天先跳过"]]
    : item.kind === "special"
      ? [["normal", "未见异常反应"], ["positive", "出现提示反应｜需要结合其他结果"], ["painful", "只有疼痛｜暂不能判断"], ["skip", "暂不检查｜不会做或暂不做"]]
      : [];
  const pairedCheckUsesResistance = canAssessResistance;
  const isSelfKneeExtension = item.id === "motion:knee-extension" && !pairedCheckUsesResistance && intake.side !== "双侧/中间";
  const isSelfAnklePlantarflexion = item.id === "motion:ankle-plantarflexion" && !pairedCheckUsesResistance;
  const acuteMotionGuidance = isAcuteTrauma(intake)
    && (intake.symptoms.includes("肿胀或淤青") || (intake.baselineScoreConfirmed && intake.baselineScore >= 6))
    || record.active === "unable";
  const pairedCheckOptions: Array<[SimpleAnswer, string]> = pairedCheckUsesResistance
    ? [["normal", "抗阻接近"], ["weak", "患侧偏弱｜加一点阻力就撑不住"], ["painful", "抗阻不适"], ["unable", "无法完成｜暂时不能安全检查"], ["skip", "暂不检查｜今天先跳过"]]
    : [["normal", "保持稳定｜两侧控制接近"], ["weak", "控制偏弱｜容易掉下或发抖"], ["painful", "持续保持时会疼｜越用力越明显"], ["unable", "无法完成｜暂时不能安全检查"], ["skip", "暂不检查｜今天先跳过"]];
  return <section className="rm-page">
    <StepHeading eyebrow={`第3步 · 评估检查 ${visibleAssessmentIndex + 1}/${assessmentDisplayItems.length + (sharedTensionRequired ? 1 : 0)}`} title={item.id === PATELLA_GROUP_PRIMARY_ID ? "髌骨四方向被动活动" : professionalAssessmentTitle(item.id, item.title)} current={visibleAssessmentIndex} total={assessmentDisplayItems.length + (sharedTensionRequired ? 1 : 0)} />
    {isThinkingMode && !focusedReassessmentActive ? <button type="button" className="rm-workbench-back" onClick={() => setThinkingWorkbenchOpen(true)}>返回阶段工作台</button> : null}
    {focusedReassessmentActive && adverseResponse ? <section className="rm-focused-reassessment"><header><span>只复查相关内容</span><strong>{adverseResponse.sourceLabel}后出现加重</strong></header><div>{focusedAssessmentIds.map((id, index) => { const assessment = assessments.find((entry) => entry.id === id); const done = adverseConfirmedAssessmentIds.includes(id); return <article key={id} className={id === item.id ? "is-current" : done ? "is-done" : ""}><i>{done ? "✓" : index + 1}</i><span>{assessment ? professionalAssessmentTitle(assessment.id, assessment.title) : id}</span></article>; })}</div><p>完成这些项目后，会重新安排后续内容；刚才的方案不再继续使用。</p></section> : null}
    <details className="rm-assessment-progress"><summary><span>检查进度</span><strong>{assessmentDisplayItems.filter((entry) => displayAssessmentComplete(entry)).length + (sharedTensionComplete && sharedTensionRequired ? 1 : 0)}/{assessmentDisplayItems.length + (sharedTensionRequired ? 1 : 0)}</strong></summary><div>{assessmentDisplayItems.map((entry, index) => { const done = displayAssessmentComplete(entry); return <button type="button" key={entry.id} disabled={index > visibleAssessmentIndex} className={done ? "is-done" : ""} onClick={() => setAssessmentIndex(index)}><i>{done ? "✓" : index + 1}</i><span>{entry.id === PATELLA_GROUP_PRIMARY_ID ? "髌骨四方向被动活动" : professionalAssessmentTitle(entry.id, entry.title)}</span>{done ? <b>已记录</b> : null}</button>; })}{sharedTensionRequired ? <button type="button" disabled className={sharedTensionComplete ? "is-done" : ""}><i>{sharedTensionComplete ? "✓" : assessmentDisplayItems.length + 1}</i><span>相关肌群触诊比较</span>{sharedTensionComplete ? <b>已记录</b> : null}</button> : null}</div></details>
    {bilateralSideLedgerEnabled ? <section
      className="rm-bilateral-side-assessment"
      data-testid="bilateral-assessment-ledger"
      data-priority-side={intake.prioritySide}
      data-complete={record.bilateralSideResults?.["左侧"] && record.bilateralSideResults?.["右侧"] ? "true" : "false"}
    >
      <header><span>双侧分别评估</span><strong>先记录{intake.prioritySide || "优先侧"}，再记录另一侧</strong><p>左右结果分别保存；只完成一侧时，本项仍是未完成，不能进入普通训练。</p></header>
      <div>{(["右侧", "左侧"] as const).map((side) => {
        const sideResult = record.bilateralSideResults?.[side];
        const sideKey = side === "左侧" ? "left" : "right";
        return <article key={side} data-testid={`bilateral-assessment-${sideKey}`} data-side={side} data-status={sideResult ?? "pending"}>
          <div><strong>{side}</strong><span>{side === intake.prioritySide ? "主诉优先侧" : "另一侧"}</span><b>{sideResult ? "已记录" : "待记录"}</b></div>
          <p>单独完成这一侧的动作，不要用另一侧的结果代替。</p>
          <div className="rm-result-grid is-two">
            {([['normal', '完成稳定'], ['limited', '受限或代偿']] as const).map(([value, label]) => <button
              type="button"
              key={value}
              data-testid={`bilateral-assessment-${sideKey}-${value}`}
              aria-pressed={sideResult === value}
              className={sideResult === value ? "is-selected" : ""}
              onClick={() => updateBilateralSideResult(side, value)}
            >{label}</button>)}
          </div>
        </article>;
      })}</div>
      <footer role="status">{record.bilateralSideResults?.["左侧"] && record.bilateralSideResults?.["右侧"] ? `左右均已记录 · 优先侧仍为${intake.prioritySide}` : "另一侧尚未完成 · 保持训练限制"}</footer>
    </section> : null}
    {item.kind === "motion" ? <div className="rm-assessment-stack">
      {!passiveOnly ? <article className="rm-check-card">
        <header><i>1</i><div><span>关节活动度检查</span><strong>{professionalAssessmentTitle(item.id, item.title)}</strong></div></header>
        {acuteMotionGuidance ? <p className="rm-passive-reminder">急性损伤先轻柔查看活动范围；页面出现保持或发力检查时，如果会明显加重，今天可以跳过。</p> : null}
        <section><b>{isThinkingMode ? "检查方法" : "现在做"}</b><p>{isThinkingMode ? item.professionalHow ?? item.how : item.how}</p></section>
        {isThinkingMode ? <section><b>记录</b><p>{item.professionalObserve ?? item.observe}</p></section> : <details className="rm-check-help"><summary>怎么做和观察重点</summary><p>{intake.side === "双侧/中间" ? BILATERAL_OBSERVE[item.id.replace(/^motion:/, "")] ?? "两侧都异常时，记录哪一侧更差；如果一样差就选择两侧都受限。" : item.observe}</p></details>}
        {!item.spinal && !isPilotRegion(intake.regionId) ? intake.side === "双侧/中间" ? <p className="rm-comparison-anchor"><b>左右各做一次</b>，找出更差的一侧；如果两边都差，选择“两侧都受限”。</p> : <p className="rm-comparison-anchor"><b>先做健侧</b>，再用同样姿势做不舒服的一侧。</p> : null}
        <section className="rm-motion-answer-block">
          <h3>{isSelfKneeExtension ? "膝后能不能像另一边一样压向床面？" : isThinkingMode ? `${professionalAssessmentTitle(item.id, item.title)}：主动活动范围` : item.spinal ? spinalRangeQuestion(item.comparison, intake.spineAssessmentMode) : activeMotionRangeQuestion(item.id, intake.side === "双侧/中间")}</h3>
          {isSelfKneeExtension ? <p className="rm-choice-hint">看不清时，把同一条薄毛巾先后放在两侧膝后。绷紧大腿后轻轻抽动，明显更容易抽出的一侧，下压表现较差。</p> : null}
          <AnswerChoiceGrid options={(isSelfKneeExtension
            ? [["same", "接近健侧｜两侧膝后压平程度相近"], ["limited", "患侧偏小｜膝后仍明显悬空"], ["unable", "无法完成｜疼痛或担心继续"], ["unsure", "暂不判断｜看不清差异"]] as Array<[MotionAnswer, string]>
            : intake.side === "双侧/中间" && !item.spinal ? bilateralMotionOptions : ["thigh-local", "calf-local"].includes(region?.id ?? "") ? localLimbMotionRangeOptions(canAssessResistance) : activeMotionRangeOptions(item.comparison, item.spinal, intake.spineAssessmentMode, canAssessResistance))} value={record.active} onChange={(value) => updateAssessment(item.id, motionActiveAnswerPatch(record, value))} />
          {intake.spineAssessmentMode === "reference" ? <label className="rm-optional-angle"><span>记录主动角度</span><small>选填 · 仅供对比参考</small><input inputMode="decimal" value={record.measuredAngle ?? ""} onChange={(event) => updateAssessment(item.id, { measuredAngle: event.target.value })} placeholder="例如：45°" /></label> : null}
        </section>

        {record.active === "unable" ? <section className="rm-motion-answer-block is-followup">
          <h3>是什么让你停下来？</h3>
          <p className="rm-choice-hint">{unableFollowUp("motion", isThinkingMode ? "thinking" : "guided").hint}</p>
          <div className="rm-result-grid is-three">{unableFollowUp("motion", isThinkingMode ? "thinking" : "guided").reasons.map(({ value, label }) => <button type="button" key={value} className={record.unableReason === value ? "is-selected" : ""} onClick={() => updateAssessment(item.id, {
            unableReason: value as NonNullable<AssessmentRecord["unableReason"]>,
            discomfort: value === "pain" ? "yes" : undefined,
            discomfortLocation: value === "pain" ? record.discomfortLocation : undefined,
            discomfortLocations: value === "pain" ? record.discomfortLocations : undefined,
            discomfortType: value === "pain" ? record.discomfortType : undefined,
            symptomScore: value === "pain" ? record.symptomScore : undefined,
            pairedStrength: undefined,
            pairedStrengthUnableReason: undefined,
          })}>{label}</button>)}</div>
        </section> : null}

        {shouldAskMotionDiscomfort(record.active) ? <section className="rm-motion-answer-block is-symptom">
          <h3>活动到最大范围时，有没有牵拉、卡住或不适？</h3>
          <div className="rm-result-grid is-two">{(["no", "yes"] as YesNo[]).map((value) => <button type="button" key={value} className={record.discomfort === value ? "is-selected" : ""} onClick={() => updateAssessment(item.id, (latestRecord) => value === "yes"
            ? { ...latestRecord, discomfort: value }
            : { ...latestRecord, discomfort: value, discomfortLocation: undefined, discomfortLocations: undefined, discomfortType: undefined, symptomScore: undefined, familiarSymptom: undefined, unableReason: latestRecord.unableReason === "pain" ? undefined : latestRecord.unableReason, pairedStrength: latestRecord.pairedStrength === "painful" ? undefined : latestRecord.pairedStrength })}>{value === "yes" ? "有不适" : "没有不适"}</button>)}</div>
          {record.discomfort === "yes" ? renderSymptomDetails("刚才这个动作有多不舒服？") : null}
        </section> : shouldCaptureUnableMotionSymptom(record.active, record.unableReason) ? <section className="rm-motion-answer-block is-symptom">
          <h3>记录刚才让你停下来的不适</h3>
          {renderSymptomDetails("刚才这个动作有多不舒服？")}
        </section> : null}

        {item.pairedStrengthId && shouldAskPairedStrength(record.active) ? <section className="rm-motion-answer-block is-strength">
          <h3>{pairedCheckUsesResistance ? "同一个动作：检查抗阻力量" : isSelfKneeExtension ? "再看一次：绷直后能不能保持" : isSelfAnklePlantarflexion ? "双脚提踵，看看高度是否稳定" : "停住不动，看稳不稳"}</h3>
          <p className="rm-choice-hint">{pairedCheckUsesResistance
            ? "由检查者沿刚才动作的反方向逐渐施加轻阻力，保持3～5秒并比较两侧；不要突然用力。"
            : isSelfKneeExtension
              ? "先把膝盖绷直，再将整条腿抬离床面约10厘米，保持3秒后放下；左右各做一次，不需要别人按压。"
              : isSelfAnklePlantarflexion
                ? "扶住墙面，双脚同时缓慢抬起脚跟再落下。双脚不能稳定完成时，不做单脚提踵。"
                : "在能不疼的最大范围处停住，看会不会发抖或往下掉。"}</p>
          {record.active === "unable" && !pairedCheckUsesResistance ? <p className="rm-passive-reminder">刚才没有完成主动活动，这一步可以跳过，不要为了测试强行完成。</p> : null}
          <AnswerChoiceGrid options={isSelfKneeExtension
            ? [["normal", "保持稳定｜抬起后膝盖仍笔直"], ["weak", "控制偏弱｜膝盖弯曲、抖动或下落"], ["painful", "发力不适｜抬腿时出现症状"], ["unable", "无法完成｜不会做或不安全"], ["skip", "暂不检查｜今天先跳过"]] as Array<[SimpleAnswer, string]>
            : isSelfAnklePlantarflexion
              ? [["normal", "完成稳定｜双脚高度和节奏接近"], ["weak", "控制偏弱｜一侧高度较低或容易掉下"], ["painful", "提踵不适｜动作诱发症状"], ["unable", "无法完成｜不会做或不安全"], ["skip", "暂不检查｜今天先跳过"]] as Array<[SimpleAnswer, string]>
              : pairedCheckOptions} value={record.pairedStrength} onChange={(value) => updateAssessment(item.id, {
              pairedStrength: value,
              pairedStrengthUnableReason: value === "unable" ? record.pairedStrengthUnableReason : undefined,
              pairedStrengthLocation: undefined,
              pairedStrengthLocations: undefined,
              pairedStrengthType: undefined,
              pairedStrengthScore: undefined,
            })} />
          {record.pairedStrength === "unable" ? <div className="rm-strength-unable">
            <h4>主要卡在哪里？</h4>
            <div className="rm-result-grid is-three">{([[
              "pain", "一用力就不适"], ["weak", "完全使不上力"], ["fear", "不敢继续"], ["instruction", "不会做或没听懂说明"]] as Array<[StrengthUnableReason, string]>).map(([value, label]) => <button type="button" key={value} className={record.pairedStrengthUnableReason === value ? "is-selected" : ""} onClick={() => updateAssessment(item.id, {
                pairedStrengthUnableReason: value,
              })}>{label}</button>)}</div>
          </div> : null}
          {strengthAnswerResult(record.pairedStrength, record.pairedStrengthUnableReason) === "painful" ? <section className="rm-motion-answer-block is-symptom rm-strength-symptom">
            <h3>持续保持时，哪里不舒服？</h3>
            <LowerLimbLocationPicker
              compact
              mode="assessment"
              allowedAreaIds={assessmentLocationAreas(item.id)}
              value={record.pairedStrengthLocations ?? []}
              initialRegionId={region?.id}
              initialSide={(record.worseSide === "左侧" || record.worseSide === "右侧") ? record.worseSide : intake.side}
              initialLocation={record.pairedStrengthLocation || intake.location}
              onChange={(pairedStrengthLocations) => updateAssessment(item.id, {
                pairedStrengthLocations,
                pairedStrengthLocation: locationSelectionsLabel(pairedStrengthLocations),
              })}
            />
            {(record.pairedStrengthLocations?.length ?? 0) > 0 ? <>
              <label className="rm-assessment-feeling"><span>持续保持时是什么感觉？</span><select value={record.pairedStrengthType ?? ""} onChange={(event) => updateAssessment(item.id, { pairedStrengthType: event.target.value })}><option value="">请选择</option>{SYMPTOM_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
              <ScoreSlider compact value={record.pairedStrengthScore ?? 0} selected={typeof record.pairedStrengthScore === "number"} onChange={(pairedStrengthScore) => updateAssessment(item.id, { pairedStrengthScore })} label="持续保持时有多不舒服？" />
            </> : null}
          </section> : null}
        </section> : null}

        {!itemCanAssessPassive && ["limited", "excessive", "unable"].includes(record.active ?? "") ? <p className="rm-passive-reminder">本次不做被动活动检查，先按已经记录的主动表现继续。</p> : null}
      </article> : null}
      {needsPassive ? <article className="rm-check-card is-secondary">
        <header><i>{passiveOnly ? "P" : "2"}</i><div><span>{passiveOnly ? "被动活动度（PROM）" : "专业检查 · 被动活动"}</span><strong>{passiveOnly ? professionalAssessmentTitle(item.id, item.title) : "不强压疼痛末端"}</strong></div></header>
        <section><b>检查方法</b><p>{isThinkingMode ? professionalPassiveMotionInstruction(item, intake.side === "双侧/中间") : intake.side === "双侧/中间" ? passiveMotionInstruction(item.comparison, true) : item.passiveHow ?? passiveMotionInstruction(item.comparison)}</p></section>
        {isThinkingMode ? <section><b>记录</b><p>{item.professionalObserve ?? "与对侧比较活动范围、终末感及症状诱发。"}</p></section> : null}
        <section className="rm-motion-answer-block">
          <h3>{passiveOnly ? "与对侧相比，被动活动范围怎么样？" : "被动活动范围怎么样？"}</h3>
          <div className="rm-result-grid rm-passive-options">{passiveMotionOptions(item.comparison, Boolean(item.spinal && intake.spineAssessmentMode === "reference"), intake.side === "双侧/中间").map(([value, label]) => <button type="button" key={value} className={record.passive === value ? "is-selected" : ""} onClick={() => updateAssessment(item.id, value === "skip"
            ? { passive: value, passiveEndFeel: undefined, passiveDiscomfort: undefined, passiveDiscomfortLocation: undefined, passiveDiscomfortLocations: undefined, passiveDiscomfortType: undefined, passiveMeasuredAngle: undefined, passiveMeasuredAngleDeg: undefined, passiveRangeMeasurement: undefined, passiveSymptomScore: undefined }
            : { passive: value, ...(record.passive !== value ? { passiveEndFeel: undefined } : {}) })}>{label}</button>)}</div>
          {record.passive && record.passive !== "skip" ? <label className="rm-optional-angle"><span>记录被动角度</span><small>选填 · 仅供同动作、同侧、同方式后续参考</small><input inputMode="decimal" value={record.passiveMeasuredAngle ?? ""} onChange={(event) => { const raw = event.target.value; const valueDeg = parseRangeAngle(raw); updateAssessment(item.id, { passiveMeasuredAngle: raw, passiveMeasuredAngleDeg: valueDeg, passiveRangeMeasurement: valueDeg === undefined ? undefined : { measurementId: `${item.id}:passive:${Date.now()}`, actionId: item.id.replace(/^motion:/, ""), side: intake.side, valueDeg, mode: "passive", method: "estimated", recordedAt: new Date().toISOString() } }); }} placeholder="例如：50°" /></label> : null}
        </section>
        {itemCanAssessEndFeel && record.passive && record.passive !== "skip" ? <section className="rm-motion-answer-block is-passive-end-feel">
          <h3>记录被动活动的终末感</h3>
          <p className="rm-choice-hint">在不强压疼痛末端的前提下，记录最后的阻力感觉；无法判断可选“无法判断”。</p>
          <AnswerChoiceGrid options={PASSIVE_END_FEEL_OPTIONS} value={record.passiveEndFeel} onChange={(passiveEndFeel) => updateAssessment(item.id, { passiveEndFeel })} />
        </section> : null}
        {record.passive && record.passive !== "skip" ? <section className="rm-motion-answer-block is-symptom">
          <h3>被动活动时有没有不适？</h3>
          <div className="rm-result-grid is-two">{(["no", "yes"] as YesNo[]).map((value) => <button type="button" key={value} className={record.passiveDiscomfort === value ? "is-selected" : ""} onClick={() => updateAssessment(item.id, (latestRecord) => value === "yes"
            ? { ...latestRecord, passiveDiscomfort: value }
            : { ...latestRecord, passiveDiscomfort: value, passiveDiscomfortLocation: undefined, passiveDiscomfortLocations: undefined, passiveDiscomfortType: undefined, passiveSymptomScore: undefined })}>{value === "yes" ? "有不适" : "没有不适"}</button>)}</div>
          {record.passiveDiscomfort === "yes" ? <div className="rm-motion-symptom-detail">
            <LowerLimbLocationPicker compact mode="assessment" allowedAreaIds={assessmentLocationAreas(item.id)} value={record.passiveDiscomfortLocations ?? []} initialRegionId={region?.id} initialSide={(record.worseSide === "左侧" || record.worseSide === "右侧") ? record.worseSide : intake.side} initialLocation={record.passiveDiscomfortLocation || intake.location} onChange={(passiveDiscomfortLocations) => updateAssessment(item.id, { passiveDiscomfortLocations, passiveDiscomfortLocation: locationSelectionsLabel(passiveDiscomfortLocations) })} />
            {(record.passiveDiscomfortLocations?.length ?? 0) > 0 ? <><label className="rm-assessment-feeling"><span>刚才是什么感觉？</span><select value={record.passiveDiscomfortType ?? ""} onChange={(event) => updateAssessment(item.id, { passiveDiscomfortType: event.target.value })}><option value="">请选择</option>{SYMPTOM_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><ScoreSlider compact value={record.passiveSymptomScore ?? 0} selected={typeof record.passiveSymptomScore === "number"} onChange={(passiveSymptomScore) => updateAssessment(item.id, { passiveSymptomScore })} label="被动活动时有多不舒服？" /></> : null}
          </div> : null}
        </section> : null}
      </article> : null}
        {intake.side === "双侧/中间" && item.pairedStrengthId && record.pairedStrength && record.pairedStrength !== "normal" ? <section className="rm-motion-answer-block is-side-compare">
          <h3>两侧都保持后，这项力量结果如何？</h3>
          <p className="rm-choice-hint">这里只记录这一个检查项目的左右差异，不决定整次康复的优先侧。</p>
          <div className="rm-result-grid is-two">{bilateralComparisonOptions.map(([value, label]) => <button type="button" key={value} className={effectiveBilateralComparison(record) === value ? "is-selected" : ""} onClick={() => updateAssessment(item.id, { bilateralComparison: value, worseSide: bilateralComparisonToSide(value) })}>{label}</button>)}</div>
        </section> : null}
      </div> : <article className="rm-check-card">
      <header><i>{item.kind === "strength" ? "力" : item.kind === "special" ? "测" : "动"}</i><div><span>{item.kind === "strength" ? "肌力与控制检查" : item.kind === "special" ? "特殊检查" : "功能动作检查"}</span><strong>{professionalAssessmentTitle(item.id, item.title)}</strong></div></header>
      <section><b>现在做</b><p>{item.how}</p></section>
      {isThinkingMode ? <section><b>记录</b><p>{intake.side === "双侧/中间" ? BILATERAL_OBSERVE[item.id.replace(/^(strength|function|special):/, "")] ?? item.observe.replaceAll("患侧", "更差的一侧").replaceAll("健侧", "另一侧") : item.observe}</p></section> : <details className="rm-check-help"><summary>怎么做和观察重点</summary><p>{intake.side === "双侧/中间" ? BILATERAL_OBSERVE[item.id.replace(/^(strength|function|special):/, "")] ?? item.observe.replaceAll("患侧", "更差的一侧").replaceAll("健侧", "另一侧") : item.observe}</p></details>}
      {item.kind === "special" && item.next ? <p className="rm-special-next"><b>如果出现提示信号：</b>{item.next}</p> : null}
      {item.kind !== "function" ? <><AnswerChoiceGrid options={options} value={record.simple} onChange={(value) => updateAssessment(item.id, value === "painful"
        ? { simple: value, compensations: undefined, discomfortLocation: record.discomfortLocation || relatedMotionRecord?.discomfortLocation, discomfortLocations: record.discomfortLocations || relatedMotionRecord?.discomfortLocations, discomfortType: record.discomfortType || relatedMotionRecord?.discomfortType, familiarSymptom: record.familiarSymptom || relatedMotionRecord?.familiarSymptom, worseSide: record.worseSide }
        : value === "present"
          ? { simple: value, symptomStage: record.symptomStage, compensations: record.compensations, worseSide: record.worseSide }
          : { simple: value, strengthUnableReason: value === "unable" ? record.strengthUnableReason : undefined, discomfortLocation: undefined, discomfortLocations: undefined, discomfortType: undefined, symptomScore: undefined, familiarSymptom: undefined, symptomStage: undefined, compensations: undefined, worseSide: value === "weak" ? record.worseSide : undefined })} />
        {item.kind === "strength" && record.simple === "unable" ? <section className="rm-motion-answer-block is-followup rm-strength-unable">
          <h3>主要卡在哪里？</h3>
          <div className="rm-result-grid is-two">{unableFollowUp("strength", isThinkingMode ? "thinking" : "guided").reasons.map(({ value, label }) => <button type="button" key={value} className={record.strengthUnableReason === value ? "is-selected" : ""} onClick={() => updateAssessment(item.id, {
              strengthUnableReason: value as StrengthUnableReason,
              discomfortLocation: value === "pain" ? record.discomfortLocation || relatedMotionRecord?.discomfortLocation : undefined,
              discomfortLocations: value === "pain" ? record.discomfortLocations || relatedMotionRecord?.discomfortLocations : undefined,
              discomfortType: value === "pain" ? record.discomfortType || relatedMotionRecord?.discomfortType : undefined,
            })}>{label}</button>)}</div>
         </section> : null}</> : <div className="rm-function-result-stack">
        <section className="rm-motion-answer-block">
          {isCustomAction ? (
            customActionBlocked
              ? <>
                <h3>今天先不做这个动作的现场复现</h3>
                <p className="rm-choice-hint">急性外伤或明显肿胀淤青时，今天不额外负重刺激。原动作照常记录、进入处理；处理完恢复后按原动作复测比较。</p>
                <ScoreSlider compact value={record.symptomScore ?? 0} selected={typeof record.symptomScore === "number"} onChange={(symptomScore) => updateFunctionAssessment({ symptomScore })} label="现在估计做这个动作有多不舒服？" />
                <div className="rm-result-grid is-two">{([["skip", "暂时不做，照常记录"]] as Array<[FunctionCompletion, string]>).map(([value, label]) => <button type="button" key={value} className={functionCompletion === value ? "is-selected" : ""} onClick={() => updateFunctionAssessment({ functionCompletion: value, functionControl: undefined, functionDiscomfort: undefined, functionUnableReason: undefined, compensations: undefined, discomfortLocation: undefined, discomfortLocations: undefined, discomfortType: undefined, familiarSymptom: undefined, worseSide: undefined })}>{label}</button>)}</div>
              </>
              : <>
                <h3>能不能用不承重的方式模仿这个动作？</h3>
                <div className="rm-result-grid is-four">{([
                  ["unloaded", "能，完全不承重"],
                  ["assisted", "需要承重，但能扶着或减轻"],
                  ["full", "只有按原样负重才会出现"],
                  ["skip", "暂时不做"],
                ] as Array<[string, string]>).map(([value, label]) => {
                  const isSelected = value === "skip" ? functionCompletion === "skip" : record.customActionLoadTier === value;
                  return <button type="button" key={value} className={isSelected ? "is-selected" : ""} onClick={() => updateFunctionAssessment(value === "skip"
                    ? { functionCompletion: "skip", functionControl: undefined, functionDiscomfort: undefined, functionUnableReason: undefined, customActionLoadTier: undefined, compensations: undefined, discomfortLocation: undefined, discomfortLocations: undefined, discomfortType: undefined, symptomScore: undefined, familiarSymptom: undefined, worseSide: undefined }
                    : { functionCompletion: "complete", functionControl: "stable", functionDiscomfort: undefined, functionUnableReason: undefined, customActionLoadTier: value, symptomScore: undefined })}>{label}</button>;
                })}</div>
                <p className="rm-choice-hint">选「只有按原样负重才会出现」时，先小负荷试一次，出现锐痛或加重立即停。</p>
              </>
          ) : isRangeFunction
            ? <>
              <h3>和另一侧相比，最大可控幅度怎么样？</h3>
              <div className="rm-result-grid is-four">{([
                ["complete-stable", "接近另一侧"],
                ["complete-compensated", "差一些"],
                ["unable", "差很多"],
                ["skip", "说不清"],
              ] as Array<[string, string]>).map(([value, label]) => {
                const isSelected = value === "complete-stable" ? functionCompletion === "complete" && functionControl === "stable"
                  : value === "complete-compensated" ? functionCompletion === "complete" && functionControl === "compensated"
                  : functionCompletion === value;
                return <button type="button" key={value} className={isSelected ? "is-selected" : ""} onClick={() => updateFunctionAssessment(value === "complete-stable"
                  ? { functionCompletion: "complete", functionControl: "stable", functionDiscomfort: effectiveRecord.functionCompletion === "unable" ? undefined : effectiveRecord.functionDiscomfort, functionUnableReason: undefined }
                  : value === "complete-compensated"
                    ? { functionCompletion: "complete", functionControl: "compensated", functionDiscomfort: effectiveRecord.functionCompletion === "unable" ? undefined : effectiveRecord.functionDiscomfort, functionUnableReason: undefined }
                    : value === "unable"
                      ? { functionCompletion: "unable", functionControl: undefined, functionDiscomfort: undefined, functionUnableReason: undefined, compensations: undefined, discomfortLocation: undefined, discomfortLocations: undefined, discomfortType: undefined, symptomScore: undefined, familiarSymptom: undefined }
                      : { functionCompletion: "skip", functionControl: undefined, functionDiscomfort: undefined, functionUnableReason: undefined, compensations: undefined, discomfortLocation: undefined, discomfortLocations: undefined, discomfortType: undefined, symptomScore: undefined, familiarSymptom: undefined, worseSide: undefined })}>{label}</button>;
              })}</div>
            </>
            : <>
              <h3>这个动作能做完吗？</h3>
              <div className="rm-result-grid is-three">{renderOptions<FunctionCompletion>(item.id.replace(/^function:/, ""), "function-completion", isThinkingMode ? "thinking" : "guided").map(({ value, label }) => <button type="button" key={value} className={functionCompletion === value ? "is-selected" : ""} onClick={() => updateFunctionAssessment(value === "complete"
                ? { functionCompletion: value, functionControl: effectiveRecord.functionCompletion === "unable" ? undefined : effectiveRecord.functionControl, functionDiscomfort: effectiveRecord.functionCompletion === "unable" ? undefined : effectiveRecord.functionDiscomfort, functionUnableReason: undefined, discomfortLocation: effectiveRecord.functionCompletion === "unable" ? undefined : effectiveRecord.discomfortLocation, discomfortType: effectiveRecord.functionCompletion === "unable" ? undefined : effectiveRecord.discomfortType, symptomScore: effectiveRecord.functionCompletion === "unable" ? undefined : effectiveRecord.symptomScore }
                : value === "unable"
                   ? { functionCompletion: value, functionControl: undefined, functionDiscomfort: undefined, functionUnableReason: undefined, compensations: undefined, discomfortLocation: undefined, discomfortLocations: undefined, discomfortType: undefined, symptomScore: undefined, familiarSymptom: undefined }
                  : { functionCompletion: value, functionControl: undefined, functionDiscomfort: undefined, functionUnableReason: undefined, compensations: undefined, discomfortLocation: undefined, discomfortLocations: undefined, discomfortType: undefined, symptomScore: undefined, familiarSymptom: undefined, worseSide: undefined })}>{label}</button>)}</div>
            </>}
        </section>
        {functionCompletion === "unable" ? <section className="rm-motion-answer-block is-followup">
          <h3>主要是什么原因停下来？</h3>
          <div className="rm-result-grid is-two">{unableFollowUp("function", isThinkingMode ? "thinking" : "guided").reasons.map(({ value, label }) => <button type="button" key={value} className={record.functionUnableReason === value ? "is-selected" : ""} onClick={() => updateFunctionAssessment({
              functionUnableReason: value as FunctionUnableReason,
              functionDiscomfort: value === "pain" ? "yes" : "no",
              discomfortLocation: value === "pain" ? effectiveRecord.discomfortLocation : undefined,
              discomfortLocations: value === "pain" ? effectiveRecord.discomfortLocations : undefined,
              discomfortType: value === "pain" ? effectiveRecord.discomfortType : undefined,
              symptomScore: value === "pain" ? effectiveRecord.symptomScore : undefined,
              familiarSymptom: value === "pain" ? effectiveRecord.familiarSymptom : undefined,
            })}>{label}</button>)}</div>
        </section> : null}
        {functionCompletion === "complete" && !isRangeFunction && !isCustomAction ? <section className="rm-motion-answer-block">
          <h3>做的时候稳不稳？</h3>
          <div className="rm-result-grid is-three">{([
            ["stable", "动作基本稳定"],
            ["compensated", "有明显晃动或借力"],
            ["unsure", "看不出来"],
           ] as Array<[FunctionControl, string]>).map(([value, label]) => <button type="button" key={value} className={functionControl === value ? "is-selected" : ""} onClick={() => updateFunctionAssessment({ functionControl: value, compensations: value === "compensated" ? record.compensations : undefined })}>{label}</button>)}</div>
        </section> : null}
         {functionCompletion === "complete" ? <section className="rm-motion-answer-block is-symptom">
          <h3>做的时候会不会不舒服？</h3>
          <div className="rm-result-grid is-two">{(["no", "yes"] as YesNo[]).map((value) => <button type="button" key={value} className={functionDiscomfort === value ? "is-selected" : ""} onClick={() => updateFunctionAssessment(value === "yes"
            ? { functionDiscomfort: value }
            : { functionDiscomfort: value, discomfortLocation: undefined, discomfortLocations: undefined, discomfortType: undefined, symptomScore: undefined, familiarSymptom: undefined })}>{value === "yes" ? "会" : "不会"}</button>)}</div>
        </section> : null}
        </div>}
        {intake.side === "双侧/中间" && (
          (item.kind === "function" ? Boolean(functionCompletion && functionCompletion !== "skip") : item.kind === "strength" || item.kind === "special" ? Boolean(record.simple && record.simple !== "skip") : Boolean(record.pairedStrength && record.pairedStrength !== "normal"))
        ) ? <section className="rm-motion-answer-block is-side-compare">
        <h3>{item.kind === "strength" ? "两侧都试过后，这项力量结果如何？" : item.kind === "function" ? "两侧都做过后，这项动作结果如何？" : item.kind === "special" ? "两侧都检查后，这项定位结果如何？" : "两侧都保持后，这项力量结果如何？"}</h3>
        <p className="rm-choice-hint">这里只记录这一个检查项目的左右差异，不决定整次康复的优先侧。</p>
        <div className="rm-result-grid is-two">{bilateralComparisonOptions.map(([value, label]) => <button type="button" key={value} className={effectiveBilateralComparison(record) === value ? "is-selected" : ""} onClick={() => updateAssessment(item.id, { bilateralComparison: value, worseSide: bilateralComparisonToSide(value) })}>{label}</button>)}</div>
      </section> : null}
      {item.kind === "strength" && strengthAnswerResult(record.simple, record.strengthUnableReason) === "painful" ? reuseRelatedMotionSymptom ? <div className="rm-motion-symptom-detail rm-strength-symptom-detail">
        <p className="rm-reused-symptom">刚才已经标记：{relatedMotionRecord?.discomfortLocation} · {relatedMotionRecord?.discomfortType}</p>
        <ScoreSlider compact value={record.symptomScore ?? 0} selected={typeof record.symptomScore === "number"} onChange={(symptomScore) => updateAssessment(item.id, { symptomScore })} label="这次用力时有多不舒服？" context={typeof relatedMotionRecord?.symptomScore === "number" ? `刚才活动时 ${relatedMotionRecord.symptomScore}/10` : undefined} />
      </div> : renderSymptomDetails("发力时有多不舒服？") : null}
       {item.kind === "function" && functionCompletion !== "skip" && (functionControl === "compensated" || functionDiscomfort === "yes") ? <section className="rm-motion-answer-block is-stage">
        {functionControl === "compensated" ? <>
          <h3>你看到了什么？</h3>
          <div className="rm-result-grid">{functionCompensationOptions(item.id).map((entry) => <button type="button" key={entry} className={record.compensations?.includes(entry) ? "is-selected" : ""} onClick={() => updateAssessment(item.id, (latestRecord) => ({ compensations: latestRecord.compensations?.includes(entry) ? latestRecord.compensations.filter((item) => item !== entry) : [...(latestRecord.compensations ?? []), entry] }))}>{entry}</button>)}</div>
        </> : null}
         {functionDiscomfort === "yes" || functionCompletion === "unable" ? renderSymptomDetails("做这个动作时有多不舒服？") : null}
      </section> : null}
    </article>}
    {hasSpecialPositive ? <section className="rm-route-note is-waiting">
      <span>建议补充确认</span>
      <h2>{specialPositiveFindings.map((entry) => entry.title).join("、")}出现了异常反应</h2>
      <p>{intake.stabbingPalpation === "sharp" ? "轻按也有清楚刺痛，同时特殊检查出现异常反应。先别再按压，也别加重负荷或往上加难度，建议先线下评估。" : "这个结果不能单独判断结构问题。可以完成其余低刺激检查；如果症状较重、持续不改善或伴随卡住、明显不稳，建议线下评估或结合影像确认。"}</p>
    </section> : null}
    <div className="rm-page-actions split"><button type="button" onClick={() => {
      if (focusedReassessmentActive) {
        if (focusedAssessmentPosition > 0) setAssessmentIndex(displayAssessmentIndexForId(focusedAssessmentIds[focusedAssessmentPosition - 1]));
        else setAdverseConfirmedAssessmentIds((current) => current.filter((id) => id !== "__capture__"));
        return;
      }
      if (visibleAssessmentIndex === 0) goToStep(1);
      else setAssessmentIndex(visibleAssessmentIndex - 1);
    }}>{focusedReassessmentActive ? focusedAssessmentPosition > 0 ? "上一个复查" : "返回异常反应" : visibleAssessmentIndex === 0 ? "返回关键确认" : "上一个检查"}</button>{focusedReassessmentActive ? <button type="button" className="rm-primary" disabled={!itemComplete || focusedAssessmentPosition < 0} onClick={() => confirmFocusedAssessment(item.id)}>{focusedAssessmentPosition >= focusedAssessmentIds.length - 1 ? "确认复查结果" : "确认，检查下一项"}</button> : visibleAssessmentIndex < assessmentDisplayItems.length - 1 ? <button type="button" className="rm-primary" disabled={!itemComplete} onClick={() => setAssessmentIndex(visibleAssessmentIndex + 1)}>下一个检查</button> : sharedTensionRequired ? <button type="button" className="rm-primary" disabled={!assessmentComplete} onClick={() => { setSharedTensionOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>检查相关肌肉</button> : <button type="button" className="rm-primary" disabled={!assessmentReadyForTreatment} onClick={openAssessmentSummary}>查看评估结果</button>}</div>
  </section>;
}
