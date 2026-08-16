/**
 * 膝、踝首发模块的标准动作—肌肉关系层。
 *
 * 这一层只负责补全解剖候选、统一部位名称和给出低次数主动控制；
 * 线下记录仍由 pilot-knowledge.ts / knee-decision-core.ts 决定优先级、
 * 适用条件和复测对象。相关肌肉是候选，不代表都要处理。
 */

export type PilotMotionId =
  | "knee-extension"
  | "knee-flexion"
  | "ankle-dorsiflexion"
  | "ankle-plantarflexion"
  | "ankle-inversion"
  | "ankle-eversion";

export type PilotMuscleRole = "agonist" | "antagonist" | "stabilizer";

export type PilotMuscleRegionId =
  | "thigh-anterior"
  | "thigh-lateral"
  | "thigh-medial"
  | "thigh-posterior"
  | "calf-anterior"
  | "calf-posterior"
  | "calf-lateral"
  | "calf-medial"
  | "plantar";

export type PilotMuscleRegion = {
  id: PilotMuscleRegionId;
  label: string;
  muscles: string[];
  aliases: RegExp[];
};

export type PilotMotionMuscleRelation = {
  regionId: PilotMuscleRegionId;
  role: PilotMuscleRole;
};

export type PilotMotionKnowledge = {
  id: PilotMotionId;
  professionalTitle: string;
  userAction: string;
  relations: PilotMotionMuscleRelation[];
  controlTitle: string;
  controlInstruction: string;
  controlRepetitions: string;
  anatomySource: string;
  /** 只用于追溯线下优先路径，不把病例关系改写成解剖定论。 */
  clinicalPrioritySourceCases: string[];
};

export const PILOT_MUSCLE_REGIONS: PilotMuscleRegion[] = [
  { id: "thigh-anterior", label: "大腿前侧肌群", muscles: ["股四头肌", "股直肌"], aliases: [/大腿前/, /股四头/, /股直肌/, /quadriceps/i] },
  { id: "thigh-lateral", label: "大腿外侧链", muscles: ["股外侧肌", "阔筋膜张肌", "髂胫束周围肌肉"], aliases: [/大腿外/, /髋外.*大腿外/, /股外侧肌/, /阔筋膜张肌/, /髂胫束/, /lateral-chain/i] },
  { id: "thigh-medial", label: "大腿内侧与鹅足周围", muscles: ["内收肌群", "缝匠肌", "股薄肌", "半腱肌", "股内侧肌"], aliases: [/大腿内/, /鹅足/, /内收肌/, /缝匠肌/, /股薄肌/, /半腱肌/] },
  { id: "thigh-posterior", label: "大腿后侧与膝后两侧", muscles: ["腘绳肌", "腘肌"], aliases: [/大腿后/, /腘绳肌/, /腘肌/, /膝后侧肌肉/, /膝后两侧/] },
  { id: "calf-anterior", label: "小腿前侧肌群", muscles: ["胫骨前肌", "趾伸肌群"], aliases: [/小腿前侧/, /胫骨前肌/, /趾伸肌/, /足背肌腱周围/] },
  { id: "calf-posterior", label: "小腿后侧肌群", muscles: ["腓肠肌", "比目鱼肌"], aliases: [/小腿肚/, /小腿后侧/, /小腿三头肌/, /腓肠肌/, /比目鱼肌/, /小腿上端/, /膝后.*小腿/] },
  { id: "calf-lateral", label: "小腿外侧肌群", muscles: ["腓骨长肌", "腓骨短肌"], aliases: [/小腿外侧/, /腓骨长肌/, /腓骨短肌/, /腓骨肌/, /外踝周围/] },
  { id: "calf-medial", label: "小腿后内侧肌群", muscles: ["胫骨后肌", "趾屈肌群"], aliases: [/小腿内侧/, /小腿后内侧/, /胫骨后肌/, /趾屈肌/, /内踝后方/] },
  { id: "plantar", label: "足底与足弓肌群", muscles: ["足底软组织", "足内在肌"], aliases: [/足底肌肉/, /足底与足弓/, /足弓.*肌肉/, /脚底.*肌肉/] },
];

