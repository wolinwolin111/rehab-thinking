/**
 * 处理候选的动作/方向生成核心。
 *
 * 候选要落地成「怎么做」文本，需要先确定它真正影响的活动方向：从 retestIds
 * 或文本推断试点方向，肌肉候选再把方向收敛到「该区域作为动作肌参与」的方向，
 * 最后按候选类型生成松解/关节/神经/控制动作说明。依赖 pilot 运动知识和候选
 * 命名核心。
 */

import { controlPlansForMotions, normalizePilotMuscleRegion, pilotMotionKnowledge, regionRelationForMotion } from "@/src/knowledge/pilot/pilot-motion-muscle-knowledge";
import { jointTreatmentName } from "@/src/domain/rehab/treatment/candidate-treatment-core";

export type CandidateActionInput = {
  id: string;
  type: string;
  title: string;
  do: string;
  tags: string[];
  retestIds?: string[];
  siteLabel?: string;
  targetLabel?: string;
};

export function candidatePilotMotionIds(candidate: CandidateActionInput) {
  const direct = (candidate.retestIds ?? []).filter((id) => Boolean(pilotMotionKnowledge(id)) || /^(thigh|calf)-/.test(id));
  if (direct.length) return [...new Set(direct)];
  const source = `${candidate.id} ${candidate.title} ${candidate.siteLabel ?? ""} ${candidate.targetLabel ?? ""} ${candidate.do} ${candidate.tags.join(" ")}`;
  return ([
    ["knee-extension", /膝伸直|伸膝|绷直|terminal-extension|\bextension\b/i],
    ["knee-flexion", /膝屈曲|屈膝|弯膝|knee-flexion/i],
    ["ankle-dorsiflexion", /踝背屈|勾脚|dorsiflex/i],
    ["ankle-plantarflexion", /踝跖屈|脚背下压|plantarflex/i],
    ["ankle-inversion", /踝足内翻|主动内翻|\binversion\b/i],
    ["ankle-eversion", /踝足外翻|主动外翻|\beversion\b/i],
  ] as const).filter(([, pattern]) => pattern.test(source)).map(([id]) => id);
}

export function candidateControlMotionIds(candidate: CandidateActionInput, availableMotionIds?: string[]) {
  const candidateMotionIds = candidatePilotMotionIds(candidate);
  const scopedMotionIds = availableMotionIds
    ? candidateMotionIds.filter((id) => availableMotionIds.includes(id))
    : candidateMotionIds;
  if (candidate.type !== "muscle") return scopedMotionIds;
  const normalizedRegion = normalizePilotMuscleRegion(`${candidate.siteLabel ?? ""} ${candidate.targetLabel ?? ""} ${candidate.title} ${candidate.do} ${candidate.tags.join(" ")}`);
  if (!normalizedRegion) return scopedMotionIds;
  return scopedMotionIds.filter((motionId) => regionRelationForMotion(motionId, normalizedRegion.id)?.role === "agonist");
}

export function candidateAction(candidate: CandidateActionInput, controlMotionIds?: string[]) {
  if (candidate.type === "control") return candidate.do;
  if (candidate.type === "muscle") {
    const relevantMotionIds = candidateControlMotionIds(candidate, controlMotionIds);
    const controls = controlPlansForMotions(relevantMotionIds);
    const release = candidate.do.replace(/。+$/, "");
    const control = controls.length
      ? `随后完成${controls.map((plan) => `${plan.controlTitle}：${plan.controlInstruction}${plan.controlRepetitions}`).join("；")}`
      : "";
    const dosage = "力度从轻到中等，以轻微酸胀为限；保持30～60秒，必要时一次延长至90秒。出现刺痛、麻、电感或熟悉症状加重立即停止。";
    return `${release}。${dosage}${control ? `随后${control.replace(/^随后/, "")}` : ""}`;
  }
  if (candidate.type === "joint") {
    const name = jointTreatmentName(candidate);
    const passiveTarget = /髌骨|腓骨|距骨|距下|跖趾/.test(name);
    return passiveTarget
      ? `由专业人员完成${name}；膝盖或踝足保持放松，只做低刺激辅助活动，出现锐痛、硬性阻挡或症状加重立即停止。`
      : `由专业人员完成${name}；只处理一个受限方向，出现锐痛、硬性阻挡或症状加重立即停止。`;
  }
  if (candidate.type === "neural") return `在不加重麻、电感的范围内，做5～8次温和神经滑动。`;
  return `休息时垫高患侧小腿，并在不增加疼痛的范围内缓慢勾脚、下压10～20次。`;
}
