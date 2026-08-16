export type LocalLimbRegionId = "thigh-local" | "calf-local";
export type LocalLimbArea = "front" | "back" | "medial" | "lateral";
import { buildTissuePathway, type TissuePathwayId } from "./tissue-pathway-core";

export type LocalLimbPhase = "acute-strain" | "contusion" | "bone-stress" | "tendon-load" | "nonacute-tension" | "strength-only" | "needs-reassessment";
export type LocalFindingResult = "normal" | "limited" | "painful" | "weak" | "unknown";

export type LocalLimbFinding = {
  id: string;
  kind: "length" | "strength" | "function" | "swelling" | "tenderness" | "sensory";
  result: LocalFindingResult;
};

export type LocalTreatmentHistory = {
  id: string;
  result: "better" | "partial" | "same" | "worse";
  sessionNumber: number;
  responseRole?: "partial-contribution" | "key-completion" | "independent-completion" | "range-contribution" | "no-change" | "worsened" | "not-immediately-testable";
};

export type LocalLimbDecisionInput = {
  regionId: LocalLimbRegionId;
  location: string;
  onset: string;
  mechanism: string;
  symptomType: string;
  symptoms: string[];
  provocationTypes: string[];
  goal: number;
  sessionNumber?: number;
  findings?: LocalLimbFinding[];
  treatmentHistory?: LocalTreatmentHistory[];
  hasNewSymptom?: boolean;
};

export type LocalLimbDecision = {
  area: LocalLimbArea;
  phase: LocalLimbPhase;
  phaseLabel: string;
  assessmentIds: string[];
  reviewIds: string[];
  treatmentIds: string[];
  trainingIds: string[];
  retestIds: string[];
  retestTiming: "same-session" | "later" | "none";
  allowRelease: boolean;
  continueEffectiveTreatment: boolean;
  summary: string;
  tissuePathway: TissuePathwayId;
};

type AreaRule = {
  motionId: string;
  strengthId: string;
  functionId: string;
  releaseId: string;
  controlId: string;
  trainingIds: string[];
  /** 局部验证无变化且存在功能线索时，才开放的跨区域反应实验。 */
  responseCandidateId?: string;
};

const THIGH_RULES: Record<LocalLimbArea, AreaRule> = {
  front: { motionId: "thigh-front-length", strengthId: "thigh-front-strength", functionId: "thigh-sit-stand", releaseId: "thigh-front-release", controlId: "thigh-front-control", trainingIds: ["thigh-front-isometric", "thigh-front-extension-control", "thigh-sit-stand", "thigh-step", "thigh-run-return"] },
  back: { motionId: "thigh-back-length", strengthId: "thigh-back-strength", functionId: "thigh-bridge-check", releaseId: "thigh-back-release", controlId: "thigh-back-control", trainingIds: ["thigh-back-isometric", "thigh-bridge", "thigh-hip-hinge", "thigh-step", "thigh-run-return"] },
  medial: { motionId: "thigh-medial-length", strengthId: "thigh-medial-strength", functionId: "thigh-single-leg", releaseId: "thigh-medial-release", controlId: "thigh-medial-control", trainingIds: ["thigh-medial-isometric", "thigh-medial-active", "thigh-sit-stand", "thigh-step", "thigh-run-return"] },
  lateral: { motionId: "thigh-lateral-load", strengthId: "thigh-lateral-strength", functionId: "thigh-single-leg", releaseId: "thigh-lateral-release", controlId: "thigh-lateral-control", trainingIds: ["thigh-lateral-isometric", "thigh-lateral-stability", "thigh-lateral-step", "thigh-step", "thigh-run-return"] },
};

