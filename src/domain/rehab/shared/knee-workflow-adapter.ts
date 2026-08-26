import {
  canonicalKneeAction,
  type KneeActionId,
  type KneeDecisionInput,
  type KneeDecisionOutput,
  type KneeFindingFact,
  type KneeObservationRecord,
  type KneeSide,
  type KneeTreatmentRecord,
  type KneeTreatmentUnit,
  type KneeUserRole,
} from "@/src/domain/rehab/shared/knee-decision-core";

export const KNEE_CORE_CANDIDATE_IDS: Record<string, string[]> = {
  "knee-swelling-management": ["knee-swelling-care"],
  "knee-medial-soft-tissue": ["knee-medial-pes"],
  "knee-medial-adductor": ["knee-medial-adductor"],
  "knee-lateral-chain": ["knee-medial-lateral-chain", "knee-lateral-muscles"],
  "knee-extension-lateral-chain": ["knee-medial-lateral-chain", "knee-extension-muscles"],
  "knee-extension-anterior-lateral": ["knee-extension-anterior-lateral", "knee-extension-anterior-muscles", "knee-medial-lateral-chain"],
  "knee-anterior-thigh-rectus-femoris": ["knee-extension-anterior-muscles", "knee-anterior-muscles"],
  "knee-posterior-calf-muscle": ["knee-extension-muscles", "knee-lateral-muscles"],
  "knee-extension-joint": ["knee-extension-joints"],
  "knee-proximal-fibula": ["knee-lateral-fibula"],
  "knee-extension-control": ["knee-extension-control"],
  "knee-flexion-control": [],
  "knee-hip-knee-control": ["knee-anterior-control"],
  "knee-quadriceps-strength": [],
};

export const KNEE_CORE_EXERCISE_IDS: Record<string, string[]> = {
  "knee-extension-control": ["knee-heel-slide-quad-set"],
  "knee-flexion-control": ["knee-heel-slide-quad-set"],
  "knee-quadriceps-strength": ["knee-heel-slide-quad-set", "knee-sit-stand-squat", "knee-step"],
  "knee-hip-knee-control": ["knee-standing-hip-flexion", "knee-sit-stand-squat", "knee-step"],
};

export function kneeLegacyCandidateIdsForUnit(unitId?: string) {
  return unitId ? KNEE_CORE_CANDIDATE_IDS[unitId] ?? [] : [];
}

export function kneeCandidateBelongsToCurrentDecision(candidateId: string, decision: KneeDecisionOutput | null) {
  const currentId = decision?.currentTreatment?.id;
  if (!currentId) return false;
  return candidateId === currentId || kneeLegacyCandidateIdsForUnit(currentId).includes(candidateId);
}

export function kneeCandidateAllowedInTreatmentQueue(candidateId: string, decision: KneeDecisionOutput | null) {
  return Boolean(decision?.currentTreatment && candidateId === decision.currentTreatment.id);
}

export function kneeExerciseIdsForDecision(decision: KneeDecisionOutput | null) {
  if (!decision) return [];
  return [...new Set(decision.treatmentUnits.flatMap((unit) => KNEE_CORE_EXERCISE_IDS[unit.id] ?? []))];
}

