import type { FullAssessment, FullCandidate, FullExercise, FullRegion } from "@/src/knowledge/pilot/full-demo-content";
import { assessmentPro } from "@/src/knowledge/actions/bridge";

const assessment = (id: string, title: string, kind: FullAssessment["kind"], how: string, observe: string, tags: string[], caution?: string): FullAssessment => ({
  id, title, kind, access: "self", how, observe, tags, caution,
  resultOptions: kind === "strength" ? ["接近健侧", "患侧较弱或较快疲劳", "发力时出现熟悉的不适", "无法判断", "暂不测试"] : ["接近健侧，没有熟悉的不适", "范围接近健侧，但出现熟悉的不适", "患侧明显更少", "不敢或不能完成", "暂不测试"],
});

const candidate = (id: string, title: string, type: FullCandidate["type"], doText: string, observe: string, retest: string, tags: string[], retestIds: string[] = []): FullCandidate => ({
  id, title, type, access: type === "joint" ? "therapist" : "self", do: doText, observe, retest, tags, retestIds,
  siteLabel: title.replace(/轻柔松解|低负荷发力|主动控制/g, ""),
  actionLabel: type === "muscle" ? "轻柔肌肉松解" : type === "control" ? "低负荷主动训练" : "针对性处理",
});

const exercise = (id: string, title: string, stage: FullExercise["stage"], sets: string, reps: string, how: string, observe: string, easier: string, harder: string, tags: string[], startPosition: FullExercise["startPosition"], purpose?: string): FullExercise => ({ id, title, stage, sets, reps, purpose, how, observe, easier, harder, tags, startPosition });

const frontThigh = ["thigh-front-length", "thigh-front-strength"];
const backThigh = ["thigh-back-length", "thigh-back-strength"];
const medialThigh = ["thigh-medial-length", "thigh-medial-strength"];
const lateralThigh = ["thigh-lateral-load", "thigh-lateral-strength"];