export const PILOT_MOTION_KNOWLEDGE: Record<PilotMotionId, PilotMotionKnowledge> = {
  "knee-extension": {
    id: "knee-extension",
    professionalTitle: "膝关节主动伸直（AROM）",
    userAction: "把膝盖绷直",
    relations: [
      { regionId: "thigh-anterior", role: "agonist" },
      { regionId: "thigh-posterior", role: "antagonist" },
      { regionId: "calf-posterior", role: "antagonist" },
      { regionId: "thigh-lateral", role: "stabilizer" },
      { regionId: "thigh-medial", role: "stabilizer" },
    ],
    controlTitle: "末端伸膝主动控制",
    controlInstruction: "仰卧把腿放松伸直，绷紧大腿前侧，让膝后轻轻向床面下压，保持2秒后放松。",
    controlRepetitions: "先做5～8次",
    anatomySource: "膝伸肌—屈肌功能解剖与主动/拮抗协调",
    clinicalPrioritySourceCases: ["KNEE-001", "KNEE-005", "MULTI-002"],
  },
  "knee-flexion": {
    id: "knee-flexion",
    professionalTitle: "膝关节主动屈曲（AROM）",
    userAction: "把脚跟滑向臀部",
    relations: [
      { regionId: "thigh-posterior", role: "agonist" },
      { regionId: "thigh-anterior", role: "antagonist" },
      { regionId: "calf-posterior", role: "stabilizer" },
      { regionId: "thigh-lateral", role: "stabilizer" },
      { regionId: "thigh-medial", role: "stabilizer" },
    ],
    controlTitle: "主动屈膝控制",
    controlInstruction: "仰卧，脚跟贴着床面，缓慢把脚跟滑向臀部，再主动控制着回到起点。",
    controlRepetitions: "只在能接受的范围做5～8次",
    anatomySource: "膝屈肌—伸肌功能解剖与主动/拮抗协调",
    clinicalPrioritySourceCases: ["KNEE-002", "KNEE-003"],
  },
  "ankle-dorsiflexion": {
    id: "ankle-dorsiflexion",
    professionalTitle: "踝关节主动背屈（AROM）",
    userAction: "把脚背向上勾",
    relations: [
      { regionId: "calf-anterior", role: "agonist" },
      { regionId: "calf-posterior", role: "antagonist" },
      { regionId: "calf-lateral", role: "stabilizer" },
      { regionId: "calf-medial", role: "stabilizer" },
    ],
    controlTitle: "踝背屈主动控制",
    controlInstruction: "坐稳，脚跟着地，缓慢把脚背向小腿方向勾起，再控制着放下；不要只抬脚趾。",
    controlRepetitions: "先做5～8次",
    anatomySource: "踝背屈肌—跖屈肌功能解剖与主动/拮抗协调",
    clinicalPrioritySourceCases: ["ANKLE-001", "MULTI-001"],
  },
  "ankle-plantarflexion": {
    id: "ankle-plantarflexion",
    professionalTitle: "踝关节主动跖屈（AROM）",
    userAction: "脚背向下压",
    relations: [
      { regionId: "calf-posterior", role: "agonist" },
      { regionId: "calf-medial", role: "agonist" },
      { regionId: "calf-anterior", role: "antagonist" },
      { regionId: "calf-lateral", role: "stabilizer" },
    ],
    controlTitle: "踝跖屈主动控制",
    controlInstruction: "坐稳，小腿放松，把脚背缓慢向下压，再缓慢回到起点；脚趾不要抓紧。",
    controlRepetitions: "先做5～8次",
    anatomySource: "踝跖屈肌—背屈肌功能解剖与主动/拮抗协调",
    clinicalPrioritySourceCases: ["ANKLE-001", "MULTI-001"],
  },
  "ankle-inversion": {
    id: "ankle-inversion",
    professionalTitle: "踝足主动内翻（AROM）",
    userAction: "把脚掌转向内侧",
    relations: [
      { regionId: "calf-medial", role: "agonist" },
      { regionId: "calf-anterior", role: "agonist" },
      { regionId: "calf-lateral", role: "antagonist" },
      { regionId: "plantar", role: "stabilizer" },
    ],
    controlTitle: "踝内翻主动控制",
    controlInstruction: "坐稳，小腿保持不动，把脚掌缓慢转向内侧，再控制着回到中间；不要用膝盖带动。",
    controlRepetitions: "先做5～8次",
    anatomySource: "踝内翻肌—外翻肌功能解剖与主动/拮抗协调",
    clinicalPrioritySourceCases: ["MULTI-001"],
  },
  "ankle-eversion": {
    id: "ankle-eversion",
    professionalTitle: "踝足主动外翻（AROM）",
    userAction: "把脚掌转向外侧",
    relations: [
      { regionId: "calf-lateral", role: "agonist" },
      { regionId: "calf-medial", role: "antagonist" },
      { regionId: "calf-anterior", role: "antagonist" },
      { regionId: "plantar", role: "stabilizer" },
    ],
    controlTitle: "踝外翻主动控制",
    controlInstruction: "坐稳，小腿保持不动，把脚掌缓慢转向外侧，再控制着回到中间；不要用膝盖带动。",
    controlRepetitions: "先做5～8次",
    anatomySource: "踝外翻肌—内翻肌功能解剖与主动/拮抗协调",
    clinicalPrioritySourceCases: ["ANKLE-001", "MULTI-001"],
  },
};

