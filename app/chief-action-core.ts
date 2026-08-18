/**
 * 主诉动作解析核心。
 *
 * 从 intake 里提取「能重复复现的主诉动作」，判断是否有明确主诉动作，并把它
 * 映射到具体关节方向（下蹲→膝屈曲、勾脚→踝背屈等）。这是评分与队列编排的
 * 上游输入，只依赖 intake 的结构字段，可独立单测。
 */

export type ChiefActionIntake = {
  side?: string;
  onset?: string;
  reportedActions?: Array<{ raw?: string; label?: string }>;
  customAction?: string;
  reproduction?: string;
  location?: string;
  symptomType?: string;
  mechanism?: string;
  forceDirection?: string;
  actionAnalysis?: { category?: string; task?: string; function?: string; load?: string; direction?: string } | null;
};

export function isUnclearAction(value?: string) {
  return !value?.trim() || /说不清|没有固定动作|待确认|不确定/.test(value.trim());
}

export function reportedActionSummary(intake: ChiefActionIntake) {
  const selected = intake.reportedActions?.map((item) => item.raw || item.label) ?? [];
  const custom = intake.customAction?.trim() ? [intake.customAction.trim()] : [];
  return [...new Set([...selected, ...custom, intake.reproduction].filter((value) => value && !isUnclearAction(value)))];
}

export function primaryReportedAction(intake: ChiefActionIntake) {
  return reportedActionSummary(intake)[0] ?? "";
}

/** 是否有可复现的明确主诉动作。forceDirection 只是推断候选，不算确认动作。 */
export function hasClearChiefAction(intake: ChiefActionIntake) {
  return reportedActionSummary(intake).length > 0;
}

export function chiefActionSource(intake: ChiefActionIntake) {
  const action = intake.actionAnalysis;
  return [intake.location, intake.symptomType, intake.mechanism, ...reportedActionSummary(intake), intake.forceDirection, action?.category, action?.task, action?.function, action?.load, action?.direction]
    .filter((value): value is string => Boolean(value) && !isUnclearAction(value))
    .join(" ");
}

export function chiefActionLabel(intake: ChiefActionIntake) {
  if (!hasClearChiefAction(intake)) return "尚未确认";
  const actions = reportedActionSummary(intake);
  return actions.length > 1 ? actions.join("、") : intake.actionAnalysis?.task || actions[0] || intake.forceDirection || "尚未确认";
}

