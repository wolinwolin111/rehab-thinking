import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { PillOptions, ScoreSlider, StepHeading } from "@/src/features/rehabmind/components/shared/ui-primitives";
import LowerLimbLocationPicker from "@/src/features/rehabmind/components/assessment/lower-limb-location-picker";
import { currentComplaintText, extractComplaintPrioritySide } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { type CapabilityKey, emptyCapabilities, type OperationTarget, type ProductMode, type WorkflowProfile } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { chiefActionLabel, hasClearChiefAction, primaryReportedAction, reportedActionSummary } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { includesAny } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { markingSideMismatchHint, removeMarksConflictingWithComplaintSide } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import { traumaMechanismMismatchHint } from "@/src/features/rehabmind/components/workbench/stage-domain-adapters";
import {
  type IntakeMultiConfirmation,
  type IntakeState,
  type ReportedAction,
  type SavedDemoRecord,
  type SavedDemoSnapshot,
  DEFAULT_INTAKE,
  GOALS,
  GOALS_PRO,
  MECHANISMS,
  ONSETS,
  LAST_EPISODE_ONSETS,
  PRIOR_CARE_OPTIONS,
  SYMPTOMS,
  SYMPTOM_TYPE_GROUPS,
  analyzeChiefAction,
  effectiveProvocationTypes,
  chiefComplaintLabel,
  inferPilotRegions,
  locationSelectionsLabel,
  mentionsBothSymptomSides,
  parseIntake,
  reportedActionOptions,
  shouldCollectBaselineScore,
  sideFromLocationSelections,
} from "@/src/features/rehabmind/components/workbench/workbench-support";

/** M-01 方案A：标记侧别与主诉不同侧时的非阻断温和确认提示（只提示，不拦截、不改决策）。
 * M-05：提供「清除不一致标记」入口，改侧后可一键移除与新主诉侧别矛盾的标记。 */
function MarkingSideHint({ complaintSide, markedSides, noun, onClear }: { complaintSide: string; markedSides: string[]; noun?: string; onClear?: () => void }) {
  const hint = markingSideMismatchHint({ complaintSide, markedSides, noun });
  if (!hint) return null;
  return (
    <p className="rm-choice-hint" role="status">
      {hint}
      {onClear ? <button type="button" className="rm-choice-hint-clear" onClick={onClear}>清除不一致标记</button> : null}
    </p>
  );
}

/** M-03 方案A：描述提到受伤但起病方式选了「没有明确受伤」时的非阻断确认提示。 */
function TraumaMechanismHint({ description, mechanism }: { description: string; mechanism: string }) {
  const hint = traumaMechanismMismatchHint({ description, mechanism });
  return hint ? <p className="rm-choice-hint" role="status">{hint}</p> : null;
}

export type SymptomStageProps = {
  intake: IntakeState;
  showAllIntakeFields: boolean;
  professionalLocationTab: "swelling" | "tenderness" | "sensory";
  guidedIntakeField: string;
  guidedIntakePath: string[];
  guidedIntakeCursor: number;
  confirmedIntakeMulti: IntakeMultiConfirmation;
  workflowProfile: WorkflowProfile;
  isThinkingMode: boolean;
  effectiveOperationTarget: OperationTarget | "";
  showExamSetupChoice: boolean;
  showCapabilitiesChoice: boolean;
  needsSpineModeChoice: boolean;
  describedRegionId: string;
  unsupportedDescriptionRegion?: string;
  selfNeuralReferral: boolean;
  stabbingEarlyReferral: boolean;
  intakeHasTenderness: boolean;
  intakeHasSensorySymptoms: boolean;
  bilateralSameProblemGuidance: string;
  baselineScoreApplicable: boolean;
  intakeMissingFields: string[];
  currentIntakeField: string;
  guidedQuestionReady: boolean;
  keyConfirmationReady: boolean;
  onIntakeChange: Dispatch<SetStateAction<IntakeState>>;
  onShowAllIntakeFieldsChange: Dispatch<SetStateAction<boolean>>;
  onProfessionalLocationTabChange: Dispatch<SetStateAction<"swelling" | "tenderness" | "sensory">>;
  onConfirmedIntakeMultiChange: Dispatch<SetStateAction<IntakeMultiConfirmation>>;
  onToggleIntakeCapability: (key: CapabilityKey) => void;
  onToggleArray: (value: string, current: string[], setter: (next: string[]) => void) => void;
  onBeginGuidedIntake: (next: IntakeState) => void;
  onRewriteIntakeDescription: () => void;
  onAdvanceGuidedQuestion: (field?: string) => void;
  onReturnToPreviousIntakeQuestion: () => void;
  onEnterKeyConfirmation: () => void;
  onSaveRecord: (status?: SavedDemoRecord["status"], latestScoreOverride?: number, snapshotOverrides?: Partial<SavedDemoSnapshot>) => void;
  onInvalidateAfterIntake: (nextOrUpdater: IntakeState | ((current: IntakeState) => IntakeState)) => void;
};