const PROFESSIONAL_ASSESSMENT_TITLES: Record<string, string> = {
  ...Object.fromEntries(Object.values(PILOT_MOTION_KNOWLEDGE).map((motion) => [motion.id, motion.professionalTitle])),
  "knee-quadriceps": "股四头肌伸膝能力检查",
  "knee-hamstring": "腘绳肌屈膝能力检查",
  "knee-posterior-chain": "髋伸与后侧链基础能力检查",
  "knee-adductor-pes": "大腿内侧肌群发力检查",
  "knee-glute": "单腿支撑与骨盆稳定检查",
  "knee-calf": "小腿跖屈肌群功能检查",
  "knee-squat": "双腿闭链下蹲功能检查",
  "knee-step-up": "台阶上升功能检查",
  "knee-step-down": "台阶下降控制检查",
  "knee-single-leg": "单腿静态稳定检查",
  "knee-single-leg-squat": "单腿闭链控制检查",
  "ankle-dorsiflexor": "踝背屈肌群能力检查",
  "ankle-calf": "踝跖屈肌群功能检查",
  "ankle-invertor": "踝内翻肌群能力检查",
  "ankle-evertor": "踝外翻肌群能力检查",
  "ankle-weight-bearing": "踝足承重与步态检查",
  "ankle-squat": "闭链踝背屈功能检查",
  "ankle-single-leg": "踝足单腿稳定检查",
  "ankle-heel-raise": "提踵功能检查",
  "ankle-knee-wall": "闭链踝背屈活动度检查",
  "ankle-great-toe-extension": "第一跖趾关节背伸检查",
  "ankle-toe-flexion": "足趾屈伸主动控制检查",
  "thigh-front-length": "股四头肌与股直肌拉长检查",
  "thigh-back-length": "腘绳肌拉长检查",
  "thigh-medial-length": "髋内收肌群拉长检查",
  "thigh-lateral-load": "大腿外侧肌群拉长检查",
  "thigh-front-strength": "股四头肌伸膝能力检查",
  "thigh-back-strength": "腘绳肌屈膝能力检查",
  "thigh-medial-strength": "髋内收肌群发力检查",
  "thigh-lateral-strength": "髋外展肌群发力检查",
  "thigh-walk": "步行功能检查",
  "thigh-sit-stand": "坐站功能检查",
  "thigh-jog": "慢跑回归准备检查",
  "thigh-local-palpation": "大腿局部触诊定位",
  "calf-dorsiflexion": "踝背屈：前侧缩短与后侧拉长检查",
  "calf-plantarflexion": "踝跖屈：后侧缩短与前侧拉长检查",
  "calf-inversion": "踝内翻：内侧缩短与外侧拉长检查",
  "calf-eversion": "踝外翻：外侧缩短与内侧拉长检查",
  "calf-dorsiflexor-strength": "踝背屈肌群发力检查",
  "calf-heel-raise-strength": "小腿跖屈肌群发力检查",
  "calf-invertor-strength": "踝内翻肌群发力检查",
  "calf-evertor-strength": "踝外翻肌群发力检查",
  "calf-walk": "步行周期功能检查",
  "calf-heel-raise": "提踵功能检查",
  "calf-jog": "慢跑回归准备检查",
  "calf-local-palpation": "小腿局部触诊定位",
};

