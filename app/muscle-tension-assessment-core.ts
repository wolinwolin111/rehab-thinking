export type TensionMotionInput = {
  spinal: boolean;
  /** 组织路径 id；撞伤/骨应力按压有风险，肌腱负荷仍可查周围肌腹。 */
  tissuePathwayId?: string;
  /** 症状性质；麻电不按压。 */
  symptomType: string;
  /** 症状表现；肿胀淤青、麻电不按压。 */
  symptoms?: string[];
};

/**
 * 肌肉紧张检查默认进行，只在「按压有风险或无意义」的窄例外里跳过：
 * 脊柱、撞伤、骨应力、明显肿胀、麻电。其余场景（含活动范围正常但有不适）
 * 都做一次统一紧张检查。
 */
export function needsMuscleTensionCheck(input: TensionMotionInput) {
  if (input.spinal) return false;
  if (input.tissuePathwayId === "muscle-contusion" || input.tissuePathwayId === "bone-stress-suspected") return false;
  if ((input.symptoms ?? []).includes("肿胀或淤青")) return false;
  if (input.symptomType === "麻或电感" || (input.symptoms ?? []).includes("麻、电或感觉变化")) return false;
  return true;
}

export function buildMuscleTensionFindings(input: { assessmentId: string; assessmentTitle: string; locations: string[] }) {
  const locations = [...new Set(input.locations.filter((location) => !["没有明显差别", "两侧感觉接近"].includes(location)))];
  return locations.map((location) => ({
    id: `tension:${input.assessmentId}:${location}`,
    title: `${location}肌张力增高`,
    detail: `与另一侧轻按比较更紧或更酸；相关动作：${input.assessmentTitle}`,
    location,
  }));
}