export function SymptomStage(props: SymptomStageProps) {
  const {
    intake,
    showAllIntakeFields,
    professionalLocationTab,
    guidedIntakeField,
    guidedIntakePath,
    guidedIntakeCursor,
    confirmedIntakeMulti,
    workflowProfile,
    isThinkingMode,
    effectiveOperationTarget,
    showExamSetupChoice,
    showCapabilitiesChoice,
    needsSpineModeChoice,
    describedRegionId,
    unsupportedDescriptionRegion,
    selfNeuralReferral,
    stabbingEarlyReferral,
    intakeHasTenderness,
    intakeHasSensorySymptoms,
    bilateralSameProblemGuidance,
    baselineScoreApplicable,
    intakeMissingFields,
    currentIntakeField,
    guidedQuestionReady,
    keyConfirmationReady,
    onIntakeChange: setIntake,
    onShowAllIntakeFieldsChange: setShowAllIntakeFields,
    onProfessionalLocationTabChange: setProfessionalLocationTab,
    onConfirmedIntakeMultiChange: setConfirmedIntakeMulti,
    onToggleIntakeCapability: toggleIntakeCapability,
    onToggleArray: toggleArray,
    onBeginGuidedIntake: beginGuidedIntake,
    onRewriteIntakeDescription: rewriteIntakeDescription,
    onAdvanceGuidedQuestion: advanceGuidedQuestion,
    onReturnToPreviousIntakeQuestion: returnToPreviousIntakeQuestion,
    onEnterKeyConfirmation: enterKeyConfirmation,
    onSaveRecord: saveRecord,
    onInvalidateAfterIntake: invalidateAfterIntake,
  } = props;

  
  const hasTenderness = intakeHasTenderness;
  const hasSensorySymptoms = intakeHasSensorySymptoms;
  // 选择“康复思路模式”只完成当前字段的选择；在当前问题点击“下一步”
  // 之前仍保持逐项信息收集页面，避免模式按钮本身把用户带到下一题。
  const professionalIntake = isThinkingMode && !workflowProfile.isStudy && currentIntakeField !== "使用方式";
  const fieldMissing = (label: string) => showAllIntakeFields && intakeMissingFields.includes(label);
  const fieldLabel = (label: string) => ({
    id: `field-${label}`,
    className: `rm-label${fieldMissing(label) ? " is-missing" : ""}`,
  });
  const regionWasNotDetected = Boolean(intake.description.trim() && !describedRegionId);
  const describedPilotRegions = inferPilotRegions(currentComplaintText(intake.description));
  const hasMultiplePilotRegions = describedPilotRegions.length > 1;
  const mentionedBothSides = mentionsBothSymptomSides(intake.description);
  const vascularDescriptionSignal = includesAny(intake.description, ["发凉", "发白", "冰凉", "苍白"]);
  const missingFields = intakeMissingFields;
  const nextMissingField = currentIntakeField;
  const guidedFieldTitle = nextMissingField === "诱发动作" ? "什么动作会不舒服？" : nextMissingField;
  const showIntakeQuestion = (...labels: string[]) => showAllIntakeFields || labels.includes(nextMissingField);
  const bilateralPriorityChoice = intake.side === "双侧/中间" && (professionalIntake || showIntakeQuestion("本次优先侧"))
    ? <div id="field-本次优先侧" data-intake-field="本次优先侧" className="rm-form-block rm-bilateral-priority">
      <div className="rm-label"><span>这次先处理哪一侧？</span><b>必须选择；只决定处理顺序，不代表另一侧正常</b></div>
      <PillOptions options={["左侧", "右侧"]} value={intake.prioritySide ?? ""} onChange={(value) => invalidateAfterIntake({ ...intake, prioritySide: value === "左侧" || value === "右侧" ? value : undefined })} columns={2} />
      <p className="rm-choice-hint">另一侧仍会保留记录；完成一侧后可以返回另一侧继续评估或处理。</p>
      <p className="rm-pilot-hint">同一问题可同时保留左右标记，并选择本次优先侧；不同大部位请另建问题。</p>
    </div> : null;
  const actionOptions = reportedActionOptions(intake.regionId);
  const activeProvocationTypes = effectiveProvocationTypes(intake);
  const inferredActionId = (() => {
    if (intake.reportedActions?.length || !intake.reproduction.trim()) return "";
    const source = `${intake.reproduction} ${intake.actionAnalysis?.task ?? ""} ${intake.actionAnalysis?.category ?? ""}`;
    const semanticMatches: Array<[RegExp, string]> = [
      [/单腿下蹲|单脚下蹲|单腿蹲|单脚蹲/, "functional-single-leg-squat"],
      [/下楼|下台阶/, "functional-step-down"],
      [/上楼|上台阶/, "functional-step-up"],
      [/坐下|起身|坐站/, "functional-sit-stand"],
      [/下蹲|蹲起|深蹲/, "functional-squat"],
      [/走路|行走|步行/, "functional-walk"],
      [/单腿站|单脚站|单腿/, "functional-single-leg-stand"],
      [/跑步|慢跑|冲刺|跑/, "functional-run"],
      [/跳跃|跳起|落地|跳/, "functional-jump-landing"],
      [/绷直膝|膝关节伸直/, "knee-extension"],
      [/弯曲膝|膝关节屈曲/, "knee-flexion"],
      [/勾脚|踝背屈/, intake.regionId === "calf-local" ? "calf-dorsiflexion" : "ankle-dorsiflexion"],
      [/绷脚|跖屈/, intake.regionId === "calf-local" ? "calf-plantarflexion" : "ankle-plantarflexion"],
      [/脚底向内|内翻/, intake.regionId === "calf-local" ? "calf-inversion" : "ankle-inversion"],
      [/脚底向外|外翻/, intake.regionId === "calf-local" ? "calf-eversion" : "ankle-eversion"],
    ];
    return semanticMatches.find(([pattern, id]) => pattern.test(source) && actionOptions.some((action) => action.id === id))?.[1] ?? "";
  })();
  const selectedReportedActionIds = new Set([...(intake.reportedActions ?? []).map((action) => action.id), inferredActionId].filter(Boolean));
  const updateReportedActions = (nextActions: ReportedAction[], customAction = intake.customAction) => {
    const primaryRaw = nextActions[0]?.raw || customAction.trim() || "";
    const nextIntake = {
      ...intake,
      // 用户动作是唯一落盘事实；决策标签由 effectiveProvocationTypes 即时推导。
      provocationTypes: intake.provocationContexts,
      reportedActions: nextActions,
      customAction,
      noFixedAction: false,
      actionSelectionConfirmed: Boolean(nextActions.length || customAction.trim()),
      reproduction: primaryRaw,
      actionAnalysis: analyzeChiefAction(intake.description, intake.regionId, intake.forceDirection, primaryRaw),
    };
    setConfirmedIntakeMulti((current) => ({ ...current, provocationTypes: Boolean(nextActions.length || customAction.trim()) }));
    invalidateAfterIntake({
      ...nextIntake,
      baselineScore: shouldCollectBaselineScore(nextIntake) ? intake.baselineScore : 0,
      baselineScoreConfirmed: shouldCollectBaselineScore(nextIntake) ? intake.baselineScoreConfirmed : false,
    });
  };
  const toggleReportedAction = (action: ReportedAction) => {
    const selected = selectedReportedActionIds.has(action.id);
    const currentActions = intake.reportedActions ?? [];
    if (selected && inferredActionId === action.id && !currentActions.some((item) => item.id === action.id)) {
      updateReportedActions([], intake.customAction);
      return;
    }
    updateReportedActions(selected ? currentActions.filter((item) => item.id !== action.id) : [...currentActions, action]);
  };
  const toggleUnknownProvocation = () => {
    const selected = intake.noFixedAction && !reportedActionSummary(intake).length;
    const nextIntake = selected
      ? { ...intake, provocationContexts: [], provocationTypes: [], noFixedAction: false, actionSelectionConfirmed: false }
      : {
        ...intake,
        provocationContexts: [],
        provocationTypes: [],
        reproduction: "",
        reportedActions: [],
        customAction: "",
        noFixedAction: true,
        actionSelectionConfirmed: true,
        forceDirection: "",
        actionAnalysis: analyzeChiefAction(intake.description, intake.regionId, "", ""),
      };
    setConfirmedIntakeMulti((current) => ({ ...current, provocationTypes: !selected }));
    invalidateAfterIntake({ ...nextIntake, baselineScore: 0, baselineScoreConfirmed: false });
  };
  const renderUnifiedProvocation = (professional = false) => <div className={`rm-form-block rm-unified-provocation${professional ? " is-professional" : ""}`}>
    <div {...fieldLabel("诱发动作")}><span>什么动作会不舒服？</span><b>可以多选</b></div>
    <div className="rm-action-picker-grid">{actionOptions.map((action) => {
      const selected = selectedReportedActionIds.has(action.id);
      const [label, detail] = action.label.split("｜");
      return <button type="button" key={action.id} className={selected ? "is-selected" : ""} onClick={() => toggleReportedAction(action)}><strong>{label}</strong>{detail ? <small>{detail}</small> : null}</button>;
    })}</div>
    <label className="rm-custom-action-field"><span>其他动作</span><input value={intake.customAction} onChange={(event) => updateReportedActions(intake.reportedActions ?? [], event.target.value)} placeholder="例如：抱孩子起身、骑车踩踏" /></label>
    <button type="button" className={intake.noFixedAction && !reportedActionSummary(intake).length ? "is-selected rm-action-unknown" : "rm-action-unknown"} onClick={toggleUnknownProvocation}>没有固定动作</button>
  </div>;
  if (professionalIntake && intake.parsed) {
    const professionalSymptoms = intake.symptoms ?? [];
    const professionalLocationTabs = [
      ...(professionalSymptoms.includes("肿胀或淤青") ? [{ id: "swelling" as const, label: "肿胀/淤青", count: intake.swellingLocations.length, emptyLabel: "位置不清楚" }] : []),
      ...(hasTenderness ? [{ id: "tenderness" as const, label: "按压痛", count: intake.tendernessLocations.length, emptyLabel: "位置不清楚" }] : []),
      ...(hasSensorySymptoms ? [{ id: "sensory" as const, label: "麻/电感", count: intake.sensoryLocations.length, emptyLabel: "范围不清楚" }] : []),
    ];
    const activeProfessionalLocationTab = professionalLocationTabs.some((tab) => tab.id === professionalLocationTab)
      ? professionalLocationTab
      : professionalLocationTabs[0]?.id;
    const professionalComplete = keyConfirmationReady && !unsupportedDescriptionRegion && !selfNeuralReferral && !stabbingEarlyReferral && !vascularDescriptionSignal;
    const selectProfessionalMode = (mode: ProductMode) => {
      invalidateAfterIntake({
        ...intake,
        productMode: mode,
        operationTarget: mode === "guided" ? "self" : intake.operationTarget,
        userRole: mode === "guided" ? "general" : "rehab",
        examSetup: mode === "guided" ? "self" : intake.examSetup,
        capabilitiesConfirmed: mode !== "thinking" || intake.operationTarget !== "other" ? true : intake.capabilitiesConfirmed,
        learningExplanation: mode === "guided" ? false : intake.learningExplanation,
        spineAssessmentMode: mode === "guided" ? "guided" : intake.spineAssessmentMode,
      });
    };
    const updateProfessionalSymptoms = (symptoms: string[]) => {
      setConfirmedIntakeMulti((current) => ({ ...current, symptoms: true }));
      invalidateAfterIntake({
        ...intake,
        symptoms,
        swellingLocation: symptoms.includes("肿胀或淤青") ? intake.swellingLocation : "",
        swellingLocations: symptoms.includes("肿胀或淤青") ? intake.swellingLocations : [],
        swellingLocationConfirmed: symptoms.includes("肿胀或淤青") ? intake.swellingLocationConfirmed : false,
        tendernessLocation: symptoms.includes("按压痛") ? intake.tendernessLocation : "",
        tendernessLocations: symptoms.includes("按压痛") ? intake.tendernessLocations : [],
        tendernessLocationConfirmed: symptoms.includes("按压痛") ? intake.tendernessLocationConfirmed : false,
        stabbingPalpation: intake.symptomType === "刺痛" || symptoms.includes("按压痛") || activeProvocationTypes.includes("按压") ? intake.stabbingPalpation : "",
      });
    };
    return <section className="rm-page rm-professional-intake">
      <StepHeading eyebrow="第1步 · 专业症状收集" title="记录主诉与评估条件" note="一次展开填写；患者原话、专业判断和后续检查分开保存。" />

      <section className="rm-professional-banner">
        <div><span>专业工作台</span><strong>集中填写</strong><small>填写本次需要的信息，再进入安全确认。</small></div>
        <button type="button" onClick={() => selectProfessionalMode("guided")}>切换为自助模式</button>
      </section>

      <section className="rm-professional-source">
        <header><div><span>患者原话</span><strong>不改写，作为本次主诉依据</strong></div><button type="button" onClick={rewriteIntakeDescription}>重新整理</button></header>
        <p>{intake.description || "未记录患者原话"}</p>
      </section>

      <section className="rm-professional-section">
        <header><span>01</span><div><h2>主诉部位</h2><p>先确定本次只解决的一个主要问题；同一大部位可以标记多个具体位置。</p></div></header>
        {hasMultiplePilotRegions ? <div className="rm-pilot-hint">描述涉及多个大部位。本次只保留一个主要问题，其他部位请另开问题。</div> : null}
        {mentionedBothSides ? <div className="rm-pilot-hint">双侧都不舒服时，先选择本次优先处理的一侧。</div> : null}
        <LowerLimbLocationPicker
          professional
          value={intake.bodyLocations}
          initialRegionId={intake.regionId}
          initialSide={intake.side}
          initialLocation={intake.location}
          onChange={(bodyLocations, meta) => {
            const primary = bodyLocations[0];
            const regionId = primary?.regionId ?? "";
            const forceDirection = intake.regionId === regionId ? intake.forceDirection : "";
            const preservedIds = new Set(meta?.preservedSelections?.map((item) => item.id) ?? []);
            const historyWithoutRemoved = intake.bodyLocationHistory.filter((item) => item.id !== meta?.removedPreservedId);
            const bodyLocationHistory = [...historyWithoutRemoved, ...(meta?.preservedSelections ?? []).filter((item) => !historyWithoutRemoved.some((entry) => entry.id === item.id))];
            invalidateAfterIntake({
              ...intake,
              bodyLocations,
              bodyLocationHistory: bodyLocationHistory.filter((item) => !preservedIds.has(item.id) || item.regionId !== regionId),
              locationConfirmed: Boolean(primary),
              regionId,
              side: sideFromLocationSelections(bodyLocations),
              prioritySide: sideFromLocationSelections(bodyLocations) === "双侧/中间"
                ? intake.prioritySide ?? extractComplaintPrioritySide(currentComplaintText(intake.description))
                : undefined,
              location: bodyLocations.map((item) => item.location).join("、"),
              forceDirection,
              actionAnalysis: analyzeChiefAction(intake.description, regionId, forceDirection, primaryReportedAction(intake)),
            });
          }}
        />
        {bilateralPriorityChoice}
      </section>

      {needsSpineModeChoice ? <section className="rm-professional-section rm-professional-spine-mode"><header><span>01A</span><div><h2>脊柱活动度记录方式</h2><p>普通用户按不适和左右差异记录；有测量工具时再填写参考角度。</p></div></header><div className="rm-options rm-professional-options" style={{ "--columns": 2 } as CSSProperties}><button type="button" className={intake.spineAssessmentMode === "guided" ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, spineAssessmentMode: "guided" })}><strong>观察不适与左右差异</strong><small>不需要测量工具</small></button><button type="button" className={intake.spineAssessmentMode === "reference" ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, spineAssessmentMode: "reference" })}><strong>按参考角度记录</strong><small>有规范测量工具和协助者</small></button></div></section> : null}

      <section className="rm-professional-section">
        <header><span>02</span><div><h2>病程与发生机制</h2><p>记录时间和出现方式，供后续判断急性、反复或代偿线索。</p></div></header>
        <div className="rm-professional-fields">
          <label><b>病程</b><select value={intake.onset} onChange={(event) => invalidateAfterIntake({ ...intake, onset: event.target.value, lastEpisodeOnset: event.target.value === "反复出现" ? intake.lastEpisodeOnset : undefined })}><option value="">请选择</option>{ONSETS.map((item) => <option key={item}>{item}</option>)}</select></label>
          {intake.onset === "反复出现" ? <label><b>最近一次出现</b><select value={intake.lastEpisodeOnset ?? ""} onChange={(event) => invalidateAfterIntake({ ...intake, lastEpisodeOnset: event.target.value })}><option value="">请选择</option>{LAST_EPISODE_ONSETS.map((item) => <option key={item}>{item}</option>)}</select></label> : null}
          <label><b>发生机制</b><select value={intake.mechanism} onChange={(event) => invalidateAfterIntake({ ...intake, mechanism: event.target.value })}><option value="">请选择</option>{MECHANISMS.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <TraumaMechanismHint description={intake.description} mechanism={intake.mechanism} />
      </section>

      <section className="rm-professional-section">
        <header><span>03</span><div><h2>症状性质与伴随表现</h2><p>可多选；不确定的可以先不选，不替你下结论。</p></div></header>
        <div className="rm-professional-symptom-groups"><div className="rm-label"><span>症状性质</span><b>选择最接近的一项</b></div>{SYMPTOM_TYPE_GROUPS.map((group) => <section key={group.title} className="rm-symptom-group is-flat"><strong>{group.title}</strong><PillOptions options={group.options} value={intake.symptomType} onChange={(symptomType) => invalidateAfterIntake({ ...intake, symptomType, painQualityConfirmed: !["疼痛，性质说不清", "说不清的不适"].includes(symptomType), stabbingSpread: symptomType === "刺痛" ? intake.stabbingSpread : "", stabbingPalpation: (symptomType === "刺痛" || hasTenderness) ? intake.stabbingPalpation : "" })} columns={3} /></section>)}</div>
        {showAllIntakeFields && (intake.symptomType === "疼痛，性质说不清" || intake.symptomType === "说不清的不适") ? null : null}
        <div className="rm-label rm-professional-symptom-label"><span>伴随表现</span><b>可多选；没有就选“没有以上情况”</b></div>
        <div className="rm-check-grid">{SYMPTOMS.map((symptom) => <button type="button" key={symptom} className={professionalSymptoms.includes(symptom) ? "is-selected" : ""} onClick={() => updateProfessionalSymptoms(professionalSymptoms.includes(symptom) ? professionalSymptoms.filter((item) => item !== symptom) : [...professionalSymptoms, symptom])}><i>{professionalSymptoms.includes(symptom) ? "✓" : ""}</i>{symptom}</button>)}<button type="button" className={confirmedIntakeMulti.symptoms && !professionalSymptoms.length ? "is-selected" : ""} onClick={() => updateProfessionalSymptoms([])}><i>{confirmedIntakeMulti.symptoms && !professionalSymptoms.length ? "✓" : ""}</i>没有以上情况</button></div>
        {professionalLocationTabs.length ? <div className="rm-professional-location-workbench">
          <nav className="rm-professional-location-tabs" aria-label="选择要标记的位置类型">
            {professionalLocationTabs.map((tab) => <button type="button" key={tab.id} className={activeProfessionalLocationTab === tab.id ? "is-active" : ""} onClick={() => setProfessionalLocationTab(tab.id)}><strong>{tab.label}</strong><small>{tab.count ? `已标记 ${tab.count} 处` : "尚未标记"}</small></button>)}
          </nav>
          <div className="rm-professional-location-panel">
            {activeProfessionalLocationTab === "swelling" ? <div><header><b>肿胀或淤青位置</b><span>标记所有明显区域</span></header><LowerLimbLocationPicker professional mode="swelling" value={intake.swellingLocations} initialRegionId={intake.regionId} initialSide={intake.side} initialLocation={intake.swellingLocation || intake.location} onChange={(swellingLocations) => invalidateAfterIntake({ ...intake, swellingLocations, swellingLocation: locationSelectionsLabel(swellingLocations), swellingLocationConfirmed: Boolean(swellingLocations.length) })} /><MarkingSideHint complaintSide={intake.side} markedSides={intake.swellingLocations.map((item) => item.side)} onClear={() => { const kept = removeMarksConflictingWithComplaintSide(intake.side, intake.swellingLocations); invalidateAfterIntake({ ...intake, swellingLocations: kept, swellingLocation: locationSelectionsLabel(kept), swellingLocationConfirmed: Boolean(kept.length) }); }} />{!intake.swellingLocations.length ? <button type="button" className="rm-location-unknown" onClick={() => invalidateAfterIntake({ ...intake, swellingLocation: "说不清", swellingLocations: [], swellingLocationConfirmed: true })}>位置不清楚</button> : null}</div> : null}
            {activeProfessionalLocationTab === "tenderness" ? <div><header><b>按压痛位置</b><span>轻按后标记出现明显疼痛的区域</span></header><LowerLimbLocationPicker professional mode="tenderness" value={intake.tendernessLocations} initialRegionId={intake.regionId} initialSide={intake.side} initialLocation={intake.tendernessLocation || intake.location} onChange={(tendernessLocations) => invalidateAfterIntake({ ...intake, tendernessLocations, tendernessLocation: locationSelectionsLabel(tendernessLocations), tendernessLocationConfirmed: Boolean(tendernessLocations.length) })} /><MarkingSideHint complaintSide={intake.side} markedSides={intake.tendernessLocations.map((item) => item.side)} noun="按压痛位置" onClear={() => { const kept = removeMarksConflictingWithComplaintSide(intake.side, intake.tendernessLocations); invalidateAfterIntake({ ...intake, tendernessLocations: kept, tendernessLocation: locationSelectionsLabel(kept), tendernessLocationConfirmed: Boolean(kept.length) }); }} />{!intake.tendernessLocations.length ? <button type="button" className="rm-location-unknown" onClick={() => invalidateAfterIntake({ ...intake, tendernessLocation: "说不清", tendernessLocations: [], tendernessLocationConfirmed: true })}>位置不清楚</button> : null}</div> : null}
            {activeProfessionalLocationTab === "sensory" ? <div><header><b>麻/电感范围</b><span>标记麻、刺、电感出现的区域</span></header><LowerLimbLocationPicker professional mode="sensory" value={intake.sensoryLocations} initialRegionId={intake.regionId} initialSide={intake.side} initialLocation={intake.sensoryLocation || intake.location} onChange={(sensoryLocations) => invalidateAfterIntake({ ...intake, sensoryLocations, sensoryLocation: locationSelectionsLabel(sensoryLocations), sensoryLocationConfirmed: Boolean(sensoryLocations.length) })} /><MarkingSideHint complaintSide={intake.side} markedSides={intake.sensoryLocations.map((item) => item.side)} noun="麻电范围" onClear={() => { const kept = removeMarksConflictingWithComplaintSide(intake.side, intake.sensoryLocations); invalidateAfterIntake({ ...intake, sensoryLocations: kept, sensoryLocation: locationSelectionsLabel(kept), sensoryLocationConfirmed: Boolean(kept.length) }); }} />{!intake.sensoryLocations.length ? <button type="button" className="rm-location-unknown" onClick={() => invalidateAfterIntake({ ...intake, sensoryLocation: "说不清", sensoryLocations: [], sensoryLocationConfirmed: true })}>范围不清楚</button> : null}</div> : null}
          </div>
        </div> : null}
        {(intake.symptomType === "刺痛" || hasTenderness) ? <div className="rm-professional-subfield rm-professional-palpation-response"><div className="rm-label"><span>轻按反应</span><b>在刚才最不舒服的位置轻按一次；没有尝试也可以直接记录</b></div><PillOptions options={["清楚的刺痛", "钝痛或酸胀", "没有明显感觉", "没有尝试"]} value={({ sharp: "清楚的刺痛", dull: "钝痛或酸胀", none: "没有明显感觉", "not-tried": "没有尝试", "": "" } as const)[intake.stabbingPalpation]} onChange={(value) => invalidateAfterIntake({ ...intake, stabbingPalpation: ({ "清楚的刺痛": "sharp", "钝痛或酸胀": "dull", "没有明显感觉": "none", "没有尝试": "not-tried" } as const)[value] ?? "" })} columns={2} /></div> : null}
      </section>

      <section className="rm-professional-section">
        <header><span>04</span><div><h2>诱发动作与时机</h2></div></header>
        {renderUnifiedProvocation(true)}
      </section>

      {baselineScoreApplicable ? <section className="rm-professional-section"><header><span>05</span><div><h2>当前不适与恢复目标</h2><p>记录这个动作现在有多不舒服，后面会用同一动作比较。</p></div></header><ScoreSlider value={intake.baselineScore} selected={intake.baselineScoreConfirmed} onChange={(baselineScore) => invalidateAfterIntake({ ...intake, baselineScore, baselineScoreConfirmed: true })} label="当前主诉动作的不适程度" /><div className="rm-label rm-professional-goal-label"><span>恢复目标</span><b>选择患者希望达到的阶段</b></div><div className="rm-goals">{GOALS_PRO.map((goal) => <button type="button" key={goal.level} className={intake.goal === goal.level ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, goal: goal.level })}><i>{goal.level}</i><span><strong>{goal.title}</strong><small>{goal.short}</small></span></button>)}</div></section> : <section className="rm-professional-section"><header><span>05</span><div><h2>恢复目标</h2><p>没有固定动作也可以直接选择恢复目标。</p></div></header><div className="rm-goals">{GOALS_PRO.map((goal) => <button type="button" key={goal.level} className={intake.goal === goal.level ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, goal: goal.level })}><i>{goal.level}</i><span><strong>{goal.title}</strong><small>{goal.short}</small></span></button>)}</div></section>}

      <section className="rm-professional-section">
        <header><span>06</span><div><h2>本次检查条件</h2><p>先说明由谁操作、能够完成哪些专业检查，后续评估会按此开放。</p></div></header>
        <div className="rm-options rm-professional-options" style={{ "--columns": 2 } as CSSProperties}>
          <button type="button" className={intake.operationTarget === "self" ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, operationTarget: "self", examSetup: "self", capabilitiesConfirmed: true })}><strong>自我检查</strong><small>记录主动活动与自我感受</small></button>
          <button type="button" className={intake.operationTarget === "other" ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, operationTarget: "other", examSetup: "professional-other", capabilitiesConfirmed: false })}><strong>协助他人检查</strong><small>可以继续选择被动、抗阻和触诊检查</small></button>
        </div>
        {effectiveOperationTarget === "other" ? <div className="rm-professional-capabilities"><div className="rm-label"><span>这次能做哪些检查？</span><b>选择实际可以完成的项目</b></div><div className="rm-options" style={{ "--columns": 3 } as CSSProperties}>{([ ["passiveRange", "被动活动度"], ["resistedStrength", "抗阻力量"], ["endFeel", "末端感觉"], ["palpation", "基础触诊"], ["specialTest", "专项检查"], ["jointMobilization", "关节处理"] ] as Array<[CapabilityKey, string]>).map(([key, label]) => <button type="button" key={key} disabled={key === "jointMobilization" && !intake.capabilities.passiveRange && !intake.capabilities.jointMobilization} className={intake.capabilities[key] ? "is-selected" : ""} onClick={() => toggleIntakeCapability(key)}>{label}</button>)}</div>{!intake.capabilities.passiveRange ? <small className="rm-capability-hint">要做关节处理，需要先选择被动活动度检查。</small> : null}</div> : null}
        {isThinkingMode ? <div className="rm-professional-subfield"><div className="rm-label"><span>学习解释</span><b>只增加步骤说明，不会改变后续建议</b></div><button type="button" className={intake.learningExplanation ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, learningExplanation: !intake.learningExplanation })}>{intake.learningExplanation ? "已开启：显示为什么进入下一步" : "关闭：只显示当前操作"}</button></div> : null}
      </section>

      <section className="rm-professional-section rm-professional-notes"><header><span>07</span><div><h2>专业备注</h2><p>记录尚未确认的判断；备注不会改变页面建议。</p></div></header><textarea value={intake.professionalNotes} onChange={(event) => invalidateAfterIntake({ ...intake, professionalNotes: event.target.value })} placeholder="例如：考虑外侧链参与；待活动度与抗阻结果验证。" /></section>

      {unsupportedDescriptionRegion ? <section className="rm-route-note is-waiting"><span>当前首发范围</span><h2>暂不支持{unsupportedDescriptionRegion}</h2><p>现在只开放大腿至足部。骨盆、臀部、腹股沟和髋关节不会被套进膝踝方案。</p></section> : null}
      {vascularDescriptionSignal ? <section className="rm-route-note is-waiting"><span>建议先线下确认</span><h2>描述中出现发凉或发白</h2><p>这可能与末端循环有关，不要先做强刺激处理。可以保存当前信息，优先完成线下评估。</p><button type="button" onClick={() => saveRecord("待医学评估")}>保存本次信息</button></section> : null}
      {selfNeuralReferral ? <section className="rm-route-note is-waiting"><span>建议先线下确认</span><h2>出现麻、电或感觉变化</h2><p>这种情况不适合自己练，也不建议自己松神经。可保存当前信息，由专业人员检查感觉范围和力量变化。</p><button type="button" onClick={() => saveRecord("待医学评估")}>保存本次信息</button></section> : null}
      {stabbingEarlyReferral ? <section className="rm-route-note is-waiting"><span>建议先线下确认</span><h2>不活动时也会刺痛</h2><p>先确认局部刺激、外伤或其他需要医学处理的问题，可保存当前信息后再继续。</p><button type="button" onClick={() => saveRecord("待医学评估")}>保存本次信息</button></section> : null}
      {/* 原先的 disabled={!professionalComplete} 会把缺项藏起来；现在改为点击后高亮并定位缺项。 */}
      <div className="rm-professional-footer"><span>{professionalComplete ? "信息已足够进入关键确认" : `还需补充：${intakeMissingFields.join("、") || "检查条件"}`}</span><div><button type="button" onClick={rewriteIntakeDescription}>重新整理原话</button>{professionalComplete && keyConfirmationReady ? <button type="button" className="rm-primary" onClick={enterKeyConfirmation}>进入关键确认</button> : null}</div></div>
    </section>;
  }
  return <section className="rm-page">
    <StepHeading eyebrow="第1步 · 症状信息" title={intake.parsed ? professionalIntake ? "记录主诉与评估条件" : "确认你的问题信息" : "请描述你的问题"} note={intake.parsed ? professionalIntake ? "可一次填写多个字段；患者原话、检查条件和专业判断分开记录。" : undefined : "请说明不适部位、出现时间、受影响的动作和恢复目标。"} tutorialTarget="flow-mobile" />
    {!intake.parsed ? <>
      <div className="rm-hero-input" data-rehabmind-tutorial="symptom-block">
        <label htmlFor="chief-description" className="rm-entry-hint"><span>不适部位</span><span>·</span><span>出现时间</span><span>·</span><span>受影响动作</span><span>·</span><span>恢复目标</span></label>
        <textarea id="chief-description" data-rehabmind-tutorial="symptom-input" value={intake.description} onChange={(event) => setIntake((current) => ({ ...current, description: event.target.value }))} placeholder="例如：右脚踝昨天扭伤，走路和下楼时疼，恢复目标是正常走路。" />
        <p className="rm-entry-example">例如：右脚踝昨天扭伤，走路和下楼时疼，恢复目标是正常走路。</p>
        <small>不清楚的内容可以写“不清楚”。</small>
        <div><button type="button" data-rehabmind-tutorial="organize" disabled={!intake.description.trim()} onClick={() => beginGuidedIntake(parseIntake(intake.description, { ...DEFAULT_INTAKE, description: intake.description }))}>继续</button></div>
      </div>
    </> : <>
      <details className="rm-collected">
        <summary><div><span>查看已收集信息</span><h2>{chiefComplaintLabel(intake)}</h2></div><b>{missingFields.length ? "正在补充" : "已确认"}</b></summary>
        {showAllIntakeFields && missingFields.length ? <div className="rm-missing-fields"><strong>还需要：</strong>{missingFields.map((field) => <span key={field}>{field}</span>)}</div> : null}
        <div className="rm-collected-quick">
          <span><b>部位</b>{intake.bodyLocations.length ? intake.bodyLocations.map((item) => `${item.side}·${item.location}`).join("、") : "具体位置待确认"}</span>
          <span><b>感觉</b>{intake.symptomType || "待确认"}</span>
          <span><b>时间</b>{intake.onset || "待确认"}</span>
          <span><b>动作</b>{hasClearChiefAction(intake) ? chiefActionLabel(intake) : "待确认"}</span>
        </div>
        <div className="rm-collected-actions">
          <button type="button" className="rm-rewrite-button" onClick={rewriteIntakeDescription}>重写症状描述</button>
          <button type="button" className="rm-all-info-button" onClick={() => setShowAllIntakeFields((current) => !current)}>{showAllIntakeFields ? "回到逐项补充" : "≡ 全部信息"}</button>
        </div>
      </details>

      <section className="rm-guided-status">
        <span>{showAllIntakeFields ? "全部信息" : guidedQuestionReady ? "这一项已完成" : missingFields.length > 5 ? "先补最关键的几项" : missingFields.length ? `还需 ${missingFields.length} 项` : "信息已完成"}</span>
        <h2>{showAllIntakeFields ? "按需要修改" : guidedFieldTitle || "你希望恢复到什么程度？"}</h2>
        <p>{showAllIntakeFields ? "只改需要调整的内容即可。" : missingFields.length || guidedQuestionReady ? "选好后直接点下一步。" : "信息已补充完成。"}</p>
      </section>
      {!showAllIntakeFields ? <nav className="rm-guided-nav" aria-label="症状信息问题导航">
        <button type="button" disabled={guidedIntakePath.length === 0 || (guidedIntakeField ? guidedIntakePath.indexOf(guidedIntakeField) <= 0 : guidedIntakeCursor <= 0)} onClick={returnToPreviousIntakeQuestion}>← 上一步</button>
        {nextMissingField ? <button type="button" className="rm-primary" disabled={!guidedQuestionReady} onClick={() => advanceGuidedQuestion(nextMissingField)}>下一步 →</button> : null}
      </nav> : null}

      {unsupportedDescriptionRegion ? <section className="rm-route-note is-waiting">
        <span>当前首发范围</span><h2>暂不支持{unsupportedDescriptionRegion}</h2>
        <p>现在只开放大腿至足部。骨盆、臀部、腹股沟和髋关节不会被套进膝踝方案。</p>
      </section> : null}
      {vascularDescriptionSignal ? <section className="rm-route-note is-waiting"><span>建议先线下确认</span><h2>描述中出现发凉或发白</h2><p>这可能与末端循环有关，不要先做强刺激处理。可以保存当前信息，优先完成线下评估。</p><button type="button" onClick={() => saveRecord("待医学评估")}>保存本次信息</button></section> : null}

      {showIntakeQuestion("使用方式", "使用身份") ? <div className="rm-form-block rm-role-choice">
        <div className="rm-label"><span>这次使用哪种模式？</span></div>
        <div className="rm-options" style={{ "--columns": 3 } as CSSProperties}>
          {([[ 
            "guided", "自助康复", "跟随一步一步的提示完成"
          ], [
            "thinking", "康复思路模式", "按阶段记录检查、处理和复测"
          ]] as Array<[ProductMode, string, string]>).map(([mode, label, note]) => {
            const selected = intake.productMode === mode;
            return <button type="button" key={mode} className={selected ? "is-selected" : ""} onClick={() => {
              invalidateAfterIntake({
                ...intake,
                productMode: mode,
                operationTarget: mode === "guided" ? "self" : "",
                userRole: mode === "guided" ? "general" : "rehab",
                examSetup: mode === "guided" ? "self" : "",
                capabilities: emptyCapabilities(),
                capabilitiesConfirmed: mode !== "thinking",
                learningExplanation: false,
                spineAssessmentMode: mode === "guided" ? "guided" : "",
              });
            }}><strong>{label}</strong><small>{note}</small></button>;
          })}
        </div>
      </div> : null}

      {showExamSetupChoice && showIntakeQuestion("操作对象", "检查方式") ? <div className="rm-form-block rm-exam-setup-choice">
        <div className="rm-label"><span>这次怎样完成检查？</span><b>这次由谁完成检查？选择给自己检查，还是给别人检查</b></div>
        <div className="rm-options" style={{ "--columns": 3 } as CSSProperties}>
          <button type="button" className={intake.operationTarget === "self" ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, operationTarget: "self", examSetup: "self", capabilitiesConfirmed: true })}><strong>给自己检查</strong><small>自己跟随提示检查，只记录主动活动</small></button>
          <button type="button" className={intake.operationTarget === "other" ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, operationTarget: "other", examSetup: "professional-other", capabilitiesConfirmed: true })}><strong>给别人检查</strong><small>继续选择这次能完成的检查</small></button>
        </div>
      </div> : null}

      {showCapabilitiesChoice && showIntakeQuestion("检查能力") ? <div className="rm-form-block rm-capability-choice">
        <div className="rm-label"><span>这次可以完成哪些检查？</span><b>选择实际可以完成的项目</b></div>
        <div className="rm-options" style={{ "--columns": 3 } as CSSProperties}>
          {([
            ["passiveRange", "被动活动度"], ["resistedStrength", "抗阻力量"], ["endFeel", "末端感觉"],
            ["palpation", "基础触诊"], ["specialTest", "专项检查"], ["jointMobilization", "关节处理"],
          ] as Array<[CapabilityKey, string]>).map(([key, label]) => <button type="button" key={key} disabled={key === "jointMobilization" && !intake.capabilities.passiveRange && !intake.capabilities.jointMobilization} className={intake.capabilities[key] ? "is-selected" : ""} onClick={() => toggleIntakeCapability(key)}>{label}</button>)}
        </div>{!intake.capabilities.passiveRange ? <small className="rm-capability-hint">要做关节处理，需要先选择被动活动度检查。</small> : null}
      </div> : null}

      {needsSpineModeChoice && showIntakeQuestion("活动度检查方式") ? <div className="rm-form-block rm-spine-mode-choice">
        <div className="rm-label"><span>这次怎样判断脊柱活动？</span></div>
        <div className="rm-options" style={{ "--columns": 2 } as CSSProperties}>
          <button type="button" className={intake.spineAssessmentMode === "guided" ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, spineAssessmentMode: "guided" })}><strong>跟随提示观察</strong><small>不需要测量工具</small></button>
          <button type="button" className={intake.spineAssessmentMode === "reference" ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, spineAssessmentMode: "reference" })}><strong>按参考角度判断</strong><small>我会规范测量且有工具</small></button>
        </div>
      </div> : null}

      {showIntakeQuestion("不舒服的位置") ? <>
        {hasMultiplePilotRegions ? <div className="rm-pilot-hint">你提到了多个位置。本版一次只评估一个主要问题，请选择这次最想解决的位置；其他问题请另开问题。</div> : regionWasNotDetected ? <div className="rm-pilot-hint">没有准确识别位置，请直接在图上选择。</div> : mentionedBothSides ? <div className="rm-pilot-hint">{bilateralSameProblemGuidance}</div> : null}
        <LowerLimbLocationPicker
          value={intake.bodyLocations}
          initialRegionId={intake.regionId}
          initialSide={intake.side}
          initialLocation={intake.location}
          onChange={(bodyLocations, meta) => {
            const preservedIds = new Set(meta?.preservedSelections?.map((item) => item.id) ?? []);
            const historyWithoutRemoved = intake.bodyLocationHistory.filter((item) => item.id !== meta?.removedPreservedId);
            const bodyLocationHistory = [...historyWithoutRemoved, ...(meta?.preservedSelections ?? []).filter((item) => !historyWithoutRemoved.some((entry) => entry.id === item.id))];
            const primary = bodyLocations[0];
            const regionId = primary?.regionId ?? "";
            const forceDirection = intake.regionId === regionId ? intake.forceDirection : "";
            invalidateAfterIntake({
              ...intake,
              bodyLocations,
              bodyLocationHistory: bodyLocationHistory.filter((item) => !preservedIds.has(item.id) || item.regionId !== regionId),
              locationConfirmed: Boolean(primary),
              regionId,
              side: sideFromLocationSelections(bodyLocations),
              prioritySide: sideFromLocationSelections(bodyLocations) === "双侧/中间"
                ? intake.prioritySide ?? extractComplaintPrioritySide(currentComplaintText(intake.description))
                : undefined,
              location: bodyLocations.map((item) => item.location).join("、"),
              forceDirection,
              actionAnalysis: analyzeChiefAction(intake.description, regionId, forceDirection, primaryReportedAction(intake)),
            });
          }}
        />
      </> : null}

      {/* BIL-01 修复：优先侧题卡必须独立于位置选择器的显隐条件。
          原先嵌在 showIntakeQuestion("不舒服的位置") 分支内，与自身条件
          （指针需流转到本次优先侧）互斥，导致双侧用户永远看不到选择题。 */}
      {bilateralPriorityChoice}

      {showIntakeQuestion("不适感觉") ? <div className="rm-form-block rm-symptom-type-groups"><div {...fieldLabel("不适感觉")}><span>最接近哪种感觉</span><b>选择一个即可</b></div>{SYMPTOM_TYPE_GROUPS.map((group) => <details key={group.title} className="rm-symptom-group" open={group.title === "疼痛"}><summary>{group.title}</summary><PillOptions options={group.options} value={intake.symptomType} onChange={(symptomType) => invalidateAfterIntake({ ...intake, symptomType, painQualityConfirmed: !["疼痛，性质说不清", "说不清的不适"].includes(symptomType), stabbingSpread: symptomType === "刺痛" ? intake.stabbingSpread : "", stabbingPalpation: (symptomType === "刺痛" || intakeHasTenderness) ? intake.stabbingPalpation : "" })} columns={3} /></details>)}</div> : null}

      {showIntakeQuestion("疼痛性质") ? null : null}

      {(intake.symptomType === "刺痛" || intakeHasTenderness) && showIntakeQuestion("轻按反应") ? <div className="rm-form-block rm-stabbing-check">
        {showAllIntakeFields || nextMissingField === "轻按反应" ? <><div {...fieldLabel("轻按反应")}><span>在刚才最不舒服的位置轻按一次，会出现什么？</span></div><PillOptions options={["清楚的刺痛", "钝痛或酸胀", "没有明显感觉", "没有尝试"]} value={({ sharp: "清楚的刺痛", dull: "钝痛或酸胀", none: "没有明显感觉", "not-tried": "没有尝试", "": "" } as const)[intake.stabbingPalpation]} onChange={(value) => invalidateAfterIntake({ ...intake, stabbingPalpation: ({ "清楚的刺痛": "sharp", "钝痛或酸胀": "dull", "没有明显感觉": "none", "没有尝试": "not-tried" } as const)[value] ?? "" })} columns={2} /></> : null}
      </div> : null}

      {showIntakeQuestion("诱发动作") ? renderUnifiedProvocation() : null}

      {baselineScoreApplicable && showIntakeQuestion("不适分数") ? <ScoreSlider value={intake.baselineScore} selected={intake.baselineScoreConfirmed} onChange={(baselineScore) => invalidateAfterIntake({ ...intake, baselineScore, baselineScoreConfirmed: true })} label="现在的疼痛或不适有多重？" /> : null}

      {showIntakeQuestion("出现多久", "发生方式") ? <div className={`rm-two-columns ${!showAllIntakeFields ? "is-guided-single" : ""}`}>
        {showAllIntakeFields || nextMissingField === "出现多久" ? <div className="rm-form-block"><div {...fieldLabel("出现多久")}><span>这个问题出现多久了？</span></div><select value={intake.onset} onChange={(event) => invalidateAfterIntake({ ...intake, onset: event.target.value, lastEpisodeOnset: event.target.value === "反复出现" ? intake.lastEpisodeOnset : undefined })}><option value="">请选择时间</option>{ONSETS.map((item) => <option key={item}>{item}</option>)}</select></div> : null}
        {showAllIntakeFields || nextMissingField === "发生方式" ? <div className="rm-form-block"><div {...fieldLabel("发生方式")}><span>它是怎么出现的？</span></div><select value={intake.mechanism} onChange={(event) => invalidateAfterIntake({ ...intake, mechanism: event.target.value })}><option value="">请选择发生方式</option>{MECHANISMS.map((item) => <option key={item}>{item}</option>)}</select><TraumaMechanismHint description={intake.description} mechanism={intake.mechanism} /></div> : null}
      </div> : null}

      {intake.onset === "反复出现" && showIntakeQuestion("最近一次出现") ? <div className="rm-form-block"><div {...fieldLabel("最近一次出现")}><span>最近一次出现是什么时候？</span></div><select value={intake.lastEpisodeOnset ?? ""} onChange={(event) => invalidateAfterIntake({ ...intake, lastEpisodeOnset: event.target.value })}><option value="">请选择时间</option>{LAST_EPISODE_ONSETS.map((item) => <option key={item}>{item}</option>)}</select></div> : null}

      {showIntakeQuestion("目前情况") ? <div className="rm-form-block"><div {...fieldLabel("目前情况")}><span>{professionalIntake ? "主要症状和伴随表现" : "目前有哪些情况"}</span><b>可多选</b></div><div className="rm-check-grid">{SYMPTOMS.map((symptom) => <button type="button" key={symptom} className={intake.symptoms.includes(symptom) ? "is-selected" : ""} onClick={() => { setConfirmedIntakeMulti((current) => ({ ...current, symptoms: true })); toggleArray(symptom, intake.symptoms, (symptoms) => invalidateAfterIntake({
        ...intake,
        symptoms,
        swellingLocation: symptoms.includes("肿胀或淤青") ? intake.swellingLocation : "",
        swellingLocations: symptoms.includes("肿胀或淤青") ? intake.swellingLocations : [],
        swellingLocationConfirmed: symptoms.includes("肿胀或淤青") ? intake.swellingLocationConfirmed : false,
        tendernessLocation: symptoms.includes("按压痛") ? intake.tendernessLocation : "",
        tendernessLocations: symptoms.includes("按压痛") ? intake.tendernessLocations : [],
        tendernessLocationConfirmed: symptoms.includes("按压痛") ? intake.tendernessLocationConfirmed : false,
        stabbingPalpation: intake.symptomType === "刺痛" || symptoms.includes("按压痛") || activeProvocationTypes.includes("按压") ? intake.stabbingPalpation : "",
      })); }}><i>{intake.symptoms.includes(symptom) ? "✓" : ""}</i>{symptom}</button>)}<button type="button" className={confirmedIntakeMulti.symptoms && !intake.symptoms.length ? "is-selected" : ""} onClick={() => { setConfirmedIntakeMulti((current) => ({ ...current, symptoms: true })); invalidateAfterIntake({ ...intake, symptoms: [], swellingLocation: "", swellingLocations: [], swellingLocationConfirmed: false, tendernessLocation: "", tendernessLocations: [], tendernessLocationConfirmed: false, stabbingPalpation: intake.symptomType === "刺痛" || activeProvocationTypes.includes("按压") ? intake.stabbingPalpation : "" }); }}><i>{confirmedIntakeMulti.symptoms && !intake.symptoms.length ? "✓" : ""}</i>没有以上情况</button></div></div> : null}

      {(intake.symptoms.includes("肿胀或淤青") || hasTenderness || hasSensorySymptoms) && showIntakeQuestion("肿胀位置", "按压痛位置", "麻电范围") ? <div className="rm-location-detail-atlas">
        {intake.symptoms.includes("肿胀或淤青") && (showAllIntakeFields || nextMissingField === "肿胀位置") ? <>
          <LowerLimbLocationPicker
            mode="swelling"
            value={intake.swellingLocations}
            initialRegionId={intake.regionId}
            initialSide={intake.side}
            initialLocation={intake.swellingLocation || intake.location}
            onChange={(swellingLocations) => invalidateAfterIntake({ ...intake, swellingLocations, swellingLocation: locationSelectionsLabel(swellingLocations), swellingLocationConfirmed: Boolean(swellingLocations.length) })}
          />
          <MarkingSideHint complaintSide={intake.side} markedSides={intake.swellingLocations.map((item) => item.side)} onClear={() => { const kept = removeMarksConflictingWithComplaintSide(intake.side, intake.swellingLocations); invalidateAfterIntake({ ...intake, swellingLocations: kept, swellingLocation: locationSelectionsLabel(kept), swellingLocationConfirmed: Boolean(kept.length) }); }} />
          {!intake.swellingLocations.length ? <button type="button" className="rm-location-unknown" onClick={() => invalidateAfterIntake({ ...intake, swellingLocation: "说不清", swellingLocations: [], swellingLocationConfirmed: true })}>暂时说不清位置</button> : null}
        </> : null}
        {hasTenderness && (showAllIntakeFields || nextMissingField === "按压痛位置") ? <>
          <LowerLimbLocationPicker
            mode="tenderness"
            value={intake.tendernessLocations}
            initialRegionId={intake.regionId}
            initialSide={intake.side}
            initialLocation={intake.tendernessLocation || intake.location}
            onChange={(tendernessLocations) => invalidateAfterIntake({ ...intake, tendernessLocations, tendernessLocation: locationSelectionsLabel(tendernessLocations), tendernessLocationConfirmed: Boolean(tendernessLocations.length) })}
          />
          <MarkingSideHint complaintSide={intake.side} markedSides={intake.tendernessLocations.map((item) => item.side)} noun="按压痛位置" onClear={() => { const kept = removeMarksConflictingWithComplaintSide(intake.side, intake.tendernessLocations); invalidateAfterIntake({ ...intake, tendernessLocations: kept, tendernessLocation: locationSelectionsLabel(kept), tendernessLocationConfirmed: Boolean(kept.length) }); }} />
          {!intake.tendernessLocations.length ? <button type="button" className="rm-location-unknown" onClick={() => invalidateAfterIntake({ ...intake, tendernessLocation: "说不清", tendernessLocations: [], tendernessLocationConfirmed: true })}>暂时说不清位置</button> : null}
        </> : null}
        {hasSensorySymptoms && (showAllIntakeFields || nextMissingField === "麻电范围") ? <>
          <LowerLimbLocationPicker
            mode="sensory"
            value={intake.sensoryLocations}
            initialRegionId={intake.regionId}
            initialSide={intake.side}
            initialLocation={intake.sensoryLocation || intake.location}
            onChange={(sensoryLocations) => invalidateAfterIntake({ ...intake, sensoryLocations, sensoryLocation: locationSelectionsLabel(sensoryLocations), sensoryLocationConfirmed: Boolean(sensoryLocations.length) })}
          />
          <MarkingSideHint complaintSide={intake.side} markedSides={intake.sensoryLocations.map((item) => item.side)} noun="麻电范围" onClear={() => { const kept = removeMarksConflictingWithComplaintSide(intake.side, intake.sensoryLocations); invalidateAfterIntake({ ...intake, sensoryLocations: kept, sensoryLocation: locationSelectionsLabel(kept), sensoryLocationConfirmed: Boolean(kept.length) }); }} />
          {!intake.sensoryLocations.length ? <button type="button" className="rm-location-unknown" onClick={() => invalidateAfterIntake({ ...intake, sensoryLocation: "说不清", sensoryLocations: [], sensoryLocationConfirmed: true })}>暂时说不清范围</button> : null}
        </> : null}
      </div> : null}

      {showAllIntakeFields ? <div className="rm-form-block rm-prior-care"><div className="rm-label"><span>之前做过哪些处理？</span><b>选填</b></div><div className="rm-check-grid">{PRIOR_CARE_OPTIONS.map((item) => <button type="button" key={item} className={(intake.priorCare ?? []).includes(item) ? "is-selected" : ""} onClick={() => {
        const current = intake.priorCare ?? [];
        if (item === "都没有/没处理过") {
          invalidateAfterIntake({ ...intake, priorCare: current.includes(item) ? [] : [item] });
        } else {
          const withoutNone = current.filter((entry) => entry !== "都没有/没处理过");
          toggleArray(item, withoutNone, (priorCare) => invalidateAfterIntake({ ...intake, priorCare }));
        }
      }}><i>{(intake.priorCare ?? []).includes(item) ? "✓" : ""}</i>{item}</button>)}</div></div> : null}

      {showIntakeQuestion("恢复目标") ? <div className="rm-form-block"><div {...fieldLabel("恢复目标")}><span>你希望最后恢复到什么程度？</span></div><div className="rm-goals">{GOALS.map((goal) => <button type="button" key={goal.level} className={intake.goal === goal.level ? "is-selected" : ""} onClick={() => invalidateAfterIntake({ ...intake, goal: goal.level })}><i>{goal.level}</i><span><strong>{goal.title}</strong><small>{goal.short}</small></span></button>)}</div></div> : null}

      {selfNeuralReferral ? <section className="rm-route-note is-waiting"><span>建议先线下确认</span><h2>出现麻、电或感觉变化</h2><p>这种情况不适合自己练，也不建议自己松神经。不必补完其余问题，可以直接保存退出，由专业人员检查感觉范围和力量变化。</p><button type="button" onClick={() => saveRecord("待医学评估")}>保存本次信息</button></section> : null}
      {stabbingEarlyReferral ? <section className="rm-route-note is-waiting"><span>建议先线下确认</span><h2>不活动时也会刺痛</h2><p>先确认局部刺激、外伤或其他需要医学处理的问题。不必补完其余问题，可以直接保存退出。</p><button type="button" onClick={() => saveRecord("待医学评估")}>保存本次信息</button></section> : null}
      {!unsupportedDescriptionRegion && !selfNeuralReferral && !stabbingEarlyReferral && !vascularDescriptionSignal ? <div className="rm-page-actions rm-intake-actions"><span>{keyConfirmationReady ? "症状信息已经够用了" : "还需补充："}{!keyConfirmationReady ? intakeMissingFields.slice(0, 6).map((label) => <button key={label} type="button" className="rm-missing-jump" onClick={() => document.getElementById(`field-${label}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>{label}</button>) : null}{!keyConfirmationReady && intakeMissingFields.length > 6 ? `等 ${intakeMissingFields.length} 项` : ""}</span>{keyConfirmationReady ? <button type="button" className="rm-primary" onClick={enterKeyConfirmation}>进入关键确认</button> : null}</div> : null}
    </>}
  </section>;
}
