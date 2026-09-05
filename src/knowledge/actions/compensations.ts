import type { LocalizedText } from "./types.ts";

/**
 * 代偿观察选项词表：编号＝存储值（永不改），label＝显示措辞（可改），legacy＝迁移前旧文字（旧记录归一化用），
 * tags＝归类标签（接入处理候选打分与肌肉归属；必须真实存在于候选标签全集，由 check:catalog 强制）。
 * 归类逻辑认编号不认文字；未入库部位（旧表）的文字不在词表内，走关键词兜底。
 */
export type CompensationOption = { label: LocalizedText; legacy: string[]; tags?: string[] };

export const COMPENSATION_OPTIONS: Record<string, CompensationOption> = {
  "knee-height-diff": { label: { plain: "两边膝盖高度不一样", pro: "双侧膝高度不等" }, legacy: ["两边膝盖高度不一样"], tags: ["dorsiflexion"] },
  "knee-valgus": { label: { plain: "膝盖明显向内偏", pro: "膝动态外翻" }, legacy: ["膝盖明显向内偏"], tags: ["adductor", "hip-abduction", "glute-med"] },
  "knee-inward": { label: { plain: "膝盖向内偏", pro: "膝内偏" }, legacy: ["膝盖向内偏"] },
  "land-knee-inward": { label: { plain: "落地时膝盖明显向内偏", pro: "落地膝内偏" }, legacy: ["落地时膝盖明显内扣"] },
  "heel-early-rise": { label: { plain: "脚跟提前抬起", pro: "足跟提前离地" }, legacy: ["脚跟提前抬起"], tags: ["dorsiflexion"] },
  "body-sway": { label: { plain: "身体明显晃动", pro: "躯干摇摆" }, legacy: ["身体明显晃动"], tags: ["hip-abduction", "glute-med"] },
  "side-balance-worse": { label: { plain: "一侧明显比另一侧更难站稳", pro: "一侧平衡明显更差" }, legacy: ["不舒服的那边明显更难站稳", "不舒服的一侧更难站稳"], tags: ["hip-abduction", "glute-med"] },
  "pelvis-tilt": { label: { plain: "骨盆明显歪向一边", pro: "骨盆侧倾" }, legacy: ["骨盆明显歪斜"], tags: ["hip-abduction", "glute-med"] },
  "pelvis-drop": { label: { plain: "骨盆往一边掉", pro: "骨盆下沉" }, legacy: ["骨盆下沉", "骨盆一侧下沉"], tags: ["hip-abduction", "glute-med"] },
  "arch-collapse": { label: { plain: "足弓塌下", pro: "足弓塌陷" }, legacy: ["足弓明显塌下", "足弓塌下"], tags: ["arch"] },
  "need-support-uncontrolled": { label: { plain: "需要扶持或无法控制下降", pro: "需扶持或下降失控" }, legacy: ["需要扶持或无法控制下降"] },
  "body-or-pelvis-lean": { label: { plain: "身体或骨盆歪向一边", pro: "躯干或骨盆侧偏" }, legacy: ["身体或骨盆歪向一边"] },
  "descent-give-way": { label: { plain: "下降时突然掉下去", pro: "下降期打软" }, legacy: ["下降时突然掉下去"] },
  "need-hold-rail": { label: { plain: "需要扶住栏杆", pro: "需扶栏杆" }, legacy: ["需要扶住栏杆"] },
  "body-fwd-or-side-fall": { label: { plain: "身体明显向前或向一边倒", pro: "躯干前冲或侧倒" }, legacy: ["身体明显向前或向一边倒"] },
  "push-off-opposite-leg": { label: { plain: "主要靠另一条腿蹬起", pro: "对侧蹬地主导" }, legacy: ["主要靠另一条腿蹬起"] },
  "need-hand-pull-rail": { label: { plain: "需要用手拉栏杆", pro: "需手拉辅助" }, legacy: ["需要用手拉栏杆"] },
  "side-raise-lower": { label: { plain: "一侧的抬起高度明显更低", pro: "一侧提踵高度更低" }, legacy: ["不舒服的那边抬起高度更低", "患侧抬起高度更低"], tags: ["heel-raise", "calf"] },
  "limp-gait": { label: { plain: "走路明显一瘸一拐", pro: "跛行步态" }, legacy: ["走路明显一瘸一拐", "迈步时跛行"] },
  "afraid-load-side": { label: { plain: "有一侧不敢踩实", pro: "患侧避重" }, legacy: ["不敢让不舒服的一边踩实"] },
  "need-hold-to-walk": { label: { plain: "需要扶着才能走", pro: "需扶持步行" }, legacy: ["需要扶着才能走"] },
  "stride-short": { label: { plain: "脚步明显变短", pro: "步幅缩短" }, legacy: ["脚步明显变短", "步幅明显变短"] },
  "ankle-in-or-out-wobble": { label: { plain: "脚踝向内或向外晃", pro: "踝内外摆动" }, legacy: ["脚踝向内或向外晃", "脚踝反复向内或向外晃"] },
  "afraid-full-weight": { label: { plain: "不敢让支撑脚完全承重", pro: "支撑期避重" }, legacy: ["不敢让支撑脚完全承重"] },
  "land-afraid-load": { label: { plain: "落地不敢承重", pro: "落地避重" }, legacy: ["落地不敢承重"] },
  "cannot-continue": { label: { plain: "无法连续完成", pro: "无法连续完成" }, legacy: ["无法连续完成"] },
  "stance-time-short": { label: { plain: "不舒服的那条腿踩地时间变短", pro: "患侧支撑时相缩短" }, legacy: ["患侧支撑时间变短"] },
  "body-lean-side": { label: { plain: "身体向一侧偏", pro: "躯干侧偏" }, legacy: ["身体向一侧偏"] },
  "push-off-pain": { label: { plain: "蹬地的时候明显不舒服", pro: "蹬地期疼痛" }, legacy: ["蹬地时症状明显"] },
  "lean-to-opposite": { label: { plain: "起身时身体歪向另一侧", pro: "起立对侧偏倚" }, legacy: ["起身时偏向另一侧"] },
  "need-hand-push": { label: { plain: "需要用手撑", pro: "需手撑辅助" }, legacy: ["需要用手撑"] },
  "sit-drop": { label: { plain: "坐下时突然掉下去", pro: "坐落期塌陷" }, legacy: ["坐下时突然掉下去"] },
  "body-side-fall": { label: { plain: "身体明显侧倒", pro: "躯干侧倒" }, legacy: ["身体明显侧倒"] },
  "cannot-hold-10s": { label: { plain: "无法保持10秒", pro: "无法维持10秒" }, legacy: ["无法保持10秒"] },
  "land-pain-afraid": { label: { plain: "落地时疼得不敢踩实", pro: "落地疼痛避重" }, legacy: ["落地时疼或不敢承重"] },
  "body-bounce": { label: { plain: "跑起来身体上下晃得厉害", pro: "跑动躯干起伏不稳" }, legacy: ["身体上下起伏不稳"] },
  "heel-strike-unstable": { label: { plain: "脚跟落地不稳", pro: "足跟着地不稳" }, legacy: ["脚跟落地不稳"] },
  "push-off-weak": { label: { plain: "蹬地使不上劲", pro: "蹬地力量不足" }, legacy: ["蹬地不足"], tags: ["calf"] },
  "calf-symptom-walk": { label: { plain: "走路时小腿明显不舒服", pro: "步行期小腿症状" }, legacy: ["走路时小腿症状明显"] },
  "toe-grip": { label: { plain: "脚趾抓地", pro: "足趾抓地代偿" }, legacy: ["脚趾抓地"], tags: ["calf"] },
  "land-or-push-symptom": { label: { plain: "落地或蹬地时明显不舒服", pro: "落地或蹬地期症状" }, legacy: ["落地或蹬地时出现症状"] },
  "afraid-continue-run": { label: { plain: "不敢连续跑", pro: "畏惧连续跑" }, legacy: ["不敢连续跑"] },
  "cannot-jog": { label: { plain: "无法完成小步慢跑", pro: "无法完成慢跑" }, legacy: ["无法完成小步慢跑"] },
  "side-force-diff": { label: { plain: "左右用力不一样", pro: "双侧发力不对称" }, legacy: ["左右用力不一样"] },
  "rom-small": { label: { plain: "动作幅度偏小", pro: "动作幅度不足" }, legacy: ["动作幅度偏小"] },
  "need-support-assist": { label: { plain: "需要扶持或借力", pro: "需扶持或借力" }, legacy: ["需要扶持或借力", "需要扶着或借力才能做"] },
};

