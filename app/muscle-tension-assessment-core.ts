export type TensionMotionInput = {
  spinal: boolean;
  active?: string;
  unableReason?: string;
  localRegion: boolean;
  standardPath: boolean;
  acute: boolean;
  localPhase?: string;
  primaryLocalMotion: boolean;
  symptomType: string;
  discomfort?: string;
  familiarSymptom?: string;
  hasClearChiefAction: boolean;
};

export function needsMuscleTensionCheck(input: TensionMotionInput) {
  if (input.spinal) return false;
  if (["limited", "left-limited", "right-limited", "both-limited"].includes(input.active ?? "")) return true;
  if (input.active === "unable" && input.unableReason === "pain") return true;
  const localNonacute = input.localRegion && input.standardPath && !input.acute && input.localPhase === "nonacute-tension";
  if (!localNonacute) return false;
  const familiarDiscomfort = input.discomfort === "yes" && (input.hasClearChiefAction || input.familiarSymptom === "yes");
  return familiarDiscomfort || input.primaryLocalMotion && /酸|紧|牵扯/.test(input.symptomType);
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
