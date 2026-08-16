/**
 * 居家自主放松目标生成核心。
 *
 * 训练结束后的自主放松只从四个去重来源生成：本次肌肉紧张检查确认的区域
 * （共享检查 + 逐项活动检查）、本次实际处理且有部分/明确效果的肌肉、以及
 * 当前训练动作的主要肌肉。最多保留 2～3 个，安全风险场景（撞伤/骨应力/
 * 肌腱负荷等非标准路径、肿胀淤青、清楚刺痛、麻电感）一律隐藏。
 */

export type HomeRelaxationTarget = {
  id: string;
  location: string;
  title: string;
  dosage: string;
  instruction: string;
  limit: string;
};

export type HomeRelaxationInput = {
  /** 组织路径 id；非 "standard"（撞伤/骨应力/肌腱负荷等）不安排自主按压。 */
  tissuePathwayId: string;
  /** 用户选中的症状表现，例如 "肿胀或淤青"、"麻、电或感觉变化"。 */
  symptoms: string[];
  /** 轻按反应；"sharp" 表示清楚刺痛。 */
  stabbingPalpation: string;
  /** 症状性质，例如 "麻或电感"。 */
  symptomType: string;
  /** 本次肌肉紧张检查确认的区域标签（共享检查与逐项检查合并前可含重复与哨兵值）。 */
  tensionLabels: string[];
  /** 本次实际处理且有效/部分有效的肌肉区域标签。 */
  effectiveMuscleLabels: string[];
  /** 当前训练动作的主要肌肉区域标签。 */
  trainingMuscleLabels: string[];
  /** 最多保留的目标数量，默认 3。 */
  maxTargets?: number;
};

/** “两侧没有明显差别”类答案不是可放松区域，须在合并时剔除。 */
const NO_DIFFERENCE_LOCATIONS = ["没有明显差别", "两侧感觉接近"];

/** 安全风险场景判断：肿胀、清楚刺痛、麻电感或非标准组织路径都不安排自主按压。 */
export function isUnsafeForSelfRelease(input: HomeRelaxationInput): boolean {
  return input.tissuePathwayId !== "standard"
    || input.symptoms.includes("肿胀或淤青")
    || input.stabbingPalpation === "sharp"
    || input.symptomType === "麻或电感"
    || input.symptoms.includes("麻、电或感觉变化");
}

/**
 * 合并四类来源并按标准区域去重，生成居家自主放松卡片。
 * 顺序固定为紧张区域 → 有效处理肌肉 → 训练主要肌肉，去重后截取 maxTargets 个。
 */
export function buildHomeRelaxationTargets(input: HomeRelaxationInput): HomeRelaxationTarget[] {
  if (isUnsafeForSelfRelease(input)) return [];
  const max = input.maxTargets ?? 3;
  const merged = [...new Set([
    ...input.tensionLabels,
    ...input.effectiveMuscleLabels,
    ...input.trainingMuscleLabels,
  ])]
    .filter((location) => location.length > 0 && !NO_DIFFERENCE_LOCATIONS.includes(location))
    .slice(0, max);
  return merged.map((location) => ({
    id: `home-release:${location}`,
    location,
    title: `${location}自主放松`,
    dosage: "每处30～60秒，1～2轮",
    instruction: `训练结束后，在${location}的肌腹位置轻柔按压或缓慢滚动。`,
    limit: "力度以酸胀但不超过3/10为准，避开骨点、关节缝、肿胀中心和明确痛点。",
  }));
}

/**
 * 训练动作 tag / 标题 → 标准肌肉区域标签。
 * 只映射明确指向肌肉的 tag；纯动作模式标签（squat、jump、step、movement-pattern 等）
 * 不映射，避免把训练动作本身误写成可放松肌肉。
 */
const EXERCISE_MUSCLE_RULES: Array<[RegExp, string]> = [
  [/股四头|股直肌|quadriceps|quad-activation|terminal-extension/, "大腿前侧肌群"],
  [/腘绳肌|hamstring/, "大腿后侧与膝后两侧"],
  [/内收|鹅足|adductor|medial-knee/, "大腿内侧与鹅足周围"],
  [/腓肠肌|比目鱼肌|\bcalf\b|heel-raise|提踵/, "小腿后侧肌群"],
  [/胫骨前肌|tibialis-anterior|dorsiflexion|勾脚/, "小腿前侧肌群"],
  [/胫骨后肌|tibialis-posterior/, "小腿后内侧肌群"],
  [/腓骨|peroneal|eversion|外翻/, "小腿外侧肌群"],
  [/足弓|足底|arch|foot-intrinsic|plantar/, "足底与足弓肌群"],
  [/臀|glute|hip-abduction|髋外展/, "臀部与髋后外侧肌群"],
];

export function exerciseMuscleLabels(tags: string[], title = ""): string[] {
  const labels: string[] = [];
  for (const tag of tags) {
    const rule = EXERCISE_MUSCLE_RULES.find(([pattern]) => pattern.test(tag));
    if (rule) labels.push(rule[1]);
  }
  for (const [pattern, label] of EXERCISE_MUSCLE_RULES) {
    if (pattern.test(title)) labels.push(label);
  }
  return [...new Set(labels)];
}
