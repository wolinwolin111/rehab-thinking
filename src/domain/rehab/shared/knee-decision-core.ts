export type KneeUserRole = "general" | "coach" | "rehab";
export type KneeSide = "left" | "right" | "bilateral" | "midline" | "unknown";
export type KneeProblemKind =
  | "chief-symptom"
  | "motion-range"
  | "motion-symptom"
  | "strength"
  | "function-control"
  | "swelling"
  | "tenderness"
  | "sensory"
  | "boundary";
export type KneeProblemStatus =
  | "needs-assessment"
  | "confirmed"
  | "ready-for-treatment"
  | "covered-this-round"
  | "improved"
  | "resolved"
  | "still-present"
  | "handoff-to-training"
  | "review-later"
  | "needs-professional-review";
export type KneeFindingResult = "limited" | "painful" | "weak" | "unstable" | "normal" | "unknown" | "not-testable";

export type KneeComplaintFact = {
  id: string;
  side: KneeSide;
  location: string;
  sensation?: string;
  action?: string;
  score?: number;
  priority?: number;
};

export type KneeFindingFact = {
  id: string;
  kind: Exclude<KneeProblemKind, "chief-symptom">;
  side: KneeSide;
  action?: string;
  direction?: "extension" | "flexion";
  result: KneeFindingResult;
  activeRange?: "matches" | "limited" | "unknown";
  passiveRange?: "matches" | "limited" | "not-checked" | "unknown";
  symptomScore?: number;
  passiveEndFeel?: "soft" | "elastic" | "firm" | "hard" | "painful" | "unknown";
  sensation?: string;
  locations?: string[];
  locationChecked?: boolean;
};

export type KneeProblem = {
  id: string;
  kind: KneeProblemKind;
  side: KneeSide;
  title: string;
  canonicalActionId?: KneeActionId;
  direction?: "extension" | "flexion";
  status: KneeProblemStatus;
  priority: number;
  metrics: Array<"score" | "active-range" | "passive-range" | "control" | "strength" | "swelling" | "tenderness">;
  evidenceIds: string[];
  sourceLabels: string[];
};

export type KneeActionId =
  | "knee-extension"
  | "knee-flexion"
  | "step-down"
  | "step-up"
  | "squat"
  | "sit-to-stand"
  | "walk"
  | "run"
  | "jump-land"
  | "single-leg-balance"
  | "single-leg-squat"
  | "hip-hinge"
  | "unknown-task";

export type KneeTreatmentKind = "symptom-management" | "muscle" | "joint" | "control";
export type KneeTreatmentUnit = {
  id: string;
  dedupKey: string;
  kind: KneeTreatmentKind;
  site: string;
  action: string;
  primaryProblemId: string;
  affectedProblemIds: string[];
  relatedActionIds: KneeActionId[];
  attribution: "primary-supported" | "primary-hypothesis" | "group-only";
  permission: "all" | "coach-rehab" | "rehab-only";
  sourceCaseIds: string[];
  mode?: "treat-and-retest" | "retest-only";
};

export type KneeTreatmentRecord = {
  unitId: string;
  dedupKey: string;
  completedAt: number;
  relatedActionIds?: KneeActionId[];
};

export type KneeRetestObservation = {
  actionId: KneeActionId;
  title: string;
  problemIds: string[];
  metrics: KneeProblem["metrics"];
  timing: "same-session" | "later";
  reuseObservationId?: string;
};

export type KneeAssessmentCheck = {
  id: string;
  title: string;
  instruction: string;
  record: string;
  actionId: KneeActionId;
};

export type KneeObservationRecord = {
  id: string;
  actionId: KneeActionId;
  treatmentSequence: number;
  problemIds: string[];
  values: Partial<Record<KneeProblem["metrics"][number], number | string>>;
};

export type KneeDecisionInput = {
  role: KneeUserRole;
  complaints: KneeComplaintFact[];
  findings: KneeFindingFact[];
  completedTreatments?: KneeTreatmentRecord[];
  observations?: KneeObservationRecord[];
};

export type KneeDecisionOutput = {
  problems: KneeProblem[];
  assessmentChecks: KneeAssessmentCheck[];
  currentProblemId?: string;
  treatmentUnits: KneeTreatmentUnit[];
  currentTreatment?: KneeTreatmentUnit;
  retestPlan: KneeRetestObservation[];
  finalRetestPlan: KneeRetestObservation[];
  deferredProblemIds: string[];
};

const ACTION_ALIASES: Array<[KneeActionId, RegExp]> = [
  ["step-down", /下楼|下台阶|台阶下降|从台阶往下|下阶/],
  ["step-up", /上楼|上台阶|登阶|上阶/],
  ["knee-extension", /膝盖绷直|绷直膝|伸直膝|膝关节伸直|伸膝|膝后下压/],
  ["knee-flexion", /弯膝|屈膝|脚跟滑向臀|膝关节屈曲/],
  ["single-leg-squat", /单腿蹲|单脚蹲/],
  ["squat", /下蹲|蹲起|深蹲/],
  ["sit-to-stand", /坐站|从椅子站起|起身/],
  ["single-leg-balance", /单腿站|单脚站|单腿平衡/],
  ["hip-hinge", /屈髋|髋折叠|站立位屈髋/],
  ["jump-land", /跳跃|落地|蹦跳/],
  ["run", /跑步|跑动|慢跑/],
  ["walk", /走路|步行|行走/],
];

