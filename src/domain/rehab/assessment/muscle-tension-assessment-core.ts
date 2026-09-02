export type TensionMotionInput = {
  spinal: boolean;
  /** 组织路径 id；撞伤/骨应力按压有风险，肌腱负荷仍可查周围肌腹。 */
  tissuePathwayId?: string;
  /** 症状性质；麻电不按压。 */
  symptomType: string;
  /** 症状表现；麻电不按压，肿胀/淤青不整卡跳过（只避开肿胀中心）。 */
  symptoms?: string[];
};

/**
 * 肌肉紧张检查默认进行，只在「按压有风险或无意义」的窄例外里跳过：
 * 脊柱、撞伤、骨应力、麻电。肿胀/淤青不再整卡跳过——只避开肿胀中心本身，
 * 周围肌腹（如崴脚后的小腿前后内外侧）仍要比较，否则会漏掉代偿性紧张。
 */
export function needsMuscleTensionCheck(input: TensionMotionInput) {
  if (input.spinal) return false;
  if (input.tissuePathwayId === "muscle-contusion" || input.tissuePathwayId === "bone-stress-suspected") return false;
  if (input.symptomType === "麻或电感" || (input.symptoms ?? []).includes("麻、电或感觉变化")) return false;
  return true;
}

/** 触诊/比较类答案里"没有差别"的哨兵词；所有过滤处必须共用这一份，防止漏滤生成空泛候选。 */
export const TENSION_NO_DIFFERENCE_LABELS = ["没有明显差别", "两侧感觉接近", "暂不判断"] as const;

export function buildMuscleTensionFindings(input: { assessmentId: string; assessmentTitle: string; locations: string[]; professional?: boolean }) {
  const locations = [...new Set(input.locations.filter((location) => !TENSION_NO_DIFFERENCE_LABELS.includes(location as (typeof TENSION_NO_DIFFERENCE_LABELS)[number])))];
  return locations.map((location) => {
    const sideMatch = location.match(/^(左侧|右侧)[｜|·](.+)$/);
    const side = sideMatch?.[1] as "左侧" | "右侧" | undefined;
    const region = sideMatch?.[2] ?? location;
    const displayLocation = side ? `${side}·${region}` : region;
    return {
    id: `tension:${input.assessmentId}:${location}`,
    title: input.professional ? `${displayLocation}张力或按压阻力增高` : `${displayLocation}按压反应更明显`,
    detail: input.professional
      ? `${side ? `${side}与另一侧比较，` : "与另一侧比较"}张力或按压阻力增高；相关动作：${input.assessmentTitle}`
      : `${side ? `${side}按压时` : "两侧轻按时"}该区域更酸或更胀；仅作为辅助证据，相关动作：${input.assessmentTitle}`,
    location: region,
    ...(side ? { side } : {}),
  };
  });
}
