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
    retestOf: "knee-extension", dose: { duration: "30～60秒" },
  },
  {
    id: "knee-anterior-control", region: "knee", type: "control", access: "self",
    title: { plain: "膝髋踝控制练习", pro: "膝髋踝控制练习" },
    actions: ["sit-to-stand"],
    doText: "扶住固定物做{dose.reps}个小幅坐站或浅蹲，让膝盖朝脚尖方向移动。",
    retestOf: "knee-squat", dose: { reps: "5～8个" },
  },
  {
    id: "knee-medial-lateral-chain", region: "knee", type: "muscle", access: "self",
    title: { plain: "大腿外侧轻柔松解", pro: "大腿外侧轻柔松解" },
    actions: [],
    doText: "用手或泡沫轴轻柔放松大腿外侧和髋外侧，每个紧张区域{dose.duration}。",
    retestOf: "knee-extension", dose: { duration: "30～60秒" },
  },
  {
    id: "knee-medial-pes", region: "knee", type: "muscle", access: "self",
    title: { plain: "大腿内侧轻柔松解", pro: "大腿内侧轻柔松解" },
    actions: [],
    doText: "轻柔放松大腿内侧和内侧大腿后方，每个区域{dose.duration}。",
    retestOf: "knee-extension", dose: { duration: "30～60秒" },
  },
  {
    id: "knee-medial-adductor", region: "knee", type: "muscle", access: "self",
    title: { plain: "大腿内收肌轻柔松解", pro: "大腿内收肌轻柔松解" },
    actions: [],
    doText: "轻柔放松检查中更紧或更酸的大腿内收肌区域{dose.duration}。",
    retestOf: "knee-extension", dose: { duration: "30～60秒" },
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
    retestOf: "knee-extension", dose: { duration: "30～60秒" },
  },
  {
    id: "knee-lateral-control", region: "knee", type: "control", access: "self",
    title: { plain: "髋与足部稳定练习", pro: "髋与足部稳定练习" },
    actions: ["single-leg-stand"],
    doText: "扶墙做 {dose.reps} 次重心左右转移，或单腿站 {dose.hold} 秒；站的时候脚掌踩实、脚内侧别塌下去。",
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
];

export const TREATMENT_BY_ID = new Map(TREATMENT_ENTRIES.map((entry) => [entry.id, entry]));