const ACTION_TITLES: Record<KneeActionId, string> = {
  "knee-extension": "把膝盖绷直",
  "knee-flexion": "把膝盖弯曲",
  "step-down": "下台阶",
  "step-up": "上台阶",
  squat: "下蹲",
  "sit-to-stand": "从椅子站起",
  walk: "走路",
  run: "跑步",
  "jump-land": "跳跃落地",
  "single-leg-balance": "单腿站",
  "single-leg-squat": "单腿下蹲",
  "hip-hinge": "站立屈髋",
  "unknown-task": "原来的不适动作",
};

export function canonicalKneeAction(value?: string): KneeActionId | undefined {
  if (!value?.trim()) return undefined;
  return ACTION_ALIASES.find(([, pattern]) => pattern.test(value))?.[0] ?? "unknown-task";
}

function unique<T>(values: T[]) {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function problemKey(problem: Pick<KneeProblem, "kind" | "side" | "canonicalActionId" | "direction">) {
  const actionOrDirection = problem.canonicalActionId ?? problem.direction ?? "none";
  const normalizedKind = problem.kind === "motion-symptom" && problem.canonicalActionId ? "chief-symptom" : problem.kind;
  return `${problem.side}:${normalizedKind}:${actionOrDirection}`;
}

function mergeProblem(current: KneeProblem, incoming: KneeProblem): KneeProblem {
  return {
    ...current,
    priority: Math.max(current.priority, incoming.priority),
    status: current.status === "needs-assessment" ? incoming.status : current.status,
    metrics: unique([...current.metrics, ...incoming.metrics]),
    evidenceIds: unique([...current.evidenceIds, ...incoming.evidenceIds]),
    sourceLabels: unique([...current.sourceLabels, ...incoming.sourceLabels]),
  };
}

function findingTitle(fact: KneeFindingFact, actionId?: KneeActionId) {
  if (actionId) {
    const resultLabel = fact.result === "limited"
      ? "范围偏小"
      : fact.result === "weak"
        ? "力量偏弱"
        : fact.result === "unstable"
          ? "控制不稳"
          : "会不适";
    return `${ACTION_TITLES[actionId]}${resultLabel}`;
  }
  const site = fact.locations?.join("、") || "检查区域";
  const kindLabel: Partial<Record<KneeProblemKind, string>> = {
    swelling: "有肿胀",
    tenderness: "按压不适",
    strength: "力量偏弱",
    "function-control": "控制不稳",
    sensory: "感觉异常",
    boundary: "需要进一步确认",
  };
  return `${site}${kindLabel[fact.kind] ?? "检查异常"}`;
}

export function buildKneeProblems(complaints: KneeComplaintFact[], findings: KneeFindingFact[]) {
  const merged = new Map<string, KneeProblem>();
  const add = (problem: KneeProblem) => {
    const key = problemKey(problem);
    merged.set(key, merged.has(key) ? mergeProblem(merged.get(key)!, problem) : problem);
  };

  complaints.forEach((fact, index) => {
    const actionId = canonicalKneeAction(fact.action);
    add({
      id: `problem:chief:${fact.id}`,
      kind: "chief-symptom",
      side: fact.side,
      title: actionId ? `${ACTION_TITLES[actionId]}时${fact.location}${fact.sensation ?? "不适"}` : `${fact.location}${fact.sensation ?? "不适"}`,
      canonicalActionId: actionId,
      status: actionId ? "ready-for-treatment" : "needs-assessment",
      priority: fact.priority ?? 100 - index,
      metrics: typeof fact.score === "number" ? ["score"] : [],
      evidenceIds: [fact.id],
      sourceLabels: ["主诉"],
    });
  });

  findings.filter((fact) => !["normal", "unknown", "not-testable"].includes(fact.result)).forEach((fact) => {
    const actionId = canonicalKneeAction(fact.action) ?? (fact.direction === "extension" ? "knee-extension" : fact.direction === "flexion" ? "knee-flexion" : undefined);
    const metrics: KneeProblem["metrics"] = fact.kind === "motion-range"
      ? ["active-range", ...(fact.passiveRange && !["not-checked", "unknown"].includes(fact.passiveRange) ? ["passive-range" as const] : [])]
      : fact.kind === "strength" ? ["strength"]
        : fact.kind === "function-control" ? ["control"]
          : fact.kind === "swelling" ? ["swelling"]
            : fact.kind === "tenderness" ? ["tenderness"]
              : fact.symptomScore === undefined ? [] : ["score"];
    add({
      id: `problem:${fact.id}`,
      kind: fact.kind,
      side: fact.side,
      title: findingTitle(fact, actionId),
      canonicalActionId: actionId,
      direction: fact.direction,
      status: ["strength", "function-control"].includes(fact.kind) ? "handoff-to-training" : fact.kind === "swelling" || fact.kind === "tenderness" ? "review-later" : "confirmed",
      priority: fact.kind === "motion-range" || fact.kind === "motion-symptom" ? 75 : 55,
      metrics,
      evidenceIds: [fact.id],
      sourceLabels: ["评估检查"],
    });
  });

  return [...merged.values()].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

function applyObservationStatuses(input: KneeDecisionInput, problems: KneeProblem[]) {
  return problems.map((problem) => {
    if (!problem.canonicalActionId) return problem;
    const actionObservations = (input.observations ?? []).filter((record) => record.actionId === problem.canonicalActionId);
    if (!actionObservations.length) return problem;
    const latestSequence = Math.max(...actionObservations.map((record) => record.treatmentSequence));
    const currentSequenceObservations = actionObservations.filter((record) => record.treatmentSequence === latestSequence);
    // 主诉分数、主动范围和被动范围可能在同一轮的不同卡片里记录。
    // 每个指标分别读取最后一次有效结果，不能让最后一条“只含分数”的记录
    // 把刚刚确认过的活动度覆盖掉，反之亦然。
    const latestValueForMetric = (metric: KneeProblem["metrics"][number]) => {
      const record = [...currentSequenceObservations].reverse().find((entry) => entry.values[metric] !== undefined);
      return record?.values[metric];
    };
    const observedMetrics = problem.metrics.filter((metric) => latestValueForMetric(metric) !== undefined);
    if (!observedMetrics.length) return problem;

    let improved = false;
    let resolved = observedMetrics.length === problem.metrics.length;
    for (const metric of observedMetrics) {
      const value = latestValueForMetric(metric);
      if (metric === "score" && typeof value === "number") {
        const baseline = input.complaints.find((complaint) => problem.evidenceIds.includes(complaint.id))?.score;
        if (value === 0) improved = true;
        else {
          resolved = false;
          if (typeof baseline === "number" && value < baseline) improved = true;
        }
      } else if (["active-range", "passive-range"].includes(metric)) {
        if (value === "matches") improved = true;
        else {
          resolved = false;
        }
      } else if (metric === "control") {
        if (value === "stable") improved = true;
        else {
          resolved = false;
          if (value === "improved") improved = true;
        }
      } else {
        resolved = false;
      }
    }
    // 疼痛分数下降但尚未到 0，可以作为“主诉改善”留到最后统一复测。
    // 活动度、肌力和控制只要仍有任一指标异常，就必须保持在待处理状态；
    // 不能因被动范围改善而把主动范围受限一并标记完成。
    const canRemainImproved = ["chief-symptom", "motion-symptom"].includes(problem.kind);
    return {
      ...problem,
      status: resolved ? "resolved" as const : improved && canRemainImproved ? "improved" as const : "still-present" as const,
    };
  });
}

function hasLocation(finding: KneeFindingFact, pattern: RegExp) {
  return finding.locations?.some((location) => pattern.test(location)) ?? false;
}

function makeUnit(unit: KneeTreatmentUnit, completedKeys: Set<string>) {
  return { ...unit, mode: completedKeys.has(unit.dedupKey) ? "retest-only" as const : "treat-and-retest" as const };
}

function latestTreatmentSequence(input: KneeDecisionInput) {
  return (input.completedTreatments ?? []).length;
}

function hasCurrentObservation(input: KneeDecisionInput, actionId: KneeActionId) {
  const sequence = latestTreatmentSequence(input);
  return (input.observations ?? []).some((record) => record.actionId === actionId && record.treatmentSequence === sequence);
}

function currentObservationCoversMetrics(input: KneeDecisionInput, actionId: KneeActionId, metrics: KneeProblem["metrics"]) {
  const sequence = latestTreatmentSequence(input);
  const records = (input.observations ?? []).filter((record) => record.actionId === actionId && record.treatmentSequence === sequence);
  return metrics.every((metric) => records.some((record) => record.values[metric] !== undefined));
}

function treatmentMetricsForAction(problems: KneeProblem[], treatment: KneeTreatmentUnit, actionId: KneeActionId) {
  return unique(problems
    .filter((problem) => treatment.affectedProblemIds.includes(problem.id) && problem.canonicalActionId === actionId)
    .flatMap((problem) => problem.metrics));
}

function hasPostTreatmentPassiveLimitation(input: KneeDecisionInput, actionId: KneeActionId) {
  const sequence = latestTreatmentSequence(input);
  const latestPassiveObservation = [...(input.observations ?? [])].reverse().find((record) =>
    record.actionId === actionId
    && record.treatmentSequence === sequence
    && record.values["passive-range"] !== undefined);
  return latestPassiveObservation?.values["passive-range"] === "limited";
}

function latestObservedMetric(input: KneeDecisionInput, actionId: KneeActionId, metric: KneeProblem["metrics"][number]) {
  // 只读取当前处理序列的最新观察。旧序列的“被动受限”不能覆盖本轮
  // 已达到健侧的结果，也不能在第二/第三次康复重新触发关节候选。
  const sequence = latestTreatmentSequence(input);
  return [...(input.observations ?? [])].reverse().find((record) =>
    record.actionId === actionId
    && record.treatmentSequence === sequence
    && record.values[metric] !== undefined)?.values[metric];
}

export function buildKneeTreatmentUnits(input: KneeDecisionInput, problems: KneeProblem[]) {
  const completedKeys = new Set((input.completedTreatments ?? []).map((record) => record.dedupKey));
  const byAction = (actionId: KneeActionId) => problems.filter((problem) => problem.canonicalActionId === actionId && !["resolved", "improved"].includes(problem.status));
  const primary = problems.find((problem) => problem.kind === "chief-symptom" && !["resolved", "improved"].includes(problem.status))
    ?? problems.find((problem) => !["resolved", "improved"].includes(problem.status))
    ?? problems.find((problem) => problem.status === "improved");
  if (!primary) return [];
  const units: KneeTreatmentUnit[] = [];
  const push = (unit: KneeTreatmentUnit) => {
    const available = makeUnit(unit, completedKeys);
    if (!units.some((entry) => entry.dedupKey === available.dedupKey)) units.push(available);
  };
  const motionExtension = byAction("knee-extension").length
    ? input.findings.find((finding) => finding.kind === "motion-range" && finding.direction === "extension" && finding.result === "limited")
    : undefined;
  const motionFlexion = byAction("knee-flexion").length
    ? input.findings.find((finding) => finding.kind === "motion-range" && finding.direction === "flexion" && finding.result === "limited")
    : undefined;
  const extensionPassiveRange = motionExtension
    ? latestObservedMetric(input, "knee-extension", "passive-range") ?? motionExtension.passiveRange
    : undefined;
  const posteriorEvidence = input.findings.some((finding) => hasLocation(finding, /膝后|小腿上端|腘肌|腘绳|腓肠肌/));
  const stepDownProblems = byAction("step-down");
  const squatProblems = byAction("squat");
  const medialLoadProblems = [...stepDownProblems, ...squatProblems];

  if (input.findings.some((finding) => finding.kind === "swelling" && finding.result !== "normal")) {
    push({ id: "knee-swelling-management", dedupKey: `${primary.side}:symptom-management:knee-swelling`, kind: "symptom-management", site: "肿胀区域", action: "完成一次低刺激肿胀管理，今天晚些时候或下次再比较轮廓和范围", primaryProblemId: primary.id, affectedProblemIds: problems.filter((problem) => problem.kind === "swelling").map((problem) => problem.id), relatedActionIds: [], attribution: "primary-supported", permission: "all", sourceCaseIds: ["KNEE-003", "MULTI-001"] });
  }

  const pesEvidence = input.findings.some((finding) => hasLocation(finding, /鹅足|膝内下|缝匠肌|股薄肌|半腱肌/));
  const adductorEvidence = input.findings.some((finding) => hasLocation(finding, /大腿内侧|内收肌/));
  if (medialLoadProblems.length && /内侧|鹅足/.test(primary.title)) {
    const lateralEvidence = input.findings.some((finding) => hasLocation(finding, /大腿外侧|阔筋膜张肌|髂胫束/)) || Boolean(motionExtension);
    const medialLoadActions = unique(medialLoadProblems.map((problem) => problem.canonicalActionId).filter((action): action is KneeActionId => Boolean(action)));
    if (pesEvidence) push({ id: "knee-medial-soft-tissue", dedupKey: `${primary.side}:muscle:pes-anserine`, kind: "muscle", site: "鹅足相关肌肉", action: "轻柔松解检查中更紧或更酸的鹅足相关肌肉", primaryProblemId: primary.id, affectedProblemIds: unique([...medialLoadProblems.map((problem) => problem.id), ...byAction("knee-extension").map((problem) => problem.id)]), relatedActionIds: unique([...medialLoadActions, ...(motionExtension ? ["knee-extension" as const] : [])]), attribution: "primary-hypothesis", permission: "all", sourceCaseIds: ["KNEE-005"] });
    if (adductorEvidence) push({ id: "knee-medial-adductor", dedupKey: `${primary.side}:muscle:thigh-adductor`, kind: "muscle", site: "大腿内收肌", action: "轻柔松解检查中更紧或更酸的内收肌区域", primaryProblemId: primary.id, affectedProblemIds: unique([...medialLoadProblems.map((problem) => problem.id), ...byAction("knee-extension").map((problem) => problem.id)]), relatedActionIds: unique([...medialLoadActions, ...(motionExtension ? ["knee-extension" as const] : [])]), attribution: "primary-hypothesis", permission: "all", sourceCaseIds: ["KNEE-005"] });
    if (lateralEvidence) push({ id: "knee-lateral-chain", dedupKey: `${primary.side}:muscle:lateral-chain`, kind: "muscle", site: "大腿外侧链", action: "轻柔松解检查中更紧或更酸的区域", primaryProblemId: primary.id, affectedProblemIds: unique([...medialLoadProblems.map((problem) => problem.id), ...byAction("knee-extension").map((problem) => problem.id)]), relatedActionIds: unique([...medialLoadActions, ...(motionExtension ? ["knee-extension" as const] : [])]), attribution: "primary-hypothesis", permission: "all", sourceCaseIds: ["KNEE-005", "MULTI-002"] });
  }

  const medialMotionActions = unique([
    ...(motionExtension ? ["knee-extension" as const] : []),
    ...(motionFlexion ? ["knee-flexion" as const] : []),
  ]);
  if (pesEvidence && medialMotionActions.length && !units.some((unit) => unit.dedupKey === `${primary.side}:muscle:pes-anserine`)) {
    push({
      id: "knee-medial-soft-tissue",
      dedupKey: `${primary.side}:muscle:pes-anserine`,
      kind: "muscle",
      site: "鹅足相关肌肉",
      action: "轻柔松解检查中明确更紧或更酸的鹅足相关肌肉",
      primaryProblemId: problems.find((problem) => medialMotionActions.includes(problem.canonicalActionId as "knee-extension" | "knee-flexion"))?.id ?? primary.id,
      affectedProblemIds: unique(medialMotionActions.flatMap((actionId) => byAction(actionId).map((problem) => problem.id))),
      relatedActionIds: medialMotionActions,
      attribution: "primary-supported",
      permission: "all",
      sourceCaseIds: ["KNEE-005"],
    });
  }

  if (adductorEvidence && medialMotionActions.length && !units.some((unit) => unit.dedupKey === `${primary.side}:muscle:thigh-adductor`)) {
    push({
      id: "knee-medial-adductor",
      dedupKey: `${primary.side}:muscle:thigh-adductor`,
      kind: "muscle",
      site: "大腿内收肌",
      action: "轻柔松解检查中明确更紧或更酸的内收肌区域",
      primaryProblemId: problems.find((problem) => medialMotionActions.includes(problem.canonicalActionId as "knee-extension" | "knee-flexion"))?.id ?? primary.id,
      affectedProblemIds: unique(medialMotionActions.flatMap((actionId) => byAction(actionId).map((problem) => problem.id))),
      relatedActionIds: medialMotionActions,
      attribution: "primary-supported",
      permission: "all",
      sourceCaseIds: ["KNEE-005"],
    });
  }


  const extensionLateralEvidence = Boolean(motionExtension && input.findings.some((finding) => hasLocation(finding, /大腿外侧|阔筋膜张肌|髂胫束/)));
  const anteriorThighEvidence = input.findings.some((finding) => hasLocation(finding, /大腿前侧|股直肌|股四头肌/));
  if (motionExtension && extensionPassiveRange !== "matches" && (extensionLateralEvidence || anteriorThighEvidence)) {
    push({
      id: "knee-extension-anterior-lateral",
      dedupKey: `${motionExtension.side}:muscle:extension-anterior-lateral`,
      kind: "muscle",
      site: "大腿前侧与外侧链",
      action: "轻柔松解检查中明确紧张的股直肌、大腿前侧或外侧链区域",
      primaryProblemId: problems.find((problem) => problem.direction === "extension")?.id ?? primary.id,
      affectedProblemIds: byAction("knee-extension").map((problem) => problem.id),
      relatedActionIds: ["knee-extension"],
      attribution: anteriorThighEvidence || extensionLateralEvidence ? "primary-supported" : "primary-hypothesis",
      permission: "all",
      sourceCaseIds: ["KNEE-005", "MULTI-002", "线下膝伸直受限规则"],
    });
  }

  const anteriorComplaint = /膝下|膝前|膝盖下缘|膝下缘|髌骨下|髌腱/.test(primary.title);
  const anteriorActions = unique([
    ...(["step-down", "squat", "knee-extension", "knee-flexion"] as KneeActionId[])
      .filter((actionId) => byAction(actionId).length > 0),
    // The complaint itself is valid load evidence. A user may report
    // “髌腱/膝下下蹲痛” while the corresponding function card is merged into
    // the chief action and therefore does not produce a separate finding.
    ...(primary.canonicalActionId && ["step-down", "squat", "sit-to-stand", "knee-flexion"].includes(primary.canonicalActionId)
      ? [primary.canonicalActionId]
      : []),
  ]);
  // 髌骨下/膝前主诉在下台阶或下蹲时出现，即使活动范围暂时正常，
  // 仍保留股直肌/大腿前侧作为首轮高相关反应实验。这里不是把它
  // 直接诊断为病因，而是避免“评估均可完成”被误判成无需现场处理。
  const anteriorLoadPattern = anteriorComplaint && (
    stepDownProblems.length > 0
    || squatProblems.length > 0
    || ["step-down", "squat", "sit-to-stand", "knee-flexion"].includes(primary.canonicalActionId as KneeActionId)
  );
  if ((anteriorThighEvidence || anteriorLoadPattern) && anteriorActions.length && (anteriorComplaint || motionFlexion)) {
    push({
      id: "knee-anterior-thigh-rectus-femoris",
      dedupKey: `${primary.side}:muscle:anterior-thigh-rectus-femoris`,
      kind: "muscle",
      site: "大腿前侧与股直肌",
      action: "轻柔松解检查中明确紧张或按压异常的区域",
      primaryProblemId: primary.id,
       affectedProblemIds: unique([
         ...anteriorActions.flatMap((actionId) => byAction(actionId).map((problem) => problem.id)),
         ...(anteriorActions.includes(primary.canonicalActionId as KneeActionId) ? [primary.id] : []),
       ]),
      relatedActionIds: anteriorActions,
      attribution: anteriorThighEvidence ? "primary-supported" : "primary-hypothesis",
      permission: "all",
      sourceCaseIds: ["线下膝下痛评估规则"],
    });
  }

  const posteriorActions = unique([
    ...(motionExtension && extensionPassiveRange !== "matches" ? ["knee-extension" as const] : []),
    ...(motionFlexion ? ["knee-flexion" as const] : []),
  ]);
  if (posteriorEvidence && posteriorActions.length) {
    push({
      id: "knee-posterior-calf-muscle",
      dedupKey: `${primary.side}:muscle:knee-posterior-calf`,
      kind: "muscle",
      site: "膝后与小腿后侧",
      action: "轻柔松解检查中明确紧张的腘肌与小腿后侧区域",
      primaryProblemId: problems.find((problem) => posteriorActions.some((actionId) => actionId === problem.canonicalActionId))?.id ?? primary.id,
      affectedProblemIds: unique(posteriorActions.flatMap((actionId) => byAction(actionId).map((problem) => problem.id))),
      relatedActionIds: posteriorActions,
      attribution: "primary-supported",
      permission: "all",
      sourceCaseIds: ["KNEE-002", "KNEE-003"],
    });
  }

  if (motionExtension) {
    // Owner-reviewed P0 contract: terminal control is only valid after passive
    // extension is known to be available.  An unchecked PROM is not evidence.
    if (extensionPassiveRange === "matches") {
      push({ id: "knee-extension-control", dedupKey: `${motionExtension.side}:control:knee-extension`, kind: "control", site: "大腿前侧", action: "练习膝后轻轻下压，找回末端伸膝控制", primaryProblemId: problems.find((problem) => problem.direction === "extension")?.id ?? primary.id, affectedProblemIds: byAction("knee-extension").map((problem) => problem.id), relatedActionIds: ["knee-extension"], attribution: "primary-supported", permission: "all", sourceCaseIds: ["KNEE-001", "MULTI-002"] });
    } else if (extensionPassiveRange === "limited" && input.role === "rehab" && hasPostTreatmentPassiveLimitation(input, "knee-extension") && (input.completedTreatments ?? []).some((record) =>
      record.relatedActionIds?.includes("knee-extension")
      || [
        `${motionExtension.side}:muscle:extension-anterior-lateral`,
        `${motionExtension.side}:muscle:knee-extension-posterior`,
        `${motionExtension.side}:muscle:anterior-thigh-rectus-femoris`,
      ].includes(record.dedupKey))) {
      push({ id: "knee-extension-joint", dedupKey: `${motionExtension.side}:joint:knee-extension`, kind: "joint", site: "膝关节", action: "根据伸直受限方向完成低刺激关节松动", primaryProblemId: problems.find((problem) => problem.direction === "extension")?.id ?? primary.id, affectedProblemIds: byAction("knee-extension").map((problem) => problem.id), relatedActionIds: ["knee-extension"], attribution: "primary-supported", permission: "rehab-only", sourceCaseIds: ["MULTI-002"] });
    }
    const extensionMuscleTrialCompleted = (input.completedTreatments ?? []).some((record) =>
      record.relatedActionIds?.includes("knee-extension")
      && record.dedupKey.includes(":muscle:"));
    if (extensionPassiveRange === "limited"
      && input.role === "rehab"
      && posteriorEvidence
      && extensionMuscleTrialCompleted
      && hasPostTreatmentPassiveLimitation(input, "knee-extension")) {
      push({
        id: "knee-proximal-fibula",
        dedupKey: `${motionExtension.side}:joint:proximal-fibula`,
        kind: "joint",
        site: "腓骨近端",
        action: "轻柔辅助近端胫腓活动，并立即复查膝伸直",
        primaryProblemId: problems.find((problem) => problem.direction === "extension")?.id ?? primary.id,
        affectedProblemIds: byAction("knee-extension").map((problem) => problem.id),
        relatedActionIds: ["knee-extension"],
        attribution: "primary-supported",
        permission: "rehab-only",
        sourceCaseIds: ["KNEE-002", "KNEE-003", "KNEE-005"],
      });
    }
  }

  if (motionFlexion) {
    const currentPassiveRange = latestObservedMetric(input, "knee-flexion", "passive-range") ?? motionFlexion.passiveRange;
    if ((currentPassiveRange === "matches" || currentPassiveRange === "not-checked")
      && (posteriorEvidence || motionFlexion.locationChecked)) {
      push({
        id: "knee-flexion-control",
        dedupKey: `${motionFlexion.side}:control:knee-flexion`,
        kind: "control",
        site: "膝关节弯曲控制",
        action: "在能接受的范围内练习脚跟缓慢滑向臀部，再主动控制回到起点",
        primaryProblemId: problems.find((problem) => problem.direction === "flexion")?.id ?? primary.id,
        affectedProblemIds: byAction("knee-flexion").map((problem) => problem.id),
        relatedActionIds: ["knee-flexion"],
        attribution: "primary-supported",
        permission: "all",
        sourceCaseIds: ["KDC-05"],
      });
    }
  }

  const controlFindings = input.findings.filter((finding) => finding.kind === "function-control" && finding.result === "unstable");
  const controlActions = unique(controlFindings.map((finding) => canonicalKneeAction(finding.action)).filter((action): action is KneeActionId => Boolean(action)));
  if (controlActions.some((action) => ["step-down", "step-up", "squat", "single-leg-squat"].includes(action))) {
    push({
      id: "knee-hip-knee-control",
      dedupKey: `${primary.side}:control:hip-knee-pattern`,
      kind: "control",
      site: "髋与膝的动作控制",
      action: "从较容易的屈髋和膝盖方向控制练习开始",
      primaryProblemId: problems.find((problem) => problem.kind === "function-control")?.id ?? primary.id,
      affectedProblemIds: problems.filter((problem) => problem.kind === "function-control").map((problem) => problem.id),
      relatedActionIds: controlActions,
      attribution: "primary-supported",
      permission: "all",
      sourceCaseIds: ["KDC-05"],
    });
  }

  const quadricepsWeak = input.findings.some((finding) => finding.kind === "strength" && finding.result === "weak"
    && (hasLocation(finding, /股四头|大腿前侧/) || canonicalKneeAction(finding.action) === "knee-extension"));
  if (quadricepsWeak) {
    push({
      id: "knee-quadriceps-strength",
      dedupKey: `${primary.side}:control:quadriceps-strength`,
      kind: "control",
      site: "大腿前侧力量",
      action: "从能稳定完成的膝盖绷直练习开始，再逐步进入坐站和台阶训练",
      primaryProblemId: problems.find((problem) => problem.kind === "strength")?.id ?? primary.id,
      affectedProblemIds: problems.filter((problem) => problem.kind === "strength").map((problem) => problem.id),
      relatedActionIds: [],
      attribution: "primary-supported",
      permission: "all",
      sourceCaseIds: ["KDC-05"],
    });
  }

  const anteriorLateralCombination = units.find((unit) => unit.id === "knee-extension-anterior-lateral");
  const hasStandaloneLateral = units.some((unit) => unit.id === "knee-lateral-chain");
  return units
    // 同时命中时合并成一次前侧/外侧处理，并沿用外侧链的去重键，
    // 这样旧记录、关节处理门控和复测复用都不会失效。
    .filter((unit) => !(anteriorLateralCombination && hasStandaloneLateral && unit.id === "knee-extension-anterior-lateral"))
    .map((unit) => anteriorLateralCombination && unit.id === "knee-lateral-chain" ? {
      ...unit,
      site: "大腿前侧与外侧链",
      action: anteriorLateralCombination.action,
      affectedProblemIds: unique([...unit.affectedProblemIds, ...anteriorLateralCombination.affectedProblemIds]),
      relatedActionIds: unique([...unit.relatedActionIds, ...anteriorLateralCombination.relatedActionIds]),
      sourceCaseIds: unique([...unit.sourceCaseIds, ...anteriorLateralCombination.sourceCaseIds]),
    } : unit)
    .filter((unit) => unit.permission === "all"
      || (unit.permission === "coach-rehab" && ["coach", "rehab"].includes(input.role))
      || (unit.permission === "rehab-only" && input.role === "rehab"));
}

export function buildKneeAssessmentChecks(input: KneeDecisionInput, problems: KneeProblem[], treatmentUnits: KneeTreatmentUnit[] = []) {
  const chief = problems.find((problem) => problem.kind === "chief-symptom");
  if (!chief) return [];
  if (treatmentUnits.some((unit) => unit.mode === "treat-and-retest")) return [];
  if (chief.canonicalActionId && chief.canonicalActionId !== "unknown-task") {
    const unresolvedMotion = problems.find((problem) => problem.kind === "motion-range" && problem.status !== "resolved");
    // A time-based swelling/tenderness unit can be the only first treatment.
    // If the complaint has not yet produced any motion finding, do not let
    // completing that unit fall through to the end of the session. Start the
    // short knee motion screen so the next decision is evidence-based.
    if (!unresolvedMotion) {
      const hasMotionFinding = input.findings.some((finding) => finding.kind === "motion-range" || finding.kind === "motion-symptom");
      if (!hasMotionFinding) {
        return [{
          id: "check-active-knee-extension",
          title: "先看膝关节伸直（AROM）",
          instruction: "坐着或躺着，慢慢把膝盖伸直，再放松。",
          record: "和另一侧比较伸直幅度，并记录过程中是否出现原来的不适。",
          actionId: "knee-extension" as const,
        }];
      }
      return [];
    }
    const motionFact = input.findings.find((finding) => finding.id === unresolvedMotion.evidenceIds[0]);
    if (motionFact?.locationChecked) return [];
    return [{
      id: `check-related-area:${unresolvedMotion.direction ?? "knee"}`,
      title: unresolvedMotion.direction === "flexion" ? "找出弯膝时最受影响的位置" : "找出绷直膝盖时最受影响的位置",
      instruction: "再做一次刚才的动作，在图上点出最紧、最扯或按压最不舒服的位置。",
      record: "只选最明显的位置；没有明确位置可以选择说不清。",
      actionId: unresolvedMotion.canonicalActionId ?? "unknown-task",
    }];
  }
  const extensionAsked = input.findings.some((finding) => finding.direction === "extension");
  if (!extensionAsked) {
    return [{
      id: "check-active-knee-extension",
      title: "先看看膝盖能不能顺利绷直",
      instruction: "坐着或躺着，慢慢把膝盖绷直，再放松。",
      record: "和另一侧相比范围是否更小；过程中有没有出现原来的不适。",
      actionId: "knee-extension" as const,
    }];
  }
  const flexionAsked = input.findings.some((finding) => finding.direction === "flexion");
  if (!flexionAsked) return [{
    id: "check-active-knee-flexion",
    title: "再看看膝盖能不能顺利弯曲",
    instruction: "坐着或躺着，慢慢弯膝到自己能接受的位置。",
    record: "和另一侧相比范围是否更小；过程中有没有出现原来的不适。",
    actionId: "knee-flexion" as const,
  }];
  return [];
}

function observationForAction(actionId: KneeActionId, problems: KneeProblem[], timing: KneeRetestObservation["timing"]): KneeRetestObservation {
  const relevant = problems.filter((problem) => problem.canonicalActionId === actionId);
  return { actionId, title: ACTION_TITLES[actionId], problemIds: relevant.map((problem) => problem.id), metrics: unique(relevant.flatMap((problem) => problem.metrics)), timing };
}

export function buildKneeRetestPlan(input: KneeDecisionInput, problems: KneeProblem[], treatment?: KneeTreatmentUnit): KneeRetestObservation[] {
  if (!treatment) return [];
  if (treatment.kind === "symptom-management") {
    return treatment.affectedProblemIds.map((problemId) => ({ actionId: "unknown-task" as const, title: "肿胀位置", problemIds: [problemId], metrics: ["swelling" as const], timing: "later" as const }));
  }
  const actions = unique(treatment.relatedActionIds);
  const latestTreatmentSequence = (input.completedTreatments ?? []).length;
  return actions.map((actionId) => {
    const observation = observationForAction(actionId, problems.filter((problem) => treatment.affectedProblemIds.includes(problem.id)), "same-session");
    const latest = [...(input.observations ?? [])].reverse().find((record) => record.actionId === actionId);
    if (treatment.mode === "retest-only"
      && latest
      && latest.treatmentSequence === latestTreatmentSequence
      && currentObservationCoversMetrics(input, actionId, observation.metrics)) observation.reuseObservationId = latest.id;
    return observation;
  }).filter((observation) => observation.problemIds.length > 0);
}

export function buildKneeDecision(input: KneeDecisionInput): KneeDecisionOutput {
  const problems = applyObservationStatuses(input, buildKneeProblems(input.complaints, input.findings));
  const treatmentUnits = buildKneeTreatmentUnits(input, problems);
  const latestCompleted = (input.completedTreatments ?? []).at(-1);
  const pendingLatestRetest = latestCompleted
    ? treatmentUnits.find((unit) => unit.dedupKey === latestCompleted.dedupKey
      && unit.mode === "retest-only"
      && unit.kind !== "symptom-management"
      && unit.relatedActionIds.some((actionId) => {
        const requiredMetrics = treatmentMetricsForAction(problems, unit, actionId);
        return !hasCurrentObservation(input, actionId) || !currentObservationCoversMetrics(input, actionId, requiredMetrics);
      }))
    : undefined;
  // A joint unit may become eligible after one muscle trial. Keep an
  // unfinished muscle retest ahead of it; an unstarted lower-priority muscle
  // candidate is not itself a reason to block a valid joint decision.
  const pendingMuscleRetest = treatmentUnits.find((unit) =>
    unit.mode === "retest-only"
    && unit.kind === "muscle"
    && unit.relatedActionIds.some((actionId) => {
      const requiredMetrics = treatmentMetricsForAction(problems, unit, actionId);
      return !hasCurrentObservation(input, actionId) || !currentObservationCoversMetrics(input, actionId, requiredMetrics);
    }));
  const pendingSymptomTreatment = treatmentUnits.find((unit) => unit.mode === "treat-and-retest" && unit.kind === "symptom-management");
  const jointTreatment = !pendingMuscleRetest
    ? treatmentUnits.find((unit) => unit.mode === "treat-and-retest" && unit.kind === "joint")
    : undefined;
  const currentTreatment = pendingSymptomTreatment
    ?? pendingMuscleRetest
    ?? pendingLatestRetest
    ?? jointTreatment
    ?? treatmentUnits.find((unit) => unit.mode === "treat-and-retest");
  const retestPlan = buildKneeRetestPlan(input, problems, currentTreatment).filter((item) => !item.reuseObservationId);
  const finalRetestPlan = currentTreatment ? [] : unique(problems
    .filter((problem) => problem.kind === "chief-symptom" && problem.status === "improved" && problem.canonicalActionId)
    .map((problem) => problem.canonicalActionId!))
    .map((actionId) => observationForAction(actionId, problems.filter((problem) => problem.canonicalActionId === actionId), "same-session"));
  const currentProblem = problems.find((problem) => !["resolved", "improved", "handoff-to-training", "review-later"].includes(problem.status))
    ?? problems.find((problem) => problem.status === "improved")
    ?? problems.find((problem) => problem.status !== "resolved");
  const assessmentChecks = currentTreatment ? [] : buildKneeAssessmentChecks(input, problems, treatmentUnits);
  return {
    problems,
    assessmentChecks,
    currentProblemId: currentProblem?.id,
    treatmentUnits,
    currentTreatment,
    retestPlan,
    finalRetestPlan,
    deferredProblemIds: problems.filter((problem) => ["handoff-to-training", "review-later", "needs-professional-review"].includes(problem.status)).map((problem) => problem.id),
  };
}
