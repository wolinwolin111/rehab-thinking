import { PILOT_RELATIONS, type PilotRegionId, type PilotRelation, type PilotTreatmentCandidate } from "./pilot-knowledge.ts";

export type PilotRole = "general" | "coach" | "rehab";

export type PilotIntakeInput = {
  userRole?: PilotRole | "";
  regionIds: PilotRegionId[];
  locations: string[];
  onset?: string;
  mechanism?: string;
  symptomType?: string;
  symptoms: string[];
  symptomsConfirmed: boolean;
  provocationTypes: string[];
  provocationConfirmed: boolean;
  currentTask?: string;
  noFixedTask?: boolean;
  baselineScoreConfirmed?: boolean;
  swellingLocation?: string;
  tendernessLocation?: string;
  sensoryLocation?: string;
  goal?: number;
};

export type PilotQuestion = {
  id: string;
  title: string;
  reason: string;
  skippable: boolean;
  priority: number;
};

export type PilotFindingInput = {
  id: string;
  result: "limited" | "painful" | "weak" | "positive" | "normal" | "unknown" | "not-testable";
};

export type PilotAssessmentEvidenceState = "abnormal" | "clear" | "incomplete";

export function classifyPilotAssessmentEvidence(findings: PilotFindingInput[]): PilotAssessmentEvidenceState {
  const core = findings.filter((finding) => /^(motion|strength|function):/.test(finding.id));
  if (core.some((finding) => ["limited", "painful", "weak", "positive"].includes(finding.result))) return "abnormal";
  if (!core.length || core.some((finding) => ["unknown", "not-testable"].includes(finding.result))) return "incomplete";
  return "clear";
}

export type PilotTreatmentUnit = PilotTreatmentCandidate & {
  relationIds: string[];
};

export type PilotDecisionTrace = {
  matchedRelationIds: string[];
  intakeQuestions: PilotQuestion[];
  assessmentIds: string[];
  treatmentUnits: PilotTreatmentUnit[];
  trainingIds: string[];
};

export const PILOT_QUESTION_BUDGET = 5;
export const PILOT_ASSESSMENT_BUDGET: Record<PilotRole, number> = {
  general: 4,
  coach: 5,
  rehab: 6,
};

function relationSources(input: PilotIntakeInput) {
  return {
    location: [...input.locations, input.swellingLocation, input.tendernessLocation, input.sensoryLocation].filter(Boolean).join(" "),
    symptom: [input.symptomType, ...input.symptoms].filter(Boolean).join(" "),
    task: [input.mechanism, ...input.provocationTypes, input.currentTask].filter(Boolean).join(" "),
  };
}

function containsAny(source: string, tokens: string[] | undefined) {
  return Boolean(tokens?.some((token) => source.includes(token)));
}

function relationScore(relation: PilotRelation, input: PilotIntakeInput) {
  if (!input.regionIds.includes(relation.regionId)) return -1;
  const sources = relationSources(input);
  const locationMatch = containsAny(sources.location, relation.locationTokens);
  const symptomMatch = containsAny(sources.symptom, relation.symptomTokens);
  const taskMatch = containsAny(sources.task, relation.taskTokens);
  const needsSymptomOrTask = Boolean(relation.symptomTokens?.length || relation.taskTokens?.length);

  // A broad body-region word is only an entry gate. It must not activate every
  // case relation for that joint. Relations with symptom/task conditions need
  // both a relevant location and at least one matching clinical clue.
  if (!locationMatch) return -1;
  if (relation.clueMode === "all") {
    if (relation.symptomTokens?.length && !symptomMatch) return -1;
    if (relation.taskTokens?.length && !taskMatch) return -1;
  } else if (needsSymptomOrTask && !symptomMatch && !taskMatch) return -1;
  let score = 1;
  if (locationMatch) score += 5;
  if (symptomMatch) score += 3;
  if (taskMatch) score += 4;
  if (relation.evidence === "P3") score += 2;
  else if (relation.evidence === "P2") score += 1;
  return score;
}

