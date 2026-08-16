export type RecordResponseRule = {
  id: string;
  match: string[];
  finding: string;
  timing: "当场复测" | "稍后观察" | "训练解决";
  firstTry: string;
  retest: string;
  ifSame: string;
  training: string;
};

export const CLINIC_ASSESSMENT_ORDER: Record<string, string[]> = {
  knee: ["局部表现", "膝伸屈", "髋踝联动", "力量控制", "走路与台阶"],
  shoulder: ["局部与姿势", "六向活动", "颈胸联动", "肩袖肩胛", "日常动作"],
  back: ["症状方向", "腰背活动", "髋与骨盆", "躯干臀肌", "坐站弯腰"],
  ankle: ["肿胀触诊", "四向活动", "距骨腓骨足部", "小腿力量", "承重步态"],
  hamstring: ["淤青压痛", "髋膝活动", "轻收缩", "走路坐站", "跑跳回归"],
};

const RECORD_RESPONSE_RULES: Record<string, RecordResponseRule[]> = {
  knee: [
    {
      id: "knee-local",
      match: ["knee-local-swelling", "knee-local-tenderness", "knee-local-patella"],
      finding: "肿胀、局部压痛或髌骨活动异常",
      timing: "稍后观察",
      firstTry: "先处理肿胀；压痛只做定位。避开痛点中心，比较股四头肌、腘肌、腘绳肌和小腿肌肉，必要时由受训者检查髌骨活动。",
      retest: "当场看伸直、弯曲和原疼痛动作；肿胀与压痛范围在数小时或次日比较。",
      ifSame: "不要反复按痛点，改查膝伸屈、腓骨近端、踝背屈和髋旋转。",
      training: "保留不加重肿胀的主动伸膝、脚跟滑动和轻量股四头肌激活。",
    },
    {
      id: "knee-motion",
      match: ["knee-rom-extension", "knee-rom-flexion"],
      finding: "膝关节伸直或弯曲受限",
      timing: "当场复测",
      firstTry: "先选一组候选肌肉处理：伸直受限可比较腘肌、腘绳肌和小腿后侧；弯曲受限可比较股直肌、大腿前侧和腘窝周围。",
      retest: "立即重复同一方向，再做走路、坐站或原疼痛动作。",
      ifSame: "肌肉试验无变化时，由受训者分别检查膝关节、髌骨与腓骨近端活动；一次只试一个方向。",
      training: "用主动伸膝或脚跟滑动巩固新范围，再衔接股四头肌和腘绳肌训练。",
    },
    {
      id: "knee-chain",
      match: ["knee-chain-ankle", "knee-chain-hip"],
      finding: "踝背屈或髋旋转同时受限",
      timing: "当场复测",
      firstTry: "把踝或髋作为候选来源单独处理；踝侧先比较小腿后侧、距骨与腓骨，髋侧先比较腰大肌、阔筋膜张肌、臀肌和关节活动。",
      retest: "处理一处后，立即重复原膝部动作、浅蹲或台阶。",
      ifSame: "原动作没有变化就不继续扩大处理范围，回到膝关节局部检查。",
      training: "把有效方向带入小腿前移、髋旋转控制、臀桥或分腿站训练。",
    },
    {
      id: "knee-strength",
      match: ["knee-strength-extension", "knee-strength-hamstring", "knee-strength-hip", "knee-strength-calf", "knee-control-single-leg"],
      finding: "股四头肌、腘绳肌、臀肌或小腿力量不足",
      timing: "训练解决",
      firstTry: "选择最弱的一到两组肌肉安排训练，不用期待一次治疗后力量立刻恢复。",
      retest: "下次与健侧比较动作质量、次数和控制，不做频繁最大力量测试。",
      ifSame: "降低难度或增加支撑，确认动作是否真正由目标肌群完成。",
      training: "主动伸膝、臀桥、分腿蹲、提踵和单脚控制按当前功能逐级组合。",
    },
    {
      id: "knee-function",
      match: ["knee-function-walk", "knee-function-sit-stand", "knee-function-squat", "knee-function-step"],
      finding: "走路、坐站、下蹲或台阶受限",
      timing: "当场复测",
      firstTry: "先固定同一个任务，调整步幅、承重、膝盖方向或支撑；再根据表现回查活动度和力量。",
      retest: "用相同速度、深度或台阶高度重复原任务。",
      ifSame: "区分是疼痛保护、膝伸屈、踝背屈，还是臀腿力量在限制任务。",
      training: "从能稳定完成的坐站、浅蹲或低台阶开始，逐步恢复下肢离心控制。",
    },
  ],
  shoulder: [
    {
      id: "shoulder-local",
      match: ["shoulder-local-scapula", "shoulder-local-humerus"],
      finding: "肩胛位置或肱骨位置两侧差异明显",
      timing: "当场复测",
      firstTry: "先用手动辅助调整肩胛上旋、后缩或肱骨位置，只改变一个变量。",
      retest: "立即重复原来的抬手、横抱或支撑动作。",
      ifSame: "外部调整无变化时，改查肩关节活动、肩袖力量、胸椎和神经表现。",
      training: "把有效提示转成墙面滑手、肩胛控制和轻量肩袖训练。",
    },
    {
      id: "shoulder-motion",
      match: ["shoulder-rom-flexion", "shoulder-rom-extension", "shoulder-rom-abduction", "shoulder-rom-adduction", "shoulder-rom-external", "shoulder-rom-internal"],
      finding: "肩关节某一方向活动受限",
      timing: "当场复测",
      firstTry: "按受限方向比较胸大肌、胸小肌、背阔肌、上斜方肌、肩胛提肌和肩袖；只选一组轻柔处理。",
      retest: "用相同体位重复受限方向和对应生活动作。",
      ifSame: "再由受训者检查后侧关节囊、盂肱关节、第一肋骨或胸椎，不叠加多种手法。",
      training: "用桌面或墙面滑动巩固新范围，再加入对应角度的肩袖和肩胛训练。",
    },
    {
      id: "shoulder-chain",
      match: ["shoulder-chain-neck", "shoulder-chain-thoracic", "shoulder-chain-forearm"],
      finding: "颈椎、胸椎或前臂活动影响上肢动作",
      timing: "当场复测",
      firstTry: "先处理一个相邻环节并复测抬手；有麻电感时优先比较神经症状，不把它当普通肌肉紧张。",
      retest: "重复原抬手或支撑动作，并确认症状是否向远端变化。",
      ifSame: "没有改变就回到肩部局部活动和力量，不继续沿整条链加手法。",
      training: "加入胸椎旋转、前臂旋转或低负荷神经滑动，并保留肩部主动训练。",
    },
    {
      id: "shoulder-strength",
      match: ["shoulder-strength-external", "shoulder-strength-internal", "shoulder-strength-abduction", "shoulder-control-wall"],
      finding: "肩袖或肩胛控制不足",
      timing: "训练解决",
      firstTry: "从无痛角度轻等长开始，分别训练内外旋和肩胛控制。",
      retest: "下次比较等长稳定度、墙面推和抬手控制。",
      ifSame: "降低角度和阻力，检查是否耸肩或由胸腰代偿。",
      training: "外旋/内旋等长、墙面推、墙面滑手与肩胛后缩下沉逐级推进。",
    },
    {
      id: "shoulder-function",
      match: ["shoulder-function-overhead", "shoulder-function-head", "shoulder-function-back", "shoulder-function-towel"],
      finding: "举手、摸背、拧转或取物受限",
      timing: "当场复测",
      firstTry: "固定一个生活动作，分别调整范围、手臂路径、肩胛辅助或负荷；一次只改一个条件。",
      retest: "用相同物品、角度和速度重复原生活动作。",
      ifSame: "回查对应方向的活动度、肩袖力量以及颈胸椎或神经表现。",
      training: "从墙面、轻物和较低角度开始，逐步恢复推、拉、支撑和过顶使用。",
    },
  ],
  back: [
    {
      id: "back-motion",
      match: ["back-rom-flexion", "back-rom-extension", "back-rom-left-bend", "back-rom-right-bend", "back-rom-left-turn", "back-rom-right-turn"],
      finding: "腰背某一方向受限或诱发熟悉症状",
      timing: "当场复测",
      firstTry: "先用较舒服方向的小范围活动，或比较腰方肌、竖脊肌和髂腰肌；每次只处理一个候选。",
      retest: "重复同一方向，再做坐站、弯腰或取物。",
      ifSame: "转查髋活动、骨盆动作、神经张力；受训者再考虑腰椎分节活动。",
      training: "保留可控方向，配合呼吸、髋铰链和低强度躯干耐力训练。",
    },
    {
      id: "back-chain",
      match: ["back-chain-hip-rotation", "back-chain-hip-flexion"],
      finding: "髋旋转或屈髋受限",
      timing: "当场复测",
      firstTry: "比较髂腰肌、阔筋膜张肌、臀肌、腘绳肌与髋关节活动，只选一个方向。",
      retest: "处理后重复弯腰、坐站或髋铰链。",
      ifSame: "原腰部任务没有变化时，停止扩大髋部处理，回到腰椎与神经检查。",
      training: "用臀桥、蚌式开合、站立屈髋或分级髋铰链巩固。",
    },
    {
      id: "back-control",
      match: ["back-control-bridge", "back-control-bird-dog", "back-control-hip"],
      finding: "躯干、臀肌或髋后伸控制不足",
      timing: "训练解决",
      firstTry: "从能保持呼吸的短杠杆版本开始，不追求当场力量提高。",
      retest: "下次比较动作稳定、代偿和可完成次数。",
      ifSame: "缩短杠杆、减少次数或增加支撑，再确认目标肌群是否参与。",
      training: "呼吸、臀桥、鸟狗、蚌式开合和髋铰链按控制水平逐级推进。",
    },
    {
      id: "back-function",
      match: ["back-function-sit-stand", "back-function-pickup", "back-function-walk"],
      finding: "坐站、走路或弯腰取物受限",
      timing: "当场复测",
      firstTry: "固定原任务，调整起始高度、支撑、步行时间或髋铰链方式。",
      retest: "保持相同次数、距离或物品高度重复原任务。",
      ifSame: "区分腰背活动、髋部活动、神经表现和躯干臀肌能力。",
      training: "从较高取物位置、短距离步行和徒手髋铰链逐级增加范围与负荷。",
    },
  ],
  hamstring: [
    {
      id: "hamstring-motion",
      match: ["hamstring-rom-hip-flexion", "hamstring-rom-hip-extension", "hamstring-rom-knee-flexion", "hamstring-rom-knee-extension"],
      finding: "髋膝活动出现拉扯或保护性受限",
      timing: "当场复测",
      firstTry: "急性期先保留舒适主动活动，不强拉；稳定后再比较腘绳肌、臀肌、内收肌和神经张力。",
      retest: "用相同幅度重复原方向和走路步幅。",
      ifSame: "不继续加大拉伸，改查收缩痛、淤青、压痛位置和神经表现。",
      training: "从小范围主动活动过渡到等长、桥式和髋铰链。",
    },
    {
      id: "hamstring-strength",
      match: ["hamstring-strength-heel", "hamstring-control-bridge"],
      finding: "后侧大腿收缩能力不足",
      timing: "训练解决",
      firstTry: "选择不明显诱发疼痛的脚跟压地或桥式等长。",
      retest: "下次比较收缩稳定度、桥式和步幅。",
      ifSame: "降低收缩强度和肌肉长度，排除动作由腰部代偿。",
      training: "脚跟压地、双腿桥、长杠杆桥和轻负荷髋铰链逐级推进。",
    },
    {
      id: "hamstring-function",
      match: ["hamstring-function-walk", "hamstring-function-sit-stand", "hamstring-function-hinge"],
      finding: "走路、坐站或髋铰链受限",
      timing: "当场复测",
      firstTry: "固定同一步幅或动作范围，先减小拉长位置和负荷，再观察是否更顺。",
      retest: "用相同速度和幅度重复原任务。",
      ifSame: "回查压痛、收缩能力、髋膝活动和神经张力。",
      training: "从正常步幅、坐站和短幅髋铰链进入，再逐级恢复跑动与加速。",
    },
  ],
};

export function getRecordResponseRules(caseKey: string, limitedCheckIds: string[]) {
  const limited = new Set(limitedCheckIds);
  return (RECORD_RESPONSE_RULES[caseKey] ?? [])
    .filter((rule) => rule.match.some((id) => limited.has(id)))
    .slice(0, 5);
}
