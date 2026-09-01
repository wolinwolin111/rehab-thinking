export type PilotRegionId = "thigh-local" | "knee" | "calf-local" | "ankle-foot";
export type EvidenceLevel = "P0" | "P1" | "P2" | "P3";
export type ReviewStatus = "reviewed-source" | "clinical-review-required";

export type PilotTreatmentCandidate = {
  id: string;
  kind: "symptom-management" | "muscle" | "joint" | "control";
  site: string;
  action: string;
  retestIds: string[];
  reviewTiming: "same-session" | "later";
  priority?: number;
  requiresProfessional?: boolean;
  requiresPriorMuscleTrial?: boolean;
};

export type PilotRelation = {
  id: string;
  regionId: PilotRegionId;
  locationTokens: string[];
  symptomTokens?: string[];
  taskTokens?: string[];
  clueMode?: "any" | "all";
  assessmentIds: string[];
  treatmentCandidates: PilotTreatmentCandidate[];
  trainingIds: string[];
  evidence: EvidenceLevel;
  status: ReviewStatus;
  sourceCases: string[];
};

const treatment = (
  id: string,
  kind: PilotTreatmentCandidate["kind"],
  site: string,
  action: string,
  retestIds: string[],
  reviewTiming: PilotTreatmentCandidate["reviewTiming"] = "same-session",
  options: Pick<PilotTreatmentCandidate, "priority" | "requiresProfessional" | "requiresPriorMuscleTrial"> = {},
): PilotTreatmentCandidate => ({ id, kind, site, action, retestIds, reviewTiming, ...options });

/**
 * 首发关系只用于决定“下一项值得确认什么”，不根据位置直接诊断组织。
 * clinical-review-required 关系可以参与专业审核和候选排序，但不能单独
 * 为普通用户生成高刺激处理。
 */
