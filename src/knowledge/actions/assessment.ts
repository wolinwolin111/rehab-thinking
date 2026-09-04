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
    retestFocus: { plain: "和上次比：踮起的高度、两边差多少、疼不疼", pro: "和上次比：踮起的高度、两边差多少、疼不疼" },
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
    retestFocus: { plain: "和上次比：踮起的高度、两边差多少、疼不疼", pro: "和上次比：踮起的高度、两边差多少、疼不疼" },
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
    retestFocus: { plain: "和上次比：踮起的高度、两边差多少、疼不疼", pro: "和上次比：踮起的高度、两边差多少、疼不疼" },
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
    retestFocus: { plain: "和上次比：踮起的高度、两边差多少、疼不疼", pro: "和上次比：踮起的高度、两边差多少、疼不疼" },
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
    retestFocus: { plain: "和上次比：踮起的高度、两边差多少、疼不疼", pro: "和上次比：踮起的高度、两边差多少、疼不疼" },
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
    retestFocus: { plain: "和上次比：踮起的高度、两边差多少、疼不疼", pro: "和上次比：踮起的高度、两边差多少、疼不疼" },
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
    retestFocus: { plain: "和上次比：步子稳不稳、疼的步段、能走多远、膝能不能伸直", pro: "和上次比：步子稳不稳、疼的步段、能走多远、膝能不能伸直" },
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
    retestFocus: { plain: "和上次比：不舒服这边踩不踩得实、能走多远", pro: "和上次比：不舒服这边踩不踩得实、能走多远" },
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
    retestFocus: { plain: "和上次比：步子稳不稳、疼的步段、能走多远", pro: "和上次比：步子稳不稳、疼的步段、能走多远" },
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
    retestFocus: { plain: "和上次比：步子稳不稳、疼的步段、能走多远", pro: "和上次比：步子稳不稳、疼的步段、能走多远" },
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
    retestFocus: { plain: "和上次比：能蹲到的深度、不舒服的位置", pro: "和上次比：能蹲到的深度、不舒服的位置" },
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
    retestFocus: { plain: "和上次比：能蹲到的深度、不舒服的位置", pro: "和上次比：能蹲到的深度、不舒服的位置" },
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
    retestFocus: { plain: "和上次比：起身费不费力、疼的阶段", pro: "和上次比：起身费不费力、疼的阶段" },
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
    retestFocus: { plain: "和上次比：起身费不费力、疼的阶段", pro: "和上次比：起身费不费力、疼的阶段" },
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
    retestFocus: { plain: "和上次比：迈上去的力度、要不要借手、疼不疼", pro: "和上次比：迈上去的力度、要不要借手、疼不疼" },
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
    retestFocus: { plain: "和上次比：往下踩的控制、疼的深度、打不打软", pro: "和上次比：往下踩的控制、疼的深度、打不打软" },
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
    retestFocus: { plain: "和上次比：往下踩的控制、疼的深度、打不打软", pro: "和上次比：往下踩的控制、疼的深度、打不打软" },
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
    retestFocus: { plain: "和上次比：能站多久、晃得多明显", pro: "和上次比：能站多久、晃得多明显" },
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
    retestFocus: { plain: "和上次比：能站多久、晃得多明显", pro: "和上次比：能站多久、晃得多明显" },
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
    retestFocus: { plain: "和上次比：能站多久、骨盆歪没歪", pro: "和上次比：能站多久、骨盆歪没歪" },
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
    retestFocus: { plain: "和上次比：能站多久、脚踝翻没翻", pro: "和上次比：能站多久、脚踝翻没翻" },
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
    retestFocus: { plain: "和上次比：膝盖往不往内倒、骨盆稳不稳", pro: "和上次比：膝盖往不往内倒、骨盆稳不稳" },
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
    retestFocus: { plain: "和上次比：膝盖往不往内倒、骨盆稳不稳", pro: "和上次比：膝盖往不往内倒、骨盆稳不稳" },
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
    retestFocus: { plain: "和上次比：落地轻不轻、稳不稳", pro: "和上次比：落地轻不轻、稳不稳" },
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
    retestFocus: { plain: "和上次比：落地轻不轻、稳不稳", pro: "和上次比：落地轻不轻、稳不稳" },
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
    retestFocus: { plain: "和上次比：症状有没有再被勾出来", pro: "和上次比：症状有没有再被勾出来" },
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
    retestFocus: { plain: "和上次比：症状有没有再被勾出来", pro: "和上次比：症状有没有再被勾出来" },
    options: OPT.jog,
    dose: { plain: {}, pro: {} },
  },
];

export const ASSESSMENT_BY_ID = new Map(ASSESSMENT_ENTRIES.map((entry) => [entry.id, entry]));