export function isPilotMotionId(value: string): value is PilotMotionId {
  return Object.hasOwn(PILOT_MOTION_KNOWLEDGE, value);
}

export function pilotMotionKnowledge(value: string) {
  return isPilotMotionId(value) ? PILOT_MOTION_KNOWLEDGE[value] : undefined;
}

export function professionalAssessmentTitle(value: string, fallback = "功能评估检查") {
  const id = value.replace(/^(motion|strength|function|special):/, "");
  return PROFESSIONAL_ASSESSMENT_TITLES[id] ?? fallback;
}

export function pilotMuscleRegion(value: PilotMuscleRegionId) {
  return PILOT_MUSCLE_REGIONS.find((region) => region.id === value)!;
}

/**
 * 旧记录中的“小腿前外侧”必须结合肌肉/处理文本拆分，不能继续作为
 * 面向用户的新区域名。腓骨肌证据归外侧，胫骨前肌/趾伸肌证据归前侧；
 * 仍无法区分时返回 undefined，要求用户在新界面重新选择。
 */
export function normalizePilotMuscleRegion(source: string): PilotMuscleRegion | undefined {
  if (/小腿前外侧|小腿外前侧/.test(source)) {
    if (/腓骨肌|腓骨长肌|腓骨短肌|外翻/.test(source)) return PILOT_MUSCLE_REGIONS.find((region) => region.id === "calf-lateral");
    if (/胫骨前肌|趾伸肌|背屈|勾脚/.test(source)) return PILOT_MUSCLE_REGIONS.find((region) => region.id === "calf-anterior");
    return undefined;
  }
  return PILOT_MUSCLE_REGIONS.find((region) => region.aliases.some((pattern) => pattern.test(source)));
}

export function regionRelationForMotion(motionId: string, regionId: PilotMuscleRegionId) {
  return pilotMotionKnowledge(motionId)?.relations.find((relation) => relation.regionId === regionId);
}

/**
 * 一个肌肉区域可能在解剖上参与很多方向，但一次处理后只复测它最直接
 * 影响的活动平面，不能因为“存在关系”就把踝四方向全部重新做一遍。
 */
export function primaryRetestMotionIdsForRegion(regionId: PilotMuscleRegionId): PilotMotionId[] {
  const map: Record<PilotMuscleRegionId, PilotMotionId[]> = {
    "thigh-anterior": ["knee-extension", "knee-flexion"],
    "thigh-lateral": ["knee-extension", "knee-flexion"],
    "thigh-medial": ["knee-extension", "knee-flexion"],
    "thigh-posterior": ["knee-extension", "knee-flexion"],
    "calf-anterior": ["ankle-dorsiflexion", "ankle-plantarflexion"],
    "calf-posterior": ["knee-extension", "ankle-dorsiflexion", "ankle-plantarflexion"],
    "calf-lateral": ["ankle-inversion", "ankle-eversion"],
    "calf-medial": ["ankle-inversion", "ankle-eversion"],
    plantar: ["ankle-inversion", "ankle-eversion"],
  };
  return map[regionId];
}

export function controlPlansForMotions(motionIds: string[]) {
  return motionIds
    .filter((id, index, list): id is PilotMotionId => isPilotMotionId(id) && list.indexOf(id) === index)
    .map((id) => PILOT_MOTION_KNOWLEDGE[id]);
}