export function kneeTreatmentInstruction(unit: KneeTreatmentUnit) {
  const hasAnteriorEvidence = /大腿前侧|股直肌|股四头肌/.test(`${unit.site} ${unit.action}`);
  const instructions: Record<string, string> = {
    "knee-swelling-management": "休息时垫高小腿，在不增加疼痛的范围内缓慢活动膝盖10～20次；减少当天会让肿胀明显增加的负重。",
    "knee-medial-soft-tissue": "先在膝内下方的鹅足相关肌肉区域，找到刚才检查时更紧或更酸的位置，用手轻柔按揉30～60秒；避开明确刺痛点。",
    "knee-medial-adductor": "在大腿内侧找到检查时更紧或更酸的内收肌区域，用手轻柔按揉30～60秒；避开膝内侧明确刺痛点。",
    "knee-lateral-chain": hasAnteriorEvidence
      ? "在大腿前侧、髋外侧和大腿外侧找到刚才检查时明确更紧或更酸的区域，分别轻柔处理30～60秒；避开髌骨、髌腱和明确刺痛点，不要沿髂胫束整条重压。"
      : "在髋外侧和大腿外侧找到刚才检查时更紧或更酸的区域，用手或泡沫轴轻柔处理30～60秒；不要沿髂胫束整条重压。",
    "knee-extension-lateral-chain": "在髋外侧和大腿外侧找到刚才检查时更紧或更酸的区域，用手或泡沫轴轻柔处理30～60秒；不要沿髂胫束整条重压。",
    "knee-extension-anterior-lateral": "先处理检查中明确紧张的区域：大腿前侧/股直肌与外侧链可在同一轮完成，每处轻柔处理30～60秒；避开髌骨、髌腱和明确刺痛点。",
    "knee-anterior-thigh-rectus-femoris": "在大腿前侧找到检查时明确紧张或按压不舒服的区域，用手或泡沫轴轻柔处理30～60秒；避开髌骨和髌腱。",
    "knee-posterior-calf-muscle": "在膝后周围和小腿上端找到明确更紧的肌肉区域，轻柔按揉30～60秒；不要直接按压腘窝正中。",
    "knee-extension-control": "仰卧把腿放松伸直，绷紧大腿前侧，让膝后轻轻向床面下压，保持2秒后放松，先做6～10次。",
    "knee-flexion-control": "仰卧，脚跟贴着床面，缓慢把脚跟滑向臀部，再主动控制着回到起点；只做到可以接受的范围，先做6～10次。",
    "knee-extension-joint": "由专业人员根据伸直受限方向完成低刺激关节松动；出现明显刺痛、硬性阻挡或症状加重时停止。",
    "knee-proximal-fibula": "由专业人员做一次腓骨近端辅助反应：保持原动作和速度，轻柔辅助后复测；不判断错位，不强推疼痛末端。",
    "knee-hip-knee-control": "先练较容易的站立屈髋或扶物浅蹲，让髋、膝和脚尖方向保持一致，再逐步进入台阶动作。",
    "knee-quadriceps-strength": "从膝后下压或坐位伸膝开始，能稳定完成后再进入坐站和低台阶训练。",
  };
  return instructions[unit.id] ?? unit.action;
}

export function kneeRetestInstruction(unit: KneeTreatmentUnit) {
  const labels: Partial<Record<KneeActionId, string>> = {
    "knee-extension": "膝盖绷直",
    "knee-flexion": "弯膝",
    "step-down": "下台阶",
    "step-up": "上台阶",
    squat: "下蹲",
    "single-leg-squat": "单腿下蹲",
    "single-leg-balance": "单腿站",
    "sit-to-stand": "坐下再站起",
    walk: "走路",
    run: "跑步",
    "jump-land": "跳跃落地",
    "hip-hinge": "站立屈髋",
    "unknown-task": "原来的动作",
  };
  const actions = unit.relatedActionIds.map((actionId) => labels[actionId] ?? "原来的动作");
  return actions.length ? `只复测本轮受影响的动作：${actions.join("、")}。` : "这项不要求当场反复复测。";
}

export type KneeWorkflowAssessment = {
  id: string;
  kind: "motion" | "strength" | "function" | "special";
  title: string;
  active?: string;
  passive?: string;
  simple?: string;
  discomfort?: string;
  discomfortType?: string;
  symptomScore?: number;
  passiveEndFeel?: string;
  passiveDiscomfort?: string;
  passiveSymptomScore?: number;
  tensionLocations?: string[];
  tensionChecked?: boolean;
   discomfortLocations?: string[];
   control?: string;
  /** S-01：该检查项自身的侧别（双侧场景逐项记录的更差侧）；缺省回退主诉侧。 */
  side?: string;
};

