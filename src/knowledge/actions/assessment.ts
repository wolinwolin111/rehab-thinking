import type { AssessmentEntry, OptionGroup } from "./types.ts";

/** 功能动作的作答三联与复测结论：按动作定制标签（值契约固定）。 */
/** 功能动作的作答三联与复测结论：按动作定制标签（值契约固定）。供 renderOptions 与审阅工具使用。 */
export const fn = (complete: string, unable: string, skip = "暂时不做"): OptionGroup => ({
  base: "function-completion",
  labels: {
    complete: { plain: complete, pro: "可以完成" },
    unable: { plain: unable, pro: "无法完成" },
    skip: { plain: skip, pro: "暂不测试" },
  },
});

export const OPT = {
  walk: fn("能走完", "走不了或不敢走", "暂时不走"),
  squat: fn("能蹲下去再站起来", "蹲不下去或不敢蹲", "暂时不蹲"),
  sitStand: fn("能坐下再站起", "站不起来或不敢做"),
  stepUp: fn("能迈上去", "迈不上去或不敢迈", "暂时不上"),
  stepDown: fn("能踩下去再回来", "下不去或不敢下", "暂时不下"),
  singleLeg: fn("能站稳", "站不稳或不敢单脚站", "暂时不站"),
  singleLegSquat: fn("能做这几次浅蹲", "做不了或不敢做"),
  hop: fn("能跳能落地", "跳不了或落地不稳", "暂时不跳"),
  jog: fn("能原地慢跑", "跑不了或不敢跑", "暂时不跑"),
  heelRaise: fn("能连续做完", "踮不上去或不敢踮"),
};

export const STRENGTH_HEEL: OptionGroup = {
  base: "strength-answer",
  labels: {
    normal: { plain: "力量接近｜两边踮起的高度和节奏接近", pro: "力量接近｜两侧力量差异不明显" },
    weak: { plain: "患侧偏弱｜踮起的高度比另一边低，或更容易累", pro: "患侧偏弱｜两侧力量差异明显" },
    painful: { plain: "发力不适｜踮起时出现平时那种不舒服", pro: "发力不适｜发力诱发症状" },
  },
};

