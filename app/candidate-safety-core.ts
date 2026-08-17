/**
 * 处理候选的安全过滤核心。
 *
 * 现场处理队列必须按使用者角色和症状风险过滤候选：普通用户只能做自助
 * 非关节、非神经处理；教练可用自助和教练项；康复师全开放。刺痛保守路径下
 * 不允许关节处理或任何带按压（压揉/重压/深压等）的处理。这些规则是临床
 * 安全红线，抽成纯函数以便组合测试。
 */

export type CandidateSafetyInput = {
  type: string;
  access: string;
  title: string;
  do: string;
  observe: string;
  tags: string[];
};

function safetyIncludesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

export function candidateUsesPressure(candidate: CandidateSafetyInput) {
  return safetyIncludesAny(`${candidate.title} ${candidate.do} ${candidate.observe} ${candidate.tags.join(" ")}`, ["按压", "压揉", "压迫", "加压", "重压", "深压"]);
}

export function candidateIsAvailable(candidate: CandidateSafetyInput, role: string) {
  if (role === "rehab") return true;
  if (role === "coach") return candidate.access === "self" || candidate.access === "coach";
  return candidate.access === "self" && candidate.type !== "joint" && candidate.type !== "neural";
}

/** 刺痛保守路径：不允许关节处理，也不允许带按压的处理。 */
export function candidateAllowedInSharpPath(candidate: CandidateSafetyInput, conservativeSharpPath: boolean) {
  return !conservativeSharpPath || (candidate.type !== "joint" && !candidateUsesPressure(candidate));
}
