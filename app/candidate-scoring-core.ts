/**
 * 候选相关性评分核心。
 *
 * 候选按与主诉（位置、性质、动作、支持标签）的匹配程度打分，用于队列排序。
 * 依赖主诉动作解析（chiefActionSource）与文本包含工具（includesAny）。
 */

import { chiefActionSource, type ChiefActionIntake } from "./chief-action-core";
import { includesAny } from "./candidate-order-core";

export type CandidateRelevanceInput = {
  id: string;
  title: string;
  siteLabel?: string;
  targetLabel?: string;
  tags: string[];
};

export function candidateRelevance(candidate: CandidateRelevanceInput, intake: ChiefActionIntake, supportTags: Set<string>) {
  const source = `${intake.side} ${chiefActionSource(intake)} ${intake.location} ${intake.symptomType} ${[...supportTags].join(" ")}`;
  const identity = `${candidate.id} ${candidate.title} ${candidate.siteLabel ?? ""} ${candidate.targetLabel ?? ""} ${candidate.tags.join(" ")}`;
  let score = candidate.tags.filter((tag) => supportTags.has(tag)).length * 5;
  const locationTokens = (intake.location ?? "").split(/[、，/与和·\s]+/).map((token) => token.replace(/关节|部位|区域/g, "")).filter((token) => token.length >= 2);
  if (locationTokens.some((token) => identity.includes(token))) score += 18;
  if (source.includes("腰") && includesAny(source, ["左腰", "右腰", "左侧", "右侧", "腰部单侧", "腰部一侧", "腰侧", "一侧腰"]) && includesAny(identity, ["腰方肌", "quadratus", "腰部两侧"])) score += 16;
  const directMuscleSignals = ["hip-flexor", "psoas", "rectus-femoris", "hamstring", "glute", "adductor", "tfl", "quadriceps", "calf", "peroneal", "wrist-flexor", "wrist-extensor", "rotator-cuff", "biceps", "triceps"];
  if (candidate.tags.some((tag) => supportTags.has(tag) && directMuscleSignals.includes(tag))) score += 12;
  if (includesAny(source, ["前侧", "前方", "腹股沟", "后仰", "久站", "抬腿", "抬膝"]) && includesAny(identity, ["anterior", "hip-flexor", "前侧", "前方", "腰大肌", "股直肌"])) score += 8;
  if (includesAny(source, ["后侧", "后方", "弯腰", "坐久", "腘窝", "跟腱"]) && includesAny(identity, ["posterior", "后侧", "后方", "竖脊肌", "腘绳肌", "小腿后侧"])) score += 7;
  if (includesAny(source, ["外侧", "外踝", "小指侧", "向外"]) && includesAny(identity, ["lateral", "外侧", "腓骨肌", "腕伸肌"])) score += 8;
  if (includesAny(source, ["内侧", "内踝", "拇指侧", "向内"]) && includesAny(identity, ["medial", "radial", "内侧", "拇指侧", "内收肌", "胫骨后肌"])) score += 8;
  if (includesAny(source, ["侧屈", "向一侧弯"]) && includesAny(identity, ["lateral", "quadratus", "腰方肌", "侧面"])) score += 7;
  if (includesAny(source, ["转", "旋转", "拧"]) && candidate.tags.some((tag) => tag.includes("rotation") || tag.includes("pronation") || tag.includes("supination"))) score += 6;
  return score;
}