export const ASSESSMENT_ENTRIES: AssessmentEntry[] = [
  {
    id: "knee-calf", region: "knee", kind: "strength", access: "self",
    title: { plain: "踮脚力量", pro: "小腿三头肌" },
    actions: ["heel-raise-standing", "heel-raise-single"],
    how: {
      plain: "扶住墙，双脚慢慢踮起再落下，做{dose.both}次。两边都能稳定完成时，再分别用单脚试做。",
      pro: "双脚踮脚尖{dose.both}个；允许时再左右单脚各做最多{dose.each}个。",
    },
    observe: {
      plain: "哪边抬得更低、更容易累，或用力时会不舒服。",
      pro: "高度、节奏、膝是否弯曲及患侧能完成的高质量个数。",
    },
    optionSet: "strength",
    options: STRENGTH_HEEL,
    dose: { plain: { both: 10 }, pro: { both: 10, each: 10 } },
  },
  {
    id: "knee-heel-raise", region: "knee", kind: "function", access: "self",
    title: { plain: "双脚提踵", pro: "双脚提踵" },
    actions: ["heel-raise-standing"],
    how: {
      plain: "扶住墙面，双脚同时缓慢抬起脚跟，再慢慢落下，完成{dose.both}次。",
      pro: "扶住墙面，双脚同时缓慢抬起脚跟，再慢慢落下，完成{dose.both}次。",
    },
    observe: {
      plain: "两侧高度是否接近，身体是否晃动，患侧是否明显更难完成。",
      pro: "两侧高度是否接近，身体是否晃动，患侧是否明显更难完成。",
    },
    optionSet: "function",
    options: OPT.heelRaise,
    dose: { plain: { both: 10 }, pro: { both: 10 } },
  },
  {
    id: "ankle-calf", region: "ankle-foot", kind: "strength", access: "self",
    title: { plain: "踮脚力量", pro: "小腿三头肌 / 提踵" },
    actions: ["heel-raise-standing", "heel-raise-single"],
    how: {
      plain: "扶住墙，双脚慢慢踮起再落下，做{dose.both}次。能稳定完成时，再分别用单脚试做。",
      pro: "先双脚提踵{dose.both}个；稳定后扶墙做单脚提踵，最多记录{dose.each}个高质量次数。",
    },
    observe: {
      plain: "哪边抬得更低、更容易累，或用力时会不舒服。",
      pro: "提踵高度、节奏、膝是否弯曲和患侧耐力。",
    },
    optionSet: "strength",
    options: STRENGTH_HEEL,
    dose: { plain: { both: 10 }, pro: { both: 10, each: 10 } },
  },
  {
    id: "ankle-heel-raise", region: "ankle-foot", kind: "function", access: "self",
    title: { plain: "踮脚", pro: "提踵" },
    actions: ["heel-raise-standing", "heel-raise-single"],
    how: {
      plain: "扶住墙，双脚慢慢踮起再落下，做{dose.both}次。",
      pro: "先双脚同步提踵{dose.both}个，再根据耐受做单脚提踵。",
    },
    observe: {
      plain: "两边脚跟抬起的高度是否接近；哪里不舒服；身体是否明显偏向一边。",
      pro: "高度、节奏、足弓、跟腱/小腿症状和高质量次数。",
    },
    optionSet: "function",
    options: OPT.heelRaise,
    dose: { plain: { both: 10 }, pro: { both: 10 } },
  },
  {
    id: "calf-heel-raise-strength", region: "calf-local", kind: "strength", access: "self",
    title: { plain: "小腿后侧发力", pro: "小腿后侧发力" },
    actions: ["heel-raise-standing"],
    how: {
      plain: "扶墙做{dose.both}次双脚提踵；稳定时再分别单脚尝试。",
      pro: "扶墙做{dose.both}次双脚提踵；稳定时再分别单脚尝试。",
    },
    observe: {
      plain: "比较高度、个数和症状。",
      pro: "比较高度、个数和症状。",
    },
    optionSet: "strength",
    options: STRENGTH_HEEL,
    dose: { plain: { both: 10 }, pro: { both: 10 } },
  },
  {
    id: "calf-heel-raise", region: "calf-local", kind: "function", access: "self",
    title: { plain: "提踵", pro: "提踵" },
    actions: ["heel-raise-standing"],
    how: {
      plain: "扶墙做{dose.both}次双脚提踵。",
      pro: "扶墙做{dose.both}次双脚提踵。",
    },
    observe: {
      plain: "局部症状、高度和左右差异。",
      pro: "局部症状、高度和左右差异。",
    },
    optionSet: "function",
    options: OPT.heelRaise,
    dose: { plain: { both: 10 }, pro: { both: 10 } },
  },
  {
    id: "knee-gait", region: "knee", kind: "function", access: "self",
    title: { plain: "走路", pro: "走路" },
    actions: ["walk"],
    how: {
      plain: "自然走10米，记录脚着地、患侧承重、身体越过支撑脚和蹬地。",
      pro: "自然走10米，记录脚着地、患侧承重、身体越过支撑脚和蹬地。",
    },
    observe: {
      plain: "跛行阶段、步幅、膝能否伸直及0～10分。",
      pro: "跛行阶段、步幅、膝能否伸直及0～10分。",
    },
    optionSet: "function",
    options: OPT.walk,
    dose: { plain: {}, pro: {} },
  },
  {
    id: "ankle-weight-bearing", region: "ankle-foot", kind: "function", access: "self",
    title: { plain: "走几步看看", pro: "走路与患侧承重" },
    actions: ["walk"],
    how: {
      plain: "在能扶住的地方自然走几步，不用故意走快。",
      pro: "在可扶持环境下走一小段。先看患侧能否承重，再观察脚跟着地、身体经过支撑脚和脚尖蹬地是否连贯。",
    },
    observe: {
      plain: "不舒服这边能不能踩地；哪一步会不舒服；有没有明显一瘸一拐。",
      pro: "记录能否承重、是否跛行、哪一步出现症状，以及左右步幅是否明显不同。",
    },
    optionSet: "function",
    options: OPT.walk,
    dose: { plain: {}, pro: {} },
  },
  {
    id: "thigh-walk", region: "thigh-local", kind: "function", access: "self",
    title: { plain: "走路", pro: "走路" },
    actions: ["walk"],
    how: {
      plain: "以平时速度走一小段。",
      pro: "以平时速度走一小段。",
    },
    observe: {
      plain: "症状出现在迈步、支撑还是蹬地阶段，是否跛行。",
      pro: "症状出现在迈步、支撑还是蹬地阶段，是否跛行。",
    },
    optionSet: "function",
    options: OPT.walk,
    dose: { plain: {}, pro: {} },
  },
  {
    id: "calf-walk", region: "calf-local", kind: "function", access: "self",
    title: { plain: "走路", pro: "走路" },
    actions: ["walk"],
    how: {
      plain: "以平时速度走一小段。",
      pro: "以平时速度走一小段。",
    },
    observe: {
      plain: "症状出现在落脚、身体前移还是蹬地阶段。",
      pro: "症状出现在落脚、身体前移还是蹬地阶段。",
    },
    optionSet: "function",
    options: OPT.walk,
    dose: { plain: {}, pro: {} },
  },
  {
    id: "knee-squat", region: "knee", kind: "function", access: "self",
    title: { plain: "下蹲", pro: "下蹲" },
    actions: ["squat"],
    how: {
      plain: "扶住稳固的桌面，慢慢下蹲到舒服的深度，再站起来，做{dose.reps}。",
      pro: "双脚固定位置，以相同速度下蹲到舒适深度再站起。",
    },
    observe: {
      plain: "哪一段不舒服；膝盖有没有明显向内倒；脚跟是否提前抬起。",
      pro: "深度、疼痛阶段、髋膝踝联动、左右承重及膝足方向。",
    },
    optionSet: "function",
    options: OPT.squat,
    dose: { plain: { reps: "3次" }, pro: {} },
  },
  {
    id: "ankle-squat", region: "ankle-foot", kind: "function", access: "self",
    title: { plain: "扶着下蹲", pro: "下蹲" },
    actions: ["squat"],
    how: {
      plain: "双脚自然站立，扶住固定物，慢慢下蹲到舒服的深度，再站起来。",
      pro: "双脚自然站立，扶住固定物，慢慢下蹲到舒适深度再站起。",
    },
    observe: {
      plain: "脚跟会不会提前抬起；哪边脚踝更难向前弯；哪里不舒服。",
      pro: "两边膝盖高度、膝盖方向和脚跟是否提前抬起。",
    },
    optionSet: "function",
    options: OPT.squat,
    dose: { plain: {}, pro: {} },
  },
  {
    id: "knee-sit-stand", region: "knee", kind: "function", access: "self",
    title: { plain: "坐下再站起", pro: "坐下再站起" },
    actions: ["sit-to-stand"],
    how: {
      plain: "从同一把稳固椅子慢慢坐下再站起{dose.reps}；需要时可以轻扶。",
      pro: "从同一把稳固椅子慢慢坐下再站起{dose.reps}；需要时可以轻扶。",
    },
    observe: {
      plain: "坐下和起身哪个阶段不舒服，是否明显偏向一侧用力。",
      pro: "坐下和起身哪个阶段不舒服，是否明显偏向一侧用力。",
    },
    optionSet: "function",
    options: OPT.sitStand,
    dose: { plain: { reps: "3次" }, pro: { reps: "3次" } },
  },
  {
    id: "thigh-sit-stand", region: "thigh-local", kind: "function", access: "self",
    title: { plain: "坐下再站起", pro: "坐下再站起" },
    actions: ["sit-to-stand"],
    how: {
      plain: "从稳固椅子慢慢坐下再站起{dose.reps}。",
      pro: "从稳固椅子慢慢坐下再站起{dose.reps}。",
    },
    observe: {
      plain: "大腿哪里不舒服，左右用力是否明显不同。",
      pro: "大腿哪里不舒服，左右用力是否明显不同。",
    },
    optionSet: "function",
    options: OPT.sitStand,
    dose: { plain: { reps: "3次" }, pro: { reps: "3次" } },
  },
  {
    id: "knee-step-up", region: "knee", kind: "function", access: "self",
    title: { plain: "上台阶", pro: "上楼 / 上台阶" },
    actions: ["step-up"],
    how: {
      plain: "扶住栏杆，用一侧腿先踏上低台阶并站起，做{dose.reps}，再换另一边。",
      pro: "用固定高度台阶，患侧先上，轻扶栏杆，完成{dose.reps}。",
    },
    observe: {
      plain: "哪边更难站起；是否明显借助手臂；哪里不舒服。",
      pro: "起身阶段、股四头与臀肌发力、疼痛和借力。",
    },
    optionSet: "function",
    options: OPT.stepUp,
    dose: { plain: { reps: "3次" }, pro: { reps: "3次" } },
  },
  {
    id: "knee-step-down", region: "knee", kind: "function", access: "self",
    title: { plain: "下台阶", pro: "下楼 / 下台阶" },
    actions: ["step-down"],
    how: {
      plain: "扶住栏杆，一只脚站在低台阶上，另一只脚跟慢慢点地再回来，做{dose.reps}，再换边。",
      pro: "站在固定高度台阶上，患侧支撑，健侧脚跟慢慢点地再回起。",
    },
    observe: {
      plain: "下降到哪一段不舒服；支撑腿膝盖是否向内倒；哪边更难控制。",
      pro: "患侧承重阶段、下降控制、膝内外偏移和0～10分。",
    },
    optionSet: "function",
    options: OPT.stepDown,
    dose: { plain: { reps: "3次" }, pro: {} },
  },
  {
    id: "ankle-step-down", region: "ankle-foot", kind: "function", access: "self",
    title: { plain: "下台阶（脚踝）", pro: "下台阶" },
    actions: ["step-down"],
    how: {
      plain: "扶住栏杆，一只脚站在低台阶上，另一只脚跟慢慢点地再回来，做{dose.reps}，再换边。",
      pro: "扶住栏杆，站在固定高度台阶上，患侧支撑，健侧脚跟慢慢点地再回起。",
    },
    observe: {
      plain: "下降到哪一段不舒服；支撑脚踝是否向内或向外晃；哪边更难控制。",
      pro: "患侧承重阶段、踝足方向与足弓稳定、下降控制和0～10分。",
    },
    optionSet: "function",
    options: OPT.stepDown,
    dose: { plain: { reps: "3次" }, pro: {} },
  },
  {
    id: "knee-single-leg", region: "knee", kind: "function", access: "self",
    title: { plain: "单脚站立", pro: "单腿站" },
    actions: ["single-leg-stand"],
    how: {
      plain: "靠近墙，一只脚站立10秒，再换另一边；需要时用手指轻扶。",
      pro: "靠近墙，先做健侧，再用患侧单腿站立10秒，必要时手指轻扶。",
    },
    observe: {
      plain: "哪边更容易晃、站不住或引起不适。",
      pro: "身体是否明显晃动，患侧是否明显更难站稳。",
    },
    optionSet: "function",
    options: OPT.singleLeg,
    dose: { plain: {}, pro: {} },
  },
  {
    id: "ankle-single-leg", region: "ankle-foot", kind: "function", access: "self",
    title: { plain: "单脚站立", pro: "单腿站" },
    actions: ["single-leg-stand"],
    how: {
      plain: "靠近墙，一只脚站立10秒，再换另一边；需要时用手指轻扶。",
      pro: "靠近墙，先做健侧，再用患侧单腿站立10秒，必要时手指轻扶。",
    },
    observe: {
      plain: "哪边更容易晃、站不住或引起不适。",
      pro: "身体是否明显晃动，患侧是否明显更难站稳。",
    },
    optionSet: "function",
    options: OPT.singleLeg,
    dose: { plain: {}, pro: {} },
  },
  {
    id: "thigh-single-leg", region: "thigh-local", kind: "function", access: "self",
    title: { plain: "单腿骨盆稳定检查", pro: "单腿骨盆稳定检查" },
    actions: ["single-leg-stand"],
    how: {
      plain: "扶住固定物，左右分别单腿站立10秒。",
      pro: "扶住固定物，左右分别单腿站立10秒。",
    },
    observe: {
      plain: "比较骨盆是否明显下沉、身体是否侧倒（可手搭两侧胯骨或拍10秒视频回看），以及大腿内外侧是否出现熟悉不适。",
      pro: "比较骨盆是否明显下沉、身体是否侧倒（可手搭两侧胯骨或拍10秒视频回看），以及大腿内外侧是否出现熟悉不适。",
    },
    optionSet: "function",
    options: OPT.singleLeg,
    dose: { plain: {}, pro: {} },
  },
  {
    id: "calf-single-leg", region: "calf-local", kind: "function", access: "self",
    title: { plain: "单腿足踝稳定检查", pro: "单腿足踝稳定检查" },
    actions: ["single-leg-stand"],
    how: {
      plain: "扶住固定物，左右分别单腿站立10秒。",
      pro: "扶住固定物，左右分别单腿站立10秒。",
    },
    observe: {
      plain: "比较足弓和脚踝是否稳定（可拍10秒视频回看），以及小腿内外侧是否出现熟悉不适。",
      pro: "比较足弓和脚踝是否稳定（可拍10秒视频回看），以及小腿内外侧是否出现熟悉不适。",
    },
    optionSet: "function",
    options: OPT.singleLeg,
    dose: { plain: {}, pro: {} },
  },
  {
    id: "knee-single-leg-squat", region: "knee", kind: "function", access: "self",
    title: { plain: "扶着做单腿浅蹲", pro: "扶物单腿浅蹲" },
    actions: ["single-leg-stand", "squat"],
    how: {
      plain: "只有下蹲和单脚站都能完成时再做。扶住固定物，单腿小幅下蹲{dose.reps}。",
      pro: "只有下蹲和单腿站都能稳定完成时再做。靠近固定物，单腿小幅下蹲{dose.reps}，不追求深度。",
    },
    observe: {
      plain: "膝盖是否向内倒；骨盆是否歪；足弓是否塌下；哪里不舒服。",
      pro: "骨盆能否保持稳定，膝盖是否明显向内偏，足弓是否塌下，以及是否出现原来的不适。",
    },
    optionSet: "function",
    options: OPT.singleLegSquat,
    dose: { plain: { reps: "3次" }, pro: { reps: "3次" } },
  },
  {
    id: "thigh-single-leg-squat", region: "thigh-local", kind: "function", access: "self",
    title: { plain: "扶物单腿浅蹲", pro: "扶物单腿浅蹲" },
    actions: ["single-leg-stand", "squat"],
    how: {
      plain: "单腿站稳且没有明显加重时，扶住固定物做{dose.reps}小幅单腿下蹲。",
      pro: "单腿站稳且没有明显加重时，扶住固定物做{dose.reps}小幅单腿下蹲。",
    },
    observe: {
      plain: "比较两侧下降控制、骨盆是否歪斜，以及大腿是否出现熟悉不适。",
      pro: "比较两侧下降控制、骨盆是否歪斜，以及大腿是否出现熟悉不适。",
    },
    optionSet: "function",
    options: OPT.singleLegSquat,
    dose: { plain: { reps: "3次" }, pro: { reps: "3次" } },
  },
  {
    id: "knee-hop-landing", region: "knee", kind: "function", access: "self",
    title: { plain: "小跳与落地", pro: "小跳与落地" },
    actions: ["hop-landing"],
    how: {
      plain: "只在走路、台阶和单腿任务稳定后，做双脚小跳落地{dose.reps}。",
      pro: "只在走路、台阶和单腿任务稳定后，做双脚小跳落地{dose.reps}。",
    },
    observe: {
      plain: "落地缓冲、膝髋屈曲、左右受力和不稳。",
      pro: "落地缓冲、膝髋屈曲、左右受力和不稳。",
    },
    optionSet: "function",
    options: OPT.hop,
    dose: { plain: { reps: "3次" }, pro: { reps: "3次" } },
  },
  {
    id: "ankle-hop", region: "ankle-foot", kind: "function", access: "self",
    title: { plain: "小跳与落地", pro: "小跳与落地" },
    actions: ["hop-landing"],
    how: {
      plain: "只在步态、提踵和单腿站稳定后，完成双脚小跳，再考虑单脚。",
      pro: "只在步态、提踵和单腿站稳定后，完成双脚小跳，再考虑单脚。",
    },
    observe: {
      plain: "落地疼痛、不稳、缓冲和再次起跳能力。",
      pro: "落地疼痛、不稳、缓冲和再次起跳能力。",
    },
    optionSet: "function",
    options: OPT.hop,
    dose: { plain: {}, pro: {} },
  },
  {
    id: "thigh-jog", region: "thigh-local", kind: "function", access: "self",
    title: { plain: "慢跑准备", pro: "慢跑准备" },
    actions: ["jog"],
    how: {
      plain: "只有走路和坐站稳定时，原地小步慢跑10秒。",
      pro: "只有走路和坐站稳定时，原地小步慢跑10秒。",
    },
    observe: {
      plain: "是否再现大腿局部症状。",
      pro: "是否再现大腿局部症状。",
    },
    optionSet: "function",
    options: OPT.jog,
    dose: { plain: {}, pro: {} },
  },
  {
    id: "calf-jog", region: "calf-local", kind: "function", access: "self",
    title: { plain: "慢跑准备", pro: "慢跑准备" },
    actions: ["jog"],
    how: {
      plain: "只有走路和提踵稳定时，原地小步慢跑10秒。",
      pro: "只有走路和提踵稳定时，原地小步慢跑10秒。",
    },
    observe: {
      plain: "是否再现局部症状。",
      pro: "是否再现局部症状。",
    },
    optionSet: "function",
    options: OPT.jog,
    dose: { plain: {}, pro: {} },
  },
  {
    id: "knee-extension", region: "knee", kind: "direction", access: "self",
    title: { plain: "把膝盖绷直", pro: "膝伸直" },
    actions: ["knee-straighten"],
    how: {
      plain: "仰卧，两条腿放平，脚跟位置保持一致。先绷紧一侧大腿前侧，把膝盖后方向床面压，再换另一侧。",
      pro: "仰卧双腿自然伸直，主动绷紧大腿前侧，把膝后侧向床面靠近；先做健侧再做患侧。",
    },
    observe: {
      plain: "比较两侧膝后离床面的空隙，以及哪一侧更难向下压。",
      pro: "膝后间隙、下压发力感、末端角度、疼痛和左右差异。",
    },
    optionSet: "direction", dose: { plain: {}, pro: {} },
  },
  {
    id: "knee-flexion", region: "knee", kind: "direction", access: "self",
    title: { plain: "慢慢弯膝盖", pro: "膝屈曲" },
    actions: ["knee-bend"],
    how: {
      plain: "仰卧，脚跟贴着床面。先做没有不适的一边，再慢慢弯另一边膝盖。",
      pro: "仰卧，双侧脚跟分别向臀部滑动，骨盆保持稳定。",
    },
    observe: {
      plain: "只比较两件事：哪边活动范围更小；活动到最大范围时会不会牵拉或卡住。",
      pro: "脚跟到臀部距离、前膝或腘窝症状、肿胀阻挡和骨盆代偿。",
    },
    optionSet: "direction", dose: { plain: {}, pro: {} },
  },
  {
    id: "knee-patella-superior", region: "knee", kind: "direction", access: "self",
    title: { plain: "髌骨向上移动", pro: "髌骨向上活动" },
    actions: ["patella-glide-up"],
    how: {
      plain: "由熟悉检查的人让膝盖完全放松，再轻轻把髌骨向上推。",
      pro: "仰卧放松膝盖，用两指轻触髌骨边缘，先在健侧感受，再轻柔向上移动患侧。",
    },
    observe: {
      plain: "与另一侧相比；是否明显更紧或会引起原来的不适。",
      pro: "与健侧相比是否明显更少，是否出现原疼痛。",
    },
    optionSet: "direction", dose: { plain: {}, pro: {} },
  },
  {
    id: "knee-patella-inferior", region: "knee", kind: "direction", access: "self",
    title: { plain: "髌骨向下移动", pro: "髌骨向下活动" },
    actions: ["patella-glide-down"],
    how: {
      plain: "由熟悉检查的人让膝盖完全放松，再轻轻把髌骨向下推。",
      pro: "仰卧放松膝盖，轻柔比较髌骨向下移动。",
    },
    observe: {
      plain: "与另一侧相比；是否明显更紧或会引起原来的不适。",
      pro: "与健侧差异，以及是否与屈膝受限同时出现。",
    },
    optionSet: "direction", dose: { plain: {}, pro: {} },
  },
  {
    id: "knee-patella-medial", region: "knee", kind: "direction", access: "self",
    title: { plain: "髌骨向内移动", pro: "髌骨向内活动" },
    actions: ["patella-glide-medial"],
    how: {
      plain: "由熟悉检查的人让膝盖完全放松，再轻轻把髌骨向内推。",
      pro: "仰卧放松膝盖，轻柔比较髌骨向内侧移动。",
    },
    observe: {
      plain: "与另一侧相比；是否明显更紧或会引起原来的不适。",
      pro: "左右差异、疼痛和末端弹性。",
    },
    optionSet: "direction", dose: { plain: {}, pro: {} },
  },
  {
    id: "knee-patella-lateral", region: "knee", kind: "direction", access: "self",
    title: { plain: "髌骨向外移动", pro: "髌骨向外活动" },
    actions: ["patella-glide-lateral"],
    how: {
      plain: "由熟悉检查的人让膝盖完全放松，再轻轻把髌骨向外推。",
      pro: "仰卧放松膝盖，轻柔比较髌骨向外侧移动。",
    },
    observe: {
      plain: "与另一侧相比；是否明显更紧或会引起原来的不适。",
      pro: "左右差异、疼痛和末端弹性。",
    },
    optionSet: "direction", dose: { plain: {}, pro: {} },
  },
  {
    id: "ankle-dorsiflexion", region: "ankle-foot", kind: "direction", access: "self",
    title: { plain: "把脚背向上勾", pro: "踝背屈" },
    actions: ["ankle-dorsiflex"],
    how: {
      plain: "坐稳，脚跟放在地上。先做没有不适的一边，再把另一边脚背慢慢向小腿靠近。",
      pro: "坐姿脚跟着地，把脚背向小腿靠近；能稳定负重后再做膝碰墙比较。",
    },
    observe: {
      plain: "只比较两件事：哪边活动范围更小；活动到最大范围时会不会牵拉或卡住。",
      pro: "主动角度、踝前卡痛、小腿后侧牵扯和两侧膝碰墙距离。",
    },
    optionSet: "direction", dose: { plain: {}, pro: {} },
  },
  {
    id: "ankle-dorsiflexion-knee-flexed", region: "ankle-foot", kind: "direction", access: "self",
    title: { plain: "屈膝位踝背屈", pro: "屈膝位踝背屈" },
    actions: ["ankle-dorsiflex"],
    how: {
      plain: "坐姿屈膝、脚跟着地，把脚背向小腿靠近；保持脚跟和膝盖方向不变。",
      pro: "坐姿屈膝、脚跟着地，把脚背向小腿靠近；保持脚跟和膝盖方向不变。",
    },
    observe: {
      plain: "与伸膝位分别记录主动、被动范围，比较屈膝后是否仍受限。",
      pro: "与伸膝位分别记录主动、被动范围，比较屈膝后是否仍受限。",
    },
    optionSet: "direction", dose: { plain: {}, pro: {} },
  },
  {
    id: "ankle-plantarflexion", region: "ankle-foot", kind: "direction", access: "self",
    title: { plain: "踝关节主动跖屈", pro: "踝跖屈" },
    actions: ["ankle-plantarflex"],
    how: {
      plain: "坐稳，小腿放松。先做没有不适的一边，再把另一边脚背缓慢向下压。",
      pro: "坐稳并放松小腿，把脚背缓慢向下压；先做健侧，再做不舒服的一侧。",
    },
    observe: {
      plain: "只比较两件事：哪边活动范围更小；活动到最大范围时会不会牵拉或卡住。",
      pro: "跖屈角度、踝前后症状和脚趾是否过度卷曲。",
    },
    optionSet: "direction", dose: { plain: {}, pro: {} },
  },
  {
    id: "ankle-inversion", region: "ankle-foot", kind: "direction", access: "self",
    title: { plain: "把脚掌转向内侧", pro: "足踝内翻" },
    actions: ["ankle-invert"],
    how: {
      plain: "坐稳，小腿保持不动。先做没有不适的一边，再把另一边脚掌慢慢转向身体中间。",
      pro: "坐姿小腿固定，把脚掌缓慢转向内侧，不动膝盖。",
    },
    observe: {
      plain: "只比较两件事：哪边活动范围更小；活动到最大范围时会不会牵拉或卡住。",
      pro: "两侧角度、外踝牵扯或内侧疼痛，以及小腿是否跟着转。",
    },
    optionSet: "direction", dose: { plain: {}, pro: {} },
  },
  {
    id: "ankle-eversion", region: "ankle-foot", kind: "direction", access: "self",
    title: { plain: "把脚掌转向外侧", pro: "足踝外翻" },
    actions: ["ankle-evert"],
    how: {
      plain: "坐稳，小腿保持不动。先做没有不适的一边，再把另一边脚掌慢慢向外转。",
      pro: "坐姿小腿固定，把脚掌缓慢转向外侧，不动膝盖。",
    },
    observe: {
      plain: "只比较两件事：哪边活动范围更小；活动到最大范围时会不会牵拉或卡住。",
      pro: "两侧角度、外侧肌肉发力、内外踝疼痛及小腿代偿。",
    },
    optionSet: "direction", dose: { plain: {}, pro: {} },
  },
  {
    id: "ankle-great-toe-extension", region: "ankle-foot", kind: "direction", access: "self",
    title: { plain: "大脚趾向上抬", pro: "第一跖趾背伸" },
    actions: ["great-toe-extend"],
    how: {
      plain: "脚掌放松，用手轻轻把大脚趾向上抬。",
      pro: "脚掌放松，用手轻抬大脚趾；先做健侧，再比较患侧。",
    },
    observe: {
      plain: "与另一侧相比；大脚趾或足底哪里不舒服。",
      pro: "大脚趾角度、足底牵扯和足弓是否随之变化。",
    },
    optionSet: "direction", dose: { plain: {}, pro: {} },
  },
  {
    id: "ankle-toe-flexion", region: "ankle-foot", kind: "direction", access: "self",
    title: { plain: "脚趾弯曲和伸直", pro: "足趾屈曲与伸展" },
    actions: ["toe-flex"],
    how: {
      plain: "脚跟着地，先把脚趾全部抬起，再轻轻放下和弯曲。",
      pro: "脚跟着地，脚趾全部抬起再放下，然后轻轻屈曲，不抓地用力。",
    },
    observe: {
      plain: "脚趾能否分别控制；哪里不舒服；是否只有某个脚趾受限。",
      pro: "足趾独立控制、疼痛和是否只有大脚趾或小趾侧受限。",
    },
    optionSet: "direction", dose: { plain: {}, pro: {} },
  },
  {
    id: "knee-quadriceps", region: "knee", kind: "strength", access: "self",
    title: { plain: "膝盖伸直力量", pro: "膝盖伸直力量" },
    actions: ["knee-straighten"],
    how: {
      plain: "仰卧，把膝盖后面向床面压住5秒。再坐好，把小腿抬起并保持5秒。两边各做一次。",
      pro: "先仰卧，把膝后侧向床面压住5秒；再坐好，把小腿慢慢抬到能到的位置并保持5秒。",
    },
    observe: {
      plain: "哪边更难压住或抬住；是否明显发抖；用力时哪里不舒服。",
      pro: "和健侧比较下压和抬腿的力量；留意不舒服的一侧是否明显抖动，或因为疼痛不敢用力。",
    },
    optionSet: "strength", dose: { plain: { hold: 5 }, pro: { hold: 5 } },
  },
  {
    id: "knee-adductor-pes", region: "knee", kind: "strength", access: "self",
    title: { plain: "大腿内侧力量", pro: "大腿内侧力量" },
    actions: ["pillow-squeeze"],
    how: {
      plain: "仰卧屈膝，在两膝之间放一个软枕，轻轻夹住5秒。两边分别侧重发力，比较哪边更难保持。",
      pro: "仰卧屈膝，在两膝之间夹软枕5秒，分别侧重一侧发力进行比较。",
    },
    observe: {
      plain: "比较哪边大腿内侧更难发力；留意膝内侧会不会出现平时的不适。",
      pro: "大腿内侧发力和膝内侧症状。",
    },
    optionSet: "strength", dose: { plain: { hold: 5 }, pro: { hold: 5 } },
  },
  {
    id: "knee-glute", region: "knee", kind: "strength", access: "self",
    title: { plain: "臀肌与骨盆稳定", pro: "臀肌与骨盆稳定" },
    actions: ["single-leg-stand"],
    how: {
      plain: "扶住墙，一只脚站立10秒，再换另一边。",
      pro: "用侧向推墙或单腿站比较两侧臀部参与。",
    },
    observe: {
      plain: "哪边更容易晃；骨盆是否明显歪向一边；膝盖是否跟着向内倒。",
      pro: "骨盆是否下沉、躯干侧倾和患侧承重感。",
    },
    optionSet: "strength", dose: { plain: { hold: 10 }, pro: {} },
  },
  {
    id: "ankle-dorsiflexor", region: "ankle-foot", kind: "strength", access: "self",
    title: { plain: "勾脚力量", pro: "勾脚力量" },
    actions: ["ankle-dorsiflex"],
    how: {
      plain: "坐稳，把另一只脚轻轻压在脚背上，再用下面这只脚向上勾住5秒。两边各做一次。",
      pro: "坐着主动勾脚，用另一只脚或手在脚背轻轻向下压，保持5秒。",
    },
    observe: {
      plain: "哪边更容易被压下去；是否只抬脚趾却没有勾起脚背；哪里不舒服。",
      pro: "和健侧比较力量，留意脚趾有没有使劲代替脚踝发力。",
    },
    optionSet: "strength", dose: { plain: { hold: 5 }, pro: { hold: 5 } },
  },
  {
    id: "ankle-evertor", region: "ankle-foot", kind: "strength", access: "self",
    title: { plain: "外翻力量（腓骨肌）", pro: "外翻力量（腓骨肌）" },
    actions: ["ankle-evert"],
    how: {
      plain: "坐稳，用另一只脚挡在脚的外侧，再把脚掌向外顶住5秒。两边各做一次。",
      pro: "坐稳。把另一只脚挡在不舒服这只脚的外侧，再用不舒服这只脚向外顶住5秒；两边各做一次。",
    },
    observe: {
      plain: "哪边更容易被挡住；外踝或小腿外侧是否不舒服。",
      pro: "比较哪边更容易被挡住；同时留意外踝会不会不舒服。",
    },
    optionSet: "strength", dose: { plain: { hold: 5 }, pro: { hold: 5 } },
  },
  {
    id: "ankle-invertor", region: "ankle-foot", kind: "strength", access: "self",
    title: { plain: "内翻力量（胫骨后肌）", pro: "内翻力量（胫骨后肌）" },
    actions: ["ankle-invert"],
    how: {
      plain: "坐稳，用另一只脚挡在脚的内侧，再把脚掌向内顶住5秒。两边各做一次。",
      pro: "坐稳。把另一只脚挡在不舒服这只脚的内侧，再用不舒服这只脚向内顶住5秒；两边各做一次。",
    },
    observe: {
      plain: "哪边更容易被挡住；内踝后方或足弓是否不舒服。",
      pro: "比较哪边更容易被挡住；同时留意内踝后方会不会不舒服。",
    },
    optionSet: "strength", dose: { plain: { hold: 5 }, pro: { hold: 5 } },
  },
  {
    id: "ankle-intrinsic", region: "ankle-foot", kind: "strength", access: "self",
    title: { plain: "踮脚尖力量", pro: "踮脚尖力量" },
    actions: ["heel-raise-standing"],
    how: {
      plain: "站稳，脚趾放松贴地，轻轻踮起脚尖再放下，两边各做5个。",
      pro: "站稳，脚趾放松贴地，轻轻踮起脚尖再放下，两边各做5个。",
    },
    observe: {
      plain: "两侧踮起的高度是否接近；脚趾有没有抠地。",
      pro: "足弓是否可控，脚趾是否抓地或卷曲。",
    },
    optionSet: "strength", dose: { plain: { both: 5 }, pro: { both: 5 } },
  },
  {
    id: "thigh-front-strength", region: "thigh-local", kind: "strength", access: "self",
    title: { plain: "大腿前侧发力", pro: "大腿前侧发力" },
    actions: ["sit-to-stand"],
    how: {
      plain: "坐稳，把小腿慢慢抬起并保持5秒；普通用户只比较两侧，不额外施加强阻力。",
      pro: "坐稳，把小腿慢慢抬起并保持5秒；普通用户只比较两侧，不额外施加强阻力。",
    },
    observe: {
      plain: "比较保持、抖动和熟悉症状。",
      pro: "比较保持、抖动和熟悉症状。",
    },
    optionSet: "strength", dose: { plain: { hold: 5 }, pro: { hold: 5 } },
  },
  {
    id: "thigh-medial-strength", region: "thigh-local", kind: "strength", access: "self",
    title: { plain: "大腿内侧发力", pro: "大腿内侧发力" },
    actions: ["pillow-squeeze"],
    how: {
      plain: "仰卧屈膝，在两膝之间放软枕，轻轻夹住5秒。",
      pro: "仰卧屈膝，在两膝之间放软枕，轻轻夹住5秒。",
    },
    observe: {
      plain: "比较发力感和熟悉症状。",
      pro: "比较发力感和熟悉症状。",
    },
    optionSet: "strength", dose: { plain: { hold: 5 }, pro: { hold: 5 } },
  },
  {
    id: "thigh-lateral-strength", region: "thigh-local", kind: "strength", access: "self",
    title: { plain: "大腿外侧发力", pro: "大腿外侧发力" },
    actions: ["hip-abduction"],
    how: {
      plain: "侧卧或扶墙站立，把腿小幅向外抬起并保持5秒，身体不要侧倒。",
      pro: "侧卧或扶墙站立，把腿小幅向外抬起并保持5秒，身体不要侧倒。",
    },
    observe: {
      plain: "比较保持能力和熟悉症状。",
      pro: "比较保持能力和熟悉症状。",
    },
    optionSet: "strength", dose: { plain: { hold: 5 }, pro: { hold: 5 } },
  },
  {
    id: "calf-dorsiflexor-strength", region: "calf-local", kind: "strength", access: "self",
    title: { plain: "小腿前侧发力", pro: "小腿前侧发力" },
    actions: ["ankle-dorsiflex"],
    how: {
      plain: "坐稳，把脚背向上勾并保持5秒，不需要别人施加强阻力。",
      pro: "坐稳，把脚背向上勾并保持5秒，不需要别人施加强阻力。",
    },
    observe: {
      plain: "比较保持和熟悉症状。",
      pro: "比较保持和熟悉症状。",
    },
    optionSet: "strength", dose: { plain: { hold: 5 }, pro: { hold: 5 } },
  },
  {
    id: "calf-invertor-strength", region: "calf-local", kind: "strength", access: "self",
    title: { plain: "小腿内侧发力", pro: "小腿内侧发力" },
    actions: ["ankle-invert"],
    how: {
      plain: "用另一只脚轻挡在脚掌内侧，当前脚掌向内轻推并保持5秒。",
      pro: "用另一只脚轻挡在脚掌内侧，当前脚掌向内轻推并保持5秒。",
    },
    observe: {
      plain: "比较保持和熟悉症状。",
      pro: "比较保持和熟悉症状。",
    },
    optionSet: "strength", dose: { plain: { hold: 5 }, pro: { hold: 5 } },
  },
  {
    id: "calf-evertor-strength", region: "calf-local", kind: "strength", access: "self",
    title: { plain: "小腿外侧发力", pro: "小腿外侧发力" },
    actions: ["ankle-evert"],
    how: {
      plain: "用另一只脚轻挡在脚掌外侧，当前脚掌向外轻推并保持5秒。",
      pro: "用另一只脚轻挡在脚掌外侧，当前脚掌向外轻推并保持5秒。",
    },
    observe: {
      plain: "比较保持和熟悉症状。",
      pro: "比较保持和熟悉症状。",
    },
    optionSet: "strength", dose: { plain: { hold: 5 }, pro: { hold: 5 } },
  },
];

export const ASSESSMENT_BY_ID = new Map(ASSESSMENT_ENTRIES.map((entry) => [entry.id, entry]));
