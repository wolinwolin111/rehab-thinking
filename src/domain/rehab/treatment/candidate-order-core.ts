/**
 * 候选排序与去重辅助核心。
 *
 * 处理候选按「运动链」和类型排序：同一链内按肌肉→控制→关节→肿胀→神经排列，
 * 主诉方向对应的链靠前。这里集中方向→链映射、候选→链归并、链排序与 pilot
 * 处理别名的匹配规则，全部是纯函数，供队列编排（buildTrialTargets）复用。
 */

const DIRECTION_CHAINS: Record<string, string> = {
  "ankle-dorsiflexion": "矢状面·前侧链",
  "ankle-dorsiflexor": "矢状面·前侧链",
  "ankle-plantarflexion": "矢状面·后侧链",
  "ankle-calf": "矢状面·后侧链",
  "ankle-inversion": "额状面·内侧链",
  "ankle-invertor": "额状面·内侧链",
  "ankle-eversion": "额状面·外侧链",
  "ankle-evertor": "额状面·外侧链",
  "ankle-squat": "功能动作",
  "ankle-single-leg": "功能动作",
  "ankle-heel-raise": "功能动作",
  "knee-extension": "膝伸直链",
  "knee-quadriceps": "膝伸直链",
  "knee-flexion": "膝屈曲链",
  "knee-hamstring": "膝屈曲链",
  "knee-adductor-pes": "膝内侧链",
  "knee-glute": "髋膝稳定链",
  "knee-calf": "髋膝稳定链",
  "knee-foot-arch": "髋膝稳定链",
  "knee-squat": "功能动作",
  "knee-single-leg": "功能动作",
  "knee-heel-raise": "功能动作",
  "thigh-front-length": "大腿前侧局部链",
  "thigh-front-strength": "大腿前侧局部链",
  "thigh-back-length": "大腿后侧局部链",
  "thigh-back-strength": "大腿后侧局部链",
  "thigh-medial-length": "大腿内侧局部链",
  "thigh-medial-strength": "大腿内侧局部链",
  "thigh-lateral-load": "大腿外侧局部链",
  "thigh-lateral-strength": "大腿外侧局部链",
  "calf-dorsiflexion": "小腿前侧局部链",
  "calf-dorsiflexor-strength": "小腿前侧局部链",
  "calf-plantarflexion": "小腿后侧局部链",
  "calf-heel-raise-strength": "小腿后侧局部链",
  "calf-inversion": "小腿内侧局部链",
  "calf-invertor-strength": "小腿内侧局部链",
  "calf-eversion": "小腿外侧局部链",
  "calf-evertor-strength": "小腿外侧局部链",
};

export function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

export function directionChain(directionId: string) {
  return DIRECTION_CHAINS[directionId] ?? "其他相关问题";
}

export type CandidateOrderInput = {
  type: string;
  retestIds?: string[];
};

export function candidateDirectionChain(candidate: CandidateOrderInput, fallback = "其他相关问题") {
  const chains = (candidate.retestIds ?? []).map(directionChain).filter(Boolean);
  if (chains.includes("功能动作")) return "功能动作";
  return chains[0] ?? fallback;
}

export function orderCandidatesByChain<T extends CandidateOrderInput>(candidates: T[]): T[] {
  const chainOrder = ["矢状面·前侧链", "矢状面·后侧链", "额状面·内侧链", "额状面·外侧链", "膝伸直链", "膝屈曲链", "膝内侧链", "髋膝稳定链", "功能动作", "其他相关问题"];
  const typeOrder = ["muscle", "control", "joint", "swelling", "neural"];
  return [...candidates].sort((a, b) => chainOrder.indexOf(candidateDirectionChain(a)) - chainOrder.indexOf(candidateDirectionChain(b)) || typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));
}

const PILOT_TREATMENT_ALIASES: Record<string, string[]> = {
  "knee-flexion-local-muscle": ["knee-mobility-posterior", "knee-extension-muscles"],
  "knee-proximal-fibula": ["knee-lateral-fibula"],
  "knee-fibula-combination": ["knee-lateral-fibula"],
  "knee-hip-control": ["knee-anterior-control", "knee-lateral-control"],
  "knee-medial-local": ["knee-medial-pes"],
  "knee-pes-local": ["knee-medial-pes"],
  "knee-adductor-local": ["knee-medial-adductor"],
  "knee-lateral-chain": ["knee-medial-lateral-chain"],
  "knee-extension-joint": ["knee-extension-joints", "knee-medial-joint", "knee-mobility-joint"],
  "knee-toe-extensor-response": ["knee-extension-anterior-lower-leg"],
  "knee-extension-chain": ["knee-extension-muscles"],
  "knee-extension-anterior-lateral": ["knee-extension-anterior-lateral"],
  "knee-extension-posterior": ["knee-extension-posterior"],
  "knee-extension-control": ["knee-extension-control", "knee-mobility-knee-extension-control"],
  "ankle-swelling-management": ["ankle-lateral-swelling"],
  "ankle-medial-calf": ["ankle-rom-medial-release", "ankle-medial-muscles"],
  "ankle-medial-control": ["ankle-rom-inversion-control", "ankle-medial-control"],
  "ankle-lateral-control": ["ankle-rom-eversion-control", "ankle-lateral-control"],
  "ankle-calf-strength": ["ankle-achilles-load"],
  "ankle-anterior-muscle": ["ankle-rom-anterior-release", "ankle-calf-anterolateral-local"],
  "ankle-joint-followup": ["ankle-rom-sagittal-joint", "ankle-df-joint"],
};

export function pilotTreatmentMatchesCandidate(hintId: string, candidateId: string) {
  return hintId === candidateId || PILOT_TREATMENT_ALIASES[hintId]?.includes(candidateId);
}