export type KneeWorkflowRecord = {
  candidateId: string;
  treatmentKey?: string;
  afterScore?: number;
  chiefRetested?: boolean;
  rangeOutcomes?: Record<string, string>;
  rangeScores?: Record<string, number>;
  relatedActionIds?: KneeActionId[];
  retestOnly?: boolean;
  reviewOnly?: boolean;
};

export type KneeWorkflowMark = {
  side?: string;
  location?: string;
};

// S-04：麻电范围（感觉异常）刻意不进入膝决策输入——pilot 层已在症状阶段
// 提供「出现麻、电或感觉变化 → 建议线下确认」出口卡兜底（selfNeuralReferral），
// 膝路径不重复产生感觉异常问题台账；如未来需要接入，从新增 sensoryMarks 字段起步。
export type KneeWorkflowSnapshot = {
  role: string;
  side: string;
  location: string;
  symptomType?: string;
  action?: string;
  baselineScore?: number;
  symptoms?: string[];
  swellingLocation?: string;
  tendernessLocation?: string;
  /** S-02：带侧别的结构化标记；提供时优先于压平文本（旧快照兼容）。 */
  swellingMarks?: KneeWorkflowMark[];
  tendernessMarks?: KneeWorkflowMark[];
  assessments: KneeWorkflowAssessment[];
  treatmentRecords?: KneeWorkflowRecord[];
};

const DIRECTION_ACTION: Record<string, KneeActionId> = {
  "knee-extension": "knee-extension",
  "knee-flexion": "knee-flexion",
};

const FUNCTION_ACTION: Array<[RegExp, KneeActionId]> = [
  [/step-down|下楼|下台阶/, "step-down"],
  [/step-up|上楼|上台阶/, "step-up"],
  [/single-leg-squat|单腿.*蹲/, "single-leg-squat"],
  [/squat|下蹲/, "squat"],
  [/single-leg|单腿站/, "single-leg-balance"],
  [/sit-to-stand|坐站/, "sit-to-stand"],
  [/walk|gait|走路|步行/, "walk"],
  [/run|跑步/, "run"],
  [/hop|jump|landing|跳|落地/, "jump-land"],
];

function toRole(role: string): KneeUserRole {
  if (role === "rehab") return "rehab";
  if (role === "coach") return "coach";
  return "general";
}

function toSide(side: string): KneeSide {
  if (/左/.test(side)) return "left";
  if (/右/.test(side)) return "right";
  if (/双|两侧/.test(side)) return "bilateral";
  if (/中间|正中/.test(side)) return "midline";
  return "unknown";
}

function actionFromAssessment(item: KneeWorkflowAssessment): KneeActionId | undefined {
  const rawId = item.id.replace(/^(motion|function|strength):/, "");
  if (DIRECTION_ACTION[rawId]) return DIRECTION_ACTION[rawId];
  const source = `${rawId} ${item.title}`;
  return FUNCTION_ACTION.find(([pattern]) => pattern.test(source))?.[1]
    ?? canonicalKneeAction(item.title);
}

function actionLabel(actionId?: KneeActionId) {
  const labels: Partial<Record<KneeActionId, string>> = {
    "knee-extension": "膝盖绷直",
    "knee-flexion": "弯膝",
    "step-down": "下台阶",
    "step-up": "上台阶",
    squat: "下蹲",
    "single-leg-squat": "单腿下蹲",
    "single-leg-balance": "单腿站",
    "sit-to-stand": "坐下再站起",
    walk: "走路",
    run: "跑步",
    "jump-land": "跳跃落地",
  };
  return actionId ? labels[actionId] : undefined;
}

function isLimited(value?: string) {
  return ["limited", "left-limited", "right-limited", "both-limited"].includes(value ?? "");
}