export function matchPilotRelations(input: PilotIntakeInput) {
  return PILOT_RELATIONS
    .map((relation) => ({ relation, score: relationScore(relation, input) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.relation.id.localeCompare(b.relation.id));
}

/**
 * Typical first-pass intake is capped at five questions. Conditional detail is
 * requested only when its parent symptom exists; unknown remains a valid state.
 */
export function buildPilotIntakeQuestionQueue(input: PilotIntakeInput): PilotQuestion[] {
  const questions: PilotQuestion[] = [];
  const push = (question: PilotQuestion, missing: boolean) => { if (missing) questions.push(question); };

  push({ id: "role", title: "这次由谁完成检查？", reason: "决定动作说明和可用检查", skippable: false, priority: 100 }, !input.userRole);
  push({ id: "locations", title: "哪里最不舒服？", reason: "确定首个问题和相邻功能模块", skippable: false, priority: 98 }, input.locations.length === 0);
  push({ id: "onset", title: "这种情况出现多久了？", reason: "区分急性反应和后续恢复", skippable: true, priority: 88 }, !input.onset);
  push({ id: "mechanism", title: "它是怎么出现的？", reason: "只在会改变安全或评估顺序时使用", skippable: true, priority: 86 }, !input.mechanism);
  push({ id: "symptom", title: "现在最明显是什么感觉？", reason: "决定先看症状、活动还是力量", skippable: true, priority: 84 }, !input.symptomType);
  push({ id: "current-state", title: "目前还有哪些情况？", reason: "肿胀、受限、无力和感觉变化会进入不同路径", skippable: true, priority: 82 }, !input.symptomsConfirmed);
  push({ id: "provocation", title: "什么情况下最容易出现？", reason: "建立可重复的检查或允许没有固定动作", skippable: true, priority: 76 }, !input.provocationConfirmed && !input.noFixedTask);
  push({ id: "swelling-location", title: "具体哪里肿？", reason: "后续按同一位置跟踪变化", skippable: true, priority: 74 }, input.symptoms.includes("肿胀或淤青") && !input.swellingLocation);
  push({ id: "tenderness-location", title: "具体哪里按压不舒服？", reason: "记录位置，不要求当场消失", skippable: true, priority: 72 }, input.symptoms.includes("按压痛") && !input.tendernessLocation);
  push({ id: "sensory-location", title: "麻或电感到哪里？", reason: "决定是否需要专业确认", skippable: true, priority: 96 }, input.symptoms.includes("麻、电或感觉变化") && !input.sensoryLocation);
  push({ id: "score", title: "现在有多不舒服？", reason: "只有存在可重复症状时用于前后比较", skippable: true, priority: 64 }, Boolean(input.currentTask && !input.noFixedTask && !input.baselineScoreConfirmed));
  push({ id: "goal", title: "这次最希望恢复到什么程度？", reason: "决定训练阶段，不要求说出某个具体动作", skippable: false, priority: 60 }, !input.goal);

  return questions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, PILOT_QUESTION_BUDGET);
}

function taskPriority(id: string, input: PilotIntakeInput) {
  const task = `${input.currentTask ?? ""} ${input.provocationTypes.join(" ")}`;
  if (/绷直膝|膝盖绷直|伸直膝|膝伸直|伸膝/.test(task) && id === "motion:knee-extension") return 85;
  if (/弯膝|屈膝|膝弯曲/.test(task) && id === "motion:knee-flexion") return 84;
  if (/下楼|下台阶/.test(task) && id === "function:knee-step-down") return 80;
  if (/上楼|上台阶/.test(task) && id === "function:knee-step-up") return 80;
  if (/蹲|坐站|起身/.test(task) && id === "function:knee-squat") return 75;
  if (/走|承重/.test(task) && id === "function:ankle-weight-bearing") return 75;
  if (/提踵|蹬地/.test(task) && id === "function:ankle-heel-raise") return 75;
  if (/脚背向下|踩油门|跖屈|向下压/.test(task) && id === "motion:ankle-plantarflexion") return 85;
  if (/勾脚|脚背向上|背屈/.test(task) && id === "motion:ankle-dorsiflexion") return 85;
  if (/脚(?:掌|底)向外|外翻/.test(task) && id === "motion:ankle-eversion") return 85;
  if (/脚(?:掌|底)向内|内翻/.test(task) && id === "motion:ankle-inversion") return 85;
  if (/跑|冲刺|迈步|弯腰/.test(task) && id === "motion:thigh-back-length") return 85;
  if (/踢|起身|下蹲|弯膝/.test(task) && id === "motion:thigh-front-length") return 85;
  if (/夹腿|侧移|变向/.test(task) && id === "motion:thigh-medial-length") return 85;
  if (/单腿|侧卧|向外抬/.test(task) && id === "motion:thigh-lateral-load") return 85;
  if (/勾脚|抬脚/.test(task) && id === "motion:calf-dorsiflexion") return 85;
  if (/提踵|蹬地|跑|跳/.test(task) && id === "motion:calf-plantarflexion") return 85;
  if (/内翻|足弓/.test(task) && id === "motion:calf-inversion") return 85;
  if (/外翻|单腿/.test(task) && id === "motion:calf-eversion") return 85;
  if (/起身|坐站|下蹲/.test(task) && id === "function:thigh-sit-stand") return 82;
  if (/臀桥|后侧链|冲刺|大腿后/.test(task) && id === "function:thigh-bridge-check") return 82;
  if (/单腿|侧移|变向|大腿内|大腿外/.test(task) && id === "function:thigh-single-leg") return 82;
  if (/走|迈步/.test(task) && id === "function:thigh-walk") return 80;
  if (/跑|冲刺/.test(task) && id === "function:thigh-jog") return 80;
  if (/走|抬脚/.test(task) && id === "function:calf-walk") return 80;
  if (/提踵|蹬地/.test(task) && id === "function:calf-heel-raise") return 82;
  if (/单腿|足弓|内侧|外侧|不稳/.test(task) && id === "function:calf-single-leg") return 82;
  if (/跑|跳/.test(task) && id === "function:calf-jog") return 80;
  return 0;
}

function locationPriority(id: string, input: PilotIntakeInput) {
  const location = input.locations.join(" ");
  if (/膝/.test(location) && ["motion:knee-extension", "motion:knee-flexion"].includes(id)) return 36;
  if (/膝前|髌骨/.test(location) && id === "strength:knee-quadriceps") return 28;
  if (/膝内侧|鹅足/.test(location) && ["strength:knee-adductor-pes", "function:knee-step-down"].includes(id)) return 30;
  if (/膝外侧/.test(location) && id === "strength:knee-glute") return 28;
  if (/膝后|腘窝/.test(location) && id === "strength:knee-hamstring") return 28;
  if (/外踝|小腿外侧/.test(location) && ["motion:ankle-inversion", "motion:ankle-eversion", "strength:ankle-evertor"].includes(id)) return 34;
  if (/内踝|足弓内侧|小腿内侧/.test(location) && ["motion:ankle-inversion", "strength:ankle-invertor"].includes(id)) return 34;
  if (/踝前|脚背/.test(location) && id === "motion:ankle-dorsiflexion") return 34;
  if (/跟腱|脚跟|小腿后侧/.test(location) && ["motion:ankle-dorsiflexion", "strength:ankle-calf"].includes(id)) return 32;
  if (/大腿前/.test(location) && ["motion:thigh-front-length", "strength:thigh-front-strength"].includes(id)) return 45;
  if (/大腿后/.test(location) && ["motion:thigh-back-length", "strength:thigh-back-strength"].includes(id)) return 45;
  if (/大腿内/.test(location) && ["motion:thigh-medial-length", "strength:thigh-medial-strength"].includes(id)) return 45;
  if (/大腿外/.test(location) && ["motion:thigh-lateral-load", "strength:thigh-lateral-strength"].includes(id)) return 45;
  if (/小腿前|胫骨前/.test(location) && ["motion:calf-dorsiflexion", "strength:calf-dorsiflexor-strength"].includes(id)) return 45;
  if (/小腿后|腓肠肌/.test(location) && ["motion:calf-plantarflexion", "strength:calf-heel-raise-strength"].includes(id)) return 45;
  if (/小腿内/.test(location) && ["motion:calf-inversion", "strength:calf-invertor-strength"].includes(id)) return 45;
  if (/小腿外/.test(location) && ["motion:calf-eversion", "strength:calf-evertor-strength"].includes(id)) return 45;
  return 0;
}

export function rankPilotAssessmentIds(input: PilotIntakeInput, availableIds: string[]) {
  const role = input.userRole || "general";
  const relationEntries = matchPilotRelations(input);
  const locationSource = input.locations.join(" ");
  const localToeOnly = /足趾|大拇趾|小拇趾|足趾根部/.test(locationSource)
    && !/脚踝|内踝|外踝|小腿|膝|走路困难|不稳/.test(locationSource);
  const acuteAnkle = input.regionIds.includes("ankle-foot")
    && /今天|昨天|2～7天/.test(input.onset ?? "")
    && /崴|扭|撞|跌|拉伤/.test(input.mechanism ?? "");
  const ankleSprainHistory = input.regionIds.includes("ankle-foot")
    && /崴|扭/.test(`${input.mechanism ?? ""} ${input.currentTask ?? ""}`);
  const relationScores = new Map<string, number>();
  relationEntries.forEach(({ relation, score }) => relation.assessmentIds.forEach((id) => {
    relationScores.set(id, Math.max(relationScores.get(id) ?? 0, score * 10));
  }));

  if (input.regionIds.includes("thigh-local") || input.regionIds.includes("calf-local")) {
    const thigh = input.regionIds.includes("thigh-local");
    const localPrefix = thigh ? "thigh-" : "calf-";
    const location = input.locations[0] ?? "";
    // 补查方向由当前功能场景触发，不用“跑跳或拉伤”这类受伤机制
    // 自动扩题；否则用户只说局部不适也会被当成跑步功能问题。
    const task = `${input.currentTask ?? ""} ${input.provocationTypes.join(" ")}`;
    const area = /前/.test(location) ? "front" : /后|腓肠/.test(location) ? "back" : /内/.test(location) ? "medial" : /外/.test(location) ? "lateral" : "front";
    const primaryMotion = thigh
      ? { front: "motion:thigh-front-length", back: "motion:thigh-back-length", medial: "motion:thigh-medial-length", lateral: "motion:thigh-lateral-load" }[area]
      : { front: "motion:calf-dorsiflexion", back: "motion:calf-plantarflexion", medial: "motion:calf-inversion", lateral: "motion:calf-eversion" }[area];
    const supportMotions: string[] = [];
    if (thigh) {
      if (area === "front") supportMotions.push("motion:thigh-back-length");
      if (area === "back") supportMotions.push(/走|跑|冲刺|单腿|台阶/.test(task) ? "motion:thigh-lateral-load" : "motion:thigh-front-length");
      if (area === "medial") supportMotions.push("motion:thigh-lateral-load");
      if (area === "lateral") supportMotions.push("motion:thigh-medial-length");
    } else {
      if (area === "front") supportMotions.push("motion:calf-plantarflexion");
      if (area === "back") supportMotions.push("motion:calf-dorsiflexion");
      if (area === "medial") supportMotions.push("motion:calf-eversion");
      if (area === "lateral") supportMotions.push("motion:calf-inversion");
      if (area === "lateral" && /前外|崴|扭|勾脚|抬脚/.test(`${location} ${task}`)) supportMotions.push("motion:calf-dorsiflexion");
    }
    const localFunctions = availableIds
      .filter((id) => id.startsWith("function:") && id.includes(localPrefix))
      .sort((a, b) => taskPriority(b, input) - taskPriority(a, input));
    const areaFunction = thigh
      ? { front: "function:thigh-sit-stand", back: "function:thigh-bridge-check", medial: "function:thigh-single-leg", lateral: "function:thigh-single-leg" }[area]
      : { front: "function:calf-walk", back: "function:calf-heel-raise", medial: "function:calf-single-leg", lateral: "function:calf-single-leg" }[area];
    const preferredFunction = localFunctions.find((id) => taskPriority(id, input) > 0)
      ?? localFunctions.find((id) => id === areaFunction)
      ?? localFunctions.find((id) => id.endsWith("-walk"))
      ?? localFunctions[0];
    const scoped = [primaryMotion, ...supportMotions, preferredFunction]
      .filter((id): id is string => Boolean(id && availableIds.includes(id)))
      .filter((id, index, list) => list.indexOf(id) === index);
    return scoped.slice(0, PILOT_ASSESSMENT_BUDGET[role]);
  }

  const rankedIds = availableIds
    .filter((id, index) => availableIds.indexOf(id) === index)
    .map((id, index) => {
      const taskScore = localToeOnly && !id.includes("toe") ? 0 : taskPriority(id, input);
      return {
      id,
      taskScore,
      score: (relationScores.get(id) ?? 0)
        + taskScore
        + locationPriority(id, input)
        - (acuteAnkle && id.startsWith("strength:") ? 55 : 0)
        - (localToeOnly && !id.includes("toe") ? 90 : 0),
      index,
    }; })
    // 用户明确说出的主诉动作必须先检查；来源关系只能补充，不能把主诉挤出首轮。
    .sort((a, b) => Number(b.taskScore > 0) - Number(a.taskScore > 0) || b.score - a.score || a.index - b.index)
    .map((entry) => entry.id);

  if (ankleSprainHistory && !localToeOnly) {
    const ankleMotionIds = [
      "motion:ankle-dorsiflexion",
      "motion:ankle-eversion",
      "motion:ankle-plantarflexion",
      "motion:ankle-inversion",
    ].filter((id) => availableIds.includes(id));
    const explicitDirection = rankedIds.find((id) => ankleMotionIds.includes(id) && taskPriority(id, input) > 0);
    const explicitFunction = rankedIds.find((id) => id.startsWith("function:") && taskPriority(id, input) > 0);
    const orderedMotions = [
      ...(explicitDirection ? [explicitDirection] : []),
      ...ankleMotionIds.filter((id) => id !== explicitDirection),
    ];
    // 急性崴脚的四方向是完整基础检查组；背屈和外翻控制会嵌入对应
    // 活动卡内，不额外增加两张检查卡。跖屈/内翻力量只按功能线索追加。
    return [
      ...orderedMotions,
      ...(explicitFunction ? [explicitFunction] : []),
      ...rankedIds.filter((id) => !ankleMotionIds.includes(id) && id !== explicitFunction),
    ].slice(0, Math.max(PILOT_ASSESSMENT_BUDGET[role], orderedMotions.length + Number(Boolean(explicitFunction))));
  }

  if (input.regionIds.includes("ankle-foot") && !localToeOnly) {
    const ankleMotionIds = [
      "motion:ankle-dorsiflexion",
      "motion:ankle-eversion",
      "motion:ankle-plantarflexion",
      "motion:ankle-inversion",
    ].filter((id) => availableIds.includes(id));
    const explicitDirections = rankedIds.filter((id) => ankleMotionIds.includes(id) && taskPriority(id, input) > 0);
    const ankleContext = `${locationSource} ${input.symptomType ?? ""} ${input.symptoms.join(" ")} ${input.currentTask ?? ""} ${input.provocationTypes.join(" ")}`;
    const locationMotions = /内踝|足弓内|内侧足弓|踝内/.test(locationSource)
      ? ["motion:ankle-inversion", "motion:ankle-eversion", ...(/走|承重|下蹲|台阶|楼梯/.test(ankleContext) ? ["motion:ankle-dorsiflexion"] : [])]
      : /跟腱|踝正后方|脚跟后|足跟后/.test(locationSource)
        ? ["motion:ankle-plantarflexion", "motion:ankle-dorsiflexion"]
        : /踝前|脚背|足背/.test(locationSource)
          ? ["motion:ankle-dorsiflexion", "motion:ankle-plantarflexion"]
          : /外踝|踝外|前外侧|不稳|打软|容易崴/.test(ankleContext)
            ? ["motion:ankle-eversion", "motion:ankle-dorsiflexion"]
            : ["motion:ankle-dorsiflexion", "motion:ankle-eversion"];
    const selectedMotions = [...explicitDirections, ...locationMotions]
      .filter((id) => ankleMotionIds.includes(id))
      .filter((id, index, list) => list.indexOf(id) === index);
    const explicitFunction = rankedIds.find((id) => id.startsWith("function:") && taskPriority(id, input) > 0);
    return [
      ...selectedMotions,
      ...(explicitFunction ? [explicitFunction] : []),
      // 未被位置或当前动作选中的踝方向不再为了填满题量预算而出现。
      ...rankedIds.filter((id) => !ankleMotionIds.includes(id) && id !== explicitFunction),
    ].slice(0, Math.max(PILOT_ASSESSMENT_BUDGET[role], selectedMotions.length + Number(Boolean(explicitFunction))));
  }

  if (input.regionIds.includes("knee")) {
    const kneeMotionIds = [
      "motion:knee-extension",
      "motion:knee-flexion",
    ].filter((id) => availableIds.includes(id));
    const explicitFunction = rankedIds.find((id) => id.startsWith("function:") && taskPriority(id, input) > 0);
    const localKneeCheck = /膝前|髌骨|髌骨下|髌腱/.test(locationSource)
      ? ["special:knee-patella-tenderness-self"].find((id) => availableIds.includes(id))
      : /膝内侧|膝外侧|关节线/.test(locationSource)
        ? ["special:knee-joint-line-tenderness"].find((id) => availableIds.includes(id))
        : undefined;
    const hamstringStrength = /屈膝|弯膝发力|脚跟向后拉|膝后无力|大腿后侧无力/.test(`${input.currentTask ?? ""} ${input.symptomType ?? ""} ${input.symptoms.join(" ")}`)
      ? ["strength:knee-hamstring"].find((id) => availableIds.includes(id))
      : undefined;

    // 膝伸直和弯曲是完整的基础活动检查组，不能被力量或功能检查挤掉。
    // 主诉功能动作仍可先复现；进入关节活动后固定先看伸直，再看弯曲。
    return [
      ...(explicitFunction ? [explicitFunction] : []),
      ...kneeMotionIds,
      ...(localKneeCheck ? [localKneeCheck] : []),
      ...(hamstringStrength ? [hamstringStrength] : []),
      ...rankedIds.filter((id) => !kneeMotionIds.includes(id) && id !== explicitFunction && id !== localKneeCheck && id !== hamstringStrength),
    ].slice(0, Math.max(PILOT_ASSESSMENT_BUDGET[role], kneeMotionIds.length + Number(Boolean(explicitFunction)) + Number(Boolean(localKneeCheck)) + Number(Boolean(hamstringStrength))));
  }

  return rankedIds.slice(0, PILOT_ASSESSMENT_BUDGET[role]);
}

export function buildPilotTreatmentUnits(input: PilotIntakeInput, findings: PilotFindingInput[]) {
  const abnormalIds = new Set(findings.filter((finding) => !["normal", "unknown", "not-testable"].includes(finding.result)).map((finding) => finding.id));
  const matched = matchPilotRelations(input);
  const units = new Map<string, PilotTreatmentUnit>();

  matched.forEach(({ relation }) => relation.treatmentCandidates.forEach((candidate) => {
    const symptomManagement = candidate.kind === "symptom-management" && input.symptoms.includes("肿胀或淤青");
    const supportedByFinding = candidate.retestIds.some((id) => abnormalIds.has(id));
    if (!symptomManagement && !supportedByFinding) return;

    const key = `${candidate.kind}:${candidate.site}`;
    const existing = units.get(key);
    if (existing) {
      existing.retestIds = Array.from(new Set([...existing.retestIds, ...candidate.retestIds.filter((id) => abnormalIds.has(id))]));
      existing.relationIds = Array.from(new Set([...existing.relationIds, relation.id]));
      return;
    }
    units.set(key, {
      ...candidate,
      retestIds: candidate.retestIds.filter((id) => abnormalIds.has(id)),
      relationIds: [relation.id],
    });
  }));

  const order: Record<PilotTreatmentCandidate["kind"], number> = {
    "symptom-management": 0,
    muscle: 1,
    joint: 2,
    control: 3,
  };
  return [...units.values()].sort((a, b) =>
    order[a.kind] - order[b.kind]
    || (b.priority ?? 0) - (a.priority ?? 0),
  ).slice(0, 5);
}

export function buildPilotDecisionTrace(
  input: PilotIntakeInput,
  availableAssessmentIds: string[],
  findings: PilotFindingInput[] = [],
): PilotDecisionTrace {
  const matched = matchPilotRelations(input);
  const treatmentUnits = buildPilotTreatmentUnits(input, findings);
  const trainingIds = Array.from(new Set([
    ...matched.flatMap(({ relation }) => relation.trainingIds),
    ...treatmentUnits.filter((unit) => unit.kind === "control").map((unit) => unit.id),
  ])).slice(0, 4);
  return {
    matchedRelationIds: matched.map(({ relation }) => relation.id),
    intakeQuestions: buildPilotIntakeQuestionQueue(input),
    assessmentIds: rankPilotAssessmentIds(input, availableAssessmentIds),
    treatmentUnits,
    trainingIds,
  };
}