export const THIGH_LOCAL_REGION: FullRegion = {
  id: "thigh-local",
  name: "大腿局部",
  shortName: "大腿",
  summary: "围绕局部症状检查相关肌肉的拉长、发力和当前功能；只调用必要的髋或膝动作。",
  keywords: ["大腿前侧", "大腿后侧", "大腿内侧", "大腿外侧", "股四头肌", "腘绳肌", "内收肌", "拉伤"],
  locations: ["大腿前侧", "大腿后侧", "大腿内侧", "大腿外侧"],
  directions: [
    assessment("thigh-front-length", "大腿前侧拉长检查", "direction", "侧卧或扶墙站立，慢慢弯膝让脚跟靠近臀部，骨盆保持不动；左右各做一次。", "比较范围，大腿前侧是否出现熟悉的牵扯或疼痛。", ["thigh-front", "quadriceps", "rectus-femoris"]),
    assessment("thigh-back-length", "大腿后侧拉长检查", "direction", "仰卧抬起一侧大腿，膝盖先微弯，再在舒适范围慢慢伸直；左右各做一次。", "比较范围，大腿后侧是否出现熟悉症状；不反复拉到疼痛末端。", ["thigh-back", "hamstring"]),
    assessment("thigh-medial-length", "大腿内侧拉长检查", "direction", "仰卧或坐稳，把一条腿缓慢向外打开，骨盆保持不动；左右各做一次。", "比较范围，大腿内侧是否出现熟悉的牵扯或疼痛。", ["thigh-medial", "adductor"]),
    assessment("thigh-lateral-load", "大腿外侧拉长检查（跨体收腿）", "direction", "仰卧，把一条腿缓慢向身体中线靠近，骨盆保持不动；左右各做一次。", "比较范围，大腿外侧是否出现熟悉的牵扯或疼痛。", ["thigh-lateral", "hip-adduction", "tfl"]),
  ],
  strengths: [
    assessment("thigh-front-strength", "大腿前侧发力", "strength", "坐稳，把小腿慢慢抬起并保持5秒；普通用户只比较两侧，不额外施加强阻力。", "比较保持、抖动和熟悉症状。", ["thigh-front", "quadriceps", "knee-extension"]),
    assessment("thigh-back-strength", "大腿后侧发力", "strength", "坐稳，脚跟踩地，像要把脚跟向椅子下面拖但不移动，保持5秒。", "比较发力、抽筋和熟悉症状。", ["thigh-back", "hamstring", "knee-flexion"]),
    assessment("thigh-medial-strength", "大腿内侧发力", "strength", "仰卧屈膝，在两膝之间放软枕，轻轻夹住5秒。", "比较发力感和熟悉症状。", ["thigh-medial", "adductor"]),
    assessment("thigh-lateral-strength", "大腿外侧发力", "strength", "侧卧或扶墙站立，把腿小幅向外抬起并保持5秒，身体不要侧倒。", "比较保持能力和熟悉症状。", ["thigh-lateral", "glute-med", "tfl"]),
  ],
  functions: [
    assessment("thigh-walk", "走路", "function", "以平时速度走一小段。", "症状出现在迈步、支撑还是蹬地阶段，是否跛行。", ["gait", "daily"]),
    assessment("thigh-sit-stand", "坐下再站起", "function", "从稳固椅子慢慢坐下再站起3次。", "大腿哪里不舒服，左右用力是否明显不同。", ["sit-to-stand", "squat"]),
    assessment("thigh-bridge-check", "后侧链功能检查", "function", "仰卧屈膝做一次臀桥；双腿稳定且不加重时，再左右各做一次单腿臀桥。", "比较两侧抬起高度、骨盆是否歪斜，以及大腿后侧是否出现熟悉不适。", ["bridge", "posterior-chain", "single-leg"]),
    assessment("thigh-single-leg", "单腿骨盆稳定检查", "function", "扶住固定物，左右分别单腿站立10秒。", "比较骨盆是否明显下沉、身体是否侧倒（可手搭两侧胯骨或拍10秒视频回看），以及大腿内外侧是否出现熟悉不适。", ["single-leg", "pelvic-stability"]),
    assessment("thigh-single-leg-squat", "扶物单腿浅蹲", "function", "单腿站稳且没有明显加重时，扶住固定物做3次小幅单腿下蹲。", "比较两侧下降控制、骨盆是否歪斜，以及大腿是否出现熟悉不适。", ["single-leg-squat", "single-leg", "pelvic-stability"], "单腿站仍明显疼、不稳或无法完成时，先不测试。"),
    assessment("thigh-jog", "慢跑准备", "function", "只有走路和坐站稳定时，原地小步慢跑10秒。", "是否再现大腿局部症状。", ["run", "sport"], "急性拉伤、走路疼痛或肿胀加重时不测试。"),
  ],
  specialTests: [assessment("thigh-local-palpation", "大腿局部轻按定位", "special-test", "沿图上标记区域轻按一次，记录熟悉痛点范围。", "是否局限，是否伴明显凹陷或快速扩大的肿胀、淤青。", ["tenderness", "local-thigh"], "急性拉伤不反复重按；明显凹陷、无力或肿胀快速扩大时先医学评估。")],
  candidateGroups: [
    { id: "thigh-front-local", title: "大腿前侧局部问题", match: { locations: ["大腿前"], feelings: ["酸", "紧", "扯", "痛", "无力"], actions: ["踢", "跑", "弯膝", "起身", "下蹲"] }, note: "不自动展开膝关节流程。", candidates: [candidate("thigh-front-release", "大腿前侧轻柔松解", "muscle", "非急性期，在明确紧张而不是损伤中心的位置轻柔松解30～60秒。", "刚发生的拉伤、明显淤青或刺痛时不压疼痛中心。", "复测拉长、发力和原不适动作。", ["thigh-front", "quadriceps", "rectus-femoris"], frontThigh), candidate("thigh-front-control", "大腿前侧低负荷发力", "control", "仰卧绷紧大腿，或坐着把小腿慢慢抬起来一点，保持5秒，做5次。", "不明显增加症状。", "记录完成度和次日反应。", ["thigh-front", "quadriceps"], frontThigh)] },
    { id: "thigh-back-local", title: "大腿后侧局部问题", match: { locations: ["大腿后"], feelings: ["酸", "紧", "扯", "痛", "无力"], actions: ["跑", "冲刺", "弯腰", "迈步", "屈膝"] }, note: "先确认局部拉长与收缩是否复现。", candidates: [candidate("thigh-back-release", "大腿后侧轻柔松解", "muscle", "非急性期，在明确紧张而不是损伤中心的位置轻柔松解30～60秒。", "刚发生的拉伤不强拉、不重压。", "复测拉长、发力和原不适动作。", ["thigh-back", "hamstring"], backThigh), candidate("thigh-back-control", "大腿后侧低负荷发力", "control", "仰卧屈膝，脚跟踩地，把臀部慢慢抬起来停1秒再放下，做2组，每组6～8次。", "不追求强度，次日不持续加重。", "记录发力和走路反应。", ["thigh-back", "hamstring"], backThigh)] },
    { id: "thigh-medial-local", title: "大腿内侧局部问题", match: { locations: ["大腿内"], feelings: ["酸", "紧", "扯", "痛", "无力"], actions: ["夹腿", "变向", "侧移", "跑", "打开腿"] }, note: "以局部内收肌拉长和发力为主。", candidates: [candidate("thigh-medial-release", "大腿内侧轻柔松解", "muscle", "非急性期，在明确紧张的内收肌区域轻柔松解30～60秒。", "避开腹股沟深处和刺痛点。", "复测拉长、夹腿发力和原动作。", ["thigh-medial", "adductor"], medialThigh), candidate("thigh-medial-control", "大腿内侧低负荷发力", "control", "两膝夹软枕，轻轻夹住5秒，做5次。", "不在刺痛范围用力。", "记录发力和走路反应。", ["thigh-medial", "adductor"], medialThigh)] },
    { id: "thigh-lateral-local", title: "大腿外侧局部问题", match: { locations: ["大腿外"], feelings: ["酸", "紧", "扯", "痛", "无力"], actions: ["走", "跑", "单腿", "侧卧", "抬腿"] }, note: "没有相邻关节主诉时不扩大检查。", candidates: [candidate("thigh-lateral-release", "大腿外侧轻柔松解", "muscle", "轻柔处理检查到紧张的前外侧或后外侧肌肉30～60秒。", "不沿髂胫束整条重压。", "复测活动、发力和原动作。", ["thigh-lateral", "tfl", "glute-med"], lateralThigh), candidate("thigh-lateral-control", "大腿外侧低负荷发力", "control", "扶墙小幅向外抬腿，做2组，每组6～8次。", "两侧胯保持一样高，身体不侧倒。", "记录走路和单腿支撑反应。", ["thigh-lateral", "hip-abduction"], lateralThigh)] },
  ],
  exercises: [
    exercise("thigh-front-isometric", "大腿前侧绷紧保持", 1, "2组", "每组5次，每次5秒", "仰卧或坐稳，把膝盖绷直，让大腿前侧收紧后放松。", "两侧发力接近，症状不逐次增加。", "减小用力或保持3秒。", "增加到每组8次。", ["thigh-front", "quadriceps", "isometric"], "仰卧", "受伤后大腿前侧会“断电”性变懒，先躺着找回绷紧的感觉，是所有站立训练的地基。"),
    exercise("thigh-front-extension-control", "坐姿伸膝控制", 2, "3组", "每组8～10个", "坐稳，缓慢把小腿抬起到舒适范围，再慢慢放下。", "膝盖朝前，抬起和放下都能控制。", "减小抬起范围。", "增加停留或轻阻力。", ["thigh-front", "quadriceps", "knee-extension"], "坐位", "小腿能稳稳抬起再放下，膝盖才受得住上下楼和蹲起。"),
    exercise("thigh-back-isometric", "大腿后侧等长保持", 1, "2组", "每组5次，每次5秒", "坐稳，脚跟踩地，像要把脚跟拖向椅子下方，但脚不要真的移动。", "大腿后侧均匀发力，不抽筋。", "减小用力或保持3秒。", "增加到每组8次。", ["thigh-back", "hamstring", "isometric"], "坐位", "大腿后侧参与稳住膝盖；坐着绷住不动，是拉伤后最安全的不牵拉发力。"),
    exercise("thigh-bridge", "臀桥", 2, "3组", "每组8～10个", "仰卧屈膝，脚跟踩地，抬起臀部再缓慢落下。", "两侧胯保持一样高（可对镜子看），腰部不过度顶起。", "减小高度。", "进阶单腿臀桥。", ["thigh-back", "hamstring", "glute"], "仰卧", "让臀和大腿后侧接管发力，受伤的大腿不用一直替全身扛活。"),
    exercise("thigh-medial-isometric", "夹枕保持", 1, "2组", "每组5次，每次5秒", "仰卧屈膝，在两膝之间放软枕，轻轻夹住后放松。", "大腿内侧均匀发力，不出现刺痛。", "减小夹力或保持3秒。", "增加到每组8次。", ["thigh-medial", "adductor", "isometric"], "仰卧", "大腿内侧没劲，膝盖就会晃；夹枕头是不摩擦关节的唤醒法。"),
    exercise("thigh-medial-active", "侧向收腿控制", 2, "3组", "每组8～10个", "站稳并扶住固定物，把一侧腿从外侧缓慢收回身体中线。", "骨盆不转，收回过程平稳。", "减小移动范围。", "增加轻阻力。", ["thigh-medial", "adductor", "control"], "站立", "把内侧力量放进真实收腿动作里，变向、夹球时不再容易拉伤。"),
    exercise("thigh-lateral-isometric", "侧向抬腿保持", 1, "2组", "每组5次，每次5秒", "扶墙站稳，把腿小幅向外抬起并保持，脚尖朝前。", "躯干不侧倒，两侧胯保持一样高。", "减小抬腿范围或时间。", "增加到每组8次。", ["thigh-lateral", "glute-med", "isometric"], "站立", "臀中肌是骨盆的“水平仪”，先静力练它，走路单腿支撑期才不晃。"),
    exercise("thigh-lateral-stability", "单腿骨盆稳定", 2, "3组", "每侧20～30秒", "扶住固定物单腿站立，保持两侧骨盆大致水平。", "支撑腿稳定，身体不明显侧倒；可手搭两侧胯骨或拍10秒视频回看。", "双手扶稳并缩短时间。", "减少扶持或加入轻微重心移动。", ["thigh-lateral", "glute-med", "single-leg"], "站立", "单腿站得稳，跑步的每一步才有地基；骨盆一歪，代偿就往上走。"),
    exercise("thigh-hip-hinge", "站立屈髋（臀部向后）", 3, "3组", "每组8～10个", "背对墙站立约一脚距离，臀部向后移动轻碰墙面，躯干随之向前，再用臀腿力量站直；熟练后离开墙面做。", "脊柱保持稳定，髋膝踝方向自然；碰不到墙说明做成了弯腰。", "减小下移幅度，扶支撑。", "增加轻负重。", ["thigh-back", "hip-hinge", "daily"], "站立", "学会用髋分担大腿后侧的压力，弯腰搬东西不再靠拉伤过的肌肉硬扛。"),
    exercise("thigh-sit-stand", "坐下再站起", 3, "3组", "每组8～10个", "从稳固椅子缓慢坐下，再均匀用双腿站起。", "左右用力接近，膝盖朝向脚尖。", "提高椅子并扶手。", "降低椅子或轻负重。", ["thigh-front", "thigh-medial", "sit-to-stand", "daily"], "站立", "坐站是最安全的“功能性深蹲”，把练的力量直接接回日常生活。"),
    exercise("thigh-lateral-step", "侧向迈步", 3, "3组", "每侧8～10步", "膝髋微屈，向侧方小步移动，再缓慢回到起点。", "骨盆保持稳定，双脚不过度内扣。", "缩小步幅并扶稳。", "增加轻阻力带。", ["thigh-lateral", "thigh-medial", "lateral-step"], "站立", "侧向移动考验大腿内外侧协同，是回归跑跳变向前的中间台阶。"),
    exercise("thigh-step", "台阶与单腿控制", 4, "3组", "每侧6～8个", "从低台阶上台开始，再练慢速下台。", "症状可控，骨盆和膝足稳定。", "降低台阶。", "增加高度。", ["step", "single-leg"], "站立", "台阶把力量送进真实的高度变化，为下楼和跑步做准备。"),
    exercise("thigh-run-return", "跑步与变速回归", 5, "3～4组", "每组20～30秒", "从走跑交替逐步增加连续跑，再进入加速或变向。", "无锐痛，动作稳定，次日反应可接受。", "缩短慢跑。", "一次只增加速度、时间或变向中的一项。", ["run", "sport"], "站立", "冲刺和变向是拉伤复发的高危场景，一次只加一项负荷才能安全回归。"),
  ],
};