/** 通用兜底 4 项（原 GENERIC_FUNCTION_COMPENSATIONS 的编号化版本）。 */
export const COMPENSATION_GENERIC: string[] = ["side-force-diff", "body-sway", "rom-small", "need-support-assist"];

const LEGACY_TO_ID: Record<string, string> = {};
for (const [id, option] of Object.entries(COMPENSATION_OPTIONS)) {
  for (const text of option.legacy) {
    if (LEGACY_TO_ID[text] && LEGACY_TO_ID[text] !== id) throw new Error(`compensation legacy text claimed twice: ${text}`);
    LEGACY_TO_ID[text] = id;
  }
}

/** 旧记录里的文字 → 编号；未入库部位的自由文本原样透传。 */
export function compensationIdFor(value: string): string {
  return LEGACY_TO_ID[value] ?? value;
}

export function compensationIds(values: readonly string[]): string[] {
  return [...new Set(values.map(compensationIdFor))];
}

export function compensationLabel(id: string, mode: "guided" | "thinking"): string {
  const option = COMPENSATION_OPTIONS[id];
  if (!option) return id;
  return mode === "thinking" ? option.label.pro : option.label.plain;
}

/** 未入库部位旧表文字的关键词兜底（与词表 tags 保持同一套指向）。 */
function legacyTags(text: string): string[] {
  return text.includes("膝盖明显向内")
    ? ["adductor", "hip-abduction", "glute-med"]
    : text.includes("脚跟提前") || text.includes("膝盖高度")
      ? ["dorsiflexion"]
      : text.includes("晃动") || text.includes("站稳")
        ? ["hip-abduction", "glute-med"]
        : text.includes("抬起高度")
          ? ["heel-raise", "calf"]
          : [];
}

/** 归类标签：编号查词表 tags（无 tags＝刻意不导向）；未入库文字走关键词兜底。去重保序。 */
export function compensationTagsFor(values: readonly string[]): string[] {
  const tags: string[] = [];
  for (const value of values) {
    const id = compensationIdFor(value);
    const known = COMPENSATION_OPTIONS[id];
    for (const tag of known ? known.tags ?? [] : legacyTags(id)) {
      if (!tags.includes(tag)) tags.push(tag);
    }
  }
  return tags;
}
