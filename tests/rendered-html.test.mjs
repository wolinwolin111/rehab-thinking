import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

const SIX_STEPS = ["症状信息", "关键确认", "评估检查", "处理复测", "训练居家", "康复总结"];

const coreSource = await readFile(new URL("../app/build-trial-targets-core.ts", import.meta.url), "utf8");

const NINE_REGIONS = [
  ["neck", "颈部"],
  ["shoulder", "肩关节与肩胛"],
  ["thoracic-rib", "胸椎与肋骨"],
  ["elbow", "肘关节"],
  ["wrist-hand", "腕与手"],
  ["lumbar-pelvis", "腰椎与骨盆"],
  ["hip-thigh", "髋关节与大腿"],
  ["knee", "膝关节"],
  ["ankle-foot", "踝关节与足"],
];

test("server-renders the complete RehabMind six-step workflow", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>RehabMind｜运动康复思路工作台<\/title>/i);
  for (const step of SIX_STEPS) assert.match(html, new RegExp(step));
  assert.match(html, /症状信息收集/);
  assert.match(html, /先说说哪里不舒服/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("ships a complete nine-region assessment and intervention library", async () => {
  const content = await readFile(new URL("../app/full-demo-content.ts", import.meta.url), "utf8");

  assert.match(content, /export const FULL_REGIONS/);
  assert.match(content, /export type FullRegionId/);
  for (const [id, name] of NINE_REGIONS) {
    assert.match(content, new RegExp(`id:\\s*"${id}"`));
    assert.match(content, new RegExp(`name:\\s*"${name}"`));
  }

  for (const capability of [
    "directions",
    "strengths",
    "functions",
    "specialTests",
    "candidateGroups",
    "mobilityInterventions",
    "exercises",
    "direction",
    "strength",
    "function",
    "special-test",
    "self",
    "coach",
    "therapist",
  ]) {
    assert.match(content, new RegExp(capability));
  }
  assert.match(content, /走路与患侧承重/);
  assert.match(content, /candidate\("ankle-lateral-swelling", "肿胀管理"/);
  assert.match(content, /当天晚些时候或第二天再比较/);
  assert.match(content, /retestIds/);
  assert.match(content, /siteLabel/);
  assert.match(content, /targetLabel/);
  assert.match(content, /actionLabel/);
  assert.match(content, /ankle-rom-calf-release/);
  assert.match(content, /ankle-rom-anterior-release/);
  assert.match(content, /ankle-rom-lateral-release/);
  assert.match(content, /ankle-rom-medial-release/);
  assert.match(content, /背屈主动控制训练/);
  assert.match(content, /跖屈主动控制训练/);
  assert.match(content, /内翻主动控制训练/);
  assert.match(content, /外翻主动控制训练/);
  assert.match(content, /根据受限方向做踝关节松动/);
  assert.doesNotMatch(content, /根据剩余方向选择距小腿关节/);
});

test("keeps NRS history, gated steps, local records and repeat-rehab paths", async () => {
  const [demoComponent, page, layout, styles, content, locationPicker] = await Promise.all([
    readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/complete-demo.css", import.meta.url), "utf8"),
    readFile(new URL("../app/full-demo-content.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lower-limb-location-picker.tsx", import.meta.url), "utf8"),
  ]);
  const demo = `${demoComponent}\n${coreSource}`;

  assert.match(page, /rehabmind-complete-demo/);
  assert.match(page, /<RehabMindCompleteDemo\s*\/>/);
  assert.match(layout, /RehabMind｜运动康复思路工作台/);
  assert.match(demo, /const STEPS = \["症状信息", "关键确认", "评估检查", "处理复测", "训练居家", "康复总结"\]/);
  assert.match(demo, /const PILOT_REGION_IDS = \["thigh-local", "knee", "calf-local", "ankle-foot"\] as const satisfies readonly FullRegionId\[\]/);
  assert.match(demo, /<LowerLimbLocationPicker/);
  assert.match(demo, /bodyLocations: LowerLimbLocationSelection\[\]/);
  assert.match(demo, /locationConfirmed/);
  assert.match(demo, /swellingLocations: LowerLimbLocationSelection\[\]/);
  assert.match(demo, /tendernessLocations: LowerLimbLocationSelection\[\]/);
  assert.match(demo, /mode="swelling"/);
  assert.match(demo, /mode="tenderness"/);
  assert.match(demo, /这个动作能做完吗/);
  assert.match(demo, /做的时候稳不稳/);
  assert.match(demo, /做的时候会不会不舒服/);
  assert.match(demo, /相关肌肉紧张度检查/);
  assert.match(demo, /这些区域只统一检查一次/);
  assert.match(demo, /updateAssessment\(SHARED_TENSION_ASSESSMENT_ID, \(latestRecord\) => \{/);
  assert.match(demo, /return \{ tensionChecked: true, tensionLocations: next \}/);
  assert.match(demo, /急性损伤先轻柔查看活动范围/);
  assert.match(demo, /primaryRetestMotionIdsForRegion/);
  assert.match(demo, /返回刚才的处理/);
  assert.match(demo, /buildProblemLedger/);
  assert.doesNotMatch(demo, /"thigh-front-length":\s*"thigh-front-strength"/);
  assert.match(demo, /不要按骨头、关节缝或明显肿胀中心/);
  assert.match(demo, /这是平时困扰你的那种感觉吗/);
  assert.match(demo, /familiarSymptom/);
  assert.match(demo, /mode="assessment"/);
  assert.match(demo, /professional mode="swelling"/);
  assert.match(demo, /rm-retest-checklist-header/);
  assert.match(demo, /rm-retest-field-title/);
  assert.match(styles, /\.rm-batch-range-list\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(styles, /\.rm-batch-range-list article\s*\{[^}]*width:\s*100%/s);
  assert.match(demo, /discomfortLocations/);
  assert.match(demo, /retestLabel/);
  assert.match(demo, /const actionPriority/);
  assert.match(locationPicker, /大腿/);
  assert.match(locationPicker, /professional\?: boolean/);
  assert.match(locationPicker, /rm-atlas-view-tabs/);
  assert.match(locationPicker, /is-single/);
  assert.match(locationPicker, /<image href=\{panel\.asset\}/);
  assert.match(locationPicker, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(locationPicker, /translate\(\$\{panel\.mirrorWidth/);
  assert.match(locationPicker, /膝盖/);
  assert.match(locationPicker, /小腿/);
  assert.match(locationPicker, /脚踝/);
  assert.match(locationPicker, /足部/);
  assert.match(locationPicker, /哪里肿胀或有淤青/);
  assert.match(locationPicker, /轻按哪里会痛/);
  assert.match(locationPicker, /最多标记/);
  assert.match(locationPicker, /compact/);
  assert.match(locationPicker, /allowedAreaIds/);
  assert.doesNotMatch(locationPicker, /描述和点击的位置不一致/);
  assert.match(locationPicker, /骨盆、臀部、腹股沟和髋关节暂未开放/);

  // NRS-like 0-10 collection is explicit, while repeat conditions appear only during retesting.
  assert.match(demo, /type="range"/);
  assert.match(demo, /min="0"/);
  assert.match(demo, /max="10"/);
  assert.match(demo, /baselineScore/);
  assert.match(demo, /postScore/);
  assert.match(demo, /followupScore/);
  assert.match(demo, /active/);
  assert.match(demo, /passive/);
  assert.match(demo, /同一个动作/);
  assert.match(demo, /同样条件/);
  assert.match(demo, /用同一台阶、同一侧先下，再做一次/);
  assert.doesNotMatch(demo, /固定复测条件/);
  assert.match(demo, /baselineScoreConfirmed/);
  assert.match(demo, /description: ""/);
  assert.match(demo, /regionId: ""/);
  assert.match(demo, /location: ""/);
  assert.match(demo, /swellingLocation: ""/);
  assert.match(demo, /tendernessLocation: ""/);
  assert.match(demo, /provocationTypes: \[\]/);
  assert.match(demo, /forceDirection: ""/);
  assert.match(demo, /sensoryLocation: ""/);
  assert.match(demo, /PROVOCATION_TYPES/);
  assert.match(demo, /什么情况下最容易出现/);
  assert.match(demo, /具体是哪个动作/);
  assert.match(demo, /customAction/);
  assert.match(demo, /reportedActionOptions/);
  assert.match(demo, /mode="sensory"/);
  assert.match(demo, /forceDirectionOptions/);
  assert.match(demo, /inferForceDirection/);
  assert.match(demo, /forceDirectionTags/);
  assert.match(demo, /type ChiefActionAnalysis/);
  assert.match(demo, /analyzeChiefAction/);
  assert.match(demo, /chiefActionSource/);
  assert.match(demo, /下楼梯/);
  assert.match(demo, /单腿承重、髋膝踝减速控制/);
  assert.match(demo, /主诉动作/);
  assert.match(demo, /已收集信息/);
  assert.match(demo, /≡ 全部信息/);
  assert.match(demo, /用力或对抗阻力/);
  assert.match(demo, /急性崴脚后，是否建议优先拍片/);
  assert.match(demo, /directionIsRelevant/);
  assert.match(demo, /ankle-great-toe-extension/);
  assert.match(demo, /resultFromScore/);
  assert.doesNotMatch(demo, /根据分数变化/);
  assert.match(demo, /评估结果/);
  assert.match(demo, /candidateAction/);
  assert.match(demo, /candidateTreatmentName/);
  assert.match(demo, /candidate\.type === "muscle"[\s\S]*controlPlansForMotions/);
  assert.match(demo, /motionComparisonMode/);
  assert.match(demo, /type UserRole/);
  assert.match(demo, /type ExamSetup/);
  assert.match(demo, /type SpineAssessmentMode/);
  assert.match(demo, /这次由谁完成检查/);
  assert.match(demo, /这次怎样完成检查/);
  assert.match(demo, /自己跟随提示检查/);
  assert.match(demo, /我在给别人检查/);
  assert.match(demo, /只记录主动活动/);
  assert.match(demo, /按参考角度判断/);
  assert.match(demo, /我会规范测量且有工具/);
  assert.match(demo, /activeMotionRangeOptions/);
  assert.match(demo, /activeMotionRangeQuestion/);
  assert.match(demo, /被动活动范围怎么样/);
  assert.match(demo, /被动活动时有没有不适/);
  assert.match(demo, /motionNeedsPassive/);
  assert.match(demo, /motion-assessment-core/);
  assert.match(demo, /canAssessPassive/);
  assert.match(demo, /candidate.type !== "joint"/);
  assert.match(demo, /有专业人员协助时，可以补充被动活动检查/);
  assert.match(demo, /与另一个方向相比怎么样/);
  assert.match(demo, /这个动作完成得怎么样/);
  assert.match(demo, /刚才活动或发力时，有没有不适/);
  assert.match(demo, /同一个动作：看主动保持/);
  assert.match(demo, /膝后能不能像另一边一样压向床面/);
  assert.match(demo, /把同一条薄毛巾先后放在两侧膝后/);
  assert.match(demo, /再将整条腿抬离床面约10厘米/);
  assert.match(demo, /保持稳定｜抬起后膝盖仍笔直/);
  assert.match(demo, /控制偏弱｜膝盖弯曲、抖动或下落/);
  assert.match(demo, /同一个动作：检查抗阻力量/);
  assert.match(demo, /不需要别人压，也不需要自己用手加阻力/);
  assert.match(demo, /由检查者沿刚才动作的反方向逐渐施加轻阻力/);
  assert.match(demo, /是什么让你停下来/);
  assert.match(demo, /因疼痛或不适未完成，真实活动范围暂时无法判断/);
  assert.match(demo, /角度偏大/);
  assert.match(demo, /记录主动角度/);
  assert.match(demo, /assessment-record-complete-core/);
  assert.match(demo, /inferSymptomSide/);
  assert.match(demo, /颈肩交界/);
  assert.match(demo, /与另一方向接近/);
  assert.match(demo, /接近平时范围/);
  assert.match(demo, /rangeRetestOptions/);
  assert.match(demo, /与对侧相比，患侧的/);
  assert.match(demo, /患侧偏小｜活动范围受限/);
  assert.match(demo, /有所改善｜幅度增加但仍小于/);
  assert.match(demo, /pendingKneeAssessmentCheck/);
  assert.match(demo, /还不能结束本次评估/);
  assert.match(demo, /finishRangeBatch/);
  assert.match(demo, /movementResponses/);
  assert.match(demo, /部分改善｜主动有改善，被动仍小于/);
  assert.match(demo, /没有明显变化/);
  assert.doesNotMatch(demo, /继续下一组相关肌肉/);
  assert.match(demo, /有所改善｜幅度增加但仍小于/);
  assert.match(demo, /nextRangeCandidateType\(movementResponse, activeRangeAllowsPassive && canMobilizeJoint\)/);
  assert.match(demo, /finishTrial\("partial", false, nextCandidateType\)/);
  assert.match(styles, /border-radius: 999px/);
  assert.match(styles, /cursor: grab/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(demo, /<span>当前结果<\/span>/);
  assert.match(demo, /!\["swelling", "control"\]\.includes\(candidate\.type\)/);
  assert.doesNotMatch(demo, /提示：速度、幅度、负重和扶持方式/);
  assert.match(demo, /本次康复总结/);
  assert.match(demo, /rm-summary-dashboard/);
  assert.match(demo, /评估结果/);
  assert.match(demo, /处理记录/);
  assert.match(demo, /居家训练/);
  assert.match(demo, /下次复查/);
  assert.match(demo, /title="针对性处理"/);
  assert.match(demo, /TreatmentActionCard/);
  assert.match(demo, /处理部位/);
  assert.match(demo, /现在做/);
  assert.match(demo, /怎么做/);
  assert.match(demo, /处理完成，复测活动范围/);
  assert.doesNotMatch(demo, /执行内容/);
  assert.doesNotMatch(demo, /处理后复测/);
  assert.doesNotMatch(demo, /candidateObservation/);
  assert.doesNotMatch(demo, /rm-treatment-instructions/);
  assert.match(demo, /发力不适/);
  assert.match(demo, /发力时有多不舒服/);
  assert.match(demo, /record\.discomfortLocation\?\.trim\(\)/);
  assert.match(demo, /strengthSymptomDetail/);
  assert.match(demo, /result\.discomfortLocation, result\.discomfortType/);
  assert.match(demo, /supportTags/);
  assert.match(demo, /查看评估记录/);
  assert.match(demo, /修改评估答案/);
  assert.match(demo, /只有评估结果真的改变/);
  assert.doesNotMatch(demo, /与健侧比较相关方向/);
  assert.doesNotMatch(demo, /当前路线/);
  assert.match(demo, /adaptExerciseForCurrentStage/);
  assert.match(demo, /const targetCount = exerciseStage <= 1 \? 2 : exerciseStage === 2 \? 3 : intake\.goal >= 3 \|\| findings\.length >= 4 \? 4 : 3/);
  assert.match(demo, /STAGE_TRANSITIONS/);
  assert.match(demo, /症状信息收集完毕/);
  assert.match(demo, /评估检查完成/);
  assert.match(demo, /处理复测完成/);
  assert.match(demo, /本次康复完成/);
  assert.match(demo, /StageTransition/);
  assert.match(demo, /continueStageTransition/);

  // A follow-up must show previous values before asking for the new value.
  assert.match(demo, /followupScoreHistory/);
  assert.match(demo, /之前的评分参考/);
  assert.match(demo, /初次评估/);
  assert.match(demo, /第\$\{index\}次康复结束/);
  assert.match(demo, /本次开始/);
  assert.match(demo, /本次训练前/);
  assert.match(demo, /现在做主诉动作，有多不舒服/);
  assert.match(demo, /followupReadyToRetest/);
  assert.match(demo, /followupMovementResponses/);
  assert.match(demo, /followupCandidateNeedsWork/);
  assert.match(demo, /followupRetestIds/);
  assert.match(demo, /rangeOutcomes/);
  assert.match(demo, /FRIENDLY_ASSESSMENT_COPY/);
  assert.match(demo, /手臂从前面举过头/);
  assert.match(demo, /站立弯腰/);
  assert.match(demo, /膝盖伸直/);
  assert.match(demo, /做的时候留意/);
  assert.match(demo, /chiefMotionDirectionId/);
  assert.match(demo, /"低头", "仰头", "弯腰", "后仰"/);
  assert.match(demo, /anyMotionIdFromFinding/);
  assert.match(demo, /merged:chief:/);
  assert.match(demo, /主诉动作/);
  assert.doesNotMatch(demo, /复测同一个动作/);
  assert.doesNotMatch(demo, /这个动作也在活动度检查里，只做一次/);
  assert.doesNotMatch(demo, /同时记录活动范围/);
  assert.doesNotMatch(demo, /刚才的动作不用重复/);
  assert.match(demo, /const displayedValue = draft/);
  assert.match(demo, /movementDiscomforts/);
  assert.match(demo, /movementScoreConfirmed/);
  assert.match(demo, /活动范围怎么样？/);
  assert.match(demo, /现在的不适程度/);
  assert.match(demo, /做这个动作时有没有出现新的不适？/);
  assert.doesNotMatch(demo, /做这个动作时还有没有不适？/);
  assert.match(demo, /motionWasSymptomatic/);
  assert.match(demo, /chiefFullyResolved/);
  assert.match(demo, /hasUnresolvedSupportProblem/);
  assert.match(demo, /全部区域共用/);
  assert.match(coreSource, /painfulStrengthTargets/);
  assert.match(demo, /strengthSymptomResolved/);
  assert.match(demo, /targetScoreBeforeRetest/);
  assert.match(demo, /现在的发力不适程度/);
  assert.match(demo, /directionAllowsPassive/);
  assert.doesNotMatch(demo, /chiefScore === 0 && chiefDirection === directionId/);
  assert.doesNotMatch(demo, /resolvedChiefDirection === directionId/);
  assert.match(demo, /主诉分数已经很低/);
  assert.match(demo, /仍会快速复查相关活动范围，并继续上次有效的处理/);
  assert.match(demo, /retestShortTitle/);
  assert.match(demo, /先复查，再决定今天做什么/);
  assert.match(demo, /没有明确处理依据时不新增肌肉处理/);
  assert.doesNotMatch(demo, /本次不增加新的肌肉处理/);
  assert.match(demo, /candidateTreatmentKey/);
  assert.match(demo, /candidateMuscleFocus/);
  assert.match(demo, /candidateDedupKey/);
  assert.match(demo, /normalizePilotMuscleRegion/);
  assert.match(demo, /calf-anterior/);
  assert.match(demo, /calf-lateral/);
  assert.match(demo, /candidateTreatmentKey[\s\S]*candidateDedupKey\(candidate\)/);
  assert.match(demo, /chiefScoreCapturedInRange/);
  assert.match(demo, /chiefScoreCapturedInRange[\s\S]*recordedChiefScore/);
  assert.match(demo, /activeTarget\.id === "target:chief" \|\| activeTarget\.id === "target:local-limb"/);
  assert.match(demo, /hasPendingTreatmentAfterCurrent/);
  assert.match(coreSource, /target:local-limb-joint/);
  assert.match(coreSource, /locallyLimitedPassiveFindings/);
  assert.match(demo, /nextTargetId/);
  assert.match(demo, /chiefRetested: chiefWasActuallyRetested/);
  assert.match(demo, /复诊只能沿用上次实际有效的处理方向/);
  assert.doesNotMatch(demo, /retainedIds\.has\(candidate\.id\) \|\| candidateMuscleUnits/);
  assert.match(demo, /candidate-treatment-core/);
  assert.match(demo, /treatmentCanCarryAcrossProblems/);
  assert.match(demo, /definedAssessmentFields/);
  assert.doesNotMatch(demo, /const hasIndependentTreatmentProblem/);
  assert.match(demo, /remainingTargetNames/);
  assert.match(demo, /followupCurrentRoadmapItem/);
  assert.match(content, /knee-extension-anterior-muscles/);
  assert.match(demo, /priorTreatmentRecord/);
  assert.doesNotMatch(demo, /前面已处理过/);
  assert.doesNotMatch(demo, /已沿用主诉记录/);
  assert.match(demo, /const showingRetest = readyToRetest \|\| carryoverOnly/);
  assert.match(demo, /retestOnly/);
  assert.match(demo, /activeCandidateGroup/);
  assert.match(demo, /activeGroupEndIndex/);
  assert.match(demo, /RESIDUAL_REVIEW_ID/);
  assert.match(demo, /isChiefTreatmentPhase/);
  assert.match(demo, /isResidualReviewStep/);
  assert.match(coreSource, /sameDirectionMotionTarget/);
  assert.match(demo, /remainingMotionTargets/);
  assert.match(coreSource, /motionTargets\.filter\(\(target\) => target !== sameDirectionMotionTarget\)/);
  assert.match(demo, /result === "better" && chiefFullyResolved/);
  assert.doesNotMatch(demo, /复查之前发现的问题/);
  assert.match(demo, /处理完成，复测原来的动作/);
  assert.match(demo, /处理完成，复测这个动作/);
  assert.match(demo, /const activeGroupEndIndex = candidateIndex/);
  assert.match(demo, /localizeTreatmentSite/);
  assert.doesNotMatch(demo, /function ProblemStrip/);
  assert.match(demo, /effectiveTreatmentCandidates/);
  assert.match(demo, /\["better", "partial"\]\.includes\(record\.result\)/);
  assert.match(demo, /!\["swelling", "control"\]\.includes\(candidate\.type\)/);
  assert.match(demo, /currentSessionRecords\.at\(-1\)\?\.afterScore \?\? followupScore/);
  assert.match(demo, /effectiveFocusLabels/);
  assert.match(demo, /本次改善相关内容/);
  assert.match(demo, /本轮做完后主诉变轻/);
  assert.match(demo, /髌骨向上滑动/);
  assert.match(demo, /knee-patella-superior[\s\S]*髌骨向上滑动幅度/);
  assert.match(demo, /candidate-treatment-core/);
  assert.match(demo, /rm-treatment-unit-followup is-patella/);
  assert.match(demo, /patella-mobility-unit/);
  assert.match(demo, /target:patella-mobility-unit/);
  assert.match(demo, /limitedPatellaDirections/);
  assert.match(demo, /patellaMobilityUnitTitle/);
  assert.match(demo, /const homeRelaxationTargets = useMemo/);
  assert.match(demo, /只安排本次检查紧张、处理有效或训练涉及的肌肉区域/);
  assert.match(demo, /special-test-trigger-core/);
  assert.match(styles, /\.rm-effective-home-focus/);
  assert.match(styles, /\.rm-home-relaxation/);
  assert.match(styles, /\.rm-shell\.is-intake-step/);
  assert.match(styles, /\.rm-two-columns\.is-guided-single/);
  assert.match(demo, /pairedStrengthId/);
  assert.match(demo, /同一个动作：看主动保持/);
  assert.match(demo, /pairedStrengthLocations/);
  assert.match(demo, /pairedStrengthUnableReason/);
  assert.match(demo, /strengthUnableReason/);
  assert.match(demo, /先这样试/);
  assert.match(demo, /firstAssessmentGap/);
  assert.match(demo, /openAssessmentItem/);
  assert.match(demo, /shouldRetestChiefNow/);
  assert.match(styles, /\.rm-problem-strip article\.is-pending/);
  assert.match(demo, /intake\.examSetup !== "professional-other"/);
  assert.match(demo, /invalidateAfterIntake\(\(current\) => \(\{ \.\.\.current, capabilities:/);
  assert.match(demo, /const intakeRef = useRef<IntakeState>\(DEFAULT_INTAKE\)/);
  assert.match(content, /REGIONAL_MOBILITY_CLUSTERS/);
  assert.match(content, /SPINAL_CONTROL_PLANS/);
  assert.match(content, /颈部中立位深层稳定训练/);
  assert.match(content, /胸廓呼吸与躯干稳定训练/);
  assert.match(content, /腰腹深层稳定训练/);
  assert.match(content, /不把复测动作当成训练反复练习/);
  assert.match(content, /不为了追求角度反复处理/);
  assert.match(content, /腰大肌、髂肌、股直肌与阔筋膜张肌/);
  assert.match(content, /exercise\("lumbar-hip-hinge", "站立屈髋"/);
  assert.match(content, /exercise\("knee-standing-hip-flexion", "站立屈髋"/);
  assert.match(content, /exercise\("hip-sit-stand-hinge", "站立屈髋与坐站"/);
  assert.doesNotMatch(content, /"臀桥或死虫"/);
  assert.doesNotMatch(content, /"臀桥与双脚提踵"/);
  assert.match(content, /withRegionalMobility\(knee/);
  assert.doesNotMatch(demo, /选择现在要做的处理/);

  // Later workflow stages stay locked until the required prior work is complete.
  for (const gate of [
    "intakeComplete",
    "canContinueSafety",
    "assessmentComplete",
    "treatmentComplete",
    "trainingComplete",
    "maxUnlocked",
  ]) {
    assert.match(demo, new RegExp(gate));
  }
  assert.match(demo, /index <= maxUnlocked/);
  assert.match(demo, /disabled=\{!available\}/);
  assert.match(demo, /!assessmentFlowComplete \|\| assessmentNeedsReferral/);
  assert.match(demo, /const targetFinished = finishTarget\s*\|\| result === "worse"/);
  assert.match(demo, /const nextIndex = result === "worse" \? -1/);
  assert.match(demo, /const hasChiefAction = chiefScoreComparable && chiefWasRecorded/);
  assert.match(demo, /followupNeedsTreatmentFinalRetest/);
  assert.match(demo, /followupScoreConfirmed\?: boolean/);
  assert.match(demo, /followupScoreConfirmed: false/);

  // Records remain on the current device and seed the next rehabilitation visit.
  assert.match(demo, /localStorage\.getItem\("rehabmind-complete-demo-records"\)/);
  assert.match(demo, /localStorage\.setItem\("rehabmind-complete-demo-records"/);
  assert.match(demo, /candidateIsAvailable/);
  assert.match(demo, /candidate-safety-core/);
  assert.match(demo, /stabbingSpread/);
  assert.match(demo, /普通自助路径不安排神经松动/);
  assert.match(demo, /FUNCTION_COMPENSATIONS/);
  assert.match(demo, /const ranked = rankPilotAssessmentIds/);
  assert.match(content, /knee-patella-tenderness-self/);

  // Guided intake interaction and every D1-D7 consumption rule from the optimization brief.
  assert.doesNotMatch(demo, /const SYMPTOMS = \[[^\]]*动作会不适/);
  assert.doesNotMatch(demo, /parsedProvokingAction \? \["动作会不适"\]/);
  assert.match(demo, /guidedIntakePath/);
  assert.match(demo, /confirmedIntakeMulti/);
  assert.doesNotMatch(demo, /\}, 700\)/);
  assert.match(demo, /← 上一步/);
  assert.match(demo, /这一项已完成/);
  assert.match(demo, /选好后直接点下一步/);
  assert.doesNotMatch(demo, /确认这些选项/);
  assert.doesNotMatch(demo, /这些位置对，继续/);
  assert.match(demo, /没有以上情况/);
  assert.match(demo, /disabled=\{!guidedQuestionReady\}/);
  assert.match(demo, /rm-intake-progress/);
  assert.match(demo, /jumpToIntakeQuestion/);
  assert.match(demo, /keyConfirmationReady && !unsupportedDescriptionRegion/);
  assert.match(demo, /intake\.symptoms\.includes\("力量不足"\)/);
  assert.match(demo, /prioritiseStrengthControl/);
  assert.match(demo, /candidateAllowedInSharpPath/);
  assert.match(demo, /intake\.stabbingPalpation === "sharp"/);
  assert.match(demo, /intake\.symptomType === "刺痛" \|\| intakeHasTenderness/);
  assert.match(demo, /轻按反应/);
  assert.match(demo, /symptomType === "刺痛" \|\| hasTenderness/);
  assert.match(demo, /tender:sharp/);
  assert.match(demo, /structuralImagingSignal/);
  assert.match(demo, /影像提示结构异常/);
  assert.match(demo, /stage:全过程/);
  assert.match(demo, /stage:起始/);
  assert.match(demo, /stage:末端/);
  assert.match(demo, /仅供对比参考/);
  assert.match(demo, /discomfortDecisionTags/);
  assert.match(demo, /assessment-neural/);
  assert.match(demo, /assessment-sharp/);
  assert.match(demo, /painfulFunctionTargets/);
  assert.match(demo, /weakStrengthProblems/);
  assert.match(demo, /sourceCaseIds/);
  assert.match(content, /functional\("knee-heel-raise"/);
  assert.match(content, /functional\("ankle-squat"/);
  assert.match(demo, /snapshot/);
  assert.match(demo, /restoreRecord/);
  assert.match(demo, /补充影像/);
  assert.match(demo, /还没到建议复查时间/);
  assert.match(demo, /提前开始/);
  assert.match(demo, /当天和第二天的反应记录不算新的一次康复/);
  assert.match(demo, /setSessionNumber\(2\)/);
  assert.match(demo, /setFollowupScoreHistory\(\[intake\.baselineScore, sessionEndScore\]\)/);
  assert.match(demo, /displayedMainScore/);
  assert.match(demo, /等待本次复测/);
  assert.match(demo, /latestFollowupRecord/);
});

test("follow-up treatment eligibility uses the latest result for each treatment unit", async () => {
  const source = await readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8");
  assert.match(source, /const latestUnitResults = new Map<string, TrialResult>\(\)/);
  assert.match(source, /latestUnitResults\.set\(unit, record\.result\)/);
  assert.doesNotMatch(source, /const ineffectiveUnits = new Set\(\[\s*\.\.\.trialRecords/);
});

test("the final chief retest depends on new treatment, not problem taxonomy", async () => {
  const source = await readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8");
  assert.match(source, /const chiefNeedsFinalRetest = needsTreatmentFinalChiefRetest\(trialRecords, chiefScoreComparable\)/);
  assert.doesNotMatch(source, /chiefNeedsFinalRetest = chiefScoreComparable && hasIndependentTreatmentProblem/);
});

test("follow-up queue recovery uses treatment identity after a dynamic decision refresh", async () => {
  const source = await readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8");
  assert.match(source, /const completedFollowupKeys = new Set/);
  assert.match(source, /!completedFollowupKeys\.has\(candidateTreatmentKey\(candidate, intake\.side\)\)/);
  assert.doesNotMatch(source, /currentRecords\.length \? undefined : followupCandidates\.find/);
});

test("a new follow-up symptom invalidates the old complaint-derived state", async () => {
  const source = await readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8");
  assert.match(source, /invalidateAfterIntake\(\{\s*\.\.\.DEFAULT_INTAKE,[\s\S]*userRole: intake\.userRole/);
  assert.match(source, /setFollowupScoreHistory\(\[\]\)/);
  assert.doesNotMatch(source, /setIntake\(\(current\) => \(\{ \.\.\.current, parsed: false, description: "" \}\)\)/);
});

test("covers the full-positive, bilateral, no-action and extreme-input pilot rules", async () => {
  const [demoComponent, content, styles, outcome] = await Promise.all([
    readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/full-demo-content.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/complete-demo.css", import.meta.url), "utf8"),
    readFile(new URL("../app/stage-outcome-sections.tsx", import.meta.url), "utf8"),
  ]);
  const demo = `${demoComponent}\n${coreSource}`;

  // Intake fallbacks and typo tolerance.
  assert.match(demo, /说不清 \/ 没有固定动作/);
  assert.match(demo, /漆盖/);
  assert.match(demo, /脚腕/);
  assert.match(demo, /脚脖子/);
  assert.match(demo, /手脖子/);
  assert.match(demo, /歪脚/);
  assert.match(demo, /好几年/);
  assert.match(demo, /昨晚/);
  assert.match(demo, /text\.includes\("疼"\) \|\| text\.includes\("痛"\)/);
  assert.match(demo, /text\.toLowerCase\(\)\.includes\("pain"\)/);
  assert.match(demo, /疼痛，性质说不清/);
  assert.match(demo, /painQualityConfirmed/);
  assert.match(demo, /你更接近哪一种感觉/);
  assert.match(demo, /还是说不清/);
  assert.match(demo, /inferPilotRegions/);
  assert.match(demo, /本版一次只评估一个主要问题/);
  assert.match(demo, /maxSelections=\{3\}/);
  assert.match(demo, /location: bodyLocations\.map\(\(item\) => item\.location\)\.join\("、"\)/);
  assert.match(demo, /showAllIntakeFields/);
  assert.match(demo, /nextMissingField/);
  assert.match(demo, /guidedIntakePath/);
  assert.match(demo, /nextFromPath/);
  assert.match(demo, /reportedActions/);
  assert.match(demo, /actionSelectionConfirmed/);
  assert.match(demo, /没有合适的动作/);
  assert.match(demo, /保留你的原话/);
  assert.match(demo, /选好后直接点下一步/);
  assert.match(demo, /goal: 0/);
  assert.match(demo, /resolveLocationInClause/);
  assert.match(demo, /deniesToeProblem/);
  assert.match(demo, /deniesToeDirection/);
  assert.match(demo, /strengthLocationScore/);
  assert.match(demo, /const scored = region\.candidateGroups\.map/);
  assert.match(demo, /const locationUnclear =/);
  assert.match(demo, /isAcuteTrauma\(intake\) && intake\.goal <= 1/);
  assert.match(demo, /const symptomWords = \["痛", "疼", "不适", "不舒服"/);
  assert.match(demo, /抬脚/);
  assert.match(demo, /踩地/);
  assert.match(demo, /一瘸一拐/);
  assert.match(demo, /unclearProvocation/);
  assert.match(demo, /SYMPTOM_TYPE_GROUPS/);
  assert.match(demo, /没有准确识别位置，请直接在图上选择/);
  assert.match(demo, /PRIOR_CARE_OPTIONS/);
  assert.match(demo, /mentionsBothSymptomSides/);
  assert.match(demo, /如果两侧是同一个问题/);
  assert.match(demo, /inferImagingFromDescription/);
  assert.match(demo, /描述中提到拍片未见骨折，已经带入影像结论/);
  assert.match(demo, /冰敷不作为恢复必做项/);
  assert.doesNotMatch(demo, /建议(?:进行|使用)?冰敷|必须冰敷/);
  assert.match(demo, /发凉或发白/);
  assert.match(demo, /swellingLocation: "说不清"/);
  assert.match(demo, /tendernessLocation: "说不清"/);
  assert.match(demo, /sensoryLocation: "说不清"/);
  assert.match(demo, /setToast\("请先确认本次最想评估的部位"\)/);
  assert.match(demo, /try \{\s*localStorage\.setItem/);
  assert.match(content, /knee-patella-tenderness-self/);

  // Full-positive queue control, chain grouping and midpoint decision.
  assert.match(content, /export const DIRECTION_CHAINS/);
  assert.match(content, /矢状面·前侧链/);
  assert.match(content, /额状面·外侧链/);
  assert.match(coreSource, /chiefCandidates = orderedChiefCandidates\.slice\(0, 3\)/);
  assert.match(coreSource, /matchedChiefCandidateIds/);
  assert.match(coreSource, /matchedChiefCandidateIds\.has\(candidate\.id\) \? 30 : 0/);
  assert.match(demo, /optionalCandidates/);
  assert.match(demo, /可选处理/);
  assert.match(coreSource, /candidateDirectionChain/);
  assert.match(demo, /本轮处理完成，统一复测/);
  assert.match(demo, /本阶段成果/);
  assert.match(demo, /recoveredRangeLabels/);
  assert.match(demo, /improvedRangeLabels/);
  assert.match(demo, /trackObservationLabels/);
  assert.match(demo, /StageOutcomeSections/);
  assert.match(outcome, /rm-stage-outcome-effective/);
  assert.match(outcome, /rm-stage-outcome-range/);
  assert.match(outcome, /rm-stage-outcome-track/);
  assert.match(outcome, /有效处理/);
  assert.match(outcome, /活动范围变化/);
  assert.match(outcome, /后续观察/);
  assert.doesNotMatch(demo, /candidateBriefActivation/);
  assert.match(demo, /treatmentActionVisuals/);
  assert.match(demo, /exerciseActionVisual/);
  assert.doesNotMatch(demo, /松解后做/);
  assert.match(demo, /assessmentRequiredExerciseIds/);
  assert.match(demo, /weakStrengthTags/);
  assert.match(demo, /noImmediateTreatmentResponse/);
  assert.match(demo, /本次试处理没有改变主诉/);
  assert.match(demo, /查看低刺激基础活动/);
  assert.match(demo, /if \(currentStage <= 1\)/);
  assert.match(demo, /每个方向5～8个/);
  assert.match(demo, /本次没有新的即时处理/);
  assert.doesNotMatch(demo, /上次没有可继续的有效处理/);
  assert.match(demo, /复查后继续上次有效处理/);
  assert.match(demo, /仍会快速复查相关活动范围，并继续上次有效的处理/);
  assert.match(demo, /ineffectiveUnits/);
  assert.match(demo, /followupTrainingReadyForRetest/);
  assert.match(demo, /训练结束，再看一次主诉动作/);
  assert.match(demo, /disabled=\{value === "progress" && \["reduce", "review"\]\.includes\(decision\.tone\)\}/);
  assert.match(demo, /candidateMuscleUnits/);
  assert.match(demo, /summarizeTreatmentCoverage/);
  assert.match(demo, /相关处理已经完成/);
  assert.doesNotMatch(demo, /supportProblemCount >= 6/);
  assert.doesNotMatch(demo, /先看前三项处理有没有带来变化/);

  // Assessment summary and bilateral handling.
  assert.match(demo, /先看清问题，再开始处理/);
  assert.match(demo, /你最开始说的/);
  assert.match(demo, /评估结果/);
  assert.match(demo, /评估完成，继续/);
  assert.match(demo, /BILATERAL_OBSERVE/);
  assert.match(demo, /左侧更差/);
  assert.match(demo, /右侧更差/);
  assert.match(demo, /两侧都受限/);
  assert.match(demo, /双侧的疼痛或轻松感有变化吗/);
  assert.match(demo, /两侧处理后症状加重/);
  assert.match(demo, /highIrritabilityReferral/);
  assert.match(demo, /多项检查因明显疼痛无法完成/);
  assert.match(demo, /range-pending/);
  assert.match(coreSource, /当前方向保留/);
  assert.match(demo, /目前的信息不足以安排处理/);
  assert.match(demo, /assessmentGapActionLabel/);
  assert.match(demo, /已定位到需要补充的检查/);
  assert.match(demo, /刚才的处理使症状或活动表现加重/);
  assert.match(demo, /训练后加重，待重新评估/);
  assert.match(demo, /assessmentNeedsReferral/);
  assert.match(demo, /!assessmentFlowComplete \|\| assessmentNeedsReferral/);

  // UX safeguards.
  assert.match(demo, /onInput=\{handleSliderChange\}/);
  assert.match(demo, /setDraftState\(next\);\s*onChange\(nextValue\)/);
  assert.match(demo, /onPointerUp=\{commitDraft\}/);
  assert.match(demo, /onTouchEnd=\{commitDraft\}/);
  assert.match(demo, /拖动后松手即可记录/);
  assert.doesNotMatch(demo, /rm-score-confirm/);
  assert.match(demo, /自动识别/);
  assert.match(demo, /这个动作能做完吗/);
  assert.match(demo, /太轻松/);
  assert.match(demo, /做不了/);
  assert.match(demo, /做不完或不敢继续/);
  assert.match(demo, /训练动作.*后不适更重|做完更不舒服/);
  assert.match(demo, /训练后加重，待重新评估/);
  assert.match(demo, /确认加重后的变化/);
  assert.match(demo, /只复查相关内容/);
  assert.match(demo, /确认复查结果/);
  assert.match(demo, /canExecutePlan/);
  assert.match(demo, /返回补充检查/);
  assert.doesNotMatch(demo, /进入完整评估/);
  assert.match(demo, /!trainingHasWorsened/);
  assert.match(demo, /localNewSourceNeedsChiefRetest/);
  assert.match(demo, /关键完成项/);
  assert.match(demo, /本次组合解决/);
  assert.match(demo, /completedLocalCandidateIds/);
  assert.match(demo, /第一组做完后，选一个最接近的情况/);
  assert.match(demo, /训练完成，整体复测/);
  assert.match(demo, /最后再看一次整体变化/);
  assert.match(demo, /只读回看/);
  assert.match(demo, /肿胀管理/);
  assert.match(demo, /不用在每项处理后反复检查/);
  assert.match(demo, /这次用力时有多不舒服/);
  assert.match(demo, /与健侧比较/);
  assert.doesNotMatch(demo, /接近没受伤的那边|明显小于没受伤的那边/);
  assert.match(content, /和健侧比较力量，留意脚趾有没有使劲代替脚踝发力/);
  assert.doesNotMatch(content, /没受伤的那边/);
  assert.match(demo, /如果是因为疼所以不敢继续/);
  assert.match(demo, /deniesTwist/);
  assert.match(demo, /deniesImpact/);
  assert.match(demo, /candidate-treatment-core/);
  assert.doesNotMatch(demo, /轻柔松解轻柔松解/);
  assert.doesNotMatch(demo, /踝背屈）· 活动度检查/);
  assert.match(demo, /item\.chiefRetested && !item\.reviewOnly/);
  assert.match(demo, /candidateControlMotionIds/);
  assert.match(demo, /candidate-action-core/);
  assert.match(demo, /chiefNeedsFinalRetest/);
  assert.match(demo, /needsTreatmentFinalChiefRetest/);
  assert.match(demo, /batchedResult/);
  assert.match(demo, /chiefStillSymptomatic/);
  assert.match(demo, /chiefImprovedDuringTreatment/);
  assert.match(demo, /item\.chiefRetested && !item\.reviewOnly/);
  assert.match(demo, /chiefWasActuallyRetested/);
  assert.match(demo, /shouldRetestChiefInBatch/);
  assert.match(demo, /本次流程/);
  assert.match(demo, /最后再做一次：/);
  assert.match(styles, /\.rm-assessment-summary/);
  assert.match(styles, /\.rm-treatment-roadmap/);
  assert.match(styles, /\.rm-treatment-final-retest/);
  assert.match(styles, /\.rm-optional-treatment/);
  assert.match(styles, /\.rm-midpoint-decision/);
  assert.match(styles, /\.rm-symptom-type-groups/);
  assert.match(styles, /\.rm-overall-retest-action/);
  assert.match(styles, /\.rm-readonly-banner/);
  assert.match(styles, /\.rm-brief-activation/);
  assert.match(styles, /\.rm-prior-care-note/);
  assert.match(styles, /\.rm-no-response-note/);
  assert.match(styles, /\.rm-training-hold/);
  assert.doesNotMatch(demo, /showIntakeQuestion\("发力方向"\)/);
  assert.match(demo, /发力方向不再作为症状收集中的独立必答题/);
  assert.match(demo, /finding-groups-core/);
  assert.match(demo, /rm-finding-board/);
  assert.match(demo, /rm-aside-finding-groups/);
  assert.match(demo, /selectTreatmentChainCandidates/);
  assert.doesNotMatch(demo, /根据复测结果继续或结束相关处理/);
  assert.match(demo, /consolidateTrialTargetsByTreatment\(baseTrialTargets\.map/);
  assert.doesNotMatch(demo, /remainingRoadmapItems/);
});

test("covers the 2026-08 assessment repair matrix without fallback decisions", async () => {
  const [demoComponent, content] = await Promise.all([
    readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/full-demo-content.ts", import.meta.url), "utf8"),
  ]);
  const demo = `${demoComponent}\n${coreSource}`;

  // No clear provoking action: no fabricated chief target, score delta, or first-group fallback.
  assert.match(demo, /finding\.id !== "chief" \|\| hasClearChiefAction\(intake\)/);
  assert.match(demo, /if \(hasClearChiefAction\(intake\)\)/);
  assert.match(demo, /treatmentEmptyState\.title/);
  assert.match(demo, /noChiefActionAndNoAssessmentProblem/);
  assert.match(demo, /未生成动作评分变化/);
  assert.match(demo, /chiefScoreComparable = hasClearChiefAction\(intake\) && intake\.baselineScoreConfirmed && intake\.side !== "双侧\/中间"/);
  assert.match(demo, /sessionEndScore = chiefScoreComparable/);
  assert.match(demo, /function shouldCollectBaselineScore\(intake: IntakeState\)/);
  assert.match(demo, /baselineScoreApplicable && showIntakeQuestion\("不适分数"\)/);
  assert.match(demo, /!baselineScoreApplicable \|\| intake\.baselineScoreConfirmed/);
  assert.match(demo, /selectingUnknown \? "" : intake\.reproduction/);
  assert.doesNotMatch(demo, /matched\.length \? matched : region\.candidateGroups\.slice\(0, 1\)/);

  // Limited motion requires a completed tension sample and consumes the selected location.
  assert.match(demo, /tensionChecked\?: boolean/);
  assert.match(demo, /tensionLocations\?: string\[\]/);
  assert.match(demo, /needsMuscleTensionCheck/);
  assert.match(demo, /buildMuscleTensionFindings/);
  assert.match(demo, /相关区域只检查一次/);
  assert.match(demo, /不要按骨头、关节缝或明显肿胀中心/);
  assert.match(coreSource, /candidateMatchesTensionLocation/);
  assert.match(coreSource, /tension-muscle:\$\{normalizedRegion\?\.id \?\? location\}/);
  assert.match(coreSource, /retestIds: relatedMotionIds/);
  assert.match(demo, /consolidateTrialTargetsByTreatment/);
  assert.match(coreSource, /在\$\{location\}找到比另一侧更紧、更酸的区域/);
  assert.match(demo, /没有明显差别/);
  assert.match(demo, /温和活动/);

  // Single-side and bilateral wording/results remain separate.
  assert.match(demo, /接近健侧/);
  assert.match(demo, /明显小于健侧/);
  assert.match(demo, /worseSide\?: "左侧" \| "右侧" \| "两侧接近"/);
  assert.match(demo, /两侧都试过后，哪一侧更弱/);
  assert.match(demo, /先处理\{activeTarget\.finding\.side\}/);
  assert.match(demo, /双侧的疼痛或轻松感有变化吗/);
  assert.match(demo, /双侧整体感受已记录/);
  assert.match(demo, /双侧场景不生成单侧式评分对比/);
  assert.match(demo, /先处理\$\{followupWorseSide\}/);
  assert.match(demo, /scoreComparable: chiefScoreComparable/);

  // Function completion, control and discomfort are recorded independently; weak strength is handed to training.
  assert.match(demo, /functionCompletion\?: FunctionCompletion/);
  assert.match(demo, /functionControl\?: FunctionControl/);
  assert.match(demo, /functionDiscomfort\?: YesNo/);
  assert.match(demo, /functionUnableReason\?: FunctionUnableReason/);
  assert.match(demo, /主要是什么原因停下来/);
  assert.match(demo, /没力或撑不住/);
  assert.match(demo, /functionSimpleAnswer/);
  assert.match(demo, /不稳定并会引起症状/);
  assert.match(demo, /还有力量或控制问题/);
  assert.match(demo, /weakStrengthProblems/);

  // Reviewed record relations must drive the real treatment queue, not only a parallel test helper.
  assert.match(demo, /buildPilotTreatmentUnits/);
  assert.match(demo, /const pilotTreatmentUnits = useMemo/);
  assert.match(demo, /sourceBackedCandidates/);
  assert.match(demo, /exactSourceMatch \? 600/);
  assert.match(demo, /professionalAssessmentTitle\(item\.id, item\.title\)/);
  assert.match(demo, /做的时候留意/);
  assert.match(demo, /sourceUnits\.flatMap\(\(unit\) => unit\.retestIds\.map/);
  assert.match(demo, /const chiefRetestFindings = motionFindings\.filter/);
  assert.doesNotMatch(demo, /interleavedTrimmed/);
  assert.match(demo, /const visibleAssessmentIndex = Math\.min/);

  // Motion candidates are ranked as a common pool, while weak early training is low-position only.
  assert.match(demo, /ordered\.slice\(0, 3\)/);
  assert.match(demo, /optionalCandidates: ordered\.slice\(3, 6\)/);
  assert.doesNotMatch(demo, /order\.map\(\(type\) => pool\.find/);
  assert.match(content, /startPosition: "仰卧" \| "坐位" \| "站立" \| "四点跪" \| "侧卧"/);
  assert.match(demo, /\["仰卧", "侧卧"\]\.includes\(exercise\.startPosition\)/);
  assert.match(demo, /<b>\{exercise\.startPosition\}开始：<\/b>/);
  assert.match(content, /knee-supine-adductor/);
  assert.match(content, /knee-supine-ankle-press/);
  assert.match(content, /ankle-dorsiflexion-control/);
});

test("keeps one concise four-document source of truth", async () => {
  const [index, product, decision, knowledge, acceptance] = await Promise.all([
    readFile(new URL("../docs/README.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/rehabmind-complete-product-design.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/rehab-decision-framework.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/knee-ankle-pilot-knowledge.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/pilot-scenario-coverage.md", import.meta.url), "utf8"),
  ]);

  assert.match(index, /四份文档的优先级/);
  assert.match(index, /当前默认只维护桌面端/);
  assert.match(product, /^# RehabMind 产品规范/m);
  assert.match(product, /当前实现：本地规则引擎，不接入 AI/);
  assert.match(product, /首发范围：大腿至足部的症状入口，膝与踝足功能模块/);
  assert.match(product, /骨盆、臀部、腹股沟和髋关节症状入口/);
  assert.match(decision, /^# RehabMind 决策引擎规范/m);
  assert.match(decision, /无明确主诉动作时/);
  assert.match(decision, /双侧或无固定动作保存趋势，不伪造分数/);
  assert.match(knowledge, /^# 膝关节与踝足首发知识库/m);
  assert.match(knowledge, /没有脚趾受伤、疼痛或功能主诉时，不自动加入脚趾检查/);
  assert.match(acceptance, /状态：现行验收规范/);
});

test("formal product consumes local limb decisions in first and followup sessions", async () => {
  const demo = await readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8");
  assert.match(demo, /buildLocalLimbDecision/);
  assert.match(demo, /localLimbDecision\.treatmentIds\.includes\(candidate\.id\)/);
  assert.match(demo, /localLimbDecision\.trainingIds/);
  assert.match(demo, /localLimbDecision\.continueEffectiveTreatment/);
  assert.match(demo, /localLimbDecision\?\.reviewIds/);
  assert.match(
    demo,
    /setFollowupStage\([\s\S]*?followupCandidates\.length === 0[\s\S]*?Boolean\(localLimbDecision\)[\s\S]*?tissuePathway\.id !== "standard"[\s\S]*?\? "training"[\s\S]*?: "treatment"[\s\S]*?\);/
  );
});

test("chief function answers are not overwritten and dynamic treatment queues keep their next target", async () => {
  const demo = await readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8");
  assert.match(demo, /updateAssessment\(item\.id, \(latestRecord\) => \{/);
  assert.match(demo, /const nextRecord = \{ \.\.\.chiefFunctionDefaults, \.\.\.latestRecord, \.\.\.patch \}/);
  assert.match(demo, /return \{ \.\.\.patch, simple: functionSimpleAnswer\(nextRecord\) \}/);
  assert.doesNotMatch(demo, /updateAssessment\(item\.id, \{ \.\.\.chiefFunctionDefaults, \.\.\.\(isChiefFunctionAssessment/);
  assert.match(demo, /const \[pendingTrialAdvance, setPendingTrialAdvance\] = useState<PendingQueueAdvance \| null>\(null\)/);
  assert.match(demo, /function advanceToNextTrialTarget\(rebuildFromQueue = false\)/);
  assert.match(demo, /pendingTrialAdvance !== null/);
  assert.match(demo, /resolveDynamicQueueAdvance\(trialTargetIndex, trialTargets\.map\(targetKey\), pendingTrialAdvance\)/);
});

test("symptom locations are collected immediately and single-direction retests feed the joint gate", async () => {
  const demo = await readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8");
  const intakeQueue = demo.slice(demo.indexOf("const intakeMissingFields"), demo.indexOf("].filter(([missing]) => missing)", demo.indexOf("const intakeMissingFields")));
  assert.ok(intakeQueue.indexOf('"目前情况"') < intakeQueue.indexOf('"肿胀位置"'));
  assert.ok(intakeQueue.indexOf('"肿胀位置"') < intakeQueue.indexOf('"诱发场景"'));
  assert.ok(intakeQueue.indexOf('"按压痛位置"') < intakeQueue.indexOf('"诱发场景"'));
  assert.match(demo, /const singleRangeDirectionId = activeRetestFindings\.length === 1/);
  assert.match(demo, /rangeOutcomes: hasSingleRangeEvidence && singleRangeDirectionId/);
  assert.match(demo, /nextRangeCandidateType\(movementResponse, activeRangeAllowsPassive && canMobilizeJoint\)/);
  assert.match(coreSource, /const directionRetestRecords = trialRecords\.filter\(\(trial\) =>/);
  assert.match(coreSource, /const latestDirectionOutcome = \[\.\.\.trialRecords\]\.reverse\(\)/);
  assert.match(coreSource, /\["better-passive-limited", "passive-limited"\]\.includes\(latestDirectionOutcome/);
  assert.match(demo, /if \(candidate\.type === "swelling"\) return Boolean\(prior\)/);
  assert.match(demo, /const chiefRetestCompletedDuringTreatment = trialRecords\.some\(\(record\) =>/);
  assert.doesNotMatch(demo, /record\.chiefRetested && !record\.reviewOnly\) \|\| hasPendingTreatmentAfterCurrent/);
  assert.doesNotMatch(demo, /const symptomLocationField = pending\.field === "目前情况"/);
});

test("batch range retests do not reference render-local chief flags", async () => {
  const demo = await readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8");
  const start = demo.indexOf("function finishRangeBatch()");
  const end = demo.indexOf("function continueWithReusedRetest()", start);
  assert.ok(start >= 0 && end > start);
  const handler = demo.slice(start, end);
  assert.match(handler, /const batchSingleRangeRetestsChief = Boolean/);
  assert.doesNotMatch(handler, /(?<!batch)singleRangeRetestsChief/);
});

test("pure passive retests keep passive-only language and completed treatment text stays readable", async () => {
  const demo = await readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8");
  assert.match(demo, /const activeRangePassiveOnly = activeAssessment\?\.kind === "motion" && activeAssessment\.testMode === "passive"/);
  assert.match(demo, /function rangeRetestOptions\(mode: MotionComparison = "contralateral", canAssessPassive = true, bilateral = false, passiveOnly = false\)/);
  assert.match(demo, /if \(passiveOnly\) return \[/);
  assert.match(demo, /activeMotionRangeQuestion\(activeRangeDirection \?\? activeTarget\.finding\.id, intake\.side === "双侧\/中间", activeRangePassiveOnly\)/);
  assert.match(demo, /motionWasSymptomatic/);
  assert.match(demo, /本轮处理已完成/);
  assert.doesNotMatch(demo, /涓嶈鐩存帴缁撴潫|闂浠嶆湭杈惧埌鐩爣|鏌ョ湅璇勪及璁板綍/);
});

test("rapid function answers merge into the latest assessment record", async () => {
  const demo = await readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8");
  assert.match(demo, /const current = assessmentResultsRef\.current/);
  assert.match(demo, /const previous = current\[id\] \?\? \{\}/);
  assert.match(demo, /const next = \{ \.\.\.previous, \.\.\.resolvedPatch \}/);
  assert.match(demo, /JSON\.stringify\(previous\) === JSON\.stringify\(next\)/);
  assert.match(demo, /assessmentResultsRef\.current = nextResults/);
  assert.match(demo, /isChiefFunctionAssessment \? \["动作不稳定"\] : undefined/);
  assert.match(demo, /const latestLocations = latestRecord\.tensionLocations \?\? \[\]/);
  assert.match(demo, /latestRecord\.compensations\?\.includes\(entry\)/);
});

test("assessment progress includes the shared muscle-tension check", async () => {
  const demo = await readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8");
  assert.match(demo, /sharedTensionComplete && sharedTensionRequired \? 1 : 0/);
  assert.match(demo, />相关肌群触诊比较</);
});

test("full-positive muscle evidence is not cut off and summary tension rows are deduplicated", async () => {
  const demo = await readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8");
  assert.match(coreSource, /const explicitChiefMuscleLimit = Math\.max\(3, directTensionCandidates\.length\)/);
  assert.match(coreSource, /selectTreatmentChainCandidates\(combinedChiefCandidates, explicitChiefMuscleLimit\)/);
  assert.match(demo, /list\.findIndex\(\(item\) => item\.title === problem\.title\) === index/);
});

test("follow-up restores dynamic muscle work and excludes time-based swelling management", async () => {
  const demo = await readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8");
  assert.match(demo, /function dynamicMuscleCandidateFromRecord\(record: TrialRecord\)/);
  assert.match(demo, /const dynamicHistoryCandidates = \[\.\.\.trialRecords/);
  assert.match(demo, /\.\.\.dynamicHistoryCandidates/);
  assert.match(demo, /\["better", "partial"\]\.includes\(item\.result\) && !item\.timeBased/);
  assert.match(demo, /const firstHistory = upsertSessionSummary\(sessionHistory, firstSummary\)/);
  assert.match(demo, /if \(!firstSessionSaved\) \{/);
  assert.match(demo, /const alreadySelected = current\.includes\(location\)/);
});

test("tissue pathways change the actual treatment and training queues", async () => {
  const demo = await readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8");
  assert.match(coreSource, /tissuePathway\.id !== "bone-stress-suspected" \|\| candidate\.type !== "muscle"/);
  assert.match(coreSource, /const allowKneeTendonMusclePath = region\.id === "knee" && tissuePathway\.id === "tendon-load"/);
  assert.match(coreSource, /tissuePathway\.id !== "tendon-load"[\s\S]*allowKneeTendonMusclePath/);
  assert.match(demo, /if \(tissuePathway\.id === "bone-stress-suspected"\) return \[\]/);
  assert.match(demo, /ankle-achilles-isometric/);
  assert.match(coreSource, /unit\.requiresPriorMuscleTrial && !relatedMuscleTrialCompleted\(unit\)/);
  assert.match(demo, /if \(tissuePathway\.id !== "standard"\) return \[\]/);
  assert.match(coreSource, /if \(tissuePathway\.id !== "standard" && !allowKneeTendonMusclePath\) \{[\s\S]*?return swellingGuidance[\s\S]*?target:swelling/);
  assert.match(demo, /!exercises\.length \|\| tissuePathway\.retestTiming !== "same-session"/);
});

test("does not reopen an old chief muscle card after the final chief retest", async () => {
  const demo = await readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8");
  assert.match(demo, /const chiefRetestLocked = treatmentFinalRetestConfirmed \|\| finalRetestConfirmed/);
  assert.match(demo, /if \(chiefRetestLocked\) return true/);
  assert.match(demo, /selectedOptionalCandidateIds, trialRecords, intake\.side, treatmentFinalRetestConfirmed, finalRetestConfirmed/);
});

test("only shows the key-confirmation action after intake is complete", async () => {
  const demo = await readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8");
  assert.match(demo, /const keyConfirmationReady = intakeComplete && intakeMissingFields\.length === 0/);
  assert.match(demo, /keyConfirmationReady \? <button type="button" className="rm-primary" onClick=\{enterKeyConfirmation\}>进入关键确认<\/button> : null/);
  assert.match(demo, /professionalComplete && keyConfirmationReady \? <button type="button" className="rm-primary" onClick=\{enterKeyConfirmation\}>进入关键确认<\/button> : null/);
});

test("the problem ledger separates a recorded retest from a resolved problem", async () => {
  const demo = await readFile(new URL("../app/rehabmind-complete-demo.tsx", import.meta.url), "utf8");
  assert.match(demo, /“已经复测”不等于“已经解决”/);
  assert.match(demo, /record\.chiefRetested && record\.afterScore === 0/);
  assert.match(demo, /outcome === "both-match"/);
  assert.doesNotMatch(demo, /Object\.keys\(record\.rangeOutcomes \?\? \{\}\)\.map\(\(id\) => `motion:\$\{id\}`\)\]\)\);/);
  assert.match(demo, /const hasUnresolvedRangeProgress = trialRecords\.some\(\(record\) =>/);
  assert.match(demo, /Object\.values\(record\.rangeOutcomes \?\? \{\}\)\.some\(\(outcome\) => outcome !== "both-match"\)/);
});
