import type { Dispatch, SetStateAction } from "react";
import { ScoreSlider, StepHeading } from "@/src/features/rehabmind/components/shared/ui-primitives";
import { resultFromScore } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { needsTrainingToleranceRetest } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { chiefActionLabel, hasClearChiefAction } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { pendingTrainingFeedback, planQuickFeedbackRecord, trainingFeedbackComplete } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { TissuePathwayDecision } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { RetestEligibility } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { BilateralTrainingGate } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { HomeRelaxationTarget } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { WorkflowProfile } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { AdverseSource, AdverseTiming } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import type { FullExercise } from "@/src/knowledge/pilot/full-demo-content";
import type { ExerciseFeedback } from "@/src/features/rehabmind/controllers/use-training-flow";
import type { FinalFunctionRetest } from "@/src/features/rehabmind/controllers/use-function-retest";
import { nextTrainingExerciseId } from "@/src/features/rehabmind/workflow/training-navigation-core";
import {
  type AssessmentItem,
  type IntakeState,
  type SavedDemoRecord,
  type SavedDemoSnapshot,
  type Step,
  type TransitionTarget,
  ActionReferenceFigure,
  GOALS_PRO,
  GOALS_SELF,
  actionImageVariant,
  chiefComplaintLabel,
  exerciseActionVisual,
  firstNumber,
  scoreChange,
} from "@/src/features/rehabmind/components/workbench/workbench-support";

export type TrainingStageProps = {
  intake: IntakeState;
  exerciseFeedback: Record<string, ExerciseFeedback>;
  openExercise: string;
  trainingReadyForFinalRetest: boolean;
  finalRetestScore: number;
  finalRetestConfirmed: boolean;
  finalFunctionRetests: Record<string, FinalFunctionRetest>;
  workflowProfile: WorkflowProfile;
  isThinkingMode: boolean;
  assessments: AssessmentItem[];
  tissuePathway: TissuePathwayDecision;
  noChiefActionAndNoAssessmentProblem: boolean;
  chiefRetestEligibility: RetestEligibility;
  chiefScoreComparable: boolean;
  lastChiefScore: number;
  effectiveFocusLabels: string[];
  effectiveControlLabels: string[];
  noImmediateTreatmentResponse: boolean;
  exerciseStage: number;
  exercises: FullExercise[];
  homeRelaxationTargets: HomeRelaxationTarget[];
  bilateralTrainingGateState: BilateralTrainingGate;
  chiefFunctionLabels: string[];
  onTransitionTargetChange: Dispatch<SetStateAction<TransitionTarget | null>>;
  onExerciseFeedbackChange: Dispatch<SetStateAction<Record<string, ExerciseFeedback>>>;
  onOpenExerciseChange: Dispatch<SetStateAction<string>>;
  onTrainingCompleteChange: Dispatch<SetStateAction<boolean>>;
  onTrainingPlanSavedChange: Dispatch<SetStateAction<boolean>>;
  onTrainingReadyForFinalRetestChange: Dispatch<SetStateAction<boolean>>;
  onFinalRetestScoreChange: Dispatch<SetStateAction<number>>;
  onFinalRetestConfirmedChange: Dispatch<SetStateAction<boolean>>;
  onFinalFunctionRetestsChange: Dispatch<SetStateAction<Record<string, FinalFunctionRetest>>>;
  onGoToStep: (next: Step) => void;
  onReopenAssessment: (message?: string) => void;
  onBeginAdverseReassessment: (input: { source: AdverseSource; sourceId: string; sourceLabel: string; timing: AdverseTiming; beforeScore: number; afterScore: number; relatedAssessmentIds: string[] }) => void;
  onSaveRecord: (status?: SavedDemoRecord["status"], latestScoreOverride?: number, snapshotOverrides?: Partial<SavedDemoSnapshot>) => void;
};