function assessmentFindings(items: KneeWorkflowAssessment[], side: KneeSide) {
  const facts: KneeFindingFact[] = [];
  items.forEach((item) => {
    // S-01：优先使用检查项自身侧别（双侧逐项证据），缺省回退主诉侧。
    const itemSide: KneeSide = item.side ? toSide(item.side) : side;
    const actionId = actionFromAssessment(item);
    const action = actionLabel(actionId) ?? item.title;
    const locations = [...(item.tensionLocations ?? []), ...(item.discomfortLocations ?? [])]
      .filter((value, index, list) => value && !/没有|接近|说不清/.test(value) && list.indexOf(value) === index);
    if (item.kind === "motion") {
      const direction = actionId === "knee-extension" ? "extension" as const : actionId === "knee-flexion" ? "flexion" as const : undefined;
      const activeRange = isLimited(item.active)
        ? "limited" as const
        : ["same", "normal"].includes(item.active ?? "")
          ? "matches" as const
          : "unknown" as const;
      const passiveRange: KneeFindingFact["passiveRange"] = item.passive === "same"
        ? "matches"
        : item.passive === "limited"
          ? "limited"
          : ["unsure", "unable"].includes(item.passive ?? "")
            ? "unknown"
            : "not-checked";
      const hasRangeProblem = activeRange === "limited" || passiveRange === "limited";
      const hasSymptom = item.discomfort === "yes"
        || item.passiveDiscomfort === "yes"
        || item.active === "painful"
        || item.active === "unable";
      if (hasRangeProblem) {
        facts.push({
          id: item.id,
          kind: "motion-range",
          side: itemSide,
          action,
          direction,
          result: "limited",
          activeRange,
          passiveRange,
          symptomScore: item.symptomScore ?? item.passiveSymptomScore,
          passiveEndFeel: item.passiveEndFeel as KneeFindingFact["passiveEndFeel"],
          locations,
          locationChecked: item.tensionChecked,
        });
      }
      if (hasSymptom) {
        facts.push({ id: `${item.id}:symptom`, kind: "motion-symptom", side: itemSide, action, direction, result: "painful", symptomScore: item.symptomScore ?? item.passiveSymptomScore, sensation: item.discomfortType, locations });
      } else if (!hasRangeProblem && ["same", "normal"].includes(item.active ?? "") && ["same", undefined, "skip"].includes(item.passive)) {
        facts.push({ id: item.id, kind: "motion-range", side: itemSide, action, direction, result: "normal", activeRange: "matches", passiveRange: item.passive === "same" ? "matches" : "not-checked", locationChecked: item.tensionChecked });
      } else if (["unsure", "skip"].includes(item.active ?? "")) {
        facts.push({ id: item.id, kind: "motion-range", side: itemSide, action, direction, result: "unknown", activeRange: "unknown", passiveRange: "unknown", locationChecked: item.tensionChecked });
      } else if (passiveRange === "unknown") {
        // S-03：被动「看不出来/做不了」不丢答案——生成 unknown 事实保留作答痕迹。
        facts.push({ id: item.id, kind: "motion-range", side: itemSide, action, direction, result: "unknown", activeRange: "matches", passiveRange: "unknown", locationChecked: item.tensionChecked });
      }
      return;
    }
    if (item.kind === "strength" && item.simple === "weak") {
      facts.push({ id: item.id, kind: "strength", side: itemSide, action, result: "weak", locations: locations.length ? locations : item.title.includes("膝盖伸直") ? ["股四头肌"] : [] });
      return;
    }
    if (item.kind === "strength" && item.simple === "painful") {
      facts.push({ id: `${item.id}:symptom`, kind: "motion-symptom", side: itemSide, action, result: "painful", symptomScore: item.symptomScore, sensation: item.discomfortType, locations });
      return;
    }
    if (item.kind === "function") {
      if (item.control === "compensated" || item.simple === "present" || item.simple === "weak") {
        facts.push({ id: `${item.id}:control`, kind: "function-control", side: itemSide, action, result: "unstable", locations });
      }
      if (item.discomfort === "yes" || item.simple === "painful" || item.simple === "unable") {
        facts.push({ id: `${item.id}:symptom`, kind: "motion-symptom", side: itemSide, action, result: "painful", symptomScore: item.symptomScore, sensation: item.discomfortType, locations });
      }
    }
  });
  return facts;
}