const CALF_RULES: Record<LocalLimbArea, AreaRule> = {
  front: { motionId: "calf-dorsiflexion", strengthId: "calf-dorsiflexor-strength", functionId: "calf-walk", releaseId: "calf-front-release", controlId: "calf-front-control", responseCandidateId: "calf-anterolateral-thigh-lateral-response", trainingIds: ["calf-front-active", "calf-front-endurance", "calf-gait", "calf-step-single-leg", "calf-run-hop"] },
  back: { motionId: "calf-plantarflexion", strengthId: "calf-heel-raise-strength", functionId: "calf-heel-raise", releaseId: "calf-back-release", controlId: "calf-back-control", trainingIds: ["calf-back-seated-raise", "calf-back-standing-raise", "calf-gait", "calf-step-single-leg", "calf-run-hop"] },
  medial: { motionId: "calf-inversion", strengthId: "calf-invertor-strength", functionId: "calf-single-leg", releaseId: "calf-medial-release", controlId: "calf-medial-control", trainingIds: ["calf-medial-active", "calf-medial-arch", "calf-gait", "calf-step-single-leg", "calf-run-hop"] },
  lateral: { motionId: "calf-eversion", strengthId: "calf-evertor-strength", functionId: "calf-single-leg", releaseId: "calf-lateral-release", controlId: "calf-lateral-control", responseCandidateId: "calf-anterolateral-thigh-lateral-response", trainingIds: ["calf-lateral-active", "calf-lateral-stability", "calf-gait", "calf-step-single-leg", "calf-run-hop"] },
};

export function localLimbArea(location: string): LocalLimbArea {
  // “小腿前外侧”在点击图中代表胫骨前肌/趾伸肌所在的前侧区域，
  // 不能因为字符串里有“外”就误分到腓骨肌路径。
  if (/小腿前外|小腿前侧|胫骨前/.test(location)) return "front";
  if (/后|腓肠|小腿肚|跟腱/.test(location)) return "back";
  if (/内/.test(location)) return "medial";
  if (/外/.test(location)) return "lateral";
  return "front";
}

export function isAcuteLocalStrain(input: Pick<LocalLimbDecisionInput, "onset" | "mechanism">) {
  return ["今天或昨天", "2～7天"].includes(input.onset) && /跑跳|拉伤|冲刺|突然发力/.test(input.mechanism);
}

function hasFinding(input: LocalLimbDecisionInput, id: string, results: LocalFindingResult[]) {
  return Boolean(input.findings?.some((finding) => finding.id === id && results.includes(finding.result)));
}

function latestTreatment(input: LocalLimbDecisionInput, id: string) {
  // History is appended in chronological order.  Keep the last record when
  // several treatments share the same session number; sorting only by session
  // number could otherwise return the first same-session result and make a
  // later effective/ineffective response invisible to the next decision.
  return input.treatmentHistory?.filter((record) => record.id === id).reduce<LocalTreatmentHistory | undefined>(
    (latest, record) => !latest || record.sessionNumber >= latest.sessionNumber ? record : latest,
    undefined,
  );
}

function phaseFor(input: LocalLimbDecisionInput, rule: AreaRule, tissuePathway: TissuePathwayId): LocalLimbPhase {
  if (input.hasNewSymptom || input.symptoms.includes("麻、电或感觉变化") || input.symptomType === "麻或电感") return "needs-reassessment";
  if (tissuePathway === "muscle-contusion") return "contusion";
  if (tissuePathway === "bone-stress-suspected") return "bone-stress";
  if (tissuePathway === "tendon-load") return "tendon-load";
  if (isAcuteLocalStrain(input)) return "acute-strain";
  const strengthWeak = hasFinding(input, rule.strengthId, ["weak"]) || input.symptoms.includes("力量不足") || /无力|不稳/.test(input.symptomType);
  const symptomOrRange = hasFinding(input, rule.motionId, ["limited", "painful"])
    || hasFinding(input, rule.functionId, ["painful", "limited"])
    || input.symptoms.some((symptom) => ["肿胀或淤青", "按压痛", "活动受限"].includes(symptom))
    || /痛|酸|胀|刺|牵扯|紧绷|卡/.test(input.symptomType);
  if (strengthWeak && !symptomOrRange) return "strength-only";
  return "nonacute-tension";
}

