import type { TreatmentEntry } from "./types.ts";

export const TREATMENT_ENTRIES: TreatmentEntry[] = [
  {
    id: "ankle-medial-control", region: "ankle-foot", type: "control", access: "self",
    title: { plain: "足弓与提踵控制练习", pro: "足弓与提踵控制练习" },
    actions: ["heel-raise-standing"],
    doText: "坐着，用脚趾把地上的毛巾一点点抓向自己，做 {dose.grasp} 次；再扶墙做 {dose.raise} 个双脚踮脚尖。",
    retestOf: "ankle-calf", dose: { grasp: 5, raise: 5 },
  },
  {
    id: "ankle-achilles-load", region: "ankle-foot", type: "control", access: "self",
    title: { plain: "双脚提踵起步", pro: "双脚提踵起步" },
    actions: ["heel-raise-standing"],
    doText: "先确认没有突然断裂的感觉、也没有踩不实的情况，再扶墙做一组{dose.reps}个双脚踮脚尖。",
    retestOf: "ankle-heel-raise", dose: { reps: "5～8" },
  },
  {
    id: "knee-anterior-muscles", region: "knee", type: "muscle", access: "self",
    title: { plain: "大腿前外侧轻柔松解", pro: "大腿前外侧轻柔松解" },
    actions: [],
    doText: "用手或泡沫轴轻柔放松大腿前侧和外侧，每个紧张区域{dose.duration}。",
    retestOf: "knee-extension", dose: { duration: "60～90秒" },
  },
  {
    id: "knee-anterior-control", region: "knee", type: "control", access: "self",
    title: { plain: "膝髋踝控制练习", pro: "膝髋踝控制练习" },
    actions: ["sit-to-stand"],
    doText: "扶住固定物做{dose.reps}个小幅坐站或浅蹲，让膝盖朝脚尖方向移动。",
    retestOf: "knee-squat", dose: { reps: "5～8" },
  },
  {
    id: "knee-medial-lateral-chain", region: "knee", type: "muscle", access: "self",
    title: { plain: "大腿外侧轻柔松解", pro: "大腿外侧轻柔松解" },
    actions: [],
    doText: "用手或泡沫轴轻柔放松大腿外侧和髋外侧，每个紧张区域{dose.duration}。",
    retestOf: "knee-extension", dose: { duration: "60～90秒" },
  },
  {
    id: "knee-medial-pes", region: "knee", type: "muscle", access: "self",
    title: { plain: "大腿内侧轻柔松解", pro: "大腿内侧轻柔松解" },
    actions: [],
    doText: "轻柔放松大腿内侧和内侧大腿后方，每个区域{dose.duration}。",
    retestOf: "knee-extension", dose: { duration: "60～90秒" },
  },
  {
    id: "knee-medial-adductor", region: "knee", type: "muscle", access: "self",
    title: { plain: "大腿内收肌轻柔松解", pro: "大腿内收肌轻柔松解" },
    actions: [],
    doText: "轻柔放松检查中更紧或更酸的大腿内收肌区域{dose.duration}。",
    retestOf: "knee-extension", dose: { duration: "60～90秒" },
  },
  {
    id: "knee-medial-foot", region: "knee", type: "control", access: "self",
    title: { plain: "足弓与踝部控制练习", pro: "足弓与踝部控制练习" },
    actions: ["heel-raise-standing"],
    doText: "坐着或站着轻轻踮起脚尖再放下，做 {dose.raise} 次；再扶着固定物做 {dose.raise} 次膝盖向前小幅移动。",
    retestOf: "knee-extension", dose: { raise: "5～8" },
  },
  {
    id: "knee-lateral-muscles", region: "knee", type: "muscle", access: "self",
    title: { plain: "大腿外侧与后外侧轻柔松解", pro: "大腿外侧与后外侧轻柔松解" },
    actions: [],
    doText: "用手或泡沫轴轻柔放松大腿外侧和后外侧，每个紧张区域{dose.duration}。",
    retestOf: "knee-extension", dose: { duration: "60～90秒" },
  },
  {
    id: "knee-lateral-control", region: "knee", type: "control", access: "self",
    title: { plain: "单腿站稳练习", pro: "单腿站稳练习" },
    actions: ["single-leg-stand"],
    doText: "扶墙单腿站 {dose.hold} 秒，再换另一边；站的时候脚掌踩实、脚内侧别塌下去。",
    retestOf: "knee-squat", dose: { reps: "5～8", hold: 10 },
  },
  {
    id: "knee-extension-control", region: "knee", type: "control", access: "self",
    title: { plain: "训练股四头末端控制", pro: "训练股四头末端控制" },
    actions: ["knee-straighten"],
    doText: "仰卧，腿伸直，绷紧大腿前侧做膝后下压，压到最直的位置停{dose.hold}秒，做{dose.reps}次。",
    retestOf: "knee-extension", dose: { hold: 2, reps: "6～10" },
  },
  {
    id: "knee-swelling-care", region: "knee", type: "swelling", access: "self",
    title: { plain: "肿胀管理", pro: "肿胀管理" },
    actions: [],
    doText: "休息时垫高小腿；在疼痛允许范围缓慢滑动脚跟、伸屈膝盖{dose.reps}次。",
    retestOf: "knee-extension", dose: { reps: "10～20" },
  },
  {
    id: "ankle-df-muscles", region: "ankle-foot", type: "muscle", access: "self",
    title: { plain: "小腿后侧轻柔松解", pro: "小腿后侧轻柔松解" },
    actions: [],
    doText: "用手或泡沫轴轻柔放松小腿后侧，每个紧张区域{dose.duration}。",
    retestOf: "ankle-dorsiflexion", dose: { duration: "60～90秒" },
  },
  {
    id: "ankle-achilles-muscles", region: "ankle-foot", type: "muscle", access: "self",
    title: { plain: "小腿后侧轻柔松解", pro: "小腿后侧轻柔松解" },
    actions: [],
    doText: "用手或泡沫轴轻柔放松小腿肌肉，每个紧张区域{dose.duration}。",
    retestOf: "ankle-heel-raise", dose: { duration: "60～90秒" },
  },
  {
    id: "ankle-plantar-muscles", region: "ankle-foot", type: "muscle", access: "self",
    title: { plain: "足底与足弓轻柔松解", pro: "足底与足弓轻柔松解" },
    actions: [],
    doText: "用软球轻滚足底和足弓周围，每个区域{dose.duration}。",
    retestOf: "ankle-heel-raise", dose: { duration: "60～90秒" },
  },
  {
    id: "ankle-lateral-swelling", region: "ankle-foot", type: "swelling", access: "self",
    title: { plain: "肿胀管理", pro: "肿胀管理" },
    actions: [],
    doText: "休息时垫高患侧小腿；在疼痛允许范围内缓慢勾脚、下压{dose.reps}次。",
    retestOf: "ankle-dorsiflexion", dose: { reps: "10～20" },
  },
  {
    id: "ankle-df-control", region: "ankle-foot", type: "control", access: "self",
    title: { plain: "背屈控制练习", pro: "背屈控制练习" },
    actions: ["ankle-dorsiflex"],
    doText: "坐稳，脚跟放在地上，把脚背慢慢向小腿靠近，再缓慢放回，{dose.reps}；动作保持轻柔，不追求一次做到最大范围。",
    retestOf: "ankle-dorsiflexion", dose: { reps: "做5～8次" },
  },
  {
    id: "ankle-plantar-control", region: "ankle-foot", type: "control", access: "self",
    title: { plain: "足弓与走路推蹬练习", pro: "足弓与走路推蹬练习" },
    actions: [],
    doText: "坐着，脚趾抓毛巾 {dose.grasp} 次；再慢走一小段，感受脚跟着地到前脚掌推地。",
    retestOf: "ankle-dorsiflexion", dose: { grasp: 5 },
  },
];

