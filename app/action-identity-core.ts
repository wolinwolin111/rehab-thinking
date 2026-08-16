/**
 * One physical action can appear under a complaint, a joint motion test, or a
 * local muscle length test.  These aliases share one stable identity so the
 * user performs and scores the action only once.
 */
const ASSESSMENT_ACTION_ALIASES: Record<string, string> = {
  "calf-dorsiflexion": "ankle-dorsiflexion",
  "calf-plantarflexion": "ankle-plantarflexion",
  "calf-inversion": "ankle-inversion",
  "calf-eversion": "ankle-eversion",
  "thigh-front-length": "knee-flexion",
};

export function canonicalActionIdFromAssessmentId(value: string) {
  const id = value.replace(/^(motion|function|strength|symptom|control):/, "");
  return ASSESSMENT_ACTION_ALIASES[id] ?? id;
}

const LABEL_ACTION_ALIASES: Array<[string, RegExp]> = [
  ["ankle-dorsiflexion", /勾脚|脚背(?:向上|靠近小腿)|踝(?:关节)?背屈/],
  ["ankle-plantarflexion", /脚背向下|脚掌向下压|踝(?:关节)?跖屈/],
  ["ankle-inversion", /脚掌向内|踝(?:关节)?内翻/],
  ["ankle-eversion", /脚掌向外|踝(?:关节)?外翻/],
  ["knee-flexion", /弯膝|屈膝|膝(?:关节)?弯曲|脚跟靠近臀部|大腿前侧拉长/],
  ["knee-extension", /绷直膝盖|伸直膝盖|膝(?:关节)?伸直/],
  ["step-down", /下楼梯|下台阶|台阶下降/],
  ["step-up", /上楼梯|上台阶|台阶上升/],
];

export function canonicalActionIdFromLabel(label: string) {
  return LABEL_ACTION_ALIASES.find(([, pattern]) => pattern.test(label))?.[0];
}

export function canonicalActionKey(value: string): string {
  const parts = value.split(/[、；\n]+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) return [...new Set(parts.map(canonicalActionKey))].sort().join("|");
  const fromId = canonicalActionIdFromAssessmentId(value);
  if (fromId !== value.replace(/^(motion|function|strength|symptom|control):/, "")) return fromId;
  return canonicalActionIdFromLabel(value) ?? value
    .replaceAll("下台阶", "下楼梯")
    .replaceAll("台阶下降", "下楼梯")
    .replaceAll("上台阶", "上楼梯")
    .replaceAll("膝盖绷直", "伸直膝盖")
    .replaceAll("膝关节伸直", "伸直膝盖")
    .replace(/[“”‘’'"，。；、·：:\s（）()]/g, "")
    .replace(/处理前|处理后|复测动作|活动范围|范围偏小|并会引起症状|会引起熟悉的不适/g, "");
}

export function dedupeAssessmentIdsByAction(ids: string[]) {
  const seen = new Set<string>();
  return ids.filter((id) => {
    const key = canonicalActionIdFromAssessmentId(id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 处理方向 → 主诉动作方向的运动学关联。
 *
 * 髌骨滑动不是膝屈/伸本身，但直接影响膝关节屈伸：处理髌骨后应顺带复测
 * 下蹲等主诉动作，而不是只复测被处理的方向本身。这张表是「影响」关系，
 * 与上面的「同一动作别名」不同——新增关节处理与主诉的关联就往这里加一行。
 */
export const KINEMATIC_LINKS: Record<string, string[]> = {
  "knee-patella-superior": ["knee-extension"],
  "knee-patella-inferior": ["knee-flexion"],
  "knee-patella-medial": ["knee-flexion", "knee-extension"],
  "knee-patella-lateral": ["knee-flexion", "knee-extension"],
};

/** 处理方向里是否存在与主诉动作方向运动学关联的方向。 */
export function treatmentRelatesToChief(treatmentDirectionIds: string[], chiefDirection: string | undefined): boolean {
  if (!chiefDirection) return false;
  return treatmentDirectionIds.some((id) =>
    (KINEMATIC_LINKS[id] ?? []).some((related) =>
      canonicalActionIdFromAssessmentId(related) === canonicalActionIdFromAssessmentId(chiefDirection)));
}

export type MotionFindingInput = { id: string };

/** 去掉 finding id 的 `motion:` 前缀，得到方向 id。 */
export function motionIdFromFinding(finding: MotionFindingInput) {
  return finding.id.replace(/^motion:/, "");
}

/** 从 symptom:/control:/track:/tension: 等前缀后提取 motion 方向 id。 */
export function anyMotionIdFromFinding(finding: MotionFindingInput) {
  const match = finding.id.match(/^(?:symptom:|control:|track:|tension:)?motion:(.+)$/);
  return match?.[1];
}

export function actionIdFromFinding(finding: MotionFindingInput) {
  return canonicalActionIdFromAssessmentId(motionIdFromFinding(finding));
}

/** 两个方向是否属于同一物理动作（别名归一后相等）。 */
export function samePhysicalAction(left?: string, right?: string) {
  return Boolean(left && right && canonicalActionIdFromAssessmentId(left) === canonicalActionIdFromAssessmentId(right));
}

/** 按物理动作去重复测 finding，保留输入元素类型。 */
export function dedupeRetestFindingsByAction<T extends MotionFindingInput>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((finding) => {
    const actionId = actionIdFromFinding(finding);
    if (seen.has(actionId)) return false;
    seen.add(actionId);
    return true;
  });
}

export type MotionSymptomRecord = {
  discomfort?: string;
  unableReason?: string;
  passiveDiscomfort?: string;
};

/** 方向是否已知有不适：主诉同动作、主动/被动不适或无法完成(痛)都算。 */
export function motionWasSymptomatic(directionId: string, assessmentResults: Record<string, MotionSymptomRecord | undefined>, chiefDirection?: string) {
  const record = assessmentResults[`motion:${directionId}`];
  return samePhysicalAction(chiefDirection, directionId)
    || record?.discomfort === "yes"
    || record?.unableReason === "pain"
    || record?.passiveDiscomfort === "yes";
}