function trainingFor(input: LocalLimbDecisionInput, rule: AreaRule, phase: LocalLimbPhase) {
  if (["needs-reassessment", "bone-stress"].includes(phase)) return [];
  // 急性拉伤、撞伤和肌腱负荷路径都只从第一项低负荷练习开始，
  // 不根据最终恢复目标在首次页面直接展开后期功能训练。
  if (["acute-strain", "contusion", "tendon-load"].includes(phase)) return rule.trainingIds.slice(0, 1);
  // 恢复目标只限定最终上限；首次仍从基础控制开始。后续康复每次最多
  // 开放下一层，不能因为目标是跑步就在首次直接展示跑跳训练。
  const sessionNumber = input.sessionNumber ?? 1;
  const goalCeiling = input.goal >= 4 ? 5 : Math.max(1, input.goal);
  const stageCount = Math.min(goalCeiling, Math.max(2, sessionNumber + 1), 5);
  return rule.trainingIds.slice(0, stageCount);
}

function supportingAreas(input: LocalLimbDecisionInput, rules: Record<LocalLimbArea, AreaRule>, primaryArea: LocalLimbArea) {
  return (Object.entries(rules) as Array<[LocalLimbArea, AreaRule]>)
    .filter(([area, rule]) => area !== primaryArea && (
      hasFinding(input, rule.motionId, ["limited", "painful"])
      || hasFinding(input, rule.strengthId, ["weak", "painful"])
      || hasFinding(input, rule.functionId, ["limited", "painful"])
    ));
}