export function TrainingStage(props: TrainingStageProps) {
  const {
    intake, exerciseFeedback, openExercise, trainingReadyForFinalRetest, finalRetestScore,
    finalRetestConfirmed, finalFunctionRetests, workflowProfile, isThinkingMode, assessments,
    tissuePathway, noChiefActionAndNoAssessmentProblem, chiefRetestEligibility, chiefScoreComparable,
    lastChiefScore, effectiveFocusLabels, effectiveControlLabels, noImmediateTreatmentResponse,
    exerciseStage, exercises, homeRelaxationTargets, bilateralTrainingGateState, chiefFunctionLabels,
    onTransitionTargetChange: setTransitionTarget,
    onExerciseFeedbackChange: setExerciseFeedback,
    onOpenExerciseChange: setOpenExercise,
    onTrainingCompleteChange: setTrainingComplete,
    onTrainingPlanSavedChange: setTrainingPlanSaved,
    onTrainingReadyForFinalRetestChange: setTrainingReadyForFinalRetest,
    onFinalRetestScoreChange: setFinalRetestScore,
    onFinalRetestConfirmedChange: setFinalRetestConfirmed,
    onFinalFunctionRetestsChange: setFinalFunctionRetests,
    onGoToStep: goToStep,
    onReopenAssessment: reopenAssessment,
    onBeginAdverseReassessment: beginAdverseReassessment,
    onSaveRecord: saveRecord,
  } = props;

  function feedbackAdvice(exercise: FullExercise) {
    
  const feedback = exerciseFeedback[exercise.id];
  if (!feedback) return "先按建议完成第一组，再根据质量调整。";
  const target = firstNumber(exercise.reps);
  if (feedback.symptom === "worse") return "先停止这个版本，改做“做不了”里的退阶；退阶后仍加重就结束该动作。";
  if (feedback.formChanged || feedback.completed < Math.max(4, target - 3)) return "改做“做不了”里的退阶，减少个数或增加扶持。";
  if (feedback.completed >= target && feedback.reserve >= 5) return "当前版本偏轻松，下次只增加阻力、难度或个数中的一项。";
  if (feedback.reserve >= 2 && feedback.reserve <= 3) return "当前版本合适，保持组数和个数。";
  return "先保持当前版本，观察当天晚些时候和第二天反应。";
  }

  function recordQuickFeedback(exercise: FullExercise, mode: "reduce" | "hold" | "progress" | "worse") {
    // 未处理的训练加重是硬门：在用户完成加重处置或明确采用一次退阶前，
    // 不接受任何动作的新反馈，避免继续生成“合适/进阶”等矛盾记录。
    if (trainingHasWorsened) return;
    const targetReps = firstNumber(exercise.reps);
    const previous = exerciseFeedback[exercise.id];
    const hadFeedback = Boolean(previous);
    let plan = planQuickFeedbackRecord(previous, mode, targetReps);
    if (plan.requiresConfirmation) {
      // T-10：把已记录加重的动作改选为其它反馈，需要显式确认；加重事实保留在 symptomHistory。
      if (!window.confirm(`「${exercise.title}」刚才记录了加重。确定改为其它反馈吗？加重记录会保留在历史里。`)) return;
      plan = planQuickFeedbackRecord(previous, mode, targetReps, { confirmed: true });
    }
    if (!plan.feedback) return;
    const feedback = plan.feedback;
    setExerciseFeedback((current) => ({
      ...current,
      [exercise.id]: feedback,
    }));
    if (mode === "worse") {
      // 当前动作写入反馈后会从“待反馈”集合退出；显式固定当前动作，避免
      // 页面按第一个待反馈项自动跳到下一动作，造成用户误以为可以继续训练。
      setOpenExercise(exercise.id);
      return;
    }
    const nextExerciseId = nextTrainingExerciseId(
      exercises.map((item) => item.id),
      exercise.id,
      { hadFeedback, worsened: false },
    );
    if (nextExerciseId) setOpenExercise(nextExerciseId);
  }

  
  const displayGoals = isThinkingMode && !workflowProfile.isStudy ? GOALS_PRO : GOALS_SELF;
  const bilateralLowLoadOnly = bilateralTrainingGateState === "low-load";
  const bilateralTrainingBlocked = bilateralTrainingGateState === "blocked";
  const lowLoadTrainingOnly = noChiefActionAndNoAssessmentProblem || noImmediateTreatmentResponse || bilateralLowLoadOnly;
  const pendingFeedbackExercises = pendingTrainingFeedback(exercises, exerciseFeedback);
  const hasCompleteTrainingFeedback = trainingFeedbackComplete(exercises, exerciseFeedback);
  const firstPendingExerciseIndex = exercises.findIndex((exercise) => !exerciseFeedback[exercise.id]);
  const requestedExerciseIndex = exercises.findIndex((exercise) => exercise.id === openExercise);
  const visibleExerciseIndex = requestedExerciseIndex >= 0
    ? requestedExerciseIndex
    : firstPendingExerciseIndex >= 0
      ? firstPendingExerciseIndex
      : Math.max(0, exercises.length - 1);
  const visibleExercise = exercises[visibleExerciseIndex];
  // T-11：加重后若用户已确认退阶继续（followUpAction），警示解除但事实保留。
  const trainingHasWorsened = exercises.some((exercise) => {
    const feedback = exerciseFeedback[exercise.id];
    return feedback?.symptom === "worse" && feedback.followUpAction !== "regress-training";
  });
  const worsenedExercise = exercises.find((exercise) => {
    const feedback = exerciseFeedback[exercise.id];
    return feedback?.symptom === "worse" && feedback.followUpAction !== "regress-training";
  });
  // T-10/T-11 细化：改口确认或退阶继续后，警示解除，但“曾记录加重”在界面上保留一行降级提示。
  const handledWorsenedExercise = !trainingHasWorsened
    ? exercises.find((exercise) => {
      const feedback = exerciseFeedback[exercise.id];
      return feedback?.symptomHistory?.includes("worse") || (feedback?.symptom === "worse" && feedback.followUpAction === "regress-training");
    })
    : undefined;
  const worsenedExerciseAssessmentIds = worsenedExercise
    ? assessments.filter((assessment) => (assessment.tags ?? []).some((tag) => worsenedExercise.tags.includes(tag))).map((assessment) => assessment.id).slice(0, 3)
    : [];
  const trainingNeedsChiefRetest = needsTrainingToleranceRetest({
    comparableChief: chiefScoreComparable,
    completionStatusChief: chiefRetestEligibility === "completion-status",
    immediateTiming: tissuePathway.retestTiming === "same-session",
  });
  if (trainingReadyForFinalRetest) {
    const finalRetestNeedsScore = chiefRetestEligibility !== "completion-status";
    const finalChange = scoreChange(intake.baselineScore, finalRetestScore);
    const finalResult = finalRetestConfirmed ? resultFromScore(intake.baselineScore, finalRetestScore) : "same";
    const allFunctionRetestsComplete = chiefFunctionLabels.every((label) => {
      const r = finalFunctionRetests[label];
      if (!r || !r.completion) return false;
      if (r.completion === "unable" && !r.unableReason) return false;
      if (!chiefRetestEligibility || chiefRetestEligibility !== "completion-status") {
        if (typeof r.score !== "number") return false;
        if (r.completion === "complete" && !r.control) return false;
      }
      return true;
    });
    const overallComplete = (finalRetestNeedsScore ? finalRetestConfirmed : true) && allFunctionRetestsComplete;
    return <section className="rm-page rm-overall-retest-page">
      <StepHeading eyebrow="第5步 · 结束前复测" title="最后再看一次整体变化" />
      {chiefFunctionLabels.length ? <section className="rm-overall-retest-functions">
        <header><span>主诉功能动作</span><strong>逐个确认能否完成、稳定和不适</strong></header>
        {chiefFunctionLabels.map((label) => {
          const r = finalFunctionRetests[label] ?? { completion: "", score: undefined };
          const set = (patch: Partial<typeof r>) => setFinalFunctionRetests((c) => ({ ...c, [label]: { ...(c[label] ?? {}), ...patch } }));
          return <article key={label}>
            <div className="rm-retest-field-title"><strong>{label}</strong><small>有<span className="rm-term" title="借力、姿势不标准地完成，也算完成">代偿</span>也算能完成</small></div>
            <div className="rm-result-grid is-two">{([["complete", "能完成"], ["unable", "还是做不完"]] as const).map(([value, text]) => <button type="button" key={value} className={r.completion === value ? "is-selected" : ""} onClick={() => set({ completion: value })}>{text}</button>)}</div>
            {r.completion === "unable" ? <div className="rm-result-grid is-two">{([["pain", "疼或不舒服"], ["weak", "没力或撑不住"], ["fear", "担心继续会加重"]] as const).map(([value, text]) => <button type="button" key={value} className={r.unableReason === value ? "is-selected" : ""} onClick={() => set({ unableReason: value })}>{text}</button>)}</div> : null}
            {r.completion === "complete" ? <div className="rm-result-grid is-two">{([["stable", "动作稳定"], ["compensated", "有晃动或借力"], ["unsure", "看不出来"]] as const).map(([value, text]) => <button type="button" key={value} className={r.control === value ? "is-selected" : ""} onClick={() => set({ control: value })}>{text}</button>)}</div> : null}
            <ScoreSlider compact value={r.score ?? 0} selected={typeof r.score === "number"} onChange={(value) => set({ score: value })} label="现在的不适程度" />
          </article>;
        })}
      </section> : null}
      <section className="rm-overall-retest-action">
        <span>{hasClearChiefAction(intake) ? "再做一次" : "再感受一次"}</span>
        <h2>{hasClearChiefAction(intake) ? chiefActionLabel(intake) : chiefComplaintLabel(intake)}</h2>
        <p>{hasClearChiefAction(intake) ? "按最开始的方式完成一次，不额外增加速度、负重或次数。" : "按最开始记录的位置和感觉，判断现在的主要不适。"}</p>
      </section>
      {finalRetestNeedsScore ? <ScoreSlider value={finalRetestScore} selected={finalRetestConfirmed} onChange={(value) => { setFinalRetestScore(value); setFinalRetestConfirmed(true); }} label="现在主诉的疼痛或不适是多少分？" context={`最开始 ${intake.baselineScore}/10 · 处理后 ${lastChiefScore}/10`} /> : <div className="rm-retest-mode-note"><strong>本次只复核功能完成状态</strong><span>不把首次未完成动作转换成普通疼痛分数比较。</span></div>}
      {finalRetestNeedsScore && finalRetestConfirmed ? <section className={`rm-overall-retest-result is-${finalResult}`}>
        <span>本次整体结果</span>
        <strong>{finalChange.delta > 0 ? `比最开始下降 ${finalChange.delta} 分` : finalChange.delta < 0 ? `比最开始上升 ${Math.abs(finalChange.delta)} 分` : "与最开始相同"}</strong>
        <p>{finalResult === "better" ? "本次方向有帮助，按当前训练版本继续。" : finalResult === "worse" ? "先停止加重的处理和训练，建议线下评估。" : "本次没有明显变化，先不进阶；持续不变时建议线下评估。"}</p>
      </section> : null}
        <div className="rm-page-actions split"><button type="button" onClick={() => setTrainingReadyForFinalRetest(false)}>返回训练</button><button type="button" className="rm-primary" disabled={!overallComplete} onClick={() => {
          // T-02：最终复测记录加重时，结束前需要显式确认（取消则留在本页重新复测）。
          if (finalResult === "worse" && !window.confirm("刚才的最终复测记录了加重。确定现在结束并查看总结吗？建议先停止加重的训练并观察。")) return;
          setTrainingPlanSaved(false); setTrainingComplete(true); setTransitionTarget("summary"); window.scrollTo({ top: 0, behavior: "smooth" });
        }}>完成并查看总结</button></div>
    </section>;
  }
  if (bilateralTrainingBlocked) return <section className="rm-page">
    <StepHeading eyebrow="第5步 · 训练与居家" title="当前不能进入训练" />
    <section className="rm-complete-panel is-referral"><span>双侧安全出口</span><h2>先停止当前安排并重新确认</h2><p>当前存在安全信号或处理后加重，不能用低负荷训练绕过复评。</p><div className="rm-page-actions split"><button type="button" className="rm-primary" onClick={() => reopenAssessment()}>返回相关评估</button><button type="button" onClick={() => saveRecord("待医学评估")}>保存并结束</button></div></section>
  </section>;
  return <section className="rm-page">
    <StepHeading eyebrow="第5步 · 训练与居家" title="今天需要做的训练" />
    {tissuePathway.id !== "standard" ? <section className="rm-training-hold"><span>{tissuePathway.title}</span><strong>{tissuePathway.trainingStages[0]}</strong><p>{tissuePathway.trainingStages.join(" → ")}</p></section> : null}
    {noChiefActionAndNoAssessmentProblem ? <section className="rm-training-hold"><span>本次未发现明确异常</span><strong>先做低刺激基础活动</strong><p>保持舒适活动即可；如果实际症状仍存在，请返回重新描述发生经过、当前位置和会加重的动作。</p></section> : null}
    {noImmediateTreatmentResponse ? <section className="rm-training-hold"><span>本次先不进阶</span><strong>只做低刺激基础活动</strong><p>刚才的试处理没有改变主诉。以下动作只用于保持舒适活动和基础控制，不增加速度、阻力或训练量。</p></section> : null}
    {bilateralLowLoadOnly ? <section className="rm-training-hold" data-testid="bilateral-low-load-gate" data-rehabmind-test="bilateral-training-gate"><span>双侧评估尚未全部完成</span><strong>当前只开放低负荷基础活动</strong><p>另一侧未完成针对性评估前，不进入正常训练、不增加阻力或动作难度。完成反馈后可返回处理记录继续另一侧。</p></section> : null}
    <details className="rm-training-path"><summary><span>恢复目标</span><strong>{displayGoals.find((goal) => goal.level === exerciseStage)?.title ?? "当前阶段"}</strong></summary><div className="rm-stage-line" aria-label="训练目标进度">{displayGoals.map((goal) => <div key={goal.level} className={`${goal.level < exerciseStage ? "is-done" : ""} ${goal.level === exerciseStage ? "is-current" : ""} ${goal.level > intake.goal ? "is-outside" : ""}`}><i>{goal.level < exerciseStage ? "✓" : goal.level}</i><span>{goal.title}</span></div>)}</div></details>
    {lowLoadTrainingOnly ? <div className="rm-training-load-badge" role="note"><strong>低负荷基础活动</strong><span>当前只保持舒适活动和基础控制，暂不增加速度、阻力或动作难度。</span></div> : null}


    {(effectiveFocusLabels.length || effectiveControlLabels.length) ? <details className="rm-training-basis">
      <summary>为什么安排这些动作</summary>
      <div className="rm-effective-home-focus">{effectiveFocusLabels.map((label) => <article key={label}><strong>{label}</strong><small>本轮做完后主诉变轻，可保留轻柔放松</small></article>)}{effectiveControlLabels.map((label) => <article key={label}><strong>{label}</strong><small>本轮做完后主诉变轻，可保留练习</small></article>)}</div>
    </details> : null}

    {visibleExercise ? <nav className="rm-exercise-pagination" aria-label="训练动作切换"><span>训练动作 {visibleExerciseIndex + 1}/{exercises.length}</span><div><button type="button" disabled={trainingHasWorsened || visibleExerciseIndex === 0} onClick={() => setOpenExercise(exercises[visibleExerciseIndex - 1]?.id ?? "")}>上一个</button><button type="button" disabled={trainingHasWorsened || visibleExerciseIndex >= exercises.length - 1 || !exerciseFeedback[visibleExercise.id]} onClick={() => setOpenExercise(exercises[visibleExerciseIndex + 1]?.id ?? "")}>下一个</button></div></nav> : null}
    <div className="rm-exercise-list">{visibleExercise ? [visibleExercise].map((exercise) => {
      const feedback = exerciseFeedback[exercise.id];
      const exerciseVisual = exerciseActionVisual(exercise, actionImageVariant(intake));
      return <article className="rm-exercise" key={exercise.id}>
        <div className="rm-exercise-summary"><i>{visibleExerciseIndex + 1}</i><span><small>{exercise.startPosition}</small><strong>{exercise.title}</strong></span><b>{exercise.sets} · {exercise.reps}</b><em>{feedback ? "已反馈" : "当前动作"}</em></div>
        <div className="rm-exercise-detail">
          {exerciseVisual ? <ActionReferenceFigure visual={exerciseVisual} /> : <div className="rm-demo-strip is-training"><div><i>1</i><span>起始</span></div><b>→</b><div><i>2</i><span>发力</span></div><b>→</b><div><i>3</i><span>回位</span></div></div>}
          <dl><div><dt>怎么做</dt><dd><b>{exercise.startPosition}开始：</b>{exercise.how}</dd></div></dl>
          <details className="rm-exercise-alt"><summary>做不了？点这里看退阶</summary><p>{exercise.easier}</p></details>
          <details className="rm-exercise-alt"><summary>太轻松？点这里看进阶</summary><p>{exercise.harder}</p></details>
          <section className="rm-first-set"><header><span>第一组做完后，选一个最接近的情况</span><strong>{feedbackAdvice(exercise)}</strong></header><div className="rm-feedback-quick">{([
            ["reduce", "做不了或动作变形"],
            ["hold", "难度正合适"],
            ["progress", "做完还很轻松"],
            ["worse", "做完更不舒服"],
          ] as const).map(([mode, label]) => {
            const selected = mode === "worse" ? feedback?.symptom === "worse" : mode === "reduce" ? Boolean(feedback?.formChanged) : mode === "progress" ? (feedback?.reserve ?? 0) >= 5 && feedback?.symptom !== "worse" : Boolean(feedback && !feedback.formChanged && feedback.reserve >= 2 && feedback.reserve < 5 && feedback.symptom !== "worse");
            return <button type="button" key={mode} data-rehabmind-test={`training-feedback-${mode}`} data-exercise-id={exercise.id} disabled={trainingHasWorsened || bilateralLowLoadOnly && mode === "progress"} className={selected ? "is-selected" : ""} onClick={() => recordQuickFeedback(exercise, mode)}>{label}</button>;
          })}</div></section>
          {!exerciseVisual ? <button type="button" className="rm-video-placeholder" disabled><span>动作视频</span><b>暂未上传</b></button> : null}
        </div>
      </article>;
    }) : null}</div>

    {homeRelaxationTargets.length ? <details className="rm-home-relaxation" aria-label="训练结束后的自主放松">
      <summary><span>训练结束后</span><strong>针对性自主放松（{homeRelaxationTargets.length}项）</strong></summary>
      <header><small>只安排本次检查紧张、处理有效或训练涉及的肌肉区域</small></header>
      <div>{homeRelaxationTargets.map((target) => <article key={target.id}>
        <div><b>{target.title}</b><span>{target.dosage}</span></div>
        <p>{target.instruction}</p>
        <small>{target.limit}</small>
      </article>)}</div>
      <footer>如果出现刺痛、麻、电感或症状加重，立即停止。</footer>
    </details> : null}

    {trainingHasWorsened ? <section className="rm-training-warning" data-testid="training-worsening-warning"><strong>{worsenedExercise?.title ?? "训练动作"}后不适更重</strong><p>先停止这个版本，确认停止后的变化；不会直接返回整套评估。</p><div className="rm-page-actions split"><button type="button" data-rehabmind-test="training-worsening-reassess" className="rm-primary" onClick={() => beginAdverseReassessment({ source: "training", sourceId: worsenedExercise?.id ?? "training", sourceLabel: worsenedExercise?.title ?? "刚才的训练", timing: "during", beforeScore: lastChiefScore, afterScore: lastChiefScore, relatedAssessmentIds: worsenedExerciseAssessmentIds })}>处理这次加重</button><button type="button" data-rehabmind-test="training-worsening-save" onClick={() => saveRecord("训练后加重，待重新评估")}>保存并结束</button></div></section> : null}

    {handledWorsenedExercise ? <p className="rm-choice-hint" role="status">「{handledWorsenedExercise.title}」曾记录加重，已按你的选择调整后继续；如再次加重请立即停止并记录。</p> : null}

    {!trainingHasWorsened && exercises.length > 0 && !hasCompleteTrainingFeedback ? <section className="rm-training-feedback-gate" data-testid="training-feedback-gate"><strong>完成训练前，还需要记录每个动作的第一组反馈</strong><span>未选择反馈的动作：{pendingFeedbackExercises.map((exercise) => exercise.title).join("、")}</span></section> : null}

    <section className="rm-next-stage"><span>下一阶段</span><h2>{bilateralLowLoadOnly ? "完成另一侧评估后再决定进阶" : exerciseStage < intake.goal ? displayGoals.find((goal) => goal.level === exerciseStage + 1)?.title : "巩固当前目标能力"}</h2><p>{bilateralLowLoadOnly ? "本次只记录基础活动和反馈，不生成正常训练进阶结论。" : "连续两次完成、动作质量稳定且第二天没有持续加重后，一次只增加个数、阻力、动作难度或训练量中的一个变量。"}</p></section>

    {!trainingHasWorsened ? <div className="rm-page-actions rm-training-actions"><button type="button" onClick={() => goToStep(3)}>返回处理记录</button><button type="button" className="rm-primary" disabled={!hasCompleteTrainingFeedback} onClick={() => {
      if (!exercises.length || tissuePathway.retestTiming !== "same-session" || !trainingNeedsChiefRetest) {
        setFinalRetestConfirmed(false);
        setTrainingPlanSaved(false);
        setTrainingComplete(true);
        setTransitionTarget("summary");
      } else {
        setFinalRetestScore(0);
        setFinalRetestConfirmed(false);
        setTrainingReadyForFinalRetest(true);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }}>{!exercises.length ? "完成当前安排，查看总结" : tissuePathway.retestTiming !== "same-session" ? "训练完成，稍后复查" : trainingNeedsChiefRetest ? "训练完成，整体复测" : "训练完成，查看总结"}</button><button type="button" className="rm-secondary-action" onClick={() => { setTrainingComplete(false); setTrainingPlanSaved(true); setTrainingReadyForFinalRetest(false); setTransitionTarget("summary"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>暂不训练，保存方案</button></div> : null}
  </section>;
}
