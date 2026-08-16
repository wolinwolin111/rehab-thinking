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