/**
 * 膝关节处理指令（源自 knee-workflow-adapter.ts kneeTreatmentInstruction，逐字收进目录）。
 * 值 = 界面显示的处理卡 do 文字。key = KneeTreatmentUnit.id。
 */
export const KNEE_TREATMENT_INSTRUCTIONS: Record<string, string> = {
  "knee-swelling-management": "休息时垫高小腿，在不增加疼痛的范围内缓慢活动膝盖10～20次；减少当天会让肿胀明显增加的负重。",
  "knee-medial-soft-tissue": "先在膝内下方的鹅足相关肌肉区域，找到刚才检查时更紧或更酸的位置，用手轻柔按揉30～60秒；避开明确刺痛点。",
  "knee-medial-adductor": "在大腿内侧找到检查时更紧或更酸的内收肌区域，用手轻柔按揉30～60秒；避开膝内侧明确刺痛点。",
  "knee-lateral-chain": "在大腿前侧、髋外侧和大腿外侧找到刚才检查时明确更紧或更酸的区域，分别轻柔处理30～60秒；避开髌骨、髌腱和明确刺痛点，不要沿髂胫束整条重压。",
  "knee-extension-lateral-chain": "在髋外侧和大腿外侧找到刚才检查时更紧或更酸的区域，用手或泡沫轴轻柔处理30～60秒；不要沿髂胫束整条重压。",
  "knee-extension-anterior-lateral": "先处理检查中明确紧张的区域：大腿前侧/股直肌与外侧链可在同一轮完成，每处轻柔处理30～60秒；避开髌骨、髌腱和明确刺痛点。",
  "knee-anterior-thigh-rectus-femoris": "在大腿前侧找到检查时明确紧张或按压不舒服的区域，用手或泡沫轴轻柔处理30～60秒；避开髌骨和髌腱。",
  "knee-posterior-calf-muscle": "在膝后周围和小腿上端找到明确更紧的肌肉区域，轻柔按揉30～60秒；不要直接按压腘窝正中。",
  "knee-extension-control": "仰卧把腿放松伸直，绷紧大腿前侧，让膝后轻轻向床面下压，保持2秒后放松，先做6～10次。",
  "knee-flexion-control": "仰卧，脚跟贴着床面，缓慢把膝盖弯起来，再主动控制着回到起点；只做到可以接受的范围，先做6～10次。",
  "knee-extension-joint": "由专业人员根据伸直受限方向完成低刺激关节松动；出现明显刺痛、硬性阻挡或症状加重时停止。",
  "knee-proximal-fibula": "由专业人员做一次腓骨近端辅助反应：保持原动作和速度，轻柔辅助后复测；不判断错位，不强推疼痛末端。",
  "knee-hip-knee-control": "先练较容易的站立屈髋（臀部向后）或扶物浅蹲，让髋、膝和脚尖方向保持一致，再逐步进入台阶动作。",
  "knee-quadriceps-strength": "从膝后下压或坐位伸膝开始，能稳定完成后再进入坐站和低台阶训练。",
};

/** 复测指令（源自 kneeRetestInstruction，逐字收进目录）。 */
export const KNEE_RETEST_INSTRUCTIONS: Record<string, string> = {
  "knee-extension": "膝盖绷直",
  "knee-flexion": "弯膝",
  "step-down": "下台阶",
  "sit-to-stand": "坐站",
  "squat": "下蹲",
  "gait": "走路",
};

/** 有前侧证据时 knee-lateral-chain 的替代指令（原 hasAnteriorEvidence 分支）。 */
export const KNEE_LATERAL_CHAIN_ANTERIOR = "在大腿前侧、髋外侧和大腿外侧找到刚才检查时明确更紧或更酸的区域，分别轻柔处理30～60秒；避开髌骨、髌腱和明确刺痛点，不要沿髂胫束整条重压。";

export const TREATMENT_BY_ID = new Map(TREATMENT_ENTRIES.map((entry) => [entry.id, entry]));