function treatmentDedupKey(candidateId: string, side: KneeSide) {
  const prefix = `${side}:`;
  const keys: Record<string, string> = {
    "knee-swelling-management": `${prefix}symptom-management:knee-swelling`,
    "knee-medial-soft-tissue": `${prefix}muscle:medial-thigh-pes`,
    "knee-lateral-chain": `${prefix}muscle:lateral-chain`,
    "knee-extension-lateral-chain": `${prefix}muscle:lateral-chain`,
    "knee-anterior-thigh-rectus-femoris": `${prefix}muscle:anterior-thigh-rectus-femoris`,
    "knee-posterior-calf-muscle": `${prefix}muscle:knee-posterior-calf`,
    "knee-extension-control": `${prefix}control:knee-extension`,
    "knee-flexion-control": `${prefix}control:knee-flexion`,
    "knee-extension-joint": `${prefix}joint:knee-extension`,
    "knee-proximal-fibula": `${prefix}joint:proximal-fibula`,
    "knee-hip-knee-control": `${prefix}control:hip-knee-pattern`,
    "knee-quadriceps-strength": `${prefix}control:quadriceps-strength`,
  };
  return keys[candidateId] ?? candidateId;
}

function outcomeValues(outcome: string) {
  if (outcome === "both-match") return { "active-range": "matches", "passive-range": "matches" };
  if (outcome === "passive-match-active-limited") return { "active-range": "limited", "passive-range": "matches" };
  if (["better-passive-limited", "passive-limited", "worse"].includes(outcome)) {
    // S-07：worse 是合法复测取值——主动与被动维度同时受限，被动信息不得丢失。
    return { "active-range": "limited", "passive-range": "limited" };
  }
  console.warn(`[knee-workflow-adapter] 未知的复测结果取值: ${JSON.stringify(outcome)}，已按活动度受限保守处理`);
  return { "active-range": "limited" as const, "passive-range": "not-checked" as const };
}

/**
 * S-02：结构化带侧别标记按侧别分组生成事实；无有效标记时回退压平文本
 * （旧快照兼容，行为与历史版本一致）。
 */
function symptomMarkFindings(
  id: string,
  kind: "swelling" | "tenderness",
  marks: KneeWorkflowMark[] | undefined,
  fallbackLocation: string | undefined,
  fallbackSide: KneeSide,
): KneeFindingFact[] {
  const valid = (marks ?? [])
    .map((mark) => ({ side: toSide(mark.side ?? ""), location: (mark.location ?? "").trim() }))
    .filter((mark) => mark.location);
  if (!valid.length) {
    return [{ id, kind, side: fallbackSide, result: "painful", locations: [fallbackLocation ?? ""].filter(Boolean) }];
  }
  const groups = new Map<KneeSide, string[]>();
  valid.forEach((mark) => {
    const locations = groups.get(mark.side) ?? [];
    locations.push(mark.location);
    groups.set(mark.side, locations);
  });
  return [...groups.entries()].map(([markSide, locations], index) => ({
    id: index === 0 ? id : `${id}:${markSide}`,
    kind,
    side: markSide,
    result: "painful" as const,
    locations,
  }));
}

/**
 * S-05：treatmentKey 的中文侧前缀是记录的真实归属（左侧:/右侧:）。
 * 双侧场景下左右记录必须各自独立推进，不得合成主诉侧的同一个键。
 */