export function buildLocalLimbDecision(input: LocalLimbDecisionInput): LocalLimbDecision {
  const area = localLimbArea(input.location);
  const rules = input.regionId === "thigh-local" ? THIGH_RULES : CALF_RULES;
  const rule = rules[area];
  const tissueDecision = buildTissuePathway({ ...input, description: "" });
  const phase = phaseFor(input, rule, tissueDecision.id);
  const sessionNumber = input.sessionNumber ?? 1;
  const motionAbnormal = hasFinding(input, rule.motionId, ["limited", "painful"]);
  const functionAbnormal = hasFinding(input, rule.functionId, ["limited", "painful"]);
  const strengthWeak = hasFinding(input, rule.strengthId, ["weak"]);
  const latestReleaseRecord = latestTreatment(input, rule.releaseId);
  const latestRelease = latestReleaseRecord?.result;
  const releaseWasEffective = latestRelease === "better" || latestRelease === "partial";
  const releaseWasIneffective = latestRelease === "same" || latestRelease === "worse";
  const functionalChainClue = hasFinding(input, rule.functionId, ["limited", "painful"])
    || input.provocationTypes.some((value) => /走|跑|单腿|台阶|蹲|变向|侧移/.test(value));
  const responseCandidateRecord = rule.responseCandidateId ? latestTreatment(input, rule.responseCandidateId) : undefined;
  const responseCandidateResult = responseCandidateRecord?.result;
  const releaseLeftResidualProblem = releaseWasIneffective
    || ["partial-contribution", "range-contribution", "no-change"].includes(latestReleaseRecord?.responseRole ?? "");
  const responseCandidateMatchesLocation = rule.responseCandidateId !== "calf-anterolateral-thigh-lateral-response"
    || area === "lateral" || /小腿前外|前外侧/.test(input.location);
  const shouldTryResponseCandidate = Boolean(rule.responseCandidateId && responseCandidateMatchesLocation && releaseLeftResidualProblem && functionalChainClue && !responseCandidateResult);
  // 首诊可用问诊症状补充尚未完成的检查；第二、三次必须以本次快速
  // 复查为准，不能让第一次的“活动受限”永久维持旧处理。
  const stillSymptomatic = motionAbnormal || functionAbnormal
    || sessionNumber <= 1 && input.symptoms.some((symptom) => ["肿胀或淤青", "按压痛", "活动受限"].includes(symptom));

  const supportRules = supportingAreas(input, rules, area).map(([, supportRule]) => supportRule);
  const assessmentIds = phase === "needs-reassessment" ? [] : [rule.motionId, rule.strengthId, rule.functionId, ...supportRules.flatMap((supportRule) => [supportRule.motionId, supportRule.strengthId])];
  const reviewIds = sessionNumber <= 1 ? [] : [...assessmentIds];
  let treatmentIds: string[] = [];
  let retestIds: string[] = [];
  let retestTiming: LocalLimbDecision["retestTiming"] = "none";
  let summary = "根据本次检查安排训练。";

  if (phase === "needs-reassessment") {
    summary = "出现新症状或感觉变化，重新收集症状并评估，不沿用旧处理。";
  } else if (phase === "contusion") {
    treatmentIds = [];
    retestTiming = "later";
    summary = "保护撞伤区域，不按摩或强拉淤青中心；保留舒适活动，稍后比较肿胀和功能。";
  } else if (phase === "bone-stress") {
    treatmentIds = [];
    retestTiming = "later";
    summary = "先降低冲击负荷并确认骨应力风险，不进入普通肌肉松解路径。";
  } else if (phase === "tendon-load") {
    treatmentIds = [];
    retestTiming = "later";
    summary = "以渐进负荷为主，记录原负荷动作和次日反应，不反复松解。";
  } else if (phase === "acute-strain") {
    treatmentIds = [];
    retestTiming = "later";
    summary = "急性拉伤阶段不重压、不强拉疼痛中心；保留可接受范围的低负荷发力，稍后或下次复查。";
  } else if (phase === "strength-only") {
    treatmentIds = [];
    retestTiming = "none";
    summary = "单纯力量不足直接进入对应训练，不安排当场反复复测力量。";
  } else {
    const responseCandidateCompletion = ["key-completion", "independent-completion"].includes(responseCandidateRecord?.responseRole ?? "");
    const shouldRepeatResponseCandidate = sessionNumber > 1 && responseCandidateCompletion && stillSymptomatic;
    const shouldRepeatEffectiveRelease = sessionNumber > 1 && releaseWasEffective && stillSymptomatic;
    const shouldUseRelease = !releaseWasIneffective && (sessionNumber === 1 ? motionAbnormal || functionAbnormal || /酸|紧|牵扯/.test(input.symptomType) : shouldRepeatEffectiveRelease);
    const supportedTreatments = supportRules.flatMap((supportRule) => {
      const supportMotionAbnormal = hasFinding(input, supportRule.motionId, ["limited", "painful"]);
      const supportWeak = hasFinding(input, supportRule.strengthId, ["weak"]);
      return [...(supportMotionAbnormal ? [supportRule.releaseId] : []), ...(supportWeak ? [supportRule.controlId] : [])];
    });
    treatmentIds = [
      ...(shouldRepeatResponseCandidate && rule.responseCandidateId ? [rule.responseCandidateId] : []),
      ...(shouldUseRelease ? [rule.releaseId] : []),
      ...(strengthWeak ? [rule.controlId] : []),
      ...supportedTreatments,
      ...(shouldTryResponseCandidate && rule.responseCandidateId ? [rule.responseCandidateId] : []),
    ];
    const hasImmediateRelease = shouldUseRelease || supportRules.some((supportRule) => hasFinding(input, supportRule.motionId, ["limited", "painful"]));
    if (hasImmediateRelease) {
      retestIds = [rule.motionId, ...(functionAbnormal ? [rule.functionId] : []), ...supportRules.filter((supportRule) => hasFinding(input, supportRule.motionId, ["limited", "painful"])).map((supportRule) => supportRule.motionId)];
      retestTiming = "same-session";
      summary = sessionNumber > 1 ? "快速复查后继续上次有效处理，再统一复测仍异常的拉长和主诉功能。" : "先处理明确紧张区域，再统一复测拉长和主诉功能；力量变化留到后续训练复查。";
    } else {
      retestTiming = "none";
      summary = releaseWasIneffective ? "不重复上次无效松解，重新评估或直接处理训练缺口。" : "没有明确需要当场处理的紧张或动作问题，进入训练。";
    }
  }

  return {
    area,
    phase,
    phaseLabel: ({ "acute-strain": "急性拉伤", contusion: "肌肉撞伤", "bone-stress": "疑似骨应力", "tendon-load": "肌腱负荷", "nonacute-tension": "非急性紧张或动作不适", "strength-only": "单纯力量不足", "needs-reassessment": "重新评估" } as const)[phase],
    assessmentIds,
    reviewIds,
    treatmentIds: [...new Set(treatmentIds)],
    trainingIds: [...new Set([
      ...trainingFor(input, rule, phase),
      ...supportRules.flatMap((supportRule) => hasFinding(input, supportRule.strengthId, ["weak", "painful"])
        ? trainingFor(input, supportRule, phase).slice(0, 1)
        : []),
    ])],
    retestIds: [...new Set(retestIds)],
    retestTiming,
    allowRelease: phase === "nonacute-tension",
    continueEffectiveTreatment: sessionNumber > 1 && (releaseWasEffective || ["better", "partial"].includes(responseCandidateResult ?? "")) && stillSymptomatic,
    summary,
    tissuePathway: tissueDecision.id,
  };
}