const frontCalf = ["calf-dorsiflexion", "calf-dorsiflexor-strength"];
const backCalf = ["calf-plantarflexion", "calf-heel-raise-strength"];
const medialCalf = ["calf-inversion", "calf-invertor-strength"];
const lateralCalf = ["calf-eversion", "calf-evertor-strength"];

export const CALF_LOCAL_REGION: FullRegion = {
  id: "calf-local", name: "小腿局部", shortName: "小腿",
  summary: "围绕局部位置选择相关踝方向、发力和步行检查；相邻动作只用于区分跨关节肌负荷。",
  keywords: ["小腿前侧", "胫骨前侧", "小腿后侧", "腓肠肌", "比目鱼肌", "小腿内侧", "小腿外侧", "拉伤"],
  locations: ["小腿前侧", "胫骨前侧", "小腿后侧", "小腿内侧", "小腿外侧"],
  directions: [
    assessment("calf-dorsiflexion", "踝背屈检查（小腿前侧）", "direction", "坐稳，脚跟放地，慢慢把脚背向小腿方向勾起。", "比较范围；记录小腿前侧缩短或小腿后侧拉长时是否出现熟悉症状。", ["calf-front", "calf-back", "dorsiflexion"]),
    assessment("calf-plantarflexion", "踝跖屈检查（小腿后侧）", "direction", "坐稳，小腿放松，慢慢把脚背向下压到舒适范围。", "比较范围；记录小腿后侧缩短或小腿前侧拉长时是否出现熟悉症状。", ["calf-front", "calf-back", "plantarflexion", "gastrocnemius", "soleus"]),
    assessment("calf-inversion", "踝内翻检查（小腿内侧）", "direction", "坐稳，小腿不动，把脚掌缓慢向内转。", "比较范围；记录小腿内侧缩短或小腿外侧拉长时是否出现熟悉症状。", ["calf-medial", "calf-lateral", "inversion"]),
    assessment("calf-eversion", "踝外翻检查（小腿外侧）", "direction", "坐稳，小腿不动，把脚掌缓慢向外转。", "比较范围；记录小腿外侧缩短或小腿内侧拉长时是否出现熟悉症状。", ["calf-medial", "calf-lateral", "eversion"]),
  ],
  strengths: [
    assessment("calf-dorsiflexor-strength", "小腿前侧发力", "strength", "坐稳，把脚背向上勾并保持5秒，不需要别人施加强阻力。", "比较保持和熟悉症状。", ["calf-front", "dorsiflexion"]),
    assessment("calf-heel-raise-strength", assessmentPro("calf-heel-raise-strength").title, "strength", assessmentPro("calf-heel-raise-strength").how, assessmentPro("calf-heel-raise-strength").observe, ["calf-back", "heel-raise"]),
    assessment("calf-invertor-strength", "小腿内侧发力", "strength", "用另一只脚轻挡在脚掌内侧，当前脚掌向内轻推并保持5秒。", "比较保持和熟悉症状。", ["calf-medial", "inversion"]),
    assessment("calf-evertor-strength", "小腿外侧发力", "strength", "用另一只脚轻挡在脚掌外侧，当前脚掌向外轻推并保持5秒。", "比较保持和熟悉症状。", ["calf-lateral", "eversion"]),
  ],
  functions: [assessment("calf-walk", "走路", "function", "以平时速度走一小段。", "症状出现在落脚、身体前移还是蹬地阶段。", ["gait"]), assessment("calf-heel-raise", assessmentPro("calf-heel-raise").title, "function", assessmentPro("calf-heel-raise").how, assessmentPro("calf-heel-raise").observe, ["heel-raise"]), assessment("calf-single-leg", "单腿足踝稳定检查", "function", "扶住固定物，左右分别单腿站立10秒。", "比较足弓和脚踝是否稳定（可拍10秒视频回看），以及小腿内外侧是否出现熟悉不适。", ["single-leg", "arch", "ankle-stability"]), assessment("calf-jog", "慢跑准备", "function", "只有走路和提踵稳定时，原地小步慢跑10秒。", "是否再现局部症状。", ["run"], "急性拉伤或走路疼痛时不测试。")],
  specialTests: [assessment("calf-local-palpation", "小腿局部轻按定位", "special-test", "沿图上标记的肌肉区域轻按一次，不按胫骨骨面。", "是否伴快速加重的肿胀、发热或颜色变化。", ["tenderness", "local-calf"], "没有明确受伤却单侧小腿肿、热、红、痛，或同时胸痛气短时，不进入松解训练流程。")],
  candidateGroups: [
    { id: "calf-front-local", title: "小腿前侧局部问题", match: { locations: ["小腿前", "胫骨前"], feelings: ["酸", "紧", "胀", "痛", "无力"], actions: ["勾脚", "走", "跑", "抬脚"] }, note: "不展开踝四方向。", candidates: [candidate("calf-front-release", "小腿前侧轻柔松解", "muscle", "在肌肉区域轻柔松解30～60秒。", "避开胫骨骨面、肿胀中心和刺痛点。", "复测勾脚、发力和原动作。", ["calf-front", "tibialis-anterior"], frontCalf), candidate("calf-front-control", "小腿前侧主动控制", "control", "主动勾脚，保持1～2秒，做2组，每组6～10次。", "不只抬脚趾。", "记录走路抬脚反应。", ["calf-front", "dorsiflexion"], frontCalf)] },
    { id: "calf-back-local", title: "小腿后侧局部问题", match: { locations: ["小腿后", "腓肠肌"], feelings: ["酸", "紧", "扯", "痛", "无力"], actions: ["提踵", "蹬地", "走", "跑", "跳"] }, note: "用伸膝与屈膝位区分负荷。", candidates: [candidate("calf-back-release", "小腿后侧轻柔松解", "muscle", "非急性期，在紧张而不是损伤中心的位置轻柔松解30～60秒。", "刚拉伤或淤青时不重压、不强拉。", "复测两种膝位、提踵和原动作。", ["calf-back", "gastrocnemius", "soleus"], backCalf), candidate("calf-back-control", "小腿后侧低负荷发力", "control", "先坐着或双脚站着轻轻踮脚尖，做2组，每组6～8次。", "次日不持续加重。", "记录高度、个数和走路反应。", ["calf-back", "heel-raise"], backCalf)] },
    { id: "calf-medial-local", title: "小腿内侧局部问题", match: { locations: ["小腿内"], feelings: ["酸", "紧", "扯", "痛", "无力"], actions: ["内翻", "足弓", "提踵", "走", "跑"] }, note: "避免深压内踝后方。", candidates: [candidate("calf-medial-release", "小腿内侧轻柔松解", "muscle", "在小腿内侧肌肉区域轻柔松解30～60秒。", "不深压内踝后方。", "复测内翻、发力和原动作。", ["calf-medial", "tibialis-posterior"], medialCalf), candidate("calf-medial-control", "小腿内侧主动控制", "control", "坐着，脚掌小幅向内转再转回，做2组，每组6～10次；再站着做脚趾抓毛巾。", "小腿不跟着转。", "记录走路和提踵反应。", ["calf-medial", "inversion"], medialCalf)] },
    { id: "calf-lateral-local", title: "小腿外侧局部问题", match: { locations: ["小腿外"], feelings: ["酸", "紧", "扯", "痛", "无力"], actions: ["外翻", "走", "跑", "单腿", "崴"] }, note: "大腿外侧链只作有明确反应时的次级候选。", candidates: [candidate("calf-lateral-release", "小腿外侧轻柔松解", "muscle", "在腓骨外侧肌肉区域轻柔松解30～60秒。", "避开腓骨骨面和刺痛点。", "复测外翻、发力和原动作。", ["calf-lateral", "peroneal"], lateralCalf), candidate("calf-lateral-control", "小腿外侧主动控制", "control", "主动把脚掌小幅向外转，做2组，每组6～10次。", "小腿和膝盖不跟着转。", "记录走路和单腿反应。", ["calf-lateral", "eversion"], lateralCalf), candidate("calf-anterolateral-thigh-lateral-response", "大腿外侧链反应试验", "muscle", "仅在小腿局部处理变化不明显且走路、跑步或单腿动作存在问题时，轻柔处理检查到紧张的大腿前外侧区域30～60秒。", "不沿髂胫束整条重压；这是下一来源反应实验，不直接认定病因。", "只复测原来的小腿主诉动作和仍异常的局部方向。", ["calf-anterolateral", "thigh-lateral", "tfl", "response-test"], ["calf-dorsiflexion", "calf-eversion"]) ] },
  ],
  exercises: [
    exercise("calf-front-active", "主动勾脚", 1, "2组", "每组6～10个", "坐稳，脚跟放地，把脚背向小腿方向勾起，再缓慢放下。", "脚背整体抬起，不只抬脚趾。", "减小范围。", "增加到每组15个。", ["calf-front", "dorsiflexion"], "坐位", "小腿前侧是走路的“抬脚刹车”，它没劲会拖步绊脚，先练主动勾抬。"),
    exercise("calf-front-endurance", "脚跟走耐力", 2, "3组", "每组10～15步", "扶稳后轻抬前脚掌，用脚跟小步向前走。", "脚尖能持续抬起，不拖地。", "原地交替勾脚。", "增加步数。", ["calf-front", "dorsiflexion", "gait"], "站立", "脚跟走把勾脚力量变成耐力，下台阶和落地时不再啪叽砸地。"),
    exercise("calf-back-seated-raise", "坐姿提踵", 1, "3组", "每组8～12个", "坐稳，前脚掌踩地，缓慢抬起脚跟再放下。", "小腿后侧发力，节奏稳定。", "减小高度或个数。", "膝上增加轻负重。", ["calf-back", "soleus", "heel-raise"], "坐位", "膝盖弯着时比目鱼肌才肯出力——这是伤后最早能做的安全负荷。"),
    exercise("calf-back-standing-raise", "双脚站姿提踵", 2, "3组", "每组8～12个", "扶墙站立，两侧脚跟同时抬起，再缓慢落下。", "两侧高度接近，不向内外歪。", "回到坐姿提踵。", "进阶单脚提踵。", ["calf-back", "gastrocnemius", "heel-raise"], "站立", "站直提踵练腓肠肌，蹬地推进的力量从这里开始回到走路里。"),
    exercise("calf-medial-active", "小幅内翻控制", 1, "2组", "每组6～10个", "坐稳，小腿不动，把脚掌小幅向内转，再缓慢回正。", "动作来自脚踝，膝盖不跟着转。", "减小范围。", "用另一只脚增加轻阻力。", ["calf-medial", "inversion"], "坐位", "内翻控制差，足弓会塌着受力；先小幅无阻力找回脚踝内侧的发力感。"),
    exercise("calf-medial-arch", "足弓保持与提踵", 2, "3组", "每组8～10个", "站稳，脚趾放松贴地，轻轻踮脚尖再放下。", "脚趾不抠地，脚跟不向外甩，小腿不跟着转。", "扶着墙做，只抬一点点。", "增加提踵高度。", ["calf-medial", "arch", "heel-raise"], "站立", "小腿内侧和足弓一起练回来，走路时力量才不从小腿内侧漏掉。"),
    exercise("calf-lateral-active", "小幅外翻控制", 1, "2组", "每组6～10个", "坐稳，小腿不动，把脚掌小幅向外转，再缓慢回正。", "膝盖不跟着转，动作不靠甩动。", "减小范围。", "增加轻阻力。", ["calf-lateral", "eversion"], "坐位", "外侧腓骨肌是“防崴弹簧”，崴过脚的人必须把它练回来。"),
    exercise("calf-lateral-stability", "单腿外侧稳定", 2, "3组", "每侧20～30秒", "扶稳后单腿站立，保持足底三点支撑和脚踝稳定。", "脚踝不反复向外翻，身体不过度摇晃；可拍10秒视频回看落地侧。", "双手扶稳并缩短时间。", "减少扶持或轻微移动重心。", ["calf-lateral", "eversion", "single-leg"], "站立", "单腿站练脚踝的动态稳定，走不平的路才不心里发虚。"),
    exercise("calf-gait", "重心转移与走路", 3, "3组", "每组10次，再走10米", "先练原地重心转移；走路时只记两件事：脚跟先着地、脚趾最后离开。", "步幅自然，不跛行。", "扶桌小幅转移。", "增加步数或速度。", ["gait"], "站立", "伤后人会不自觉避开患侧承重；把落脚走顺，步态才算真正回归。"),
    exercise("calf-step-single-leg", "台阶与单腿稳定", 4, "3组", "每侧6～8个", "先单腿站，再做低台阶上下。", "症状可控，髋膝踝协同。", "扶墙并降低台阶。", "增加高度。", ["step", "single-leg"], "站立", "台阶把小腿送回高负荷场景，为跑跳做最后准备。"),
    exercise("calf-run-hop", "跑跳与蹬地回归", 5, "3～4组", "每组5次或20秒", "从走跑交替、快提踵进入小幅双脚跳。", "无锐痛，次日反应可接受。", "回到快走。", "一次只增加一项负荷。", ["run", "hop"], "站立", "提踵弹跳是回归运动的验收考：落地稳、蹬地有力才算过关。"),
  ],
};