function recordDedupSide(record: KneeWorkflowRecord, fallback: KneeSide): KneeSide {
  const fromKey = /^(左侧|右侧)/.exec(record.treatmentKey ?? "")?.[1];
  return fromKey ? toSide(fromKey) : fallback;
}

export function kneeDecisionInputFromWorkflow(snapshot: KneeWorkflowSnapshot): KneeDecisionInput {
  const side = toSide(snapshot.side);
  const actionId = canonicalKneeAction(snapshot.action);
  const action = snapshot.action || actionLabel(actionId);
  const findings = assessmentFindings(snapshot.assessments, side);
  // S-02：结构化带侧别标记优先；旧快照回退压平文本（兼容不变）。
  if (snapshot.symptoms?.includes("肿胀或淤青")) {
    findings.push(...symptomMarkFindings("workflow:swelling", "swelling", snapshot.swellingMarks, snapshot.swellingLocation || snapshot.location, side));
  }
  if (snapshot.symptoms?.includes("按压痛")) {
    findings.push(...symptomMarkFindings("workflow:tenderness", "tenderness", snapshot.tendernessMarks, snapshot.tendernessLocation || snapshot.location, side));
  }

  const workflowRecords = (snapshot.treatmentRecords ?? []).filter((record) => !record.reviewOnly);
  const treatmentRecords = workflowRecords.filter((record) => !record.retestOnly);
  const completedTreatments: KneeTreatmentRecord[] = treatmentRecords.map((record, index) => ({
    unitId: record.candidateId,
    // S-05：核心处理按记录真实侧别重建规范键；非核心处理沿用原 treatmentKey
    // （其自带中文侧前缀，天然按侧独立），缺失时才按侧别兜底。
    // 原先对英文枚举前缀的 startsWith 判断恒为假（死分支），已删除。
    dedupKey: Object.hasOwn(KNEE_CORE_CANDIDATE_IDS, record.candidateId)
      ? treatmentDedupKey(record.candidateId, recordDedupSide(record, side))
      : record.treatmentKey || treatmentDedupKey(record.candidateId, recordDedupSide(record, side)),
    completedAt: index + 1,
    relatedActionIds: [...new Set([
      ...(record.relatedActionIds ?? []),
      ...Object.keys(record.rangeOutcomes ?? {}).map((directionId) => DIRECTION_ACTION[directionId]).filter((actionId): actionId is KneeActionId => Boolean(actionId)),
    ])],
  }));
  // retestOnly 记录不应再次算作一个新处理，但它携带的范围/主诉结果必须
  // 进入观察序列；否则核心引擎会认为刚才的补测从未发生并重复发问。
  let treatmentSequence = 0;
  const observations = workflowRecords.flatMap((record, index) => {
    if (!record.retestOnly) treatmentSequence += 1;
    const values: KneeObservationRecord[] = Object.entries(record.rangeOutcomes ?? {}).map(([directionId, outcome]) => ({
      id: `workflow:${index}:${directionId}`,
      actionId: DIRECTION_ACTION[directionId] ?? "unknown-task" as KneeActionId,
      treatmentSequence,
      problemIds: [],
      values: { ...outcomeValues(outcome), ...(typeof record.rangeScores?.[directionId] === "number" ? { score: record.rangeScores[directionId] } : {}) },
    }));
    if (record.chiefRetested && actionId && typeof record.afterScore === "number") values.push({
      id: `workflow:${index}:chief`,
      actionId,
      treatmentSequence,
      problemIds: [],
      values: { score: record.afterScore },
    });
    return values;
  });

  return {
    role: toRole(snapshot.role),
    complaints: [{ id: "workflow:chief", side, location: snapshot.location || "膝关节", sensation: snapshot.symptomType, action, score: snapshot.baselineScore }],
    findings,
    completedTreatments,
    observations,
  };
}