export const PILOT_RELATIONS: PilotRelation[] = [
  {
    id: "THIGH-LOCAL-FRONT", regionId: "thigh-local", locationTokens: ["大腿前"],
    assessmentIds: ["motion:thigh-front-length", "strength:thigh-front-strength", "function:thigh-sit-stand"],
    treatmentCandidates: [treatment("thigh-front-release", "muscle", "大腿前侧", "非急性期轻柔松解检查到紧张的区域", ["motion:thigh-front-length", "strength:thigh-front-strength"]), treatment("thigh-front-control", "control", "大腿前侧", "按检查结果做低负荷伸膝控制", ["strength:thigh-front-strength"], "later")],
    trainingIds: ["thigh-sit-stand"], evidence: "P1", status: "reviewed-source", sourceCases: ["线下记录：股直肌与股四头肌候选", "独立局部流程规则"],
  },
  {
    id: "THIGH-LOCAL-BACK", regionId: "thigh-local", locationTokens: ["大腿后"],
    assessmentIds: ["motion:thigh-back-length", "strength:thigh-back-strength", "function:thigh-walk"],
    treatmentCandidates: [treatment("thigh-back-release", "muscle", "大腿后侧", "非急性期轻柔松解检查到紧张的区域", ["motion:thigh-back-length", "strength:thigh-back-strength"]), treatment("thigh-back-control", "control", "大腿后侧", "从低负荷屈膝保持或臀桥开始", ["strength:thigh-back-strength"], "later")],
    trainingIds: ["thigh-bridge"], evidence: "P2", status: "reviewed-source", sourceCases: ["线下记录：腘绳肌处理与臀桥进阶", "Hamstring CPG 2022"],
  },
  {
    id: "THIGH-LOCAL-MEDIAL", regionId: "thigh-local", locationTokens: ["大腿内"],
    assessmentIds: ["motion:thigh-medial-length", "strength:thigh-medial-strength", "function:thigh-walk"],
    treatmentCandidates: [treatment("thigh-medial-release", "muscle", "大腿内侧", "非急性期轻柔松解检查到紧张的内收肌区域", ["motion:thigh-medial-length", "strength:thigh-medial-strength"]), treatment("thigh-medial-control", "control", "大腿内侧", "按检查结果做夹枕低负荷发力", ["strength:thigh-medial-strength"], "later")],
    trainingIds: ["thigh-sit-stand"], evidence: "P1", status: "reviewed-source", sourceCases: ["线下记录：内收肌候选", "独立局部流程规则"],
  },
  {
    id: "THIGH-LOCAL-LATERAL", regionId: "thigh-local", locationTokens: ["大腿外"],
    assessmentIds: ["motion:thigh-lateral-load", "strength:thigh-lateral-strength", "function:thigh-walk"],
    treatmentCandidates: [treatment("thigh-lateral-release", "muscle", "大腿外侧", "轻柔松解检查到紧张的前外侧或后外侧肌肉", ["motion:thigh-lateral-load", "strength:thigh-lateral-strength"]), treatment("thigh-lateral-control", "control", "大腿外侧", "按检查结果做低负荷侧向控制", ["strength:thigh-lateral-strength"], "later")],
    trainingIds: ["thigh-sit-stand"], evidence: "P2", status: "reviewed-source", sourceCases: ["线下记录：阔筋膜张肌、股外侧肌与髋外侧控制", "独立局部流程规则"],
  },
  {
    id: "CALF-LOCAL-FRONT", regionId: "calf-local", locationTokens: ["小腿前", "胫骨前"],
    assessmentIds: ["motion:calf-dorsiflexion", "strength:calf-dorsiflexor-strength", "function:calf-walk"],
    treatmentCandidates: [treatment("calf-front-release", "muscle", "小腿前侧", "轻柔松解检查到紧张的肌肉区域", ["motion:calf-dorsiflexion", "strength:calf-dorsiflexor-strength"]), treatment("calf-front-control", "control", "小腿前侧", "练习主动勾脚控制", ["strength:calf-dorsiflexor-strength"], "later")],
    trainingIds: ["calf-gait"], evidence: "P2", status: "reviewed-source", sourceCases: ["线下记录：胫骨前肌与趾伸肌候选", "独立局部流程规则"],
  },
  {
    id: "CALF-LOCAL-BACK", regionId: "calf-local", locationTokens: ["小腿后", "腓肠肌"],
    assessmentIds: ["motion:calf-plantarflexion", "strength:calf-heel-raise-strength", "function:calf-walk"],
    treatmentCandidates: [treatment("calf-back-release", "muscle", "小腿后侧", "非急性期轻柔松解检查到紧张的区域", ["motion:calf-plantarflexion", "strength:calf-heel-raise-strength"]), treatment("calf-back-control", "control", "小腿后侧", "从坐姿或双脚提踵逐步恢复负荷", ["strength:calf-heel-raise-strength"], "later")],
    trainingIds: ["calf-gait"], evidence: "P1", status: "reviewed-source", sourceCases: ["线下记录：腓肠肌、比目鱼肌候选", "小腿拉伤分期负荷原则"],
  },
  {
    id: "CALF-LOCAL-MEDIAL", regionId: "calf-local", locationTokens: ["小腿内"],
    assessmentIds: ["motion:calf-inversion", "strength:calf-invertor-strength", "function:calf-walk"],
    treatmentCandidates: [treatment("calf-medial-release", "muscle", "小腿内侧", "轻柔松解检查到紧张的肌肉区域", ["motion:calf-inversion", "strength:calf-invertor-strength"]), treatment("calf-medial-control", "control", "小腿内侧", "练习内翻与足弓主动控制", ["strength:calf-invertor-strength"], "later")],
    trainingIds: ["calf-gait"], evidence: "P2", status: "reviewed-source", sourceCases: ["线下记录：胫骨后肌候选", "独立局部流程规则"],
  },
  {
    id: "CALF-LOCAL-LATERAL", regionId: "calf-local", locationTokens: ["小腿外"],
    assessmentIds: ["motion:calf-eversion", "strength:calf-evertor-strength", "function:calf-walk"],
    treatmentCandidates: [treatment("calf-lateral-release", "muscle", "小腿外侧", "轻柔松解检查到紧张的腓骨肌区域", ["motion:calf-eversion", "strength:calf-evertor-strength"]), treatment("calf-lateral-control", "control", "小腿外侧", "练习外翻主动控制", ["strength:calf-evertor-strength"], "later")],
    trainingIds: ["calf-gait"], evidence: "P2", status: "reviewed-source", sourceCases: ["线下记录：腓骨肌与大腿外侧链反应候选", "独立局部流程规则"],
  },
  {
    id: "KNEE-R01",
    regionId: "knee",
    locationTokens: ["膝", "髌骨"],
    symptomTokens: ["弹响", "刮擦", "响"],
    assessmentIds: ["motion:knee-extension", "motion:knee-flexion", "function:knee-squat"],
    treatmentCandidates: [],
    trainingIds: [],
    evidence: "P0",
    status: "reviewed-source",
    sourceCases: ["KNEE-001"],
  },
  {
    id: "KNEE-R02",
    regionId: "knee",
    locationTokens: ["膝后", "腘窝", "腓骨头", "膝外侧", "膝内侧", "关节线"],
    symptomTokens: ["末端痛", "弯曲痛", "屈膝痛"],
    taskTokens: ["弯膝", "屈膝"],
    assessmentIds: ["motion:knee-flexion", "motion:knee-extension"],
    treatmentCandidates: [
      treatment("knee-flexion-local-muscle", "muscle", "膝后与小腿上端", "轻柔松解检查到紧张的区域", ["motion:knee-flexion"], "same-session", { priority: 80 }),
      treatment("knee-proximal-fibula", "joint", "腓骨近端", "按受限方向进行低刺激关节松动", ["motion:knee-flexion"], "same-session", { priority: 30, requiresProfessional: true, requiresPriorMuscleTrial: true }),
    ],
    trainingIds: ["knee-heel-slide-quad-set"],
    evidence: "P3",
    status: "reviewed-source",
    sourceCases: ["KNEE-002", "KNEE-003"],
  },
  {
    id: "KNEE-R03",
    regionId: "knee",
    locationTokens: ["膝前", "膝外侧", "小腿上端"],
    symptomTokens: ["刮擦", "摩擦", "弹响"],
    taskTokens: ["下蹲", "蹲起"],
    assessmentIds: ["function:knee-squat", "motion:knee-flexion", "motion:knee-extension"],
    treatmentCandidates: [
      treatment("knee-fibula-combination", "joint", "腓骨近端与远端", "分步检查腓骨近端和远端活动，不同时归因", ["function:knee-squat"], "same-session", { requiresProfessional: true }),
    ],
    trainingIds: [],
    evidence: "P1",
    status: "reviewed-source",
    sourceCases: ["KNEE-004"],
  },
  {
    id: "KNEE-R04",
    regionId: "knee",
    locationTokens: ["膝前", "膝内侧", "膝外侧"],
    symptomTokens: ["弹响", "刮擦", "扭", "不稳"],
    taskTokens: ["下蹲", "下楼", "台阶"],
    assessmentIds: ["function:knee-squat", "function:knee-step-down", "strength:knee-glute"],
    treatmentCandidates: [
      treatment("knee-hip-control", "control", "髋与膝", "练习膝盖方向与髋部支撑控制", ["function:knee-squat", "function:knee-step-down"]),
    ],
    trainingIds: ["knee-standing-hip-flexion", "knee-sit-stand-squat", "knee-step"],
    evidence: "P2",
    status: "reviewed-source",
    sourceCases: ["KNEE-004", "MULTI-002"],
  },
  {
    id: "KNEE-R07",
    regionId: "knee",
    locationTokens: ["膝内侧", "内侧关节线", "鹅足"],
    symptomTokens: ["疼", "刺", "不适"],
    taskTokens: ["伸膝", "绷直", "下压", "下楼"],
    assessmentIds: ["motion:knee-extension", "strength:knee-adductor-pes", "function:knee-step-down"],
    treatmentCandidates: [
      treatment("knee-pes-local", "muscle", "鹅足相关肌肉", "轻柔松解检查到紧张的鹅足相关肌肉", ["motion:knee-extension", "function:knee-step-down"], "same-session", { priority: 95 }),
      treatment("knee-adductor-local", "muscle", "大腿内收肌", "轻柔松解检查到紧张的内收肌区域", ["motion:knee-extension", "function:knee-step-down"], "same-session", { priority: 85 }),
      treatment("knee-lateral-chain", "muscle", "大腿外侧链", "轻柔松解外侧紧张区域", ["motion:knee-extension", "function:knee-step-down"], "same-session", { priority: 70 }),
      treatment("knee-extension-joint", "joint", "膝关节", "根据剩余受限方向进行低刺激关节松动", ["motion:knee-extension"], "same-session", { priority: 30, requiresProfessional: true, requiresPriorMuscleTrial: true }),
    ],
    trainingIds: ["knee-heel-slide-quad-set", "knee-supine-arch-control", "knee-step"],
    evidence: "P2",
    status: "reviewed-source",
    sourceCases: ["KNEE-005"],
  },
  {
    id: "KNEE-R05",
    regionId: "knee",
    locationTokens: ["膝前", "膝内侧", "膝下"],
    symptomTokens: ["胀", "胀痛", "发胀"],
    taskTokens: ["承重", "站立", "走路"],
    clueMode: "all",
    assessmentIds: ["function:knee-gait", "function:knee-step-down", "strength:ankle-dorsiflexor"],
    treatmentCandidates: [
      treatment("knee-anterior-lower-leg-control", "control", "小腿前侧", "比较勾脚与趾伸肌主动发力是否改变原承重不适", ["function:knee-gait"], "later"),
    ],
    trainingIds: ["knee-anterior-lower-leg-control"],
    evidence: "P1",
    status: "reviewed-source",
    sourceCases: ["KNEE-005"],
  },
  {
    id: "KNEE-R06",
    regionId: "knee",
    locationTokens: ["膝", "小腿前外侧"],
    symptomTokens: ["刮擦", "摩擦", "不适"],
    taskTokens: ["伸膝", "绷直"],
    assessmentIds: ["motion:knee-extension", "strength:ankle-dorsiflexor"],
    treatmentCandidates: [
      treatment("knee-toe-extensor-response", "muscle", "小腿前侧肌群", "检查支持时轻柔松解胫骨前肌或趾伸肌周围，再做低次数勾脚控制", ["motion:knee-extension"]),
    ],
    trainingIds: ["knee-anterior-lower-leg-control"],
    evidence: "P2",
    status: "reviewed-source",
    sourceCases: ["KNEE-005"],
  },
  {
    id: "KNEE-R08",
    regionId: "knee",
    locationTokens: ["膝", "大腿"],
    symptomTokens: ["扭", "别", "不顺"],
    taskTokens: ["屈髋", "抬腿", "下蹲"],
    assessmentIds: ["function:knee-squat", "strength:knee-glute"],
    treatmentCandidates: [
      treatment("knee-hip-pelvis-control", "control", "髋部与骨盆", "先用降阶屈髋确认动作调整能否改变膝部扭感", ["function:knee-squat"], "later"),
    ],
    trainingIds: ["knee-standing-hip-flexion"],
    evidence: "P2",
    status: "reviewed-source",
    sourceCases: ["MULTI-002"],
  },
  {
    id: "KNEE-R09",
    regionId: "knee",
    locationTokens: ["膝", "大腿外侧", "小腿外侧"],
    symptomTokens: ["伸不直", "紧", "扯", "不适"],
    taskTokens: ["绷直", "伸膝"],
    assessmentIds: ["motion:knee-extension", "strength:knee-quadriceps"],
    treatmentCandidates: [
      treatment("knee-extension-anterior-lateral", "muscle", "大腿前侧与外侧链", "轻柔松解检查到紧张的股直肌与外侧链区域", ["motion:knee-extension"], "same-session", { priority: 90 }),
      treatment("knee-extension-posterior", "muscle", "膝后与小腿后侧", "轻柔松解检查到紧张的腘肌与小腿后侧区域", ["motion:knee-extension"], "same-session", { priority: 80 }),
      treatment("knee-extension-joint", "joint", "膝关节", "根据剩余受限方向进行低刺激关节松动", ["motion:knee-extension"], "same-session", { priority: 30, requiresProfessional: true, requiresPriorMuscleTrial: true }),
      treatment("knee-extension-control", "control", "大腿前侧", "练习膝后下压和终末伸膝控制", ["motion:knee-extension"], "later"),
    ],
    trainingIds: ["knee-heel-slide-quad-set", "knee-standing-hip-flexion"],
    evidence: "P1",
    status: "reviewed-source",
    sourceCases: ["MULTI-002"],
  },
  {
    id: "ANKLE-R01",
    regionId: "ankle-foot",
    locationTokens: ["外踝", "内踝", "脚踝", "脚背"],
    symptomTokens: ["肿", "淤青", "积液"],
    assessmentIds: ["motion:ankle-dorsiflexion", "motion:ankle-inversion", "function:ankle-weight-bearing"],
    treatmentCandidates: [
      treatment("ankle-swelling-management", "symptom-management", "肿胀区域", "完成一次肿胀管理并记录当天负荷", [], "later"),
    ],
    trainingIds: ["ankle-four-way-motion"],
    evidence: "P2",
    status: "reviewed-source",
    sourceCases: ["ANKLE-001", "MULTI-001"],
  },
  {
    id: "ANKLE-R02",
    regionId: "ankle-foot",
    locationTokens: ["踝", "外踝", "内踝", "脚背", "足底", "小腿"],
    assessmentIds: ["motion:ankle-dorsiflexion", "motion:ankle-plantarflexion", "motion:ankle-inversion", "motion:ankle-eversion"],
    treatmentCandidates: [],
    trainingIds: [],
    evidence: "P0",
    status: "reviewed-source",
    sourceCases: ["ANKLE-001", "MULTI-001"],
  },
  {
    id: "ANKLE-R03",
    regionId: "ankle-foot",
    locationTokens: ["踝", "足", "小腿"],
    symptomTokens: ["活动受限", "控制差", "无力"],
    assessmentIds: ["motion:ankle-dorsiflexion", "motion:ankle-plantarflexion", "motion:ankle-inversion", "motion:ankle-eversion"],
    treatmentCandidates: [
      treatment("ankle-direction-control", "control", "脚踝", "练习检查中偏弱方向的主动控制", ["motion:ankle-dorsiflexion", "motion:ankle-plantarflexion", "motion:ankle-inversion", "motion:ankle-eversion"], "later"),
    ],
    trainingIds: ["ankle-dorsiflexion-control", "ankle-plantarflexion-control", "ankle-eversion-control"],
    evidence: "P3",
    status: "reviewed-source",
    sourceCases: ["ANKLE-001", "MULTI-001"],
  },
  {
    id: "ANKLE-R04",
    regionId: "ankle-foot",
    locationTokens: ["足底", "足弓内侧", "内踝", "小腿内侧"],
    assessmentIds: ["motion:ankle-inversion", "strength:ankle-invertor", "function:ankle-weight-bearing"],
    treatmentCandidates: [
      treatment("ankle-medial-calf", "muscle", "小腿内侧", "检查确认紧张后，轻柔松解对应区域", ["motion:ankle-inversion", "strength:ankle-invertor", "function:ankle-weight-bearing"], "same-session", { priority: 90 }),
      treatment("ankle-medial-control", "control", "踝足内侧", "检查确认控制不足后，练习内翻与足弓主动控制", ["strength:ankle-invertor"], "later", { priority: 60 }),
    ],
    trainingIds: [],
    evidence: "P2",
    status: "reviewed-source",
    sourceCases: ["MULTI-001"],
  },
  {
    id: "ANKLE-R06",
    regionId: "ankle-foot",
    locationTokens: ["外踝", "小腿外侧", "脚踝", "跟腱"],
    symptomTokens: ["无力", "不稳", "发软"],
    taskTokens: ["走路", "提踵", "蹬地"],
    assessmentIds: ["strength:ankle-evertor", "strength:ankle-calf", "function:ankle-weight-bearing", "function:ankle-heel-raise"],
    treatmentCandidates: [
      treatment("ankle-lateral-control", "control", "小腿外侧", "练习外翻主动控制", ["motion:ankle-eversion"], "later"),
      treatment("ankle-calf-strength", "control", "小腿后侧", "从双脚提踵开始恢复小腿力量", [], "later"),
    ],
    trainingIds: ["ankle-eversion-control", "ankle-band-heelraise", "ankle-gait-weightshift"],
    evidence: "P1",
    status: "reviewed-source",
    sourceCases: ["ANKLE-001"],
  },
  {
    id: "ANKLE-R05",
    regionId: "ankle-foot",
    locationTokens: ["踝前", "外踝", "脚背", "脚踝"],
    symptomTokens: ["活动痛", "勾脚痛", "刺", "不适"],
    taskTokens: ["勾脚", "脚踝活动", "走路"],
    clueMode: "all",
    assessmentIds: ["motion:ankle-dorsiflexion", "motion:ankle-eversion", "function:ankle-weight-bearing"],
    treatmentCandidates: [
      treatment("ankle-anterior-muscle", "muscle", "小腿前侧", "先处理检查中明确紧张的小腿前侧，再复测原活动", ["motion:ankle-dorsiflexion"]),
      treatment("ankle-joint-followup", "joint", "踝关节", "肌肉处理后被动仍受限时按方向检查关节活动", ["motion:ankle-dorsiflexion"], "same-session", { priority: 30, requiresProfessional: true, requiresPriorMuscleTrial: true }),
    ],
    trainingIds: ["ankle-dorsiflexion-control"],
    evidence: "P1",
    status: "reviewed-source",
    sourceCases: ["ANKLE-001"],
  },
  {
    id: "ANKLE-R07",
    regionId: "ankle-foot",
    locationTokens: ["踝", "足", "小腿"],
    symptomTokens: ["不会做", "找不到感觉", "晃", "借力"],
    taskTokens: ["提踵", "内翻", "外翻", "勾脚", "站立"],
    assessmentIds: ["strength:ankle-calf", "strength:ankle-evertor", "strength:ankle-invertor"],
    treatmentCandidates: [
      treatment("ankle-control-regression", "control", "当前训练方向", "降低体位、范围或阻力，保留能够稳定完成的版本", [], "later"),
    ],
    trainingIds: ["ankle-dorsiflexion-control", "ankle-plantarflexion-control", "ankle-eversion-control"],
    evidence: "P1",
    status: "reviewed-source",
    sourceCases: ["MULTI-002"],
  },
  {
    id: "ANKLE-LOCAL-TOE",
    regionId: "ankle-foot",
    locationTokens: ["足趾", "大拇趾", "小拇趾", "前脚掌", "足趾根部"],
    assessmentIds: ["motion:ankle-great-toe-extension", "motion:ankle-toe-flexion"],
    treatmentCandidates: [],
    trainingIds: [],
    evidence: "P0",
    status: "reviewed-source",
    sourceCases: ["用户确认的局部问题规则"],
  },
];