const CHIEF_MOTION_ALIASES: Record<string, Array<[string, string[]]>> = {
  neck: [
    ["neck-flexion", ["低头", "颈前屈"]], ["neck-extension", ["抬头", "仰头", "颈后伸"]],
    ["neck-rotation-left", ["向左转头", "头转左"]], ["neck-rotation-right", ["向右转头", "头转右"]],
    ["neck-sidebend-left", ["左耳靠肩", "头向左歪", "颈左侧屈"]], ["neck-sidebend-right", ["右耳靠肩", "头向右歪", "颈右侧屈"]],
  ],
  shoulder: [
    ["shoulder-flexion", ["向前举手", "手臂前举", "举手过头", "抬手过头", "肩前屈"]],
    ["shoulder-extension", ["手臂后伸", "向后抬手", "肩后伸"]], ["shoulder-abduction", ["侧举", "侧面举手", "肩外展"]],
    ["shoulder-internal-rotation", ["摸背", "手放背后", "肩内旋"]], ["shoulder-external-rotation", ["肩外旋", "前臂向外转"]],
  ],
  "thoracic-rib": [
    ["thoracic-extension", ["上背后伸", "胸椎伸展"]], ["thoracic-rotation-left", ["上身向左转", "胸椎左旋"]],
    ["thoracic-rotation-right", ["上身向右转", "胸椎右旋"]], ["thoracic-sidebend-left", ["上身向左弯", "胸椎左侧屈"]],
    ["thoracic-sidebend-right", ["上身向右弯", "胸椎右侧屈"]],
  ],
  elbow: [
    ["elbow-flexion", ["弯手肘", "屈肘", "肘屈"]], ["elbow-extension", ["伸直手肘", "伸肘", "肘伸"]],
    ["elbow-pronation", ["掌心向下", "旋前"]], ["elbow-supination", ["掌心向上", "旋后"]],
  ],
  "wrist-hand": [
    ["wrist-flexion", ["手掌向下弯", "屈腕", "腕屈"]], ["wrist-extension", ["手背向上抬", "伸腕", "腕背伸"]],
    ["wrist-radial-deviation", ["手向拇指侧", "桡偏"]], ["wrist-ulnar-deviation", ["手向小指侧", "尺偏"]],
    ["wrist-pronation", ["掌心向下", "旋前"]], ["wrist-supination", ["掌心向上", "旋后"]],
  ],
  "lumbar-pelvis": [
    ["lumbar-flexion", ["弯腰", "身体前屈", "腰前屈"]], ["lumbar-extension", ["后仰", "腰后伸"]],
    ["lumbar-sidebend-left", ["身体向左弯", "腰左侧屈"]], ["lumbar-sidebend-right", ["身体向右弯", "腰右侧屈"]],
    ["lumbar-rotation-left", ["向左转身", "腰左旋"]], ["lumbar-rotation-right", ["向右转身", "腰右旋"]],
  ],
  "hip-thigh": [
    ["hip-flexion", ["抬膝", "屈髋", "膝盖靠近胸口"]], ["hip-extension", ["大腿后伸", "髋后伸"]],
    ["hip-abduction", ["腿向外打开", "髋外展"]], ["hip-adduction", ["腿向内收", "髋内收"]],
    ["hip-internal-rotation", ["髋内旋", "小腿向外摆"]], ["hip-external-rotation", ["髋外旋", "小腿向内摆"]],
  ],
  knee: [
    ["knee-extension", ["伸直膝盖", "膝伸直", "伸膝"]],
    ["knee-flexion", ["弯膝", "屈膝", "膝弯曲"]],
  ],
  "ankle-foot": [
    ["ankle-dorsiflexion", ["勾脚", "脚背向上", "踝背屈"]], ["ankle-plantarflexion", ["脚背向下", "踩油门", "踮脚", "跖屈"]],
    ["ankle-inversion", ["脚掌向内", "内翻"]], ["ankle-eversion", ["脚掌向外", "外翻"]],
  ],
  "calf-local": [
    ["calf-dorsiflexion", ["勾脚", "脚背向上", "踝背屈"]], ["calf-plantarflexion", ["脚背向下", "跖屈", "提踵", "蹬地"]],
    ["calf-inversion", ["脚掌向内", "内翻"]], ["calf-eversion", ["脚掌向外", "外翻"]],
  ],
  "thigh-local": [
    ["thigh-front-length", ["弯膝", "屈膝", "脚跟靠近臀部", "大腿前侧拉长"]],
    ["thigh-back-length", ["抬腿伸膝", "大腿后侧拉长"]],
    ["thigh-medial-length", ["腿向外打开", "大腿内侧拉长"]],
    ["thigh-lateral-load", ["腿向内靠", "大腿外侧拉长"]],
  ],
};

export function chiefMotionDirectionId(intake: ChiefActionIntake, regionId: string) {
  return chiefMotionDirectionIds(intake, regionId)[0];
}

/** 返回主诉动作映射到的全部关节方向（多主诉动作可映射多个方向）。 */
export function chiefMotionDirectionIds(intake: ChiefActionIntake, regionId: string): string[] {
  if (!hasClearChiefAction(intake)) return [];
  const source = [intake.actionAnalysis?.task, ...reportedActionSummary(intake), intake.forceDirection].filter(Boolean).join(" ");
  const matches = (CHIEF_MOTION_ALIASES[regionId] ?? [])
    .filter(([, words]) => words.some((word) => source.includes(word)))
    .map(([id]) => id);
  return [...new Set(matches)];
}

/** 返回「映射不到单一关节方向」的功能主诉动作（走路、下蹲、上下楼梯、跑跳落地等）。 */
export function chiefFunctionActionLabels(intake: ChiefActionIntake, regionId: string): string[] {
  if (!hasClearChiefAction(intake)) return [];
  const words = (CHIEF_MOTION_ALIASES[regionId] ?? []).flatMap(([, w]) => w);
  return reportedActionSummary(intake)
    .filter((action): action is string => Boolean(action))
    .filter((action) => !words.some((w) => action.includes(w)));
}

export type RetestSymptomRecord = { familiarSymptom?: string };

/** 该评估记录的症状是否能驱动一次复测：有明确主诉动作，或症状是熟悉的不适。 */
export function assessmentSymptomCanDriveRetest(record: RetestSymptomRecord | undefined, intake: ChiefActionIntake) {
  if (!record) return false;
  if (hasClearChiefAction(intake)) return true;
  return record.familiarSymptom === "yes";
}

/** 是否急性外伤（近 7 天内 + 扭转/碰撞/拉伤机制）。 */
export function isAcuteTrauma(intake: ChiefActionIntake) {
  return ["今天或昨天", "2～7天"].includes(intake.onset ?? "") && ["扭转或崴伤", "跌倒或碰撞", "跑跳或拉伤"].includes(intake.mechanism ?? "");
}
