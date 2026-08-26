export type TissuePathwayId = "standard" | "muscle-contusion" | "bone-stress-suspected" | "tendon-load";

export type TissuePathwayInput = {
  regionId: string;
  location: string;
  onset: string;
  mechanism: string;
  symptomType: string;
  symptoms: string[];
  provocationTypes: string[];
  description?: string;
};

export type TissuePathwayDecision = {
  id: TissuePathwayId;
  title: string;
  assessmentFocus: string[];
  immediateActions: string[];
  blockedActions: string[];
  trainingStages: string[];
  retestTiming: "same-session" | "later" | "next-day";
  referralReasons: string[];
};

const standard: TissuePathwayDecision = {
  id: "standard",
  title: "局部活动与功能路径",
  assessmentFocus: [],
  immediateActions: [],
  blockedActions: [],
  trainingStages: [],
  retestTiming: "same-session",
  referralReasons: [],
};

function source(input: TissuePathwayInput) {
  return `${input.location} ${input.description ?? ""} ${input.symptomType} ${input.symptoms.join(" ")} ${input.provocationTypes.join(" ")}`;
}

export function buildTissuePathway(input: TissuePathwayInput): TissuePathwayDecision {
  const text = source(input);
  const directImpact = input.mechanism === "跌倒或碰撞" || /撞|碰|磕|踢到|砸到/.test(text);
  const acute = ["今天或昨天", "2～7天"].includes(input.onset);
  const localMuscleRegion = ["thigh-local", "calf-local"].includes(input.regionId);
  if (directImpact && localMuscleRegion && (acute || /肿|淤青|压痛/.test(text))) {
    return {
      id: "muscle-contusion",
      title: "肌肉撞伤恢复",
      assessmentFocus: ["肿胀和淤青位置", "舒适活动范围", "当前走路或用力能力"],
      immediateActions: ["保护撞伤区域，减少再次碰撞和高负荷", "在不加重症状的范围内轻微活动"],
      blockedActions: ["不按摩、重压或强拉淤青和血肿中心", "冰敷不作为默认消肿或促进恢复方法"],
      trainingStages: ["舒适主动活动", "低强度等长发力", "局部力量", "走路、台阶或运动功能"],
      retestTiming: "later",
      referralReasons: ["肿胀快速增大", "局部明显凹陷", "麻木或循环异常", "基本功能严重下降"],
    };
  }

  // “髌骨下方 / 髌腱”是下肢定位图中的解剖区域名称，不能仅凭用户
  // 点击这个区域就把膝下缘疼痛判定为肌腱负荷问题。膝下疼痛仍应先
  // 经过股直肌/大腿前侧和相关动作的处理路径；只有用户原话或感觉
  // 明确提到“髌腱、跟腱、肌腱”等，才进入肌腱负荷路线。小腿/踝足
  // 的“跟腱中段”等定位本身仍可作为明确结构线索。
  const explicitTendonText = /跟腱|髌腱|肌腱|腱/.test(`${input.description ?? ""} ${input.symptomType}`);
  const selectedTendonLocation = /跟腱|髌腱|肌腱|腱/.test(input.location);
  const tendonLocation = explicitTendonText || (input.regionId !== "knee" && selectedTendonLocation);
  const loadRelated = /跑|跳|提踵|蹬地|下蹲|台阶|运动/.test(text);
  if (tendonLocation && (loadRelated || input.mechanism === "逐渐出现")) {
    return {
      id: "tendon-load",
      title: "肌腱渐进负荷",
      assessmentFocus: ["具体肌腱位置", "当前可耐受的负荷动作", "训练后的次日反应"],
      immediateActions: ["调整当前训练量，保留可耐受负荷", "从低刺激等长发力开始"],
      blockedActions: ["不以反复松解作为主要恢复方法", "突然弹响、凹陷或主动功能突然丧失时停止训练"],
      trainingStages: ["等长发力", "双侧慢速力量", "单侧力量", "快速力量与储能", "跑跳回归"],
      retestTiming: "next-day",
      referralReasons: ["突然弹响或出现凹陷", "主动功能突然丧失", "负荷持续下降或症状明显恶化"],
    };
  }

  const gradualLocalBonePain = input.mechanism === "逐渐出现"
    && ["calf-local", "ankle-foot"].includes(input.regionId)
    && /骨|胫骨|腓骨|跖骨|局限|一点|按压痛/.test(text)
    && /走路|负重|跑|跳|运动/.test(text);
  if (gradualLocalBonePain) {
    return {
      id: "bone-stress-suspected",
      title: "局部骨应力风险确认",
      assessmentFocus: ["近期跑跳和训练量变化", "走路、静息或夜间是否疼", "恢复、睡眠和营养情况", "少量相关功能缺口"],
      immediateActions: ["先降低跑跳等冲击负荷", "根据走路疼痛和症状趋势决定是否医学或影像确认"],
      blockedActions: ["不进入普通肌肉松解路径", "不把踝活动、小腿力量或动作代偿直接写成病因"],
      trainingStages: ["无痛走路", "基础功能负荷", "走跑交替", "先增加距离，再增加速度"],
      retestTiming: "next-day",
      referralReasons: ["走路疼", "静息或夜间疼", "局限骨性疼痛持续加重", "位于高风险骨性区域"],
    };
  }

  return standard;
}

export type TissueReferralAdvice = { title: string; reasons: string[] };

/**
 * T-05：把路径的就医预警清单转成出口卡片数据。
 * 标准路径没有预警；返回副本，外部修改不影响路径决策本身。
 */
export function tissueReferralAdvice(pathway: TissuePathwayDecision): TissueReferralAdvice | null {
  if (pathway.id === "standard" || pathway.referralReasons.length === 0) return null;
  return { title: `${pathway.title}：出现以下情况请及时就医`, reasons: [...pathway.referralReasons] };
}
