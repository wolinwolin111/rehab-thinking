/**
 * 术后分流核心（自助模式）：产品定位不含术后康复方案，术后恢复弧内的用户
 * 转介 RehabGuide 专项指南；超出弧长的按普通流程继续并把术式写入记录。
 * 阈值逐术式取自 AAOS《骨科术后康复》阶段终点（docs/research/postop-timeline-verification-2026-09-01.md），
 * 时间档位取区间中值与阈值比较；说不清一律按转介处理（保守方向唯一）。
 */

export const REHABGUIDE_BASE = "https://66.154.101.204/shop";

export type SurgeryProcedure = {
  id: string;
  label: string;
  /** RehabGuide 指南 slug；null 表示站点暂无专项指南。 */
  guideSlug: string | null;
  /** 结构化恢复弧终点（月）；术后时长中值超过它才放行走普通流程。 */
  thresholdMonths: number;
};

export const SURGERY_PROCEDURES: SurgeryProcedure[] = [
  { id: "acl", label: "前交叉韧带（ACL）重建", guideSlug: "acl", thresholdMonths: 12 },
  { id: "acl-meniscus", label: "ACL重建 + 半月板手术", guideSlug: "acl-meniscus", thresholdMonths: 12 },
  { id: "meniscus-repair", label: "半月板缝合/修补", guideSlug: "meniscus", thresholdMonths: 6 },
  { id: "meniscectomy", label: "半月板切除", guideSlug: "meniscus", thresholdMonths: 2 },
  { id: "patellar", label: "髌骨脱位/稳定手术", guideSlug: "patellar-dislocation", thresholdMonths: 6 },
  { id: "pcl", label: "后交叉韧带（PCL）重建", guideSlug: "pcl", thresholdMonths: 12 },
  { id: "achilles", label: "跟腱断裂修补", guideSlug: "achilles-rupture", thresholdMonths: 9 },
  { id: "other", label: "其他手术", guideSlug: null, thresholdMonths: 12 },
];

export type SurgeryTiming = { id: string; label: string; /** 区间中值（月）；null=说不清。 */ monthsPast: number | null };

export const SURGERY_TIMINGS: SurgeryTiming[] = [
  { id: "lt2w", label: "不到2周", monthsPast: 0.5 },
  { id: "w2-6", label: "2～6周", monthsPast: 1.5 },
  { id: "w6-3m", label: "6周～3个月", monthsPast: 2.5 },
  { id: "m3-6", label: "3～6个月", monthsPast: 4.5 },
  { id: "m6-12", label: "6个月～1年", monthsPast: 9 },
  { id: "gt12m", label: "超过1年", monthsPast: 15 },
  { id: "unsure", label: "说不清", monthsPast: null },
];

export type PostOpRouting = {
  action: "none" | "refer" | "proceed-recorded";
  guideUrl: string | null;
  procedureLabel: string | null;
  timingLabel: string | null;
};

const NONE: PostOpRouting = { action: "none", guideUrl: null, procedureLabel: null, timingLabel: null };

/** 描述里明确的手术史默认"做过"；只默认 yes，绝不默认"没做过"。 */
export function inferSurgeryHadFromText(text: string): "" | "yes" {
  return /术后|做过手术|做了手术|已手术|已开刀/.test(text) ? "yes" : "";
}

export function resolvePostOpRouting(input: { had: string; procedure: string; timing: string; isGuided: boolean }): PostOpRouting {
  if (!input.isGuided || input.had === "" || input.had === "no") return NONE;
  const procedure = SURGERY_PROCEDURES.find((item) => item.id === input.procedure) ?? null;
  const timing = SURGERY_TIMINGS.find((item) => item.id === input.timing) ?? null;
  const labels = { procedureLabel: procedure?.label ?? null, timingLabel: timing?.label ?? null };
  // 答了"做过"但还没选完术式/时长：不放行，转介卡先指向站点首页。
  if (!procedure || !timing) return { action: "refer", guideUrl: `${REHABGUIDE_BASE}/`, ...labels };
  if (timing.monthsPast !== null && timing.monthsPast > procedure.thresholdMonths) {
    return { action: "proceed-recorded", guideUrl: null, ...labels };
  }
  return { action: "refer", guideUrl: procedure.guideSlug ? `${REHABGUIDE_BASE}/guides/${procedure.guideSlug}` : `${REHABGUIDE_BASE}/`, ...labels };
}