export type LocalLimbLabCase = {
  id: string;
  title: string;
  complaint: string;
  expected: string;
  input: LocalLimbDecisionInput;
};

export const LOCAL_LIMB_LAB_CASES: LocalLimbLabCase[] = [
  { id: "thigh-back-acute", title: "大腿后侧急性拉伤", complaint: "今天冲刺时右大腿后侧突然拉痛并有轻微淤青。", expected: "不松解损伤中心；低负荷屈膝发力，稍后复查。", input: { regionId: "thigh-local", location: "大腿后侧中段", onset: "今天或昨天", mechanism: "跑跳或拉伤", symptomType: "刺痛", symptoms: ["肿胀或淤青", "按压痛"], provocationTypes: ["运动过程中"], goal: 4, findings: [{ id: "thigh-back-length", kind: "length", result: "painful" }, { id: "thigh-back-strength", kind: "strength", result: "painful" }] } },
  { id: "thigh-front-nonacute", title: "大腿前侧非急性紧张", complaint: "右大腿前侧紧，起身和弯膝会扯。", expected: "前侧轻柔松解，统一复测拉长和坐站。", input: { regionId: "thigh-local", location: "大腿前侧下段", onset: "1～6周", mechanism: "逐渐出现", symptomType: "牵扯或紧绷", symptoms: ["活动受限"], provocationTypes: ["活动到某个角度"], goal: 3, findings: [{ id: "thigh-front-length", kind: "length", result: "limited" }, { id: "thigh-sit-stand", kind: "function", result: "painful" }] } },
  { id: "thigh-medial-strength", title: "大腿内侧单纯无力", complaint: "夹腿力量比另一侧弱，但没有疼痛和活动受限。", expected: "直接训练，不松解，不当场反复测力量。", input: { regionId: "thigh-local", location: "大腿前内侧", onset: "超过6周", mechanism: "逐渐出现", symptomType: "无力或不稳", symptoms: ["力量不足"], provocationTypes: ["用力或对抗阻力"], goal: 4, findings: [{ id: "thigh-medial-strength", kind: "strength", result: "weak" }] } },
  { id: "thigh-lateral-unknown", title: "大腿外侧说不清动作", complaint: "左大腿外侧不舒服，但说不清固定动作。", expected: "只查外侧活动、发力和基础走路，不展开膝髋全套。", input: { regionId: "thigh-local", location: "大腿前外侧", onset: "反复出现", mechanism: "没有明确受伤", symptomType: "说不清的不适", symptoms: [], provocationTypes: ["说不清 / 没有固定动作"], goal: 3 } },
  { id: "calf-back-acute", title: "小腿后侧急性拉伤", complaint: "昨天跑步蹬地时右小腿后侧突然疼。", expected: "两种膝位检查；不强拉重压；低负荷提踵留到可接受范围。", input: { regionId: "calf-local", location: "小腿后侧", onset: "今天或昨天", mechanism: "跑跳或拉伤", symptomType: "刺痛", symptoms: ["按压痛"], provocationTypes: ["运动过程中"], goal: 4, findings: [{ id: "calf-plantarflexion", kind: "length", result: "painful" }, { id: "calf-heel-raise-strength", kind: "strength", result: "painful" }] } },
  { id: "calf-front-tension", title: "小腿前侧活动不适", complaint: "左小腿前侧勾脚紧，走路抬脚也酸。", expected: "前侧松解后统一复测勾脚和走路。", input: { regionId: "calf-local", location: "小腿前外侧", onset: "1～6周", mechanism: "逐渐出现", symptomType: "酸痛", symptoms: ["活动受限"], provocationTypes: ["活动到某个角度", "走路、站立或负重"], goal: 3, findings: [{ id: "calf-dorsiflexion", kind: "length", result: "limited" }, { id: "calf-walk", kind: "function", result: "painful" }] } },
  { id: "calf-lateral-strength", title: "小腿外侧单纯无力", complaint: "外翻保持比另一侧弱，但不疼。", expected: "直接安排外翻控制和功能训练。", input: { regionId: "calf-local", location: "小腿外侧", onset: "超过6周", mechanism: "没有明确受伤", symptomType: "无力或不稳", symptoms: ["力量不足"], provocationTypes: ["用力或对抗阻力"], goal: 4, findings: [{ id: "calf-evertor-strength", kind: "strength", result: "weak" }] } },
  { id: "calf-back-followup-effective", title: "第二次继续有效处理", complaint: "第一次小腿后侧轻柔处理有效，本次拉长和提踵仍不完全。", expected: "快速复查后继续有效松解，并训练提踵。", input: { regionId: "calf-local", location: "小腿后侧", onset: "1～6周", mechanism: "跑跳或拉伤", symptomType: "牵扯或紧绷", symptoms: ["活动受限"], provocationTypes: ["运动过程中"], goal: 4, sessionNumber: 2, findings: [{ id: "calf-plantarflexion", kind: "length", result: "limited" }, { id: "calf-heel-raise", kind: "function", result: "painful" }], treatmentHistory: [{ id: "calf-back-release", result: "better", sessionNumber: 1 }] } },
  { id: "thigh-back-followup-ineffective", title: "第二次不重复无效处理", complaint: "第一次大腿后侧松解没有变化，本次仍不舒服。", expected: "不重复无效松解，重新评估或调整训练。", input: { regionId: "thigh-local", location: "大腿后侧", onset: "1～6周", mechanism: "跑跳或拉伤", symptomType: "酸痛", symptoms: ["活动受限"], provocationTypes: ["运动过程中"], goal: 4, sessionNumber: 2, findings: [{ id: "thigh-back-length", kind: "length", result: "limited" }], treatmentHistory: [{ id: "thigh-back-release", result: "same", sessionNumber: 1 }] } },
  { id: "local-new-symptom", title: "随访出现新症状", complaint: "原小腿症状恢复中，本次新出现麻电感。", expected: "回到症状收集和相关评估，不沿用旧处理。", input: { regionId: "calf-local", location: "小腿外侧", onset: "1～6周", mechanism: "没有明确受伤", symptomType: "麻或电感", symptoms: ["麻、电或感觉变化"], provocationTypes: ["其他情况"], goal: 3, sessionNumber: 3, hasNewSymptom: true } },
  { id: "calf-medial-sport", title: "小腿内侧恢复运动", complaint: "内侧不适已减轻，目标回到跑步。", expected: "保留局部控制，逐级进入步态、单腿和跑跳。", input: { regionId: "calf-local", location: "小腿内侧", onset: "超过6周", mechanism: "逐渐出现", symptomType: "酸痛", symptoms: [], provocationTypes: ["运动过程中"], goal: 4, findings: [{ id: "calf-inversion", kind: "length", result: "normal" }, { id: "calf-invertor-strength", kind: "strength", result: "weak" }] } },
  { id: "thigh-front-daily", title: "大腿前侧恢复生活", complaint: "前侧症状较轻，目标正常上下楼和起身。", expected: "训练控制、坐站和台阶，不提前加入跑跳。", input: { regionId: "thigh-local", location: "大腿前侧", onset: "1～6周", mechanism: "逐渐出现", symptomType: "酸痛", symptoms: [], provocationTypes: ["走路、站立或负重"], goal: 3, findings: [{ id: "thigh-front-length", kind: "length", result: "normal" }, { id: "thigh-front-strength", kind: "strength", result: "weak" }] } },
];
