export type ModuleId = "knee" | "ankle-foot" | "lumbar-hip";

export type TreatmentCandidate = {
  id: string;
  type: "muscle" | "joint" | "control";
  title: string;
  do: string;
  watch: string;
};

export type MotionCheck = {
  id: string;
  title: string;
  joint: string;
  activeHow: string;
  passiveHow: string;
  observe: string;
  professionalPassive?: boolean;
  muscles: TreatmentCandidate[];
  joints: TreatmentCandidate[];
  control: TreatmentCandidate;
  retest: string;
  trainingTags: string[];
};

export type SimpleCheck = {
  id: string;
  title: string;
  how: string;
  observe: string;
  trainingTags?: string[];
};

export type FunctionCheck = SimpleCheck & {
  muscleCandidates: TreatmentCandidate[];
  jointCandidates: TreatmentCandidate[];
  retest: string;
};

export type Exercise = {
  id: string;
  name: string;
  tags: string[];
  groups: string;
  reps: string;
  how: string;
  observe: string;
  easier: string;
  harder: string;
};

export type RehabModule = {
  id: ModuleId;
  name: string;
  short: string;
  scope: string;
  keywords: string[];
  locationPlaceholder: string;
  painActionPlaceholder: string;
  localChecks: SimpleCheck[];
  motions: MotionCheck[];
  strengths: SimpleCheck[];
  functions: FunctionCheck[];
  specialChecks: Array<SimpleCheck & { trigger: RegExp; next: string }>;
  training: {
    restore: Exercise[];
    rebuild: Exercise[];
    return: Exercise[];
  };
};

const muscle = (id: string, title: string, doText: string, watch: string): TreatmentCandidate => ({
  id,
  type: "muscle",
  title,
  do: doText,
  watch,
});

const joint = (id: string, title: string, doText: string, watch: string): TreatmentCandidate => ({
  id,
  type: "joint",
  title,
  do: doText,
  watch,
});

const control = (id: string, title: string, doText: string, watch: string): TreatmentCandidate => ({
  id,
  type: "control",
  title,
  do: doText,
  watch,
});

const exercise = (
  id: string,
  name: string,
  tags: string[],
  groups: string,
  reps: string,
  how: string,
  observe: string,
  easier: string,
  harder: string,
): Exercise => ({ id, name, tags, groups, reps, how, observe, easier, harder });

const sharedLowerLimbFunctionMuscles = [
  muscle("lower-vl", "大腿外侧链", "避开疼痛点中心，比较股外侧肌、阔筋膜张肌及髂胫束周围的紧张；轻柔处理后马上重做原动作。", "疼痛出现阶段是否推迟，动作是否更顺。"),
  muscle("lower-calf", "小腿后侧与外侧", "分别比较小腿三头肌和腓骨肌群；一次只处理一个区域，再重做原动作。", "步幅、下蹲深度或台阶承重是否改变。"),
  muscle("lower-glute", "臀肌与髋部控制", "用侧向推墙、骨盆稳定提示或轻柔处理臀肌作为反应试验。", "膝、踝或髋部疼痛是否下降，骨盆是否更稳定。"),
];

const sharedLowerLimbFunctionJoints = [
  joint("lower-ankle-position", "踝背屈与足部支撑", "由受训者调整距骨/踝足支撑，或用脚跟垫高做一次低风险动作比较。", "原下蹲、台阶或走路是否立即改变。"),
  joint("lower-knee-position", "膝与髌骨位置", "由受训者轻柔调整髌骨或胫骨位置，同时保持相同动作速度和深度。", "疼痛位置、程度和动作幅度是否稳定改善。"),
  joint("lower-hip-position", "髋关节与骨盆稳定", "由受训者稳定骨盆或调整髋关节位置后重复动作，不同时改变其他变量。", "原动作是否更轻松，改善能否重复。"),
];

const knee: RehabModule = {
  id: "knee",
  name: "膝关节",
  short: "膝",
  scope: "膝前、膝后、内外侧、术后或跑跳相关问题",
  keywords: ["膝", "髌骨", "半月板", "前交叉", "髌腱", "上下楼"],
  locationPlaceholder: "例如：右膝髌骨下方、膝外侧、膝后方",
  painActionPlaceholder: "例如：下楼承重时刺痛；跑步20分钟后膝外侧痛；伸直到最后会拉扯",
  localChecks: [
    { id: "knee-swelling", title: "肿胀与皮温", how: "比较两侧膝盖轮廓、髌骨周围和腘窝；用手背轻触比较温度。", observe: "肿胀是否明显、集中在哪里；皮温是否明显升高。" },
    { id: "knee-tenderness", title: "压痛位置", how: "轻按髌腱、脂肪垫、关节线、鹅足和腘窝周围，只做一次定位。", observe: "记录最熟悉疼痛的具体位置和性质，不反复重按。" },
    { id: "knee-patella", title: "髌骨活动", how: "膝盖放松时轻柔比较髌骨上下、左右移动；不熟悉可跳过。", observe: "哪一方向较紧、是否出现原疼痛。" },
  ],
  motions: [
    {
      id: "knee-extension",
      title: "膝伸直",
      joint: "膝关节",
      activeHow: "仰卧，双腿自然伸直。主动绷紧大腿前侧，把膝后侧向床面靠近；协助者可把手放在腘窝下比较压力。",
      passiveHow: "一手稳定大腿末端，另一手托住小腿下段或脚跟，缓慢带到伸直末端，比较两侧角度和弹性，不强压过伸。",
      observe: "比较膝后间隙、下压发力、末端角度、疼痛和弹性。",
      muscles: [
        muscle("knee-ext-lateral", "股外侧肌、阔筋膜张肌与外侧链", "先比较大腿外侧紧张和屏蔽反应；轻柔处理后复测被动伸直。", "被动伸直是否增加，膝下或膝后拉扯是否变化。"),
        muscle("knee-ext-popliteus", "腘肌与腘窝周围", "避开明显压痛中心，比较腘肌和膝后软组织；处理后复测被动伸直。", "末端阻力是否变柔和。"),
        muscle("knee-ext-calf", "小腿三头肌与腘绳肌", "分别比较小腿后侧和大腿后侧，单独处理一个区域。", "膝伸直角度和站立伸膝是否改变。"),
      ],
      joints: [
        joint("knee-ext-patella", "髌骨上向活动", "由受训者检查并处理髌骨向上活动。", "被动伸直和主动下压是否改善。"),
        joint("knee-ext-tibiofemoral", "膝关节伸直方向松动", "肌肉处理后被动仍受限时，由受训者进行相应胫股关节松动。", "被动角度是否增加；出现锐痛立即停止。"),
        joint("knee-ext-fibula", "腓骨近端与踝背屈", "由受训者分别检查腓骨近端、踝背屈；一次只处理一个方向。", "处理后膝伸直和原负重动作是否改变。"),
      ],
      control: control("knee-ext-control", "股四头肌末端控制", "做膝伸直下压或终末伸膝，在现有完整被动范围内主动达到末端。", "膝后压力、股内侧参与和站立时自然伸膝。"),
      retest: "先复测被动伸直，再复测主动下压和站立伸膝，最后重复原疼痛动作。",
      trainingTags: ["knee-extension", "quad"],
    },
    {
      id: "knee-flexion",
      title: "膝屈曲",
      joint: "膝关节",
      activeHow: "仰卧，双侧脚跟同时向臀部滑，骨盆保持稳定。",
      passiveHow: "协助者托住小腿，缓慢增加屈曲到自然末端，比较脚跟到臀部距离和末端感觉。",
      observe: "比较两侧角度、前膝/腘窝疼痛、肿胀阻挡和骨盆代偿。",
      muscles: [
        muscle("knee-flex-quads", "股直肌与股四头肌", "比较大腿前侧紧张，轻柔处理后复测被动屈膝。", "脚跟是否更靠近臀部，前膝拉扯是否下降。"),
        muscle("knee-flex-popliteal", "腘肌、小腿三头肌与腘窝", "避开肿胀和压痛中心，比较膝后软组织限制。", "腘窝阻挡和屈膝末端是否改变。"),
      ],
      joints: [
        joint("knee-flex-patella", "髌骨向下活动", "由受训者检查髌骨向下活动和瘢痕滑动。", "被动屈膝是否增加。"),
        joint("knee-flex-joint", "膝关节屈曲方向松动", "软组织处理后仍受限时，由受训者选择胫股关节屈曲方向松动。", "末端角度、疼痛和弹性。"),
      ],
      control: control("knee-flex-control", "主动屈膝控制", "在被动可达到的范围内做脚跟滑动或俯卧屈膝，慢慢返回。", "主动角度能否追上被动范围。"),
      retest: "先复测被动屈膝，再做主动脚跟滑动，最后重复下蹲或台阶。",
      trainingTags: ["knee-flexion", "hamstring"],
    },
  ],
  strengths: [
    { id: "knee-quad", title: "股四头肌与股内斜肌", how: "坐姿伸膝停住5秒，或仰卧膝后下压，与健侧比较。", observe: "发力感、抖动、保持能力和疼痛。", trainingTags: ["quad", "knee-extension"] },
    { id: "knee-hamstring", title: "腘绳肌", how: "坐着让脚跟轻压地面5秒，比较两侧后侧大腿发力。", observe: "是否明显偏弱、抽筋或由小腿代偿。", trainingTags: ["hamstring"] },
    { id: "knee-glute", title: "臀肌与髋控制", how: "用臀桥或侧向推墙比较两侧臀部参与。", observe: "骨盆是否稳定、腰部是否代偿。", trainingTags: ["glute", "single-leg"] },
    { id: "knee-calf", title: "小腿力量", how: "扶稳做双脚提踵；能够完成后再比较单脚。", observe: "高度、次数和患侧是否少用力。", trainingTags: ["calf", "gait"] },
  ],
  functions: [
    { id: "knee-walk", title: "走路", how: "自然走10步再转身，保持平时速度。", observe: "跛行、步长、患侧承重时间和膝是否自然伸直。", muscleCandidates: sharedLowerLimbFunctionMuscles, jointCandidates: sharedLowerLimbFunctionJoints, retest: "用相同速度和路线再走10步。", trainingTags: ["gait", "calf", "quad"] },
    { id: "knee-squat", title: "坐站或浅蹲", how: "从固定椅子坐站，或扶支撑做相同深度浅蹲。", observe: "疼痛阶段、是否偏向健侧、膝轨迹和踝前移。", muscleCandidates: sharedLowerLimbFunctionMuscles, jointCandidates: sharedLowerLimbFunctionJoints, retest: "保持相同椅高、站距、深度和速度重复。", trainingTags: ["squat", "glute", "quad"] },
    { id: "knee-step", title: "上下一级台阶", how: "扶好栏杆，分别上和下一级固定高度台阶。", observe: "上台还是下台更痛；承重、离心控制和膝轨迹。", muscleCandidates: sharedLowerLimbFunctionMuscles, jointCandidates: sharedLowerLimbFunctionJoints, retest: "使用同一台阶和扶持程度重复原方向。", trainingTags: ["step", "single-leg", "quad"] },
    { id: "knee-single", title: "单腿站与单腿小蹲", how: "靠近支撑单脚站10秒；稳定后做很小幅单腿蹲。", observe: "骨盆下沉、膝内外摆、足弓和疼痛。", muscleCandidates: sharedLowerLimbFunctionMuscles, jointCandidates: sharedLowerLimbFunctionJoints, retest: "保持相同扶持和幅度重复。", trainingTags: ["single-leg", "glute", "calf"] },
  ],
  specialChecks: [
    { id: "knee-lock", title: "是否真正卡住不能伸直", how: "询问是否出现机械性卡住，而不是单纯因为疼痛不敢伸。", observe: "真正锁住、快速大量肿胀或反复打软。", trigger: /卡|锁|半月板|扭/, next: "优先结合影像或专业评估，不反复做深蹲和旋转测试。" },
    { id: "knee-instability", title: "韧带稳定性检查", how: "只由受训人员根据受伤方向选择前后或侧向稳定检查。", observe: "明显松弛、终末感差异或疼痛伴不稳。", trigger: /扭|撞|前交叉|韧带|打软/, next: "阳性结果结合影像和医学评估，不能由单项测试确诊。" },
  ],
  training: {
    restore: [
      exercise("knee-quad-set", "膝伸直下压", ["quad", "knee-extension"], "3组", "每组20个", "仰卧绷紧大腿前侧，让膝后向床面靠近，每次停2秒。", "患侧能主动达到现有被动末端。", "膝下垫薄毛巾", "增加终末伸膝弹力带"),
      exercise("knee-heel-slide", "脚跟滑动", ["knee-flexion"], "3组", "每组10个", "仰卧脚跟沿床面滑向臀部，再主动伸直。", "不顶进卡住或锐痛。", "缩小范围", "在新范围停2秒"),
      exercise("knee-ankle-motion", "踝背屈＋外翻活动", ["gait", "calf"], "3组", "每组15个", "勾脚后轻向外转，感受小腿前外侧参与。", "膝部和外踝不出现锐痛。", "只做勾脚", "加轻弹力带"),
      exercise("knee-bridge", "呼吸臀桥", ["glute", "hamstring"], "3组", "每组15个", "呼气时轻收腹、抬起臀部，感受臀部和大腿后侧。", "腰部不过度顶起。", "小幅臀桥", "脚垫高或单腿"),
    ],
    rebuild: [
      exercise("knee-sit-stand-ex", "坐站", ["squat", "quad"], "3组", "每组8个", "从固定椅子起立，再慢慢坐下。", "两侧承重接近，膝轨迹稳定。", "提高椅子或扶支撑", "降低椅子或抱轻物"),
      exercise("knee-split-squat", "扶持分腿蹲", ["step", "single-leg", "quad"], "3组", "每侧8个", "前后站立，扶支撑垂直下蹲。", "前膝稳定，疼痛不随次数增加。", "减小幅度", "减少扶持或加重量"),
      exercise("knee-calf-raise", "提踵", ["calf", "gait"], "3组", "每组12个", "扶墙抬起脚跟再缓慢落下。", "两侧高度逐渐接近。", "双脚分担", "单脚或加重量"),
      exercise("knee-single-reach", "单髋支撑点地", ["single-leg", "glute"], "3组", "每方向5个", "单腿站，另一脚向前和斜后方轻点。", "骨盆、膝盖和足弓稳定。", "缩短距离", "增加距离或减少扶持"),
    ],
    return: [
      exercise("knee-loaded-squat", "负重深蹲", ["squat", "quad", "glute"], "4组", "每组8个", "保持可控深度，抱重量完成深蹲。", "动作后和次日没有明显肿胀增加。", "徒手深蹲", "增加重量或深度"),
      exercise("knee-step-up", "负重登阶", ["step", "single-leg"], "3组", "每侧8个", "踩上固定台阶，控制上升和下降。", "膝轨迹和骨盆稳定。", "降低台阶", "加重量或提高台阶"),
      exercise("knee-landing", "跳跃落地", ["return", "single-leg"], "4组", "每组6次", "从双脚小跳开始，安静落地并停稳。", "落地有缓冲，次日稳定。", "快速提踵或跨步停稳", "单腿小跳或多方向"),
      exercise("knee-run", "跑步分级", ["return", "gait"], "4轮", "每轮走2分钟＋慢跑1分钟", "在平地交替走跑，保持舒适速度。", "疼痛不逐轮增加，次日恢复。", "只快走", "逐步延长慢跑段"),
    ],
  },
};

const ankleFoot: RehabModule = {
  id: "ankle-foot",
  name: "踝关节与足部",
  short: "踝足",
  scope: "崴脚、跟腱、足底、足背、足弓与步态问题",
  keywords: ["踝", "崴脚", "脚", "足", "跟腱", "外踝", "内踝", "足底"],
  locationPlaceholder: "例如：右外踝前下方、足底内侧、跟腱末端",
  painActionPlaceholder: "例如：走路蹬地时外踝痛；早上第一步脚跟痛；下楼时脚踝前方夹",
  localChecks: [
    { id: "ankle-swelling", title: "肿胀、淤血与皮温", how: "比较双侧踝足轮廓；记录肿胀和淤血范围，用手背比较温度。", observe: "肿胀是否正在减轻；淤血是局部残留还是整只脚颜色、温度异常。" },
    { id: "ankle-tenderness", title: "具体压痛位置", how: "轻触内外踝、足背、足底、跟腱和第五跖骨基底，只做一次定位。", observe: "骨点、韧带区、肌腱或肌肉区域中，哪里最接近原疼痛。" },
    { id: "ankle-girth", title: "小腿围度与肌肉外观", how: "比较两侧小腿外侧和后侧肌肉轮廓。", observe: "是否存在明显萎缩或长期少用。", trainingTags: ["calf", "eversion"] },
  ],
  motions: [
    {
      id: "ankle-dorsiflexion", title: "踝背屈", joint: "踝关节",
      activeHow: "坐姿双侧同时勾脚；能安全负重时增加膝碰墙，脚跟不离地。",
      passiveHow: "协助者稳定小腿，托住足跟和前足缓慢带向背屈末端；急性期不过度加压。",
      observe: "非负重角度、膝碰墙距离、踝前夹挤或小腿后侧牵拉。",
      muscles: [
        muscle("ankle-df-calf", "腓肠肌与比目鱼肌", "分别在膝伸直、屈曲时比较小腿后侧限制；轻柔处理后复测被动背屈。", "背屈和膝碰墙距离是否增加。"),
        muscle("ankle-df-anterior", "胫骨前肌、趾长伸肌与足底", "根据疼痛位置比较踝前、小腿前侧和足底肌肉，不同时处理多处。", "踝前夹挤或足底牵拉是否变化。"),
      ],
      joints: [
        joint("ankle-df-talus", "距骨与踝关节背屈松动", "肌肉处理后仍受限时，由受训者进行距骨后向或踝关节分离。", "被动背屈和膝碰墙是否增加。"),
        joint("ankle-df-fibula", "腓骨与中足活动", "由受训者分别检查近远端腓骨、骰骨或足舟骨活动。", "只保留能改变背屈或原走路动作的方向。"),
      ],
      control: control("ankle-df-control", "主动勾脚控制", "在完整被动范围内主动勾脚，必要时配合轻弹力带。", "脚尖能否主动达到末端，走路摆动期是否更顺。"),
      retest: "先复测被动背屈，再复测主动勾脚和膝碰墙，最后重复走路或下楼。",
      trainingTags: ["dorsiflexion", "gait"],
    },
    {
      id: "ankle-plantarflexion", title: "踝跖屈", joint: "踝关节",
      activeHow: "坐姿或仰卧，双侧同时向下绷脚。",
      passiveHow: "协助者稳定小腿，托住足跟和前足缓慢带向跖屈末端。",
      observe: "踝前拉扯、后方夹挤、两侧角度和主动发力。",
      muscles: [
        muscle("ankle-pf-anterior", "胫骨前肌与趾伸肌", "比较小腿前侧和足背紧张，处理后复测被动跖屈。", "足背绷直角度和前方拉扯是否改变。"),
        muscle("ankle-pf-calf", "小腿三头肌控制", "检查小腿后侧发力和跟腱负荷，而不是只做放松。", "主动跖屈和提踵高度。"),
      ],
      joints: [joint("ankle-pf-joint", "踝关节跖屈与中足活动", "由受训者检查踝关节、距下关节和中足相关方向。", "被动跖屈和原蹬地动作是否改变。")],
      control: control("ankle-pf-control", "小腿后侧主动控制", "从双脚提踵或坐姿提踵开始，主动使用完整跖屈范围。", "提踵高度、路线和小腿发力。"),
      retest: "先复测被动跖屈，再复测主动绷脚和提踵/走路蹬地。",
      trainingTags: ["calf", "gait"],
    },
    {
      id: "ankle-inversion", title: "踝内翻", joint: "踝与距下关节",
      activeHow: "坐姿双侧同时把脚底轻转向内。",
      passiveHow: "协助者稳定小腿，托住足跟和前足缓慢带向内翻，不在急性外侧扭伤期强推。",
      observe: "外侧牵拉、内侧夹挤、角度和主动控制。",
      muscles: [muscle("ankle-inv-muscles", "胫骨后肌、胫骨前肌与腓骨肌群", "根据内外侧疼痛分别比较相关肌肉；处理一处后复测。", "被动内翻和外侧牵拉是否改变。")],
      joints: [joint("ankle-inv-joint", "距下关节与中足活动", "结构稳定确认后，由受训者检查距下、骰骨和足舟骨方向。", "被动内翻及原动作是否改变。")],
      control: control("ankle-inv-control", "足弓与内翻控制", "在无锐痛范围主动内翻，并保持足弓不过度卷曲。", "主动角度能否追上被动，足弓是否可控。"),
      retest: "先复测被动内翻，再复测主动内翻和站立足部控制。",
      trainingTags: ["arch", "inversion"],
    },
    {
      id: "ankle-eversion", title: "踝外翻", joint: "踝与距下关节",
      activeHow: "坐姿双侧同时把脚底轻转向外。",
      passiveHow: "协助者稳定小腿，托住足跟和前足缓慢带向外翻末端。",
      observe: "外侧肌肉发力、内侧牵拉、角度和疼痛。",
      muscles: [
        muscle("ankle-ev-peroneal", "腓骨长短肌与小腿外侧", "比较小腿外侧紧张和主动发力；轻柔处理后复测被动外翻。", "外翻角度、外踝疼痛和肌肉参与。"),
        muscle("ankle-ev-foot", "趾伸肌与足底外侧", "按疼痛位置比较足背和足底外侧组织。", "外翻和站立重心移动是否改变。"),
      ],
      joints: [joint("ankle-ev-joint", "腓骨、距下关节与骰骨", "肌肉处理后仍受限时，由受训者分别检查腓骨、距下和骰骨活动。", "被动外翻和走路承重是否改变。")],
      control: control("ankle-ev-control", "足外翻主动控制", "用徒手或轻弹力带做外翻，主动达到被动末端。", "小腿外侧发力，脚趾不过度代偿。"),
      retest: "先复测被动外翻，再复测主动外翻、站立重心移动和走路。",
      trainingTags: ["eversion", "balance", "gait"],
    },
    {
      id: "foot-big-toe", title: "大脚趾背伸", joint: "第一跖趾关节",
      activeHow: "脚掌着地，保持其他脚趾放松，主动抬起大脚趾。",
      passiveHow: "协助者稳定第一跖骨，轻托大脚趾向上，比较两侧末端。",
      observe: "角度、关节根部疼痛和走路推蹬影响。",
      muscles: [muscle("toe-muscles", "拇趾屈伸肌与足底组织", "比较足底和拇趾肌腱紧张，轻柔处理后复测被动背伸。", "大脚趾角度和足底牵拉。")],
      joints: [joint("toe-joint", "第一跖趾关节活动", "由受训者做轻柔牵引或滑动，不直接强压疼痛骨点。", "被动背伸和走路推蹬是否改变。")],
      control: control("toe-control", "大脚趾与足弓控制", "练习单独抬大脚趾和短足，主动使用可获得范围。", "脚趾不蜷缩，足弓保持。"),
      retest: "先复测被动大脚趾背伸，再复测主动抬趾和走路推蹬。",
      trainingTags: ["toe", "arch", "gait"],
    },
  ],
  strengths: [
    { id: "ankle-calf", title: "小腿后侧力量", how: "扶墙做双脚提踵；可以完成后比较单脚高度和个数。", observe: "高度、路线、速度和次日反应。", trainingTags: ["calf", "gait"] },
    { id: "ankle-eversion-strength", title: "小腿外侧与外翻力量", how: "脚外侧轻抵另一只脚或弹力带向外推。", observe: "与健侧比较发力和控制。", trainingTags: ["eversion", "balance"] },
    { id: "ankle-dorsiflexion-strength", title: "胫骨前肌与勾脚力量", how: "脚背向上抵轻阻力，比较两侧。", observe: "脚尖能否抬起，是否由脚趾过度代偿。", trainingTags: ["dorsiflexion", "gait"] },
    { id: "foot-arch-strength", title: "足弓与脚趾控制", how: "脚趾放松，轻缩短脚掌，再分别抬大脚趾和其他脚趾。", observe: "足弓能否主动抬起，脚趾是否蜷缩。", trainingTags: ["arch", "toe"] },
  ],
  functions: [
    { id: "ankle-weight", title: "双脚负重与重心移动", how: "扶支撑双脚站立，缓慢把重心移向患侧。", observe: "是否害怕、疼痛阶段和足底压力位置。", muscleCandidates: sharedLowerLimbFunctionMuscles, jointCandidates: sharedLowerLimbFunctionJoints, retest: "保持相同支撑和站距重复重心移动。", trainingTags: ["gait", "balance"] },
    { id: "ankle-walk", title: "走路与推蹬", how: "自然走10步再转身。", observe: "跛行、步长、脚跟着地、推蹬和脚尖离地。", muscleCandidates: sharedLowerLimbFunctionMuscles, jointCandidates: sharedLowerLimbFunctionJoints, retest: "相同速度走同一路线。", trainingTags: ["gait", "calf", "dorsiflexion"] },
    { id: "ankle-step", title: "上下一级台阶", how: "扶栏分别上、下一级台阶。", observe: "背屈、承重、疼痛和小腿控制。", muscleCandidates: sharedLowerLimbFunctionMuscles, jointCandidates: sharedLowerLimbFunctionJoints, retest: "使用同一台阶和扶持重复。", trainingTags: ["step", "calf", "balance"] },
    { id: "ankle-single", title: "单腿站与提踵", how: "靠近支撑单腿站10秒；稳定后尝试单脚提踵。", observe: "晃动、足弓、提踵高度和外踝信心。", muscleCandidates: sharedLowerLimbFunctionMuscles, jointCandidates: sharedLowerLimbFunctionJoints, retest: "保持相同扶持和次数重复。", trainingTags: ["balance", "calf", "eversion"] },
  ],
  specialChecks: [
    { id: "ankle-bone-screen", title: "踝足骨性影像筛查", how: "确认急性外伤后当时和现在的四步负重，以及内外踝后缘、第五跖骨基底和舟骨骨点压痛。", observe: "不能负重四步或指定骨点明显压痛。", trigger: /崴|扭|撞|压|摔|急性/, next: "符合条件只表示优先考虑X线，不代表已经骨折；保存记录，影像后继续评估。" },
    { id: "ankle-ligament", title: "韧带稳定性", how: "由受训人员根据受伤方向选择前抽屉、距骨倾斜等轻柔比较。", observe: "疼痛伴明显松弛或终末感差异。", trigger: /崴|扭|韧带|不稳|打软/, next: "阳性结合影像或专业评估，不能由单项测试确诊。" },
    { id: "achilles-screen", title: "跟腱连续性", how: "怀疑突然断裂时，由受训人员进行小腿挤压等检查。", observe: "突然像被踢、不能主动提踵或挤压后脚掌不自然下移。", trigger: /跟腱|被踢|提踵不了|弹响/, next: "先做医学评估，不继续强拉伸或负重提踵。" },
  ],
  training: {
    restore: [
      exercise("ankle-four-way", "踝泵与四方向活动", ["dorsiflexion", "inversion", "eversion", "gait"], "3组", "每方向10个", "按背屈、跖屈、内翻、外翻缓慢主动活动。", "肿胀和疼痛不随次数增加。", "只做踝泵", "扩大到完整被动范围"),
      exercise("ankle-eversion-ex", "足外翻激活", ["eversion", "balance"], "3组", "每组12个", "脚外侧抵轻弹力带向外转。", "小腿外侧发力，脚趾不过度用力。", "徒手外翻", "增加阻力"),
      exercise("foot-arch", "短足与大脚趾控制", ["arch", "toe"], "3组", "每组10个", "脚趾放松，轻缩短足弓，再单独抬大脚趾。", "足底不抽筋，脚趾不蜷缩。", "坐姿只做短足", "站姿完成"),
      exercise("ankle-gait", "重心移动与步态", ["gait"], "4轮", "每轮10步", "扶支撑把重量移向患侧，再走固定路线。", "跛行逐渐减少，不追求快。", "只做重心移动", "增加连续步数"),
    ],
    rebuild: [
      exercise("ankle-calf-raise", "双脚到单脚提踵", ["calf", "gait"], "3组", "每组12个", "扶墙抬起脚跟，缓慢落下。", "小腿后侧发力，足弓稳定。", "坐姿或双脚", "单脚或加重量"),
      exercise("ankle-single-stand", "单腿站", ["balance", "eversion"], "3组", "每组30秒", "靠近墙单脚站立，保持足底三点。", "外踝有信心，骨盆不过度倾斜。", "手指扶墙", "减少扶持或软垫"),
      exercise("ankle-split-squat", "分腿蹲", ["step", "dorsiflexion"], "3组", "每侧8个", "前后站立，前膝向前时脚跟保持着地。", "踝背屈和膝轨迹稳定。", "扶支撑小幅度", "增加深度或重量"),
      exercise("ankle-step-ex", "登阶与慢下台阶", ["step", "calf", "balance"], "3组", "每侧8个", "踩上低台阶，再控制下降。", "患侧承重稳定。", "降低台阶", "提高台阶或加重量"),
    ],
    return: [
      exercise("ankle-loaded-calf", "负重单腿提踵", ["calf", "return"], "4组", "每组8个", "扶持单脚提踵，逐渐加入重量。", "高度和节奏稳定，次日不肿。", "双脚或不加重量", "增加重量或速度"),
      exercise("ankle-y-reach", "三方向触地", ["balance", "return"], "3组", "每方向5次", "单腿站，另一脚向前、后内、后外轻点。", "足弓、膝和骨盆稳定。", "缩短距离", "增加距离或不稳定面"),
      exercise("ankle-hop", "多方向跳稳", ["return"], "4组", "每方向5次", "从跨步停稳进阶到小跳并停稳。", "落地有控制，次日无肿胀增加。", "跨步停稳", "连续跳或随机方向"),
      exercise("ankle-run", "走跑交替", ["return", "gait"], "4轮", "每轮走2分钟＋慢跑1分钟", "平地完成，保持步态对称。", "疼痛不逐轮增加，次日恢复。", "只快走", "延长慢跑或加入方向变化"),
    ],
  },
};

const lumbarHip: RehabModule = {
  id: "lumbar-hip",
  name: "腰椎、骨盆与髋",
  short: "腰髋",
  scope: "腰痛、臀腿症状、髋活动和久坐/弯腰问题",
  keywords: ["腰", "下背", "髋", "臀", "腹股沟", "坐骨", "大腿"],
  locationPlaceholder: "例如：右侧下腰、骶髂附近、腹股沟、臀部外侧",
  painActionPlaceholder: "例如：久坐30分钟后腰酸；弯腰末端右侧痛；单腿站时髋外侧痛",
  localChecks: [
    { id: "back-tenderness", title: "症状位置与触诊", how: "先用手指出最熟悉的位置，再轻触腰方肌、竖脊肌、臀部、髋前和大腿周围。", observe: "疼痛位置、性质和是否向腿部扩散；不深压神经路径。" },
    { id: "pelvis-observation", title: "骨盆位置候选", how: "可记录仰卧—长坐脚跟高度变化及髂前上棘左右差异。", observe: "只记录变化，不直接判断骨盆旋前/旋后；必须结合原疼痛动作复测。" },
    { id: "back-neural", title: "感觉与神经症状分布", how: "记录麻、刺、电或拉扯从哪里到哪里，以及什么动作会改变。", observe: "症状是否向脚部扩散、是否伴进行性力量下降。" },
  ],
  motions: [
    {
      id: "back-flexion", title: "腰背前屈", joint: "腰椎与髋",
      activeHow: "站立，双手沿大腿向下滑，观察下腰、骨盆和髋如何配合。",
      passiveHow: "脊柱被动和分节活动只由专业人员检查；普通用户不自行做被动末端。",
      observe: "手到哪里、疼痛阶段、回正过程、髋膝代偿和腿部症状。",
      professionalPassive: true,
      muscles: [
        muscle("back-flex-posterior", "竖脊肌、臀肌与后侧链", "分别比较腰背、臀部和大腿后侧；一次只处理一个区域，再复测弯腰。", "弯腰范围、疼痛位置和回正是否改变。"),
        muscle("back-flex-hip", "髋周肌肉", "比较髋屈曲、臀深层和内收肌等候选，不把所有拉扯都归为腘绳肌。", "髋屈曲和原弯腰动作是否改变。"),
      ],
      joints: [
        joint("back-flex-spine", "腰椎/胸腰交界活动", "由受训者根据分节检查选择相应关节手法。", "原弯腰动作和症状是否改善。"),
        joint("back-flex-hip-joint", "髋关节活动", "髋被动活动同时受限时，由受训者选择髋关节松动。", "髋被动范围和弯腰是否同步改善。"),
      ],
      control: control("back-flex-control", "屈髋与躯干控制", "练习小范围髋铰链、呼吸和主动弯腰回正。", "动作信心、腰髋配合和回正控制。"),
      retest: "先由专业人员复测相关被动/分节活动，再复测主动弯腰和原取物动作。",
      trainingTags: ["hinge", "core"],
    },
    {
      id: "back-extension", title: "腰背后伸", joint: "腰椎与髋",
      activeHow: "双手扶髋，小幅向后伸，观察腰椎、骨盆和髋是否共同参与。",
      passiveHow: "脊柱被动和分节活动只由专业人员检查；普通用户不自行压迫后伸末端。",
      observe: "局部夹挤、腿部症状、左右偏移和髋前侧紧张。",
      professionalPassive: true,
      muscles: [
        muscle("back-ext-front", "髂腰肌、股直肌与大腿前侧", "比较髋前和大腿前侧紧张，处理一处后复测后伸。", "后伸范围和前侧牵拉是否改变。"),
        muscle("back-ext-paraspinal", "腰方肌与竖脊肌", "比较左右腰背紧张，避免直接重压痛点。", "后伸疼痛位置和偏移是否改变。"),
      ],
      joints: [
        joint("back-ext-spine", "胸腰交界与腰椎活动", "由受训者根据分节检查选择关节手法。", "主动后伸是否更顺，腿部症状不能向下扩散。"),
        joint("back-ext-hip", "髋伸展与骨盆活动", "髋被动后伸受限时检查髋关节和骨盆相关方向。", "站立后伸和走路是否改变。"),
      ],
      control: control("back-ext-control", "腰髋伸展控制", "在舒适范围练习髋后伸、臀桥和躯干稳定。", "臀肌参与，腰部不过度代偿。"),
      retest: "复测专业被动/分节结果，再复测主动后伸和原久站/走路动作。",
      trainingTags: ["glute", "core", "walk"],
    },
    {
      id: "back-side", title: "腰背左右侧屈", joint: "腰椎与胸腰交界",
      activeHow: "站立，左右手分别沿大腿外侧下滑，骨盆尽量保持中间。",
      passiveHow: "被动侧屈和分节活动由专业人员检查。",
      observe: "左右幅度、哪侧拉扯或挤压、骨盆和肩膀代偿。",
      professionalPassive: true,
      muscles: [muscle("back-side-muscle", "腰方肌、竖脊肌与背阔肌", "比较左右肌肉紧张，单侧处理后复测同方向侧屈。", "侧屈幅度和对侧拉扯是否改变。")],
      joints: [joint("back-side-joint", "腰椎与胸腰交界侧向活动", "由受训者根据分节检查选择关节方向。", "主动侧屈和原疼痛动作是否改变。")],
      control: control("back-side-control", "侧向躯干控制", "练习小幅侧屈回正、侧向支撑或携物行走。", "左右控制和骨盆稳定。"),
      retest: "复测被动/分节活动后，再做主动侧屈和原动作。",
      trainingTags: ["core", "carry"],
    },
    {
      id: "hip-flexion", title: "髋屈曲", joint: "髋关节",
      activeHow: "仰卧主动抱膝靠近胸口，骨盆保持稳定。",
      passiveHow: "协助者托住大腿和小腿，缓慢把髋带向屈曲末端，比较腹股沟夹挤和骨盆代偿。",
      observe: "两侧角度、腹股沟/臀部疼痛和骨盆提前后倾。",
      muscles: [muscle("hip-flex-posterior", "臀大肌、后侧关节囊周围与内收肌", "比较髋后侧和内侧组织，处理后复测被动屈髋。", "夹挤是否下降、被动屈髋是否增加。")],
      joints: [joint("hip-flex-joint", "髋关节后向或牵引", "肌肉处理后仍受限时，由受训者选择髋关节后向或牵引。", "被动屈髋和原下蹲/穿鞋动作是否改变。")],
      control: control("hip-flex-control", "主动屈髋控制", "做仰卧滑脚、坐姿抬膝或低台阶抬腿，主动达到被动范围。", "骨盆稳定，腹股沟不夹挤。"),
      retest: "先复测被动屈髋，再复测主动抱膝、穿鞋或下蹲。",
      trainingTags: ["hip-flexion", "step"],
    },
    {
      id: "hip-extension", title: "髋后伸", joint: "髋关节",
      activeHow: "俯卧或站立扶稳，把腿向后移动，骨盆不前倾。",
      passiveHow: "协助者稳定骨盆，轻托大腿带向后伸，比较两侧。",
      observe: "髋前牵拉、腰部代偿和臀肌发力。",
      muscles: [muscle("hip-ext-front", "髂腰肌、股直肌与阔筋膜张肌", "稳定骨盆后比较髋前/大腿前侧，轻柔处理后复测被动后伸。", "髋后伸和走路步幅是否改变。")],
      joints: [joint("hip-ext-joint", "髋关节前向/伸展方向活动", "由受训者检查髋关节和骨盆相关方向。", "被动后伸和主动步幅是否改变。")],
      control: control("hip-ext-control", "臀肌与髋后伸控制", "练习臀桥或站立髋后伸，保持骨盆稳定。", "臀肌参与，腰部不顶替。"),
      retest: "先复测被动髋后伸，再复测主动后伸和走路。",
      trainingTags: ["glute", "walk"],
    },
    {
      id: "hip-rotation", title: "髋内旋与外旋", joint: "髋关节",
      activeHow: "仰卧或坐位屈髋屈膝，保持骨盆稳定，分别主动内旋和外旋。",
      passiveHow: "协助者稳定大腿和骨盆，缓慢带向内旋、外旋末端，逐项比较。",
      observe: "两侧角度、腹股沟/臀部疼痛和骨盆代偿。",
      muscles: [
        muscle("hip-rotation-deep", "臀深层旋转肌与臀大肌", "比较臀深层和后侧组织，处理后分别复测被动内外旋。", "哪个方向增加、疼痛是否改变。"),
        muscle("hip-rotation-tfl", "阔筋膜张肌、腰大肌与内收肌", "根据受限方向和触诊反应选择一个区域。", "被动旋转和原下蹲/单腿动作。"),
      ],
      joints: [joint("hip-rotation-joint", "髋关节后外侧活动", "肌肉处理后仍受限时，由受训者选择髋关节松动。", "被动旋转和功能动作是否同步改善。")],
      control: control("hip-rotation-control", "髋旋转主动控制", "坐姿在可获得范围内主动内外旋，骨盆保持不动。", "主动角度能否追上被动。"),
      retest: "先复测被动内外旋，再复测主动旋转和下蹲/单腿动作。",
      trainingTags: ["hip-rotation", "single-leg"],
    },
    {
      id: "hip-ab-ad", title: "髋外展与内收", joint: "髋关节",
      activeHow: "仰卧或站立扶稳，腿分别向外、向内移动，骨盆保持稳定。",
      passiveHow: "协助者稳定骨盆，缓慢带向外展和内收末端。",
      observe: "大腿内外侧牵拉、骨盆代偿和两侧角度。",
      muscles: [muscle("hip-ab-ad-muscles", "内收肌、臀中肌与阔筋膜张肌", "根据受限方向分别比较大腿内侧或髋外侧，处理后复测被动范围。", "外展/内收角度和单腿动作是否改变。")],
      joints: [joint("hip-ab-ad-joint", "髋关节外侧或内侧活动", "被动仍受限时由受训者选择髋关节方向。", "被动范围和原功能动作。")],
      control: control("hip-ab-ad-control", "髋外展/内收控制", "用侧向推墙、夹枕或站姿外展训练主动控制。", "骨盆稳定，目标肌肉参与。"),
      retest: "先复测被动外展/内收，再复测主动活动和单腿站。",
      trainingTags: ["glute", "adductor", "single-leg"],
    },
  ],
  strengths: [
    { id: "back-core", title: "躯干与呼吸控制", how: "仰卧呼吸收腹，或四点跪抬一只手/腿。", observe: "能否正常呼吸，腰背是否过度紧张。", trainingTags: ["core"] },
    { id: "hip-glute", title: "臀大肌与臀中肌", how: "用臀桥和侧向推墙比较两侧臀部参与。", observe: "骨盆稳定、腰部代偿和两侧差异。", trainingTags: ["glute", "single-leg"] },
    { id: "hip-hamstring", title: "腘绳肌", how: "坐姿脚跟压地5秒，或做小幅臀桥。", observe: "后侧大腿发力、抽筋和两侧差异。", trainingTags: ["hamstring", "glute"] },
    { id: "hip-adductor", title: "内收肌", how: "膝间夹软枕轻轻发力5秒。", observe: "力量、疼痛和骨盆是否代偿。", trainingTags: ["adductor"] },
  ],
  functions: [
    { id: "back-sit-stand", title: "坐下与起立", how: "从固定椅子连续坐站3次。", observe: "疼痛阶段、是否用手、是否偏向一侧。", muscleCandidates: [muscle("back-task-hip", "腰大肌、腰方肌与臀肌", "一次选择一个区域做轻柔处理或发力提示，再重复坐站。", "疼痛和偏移是否改善。"), ...sharedLowerLimbFunctionMuscles], jointCandidates: [joint("back-task-pelvis", "髋关节、骨盆与腰椎方向", "由受训者一次调整一个关节方向后重复坐站。", "改善能否重复。"), ...sharedLowerLimbFunctionJoints], retest: "保持相同椅高和速度重复3次。", trainingTags: ["squat", "core", "glute"] },
    { id: "back-pickup", title: "弯腰取物", how: "先从椅面高度拿空瓶，再根据情况降低高度。", observe: "弯腰阶段、回正、疼痛位置和信心。", muscleCandidates: [muscle("back-task-posterior", "腰背、臀部与后侧链", "分别做肌肉屏蔽或髋铰链提示，一次只改变一个变量。", "弯腰范围、疼痛和回正是否改善。")], jointCandidates: [joint("back-task-joint", "腰椎、髋关节与骨盆调整", "由受训者根据主动—被动结果选择一个关节方向。", "原取物动作是否改变。")], retest: "使用相同物品、高度和速度重复。", trainingTags: ["hinge", "core", "glute"] },
    { id: "back-walk", title: "走路", how: "按平时速度走1—2分钟。", observe: "是越走越轻松还是加重；步幅、骨盆和腿部症状。", muscleCandidates: [muscle("back-task-walk", "髋屈肌、臀肌与小腿", "分别比较髋前、臀部和小腿对步幅的影响。", "走路疼痛、步幅和腿部症状。")], jointCandidates: [joint("back-task-walk-joint", "髋、骨盆与腰椎方向", "由受训者一次调整一个区域，再走相同路线。", "症状不能向脚部扩散。")], retest: "相同速度走相同时间。", trainingTags: ["walk", "glute", "core"] },
    { id: "hip-single", title: "单腿站与台阶", how: "靠近支撑单腿站10秒；稳定后上下一级台阶。", observe: "髋外侧/腹股沟疼痛、骨盆下沉和膝足轨迹。", muscleCandidates: sharedLowerLimbFunctionMuscles, jointCandidates: sharedLowerLimbFunctionJoints, retest: "保持相同扶持和台阶高度重复。", trainingTags: ["single-leg", "step", "glute"] },
  ],
  specialChecks: [
    { id: "back-neural-screen", title: "下肢神经张力与力量", how: "出现麻、电、放射时，由受训者比较直腿抬高、股神经或相关神经滑动，并检查脚踝脚趾力量。", observe: "熟悉症状是否在明显较低角度出现，力量是否进行性下降。", trigger: /麻|电|放射|窜|脚跟|小腿/, next: "不反复拉到症状末端；进行性无力或大小便/会阴异常优先医学评估。" },
    { id: "hip-structure-screen", title: "髋部结构相关检查", how: "腹股沟卡住、明显弹响或深屈髋痛时，由专业人员选择髋部特殊检查。", observe: "多项结果和原动作是否一致。", trigger: /腹股沟|卡|弹响|髋前|深蹲/, next: "单个阳性结果不等于确诊；持续卡住或负重困难时结合影像。" },
  ],
  training: {
    restore: [
      exercise("back-breath", "呼吸与深层腹部激活", ["core"], "2组", "每组10次呼吸", "仰卧屈膝，呼气时轻收下腹，保持肩颈放松。", "能正常呼吸，腰部不过度用力。", "减少收紧程度", "带入臀桥"),
      exercise("back-bridge", "臀桥", ["glute", "hamstring"], "3组", "每组15个", "呼气时轻卷骨盆，抬起臀部再慢慢落下。", "臀部和大腿后侧发力。", "小幅臀桥", "脚垫高或单腿"),
      exercise("back-cat", "舒适方向活动", ["core", "hinge"], "2组", "每组8个", "选择评估中更舒适的弯腰、后伸或猫式小范围活动。", "症状不向腿部远端扩散。", "减小范围", "增加到站立动作"),
      exercise("hip-active", "髋主动活动", ["hip-flexion", "hip-rotation"], "2组", "每方向10个", "仰卧滑脚、主动抱膝和坐姿内外旋。", "主动逐渐达到被动范围。", "缩小范围", "增加轻阻力"),
    ],
    rebuild: [
      exercise("back-dead-bug", "死虫", ["core"], "3组", "每侧8个", "仰卧屈髋屈膝，交替放下一只脚。", "腰部稳定、呼吸自然。", "只抬一只脚", "伸直腿或加手臂"),
      exercise("back-bird-dog", "鸟狗", ["core", "glute"], "3组", "每侧6个", "四点跪伸出对侧手脚。", "骨盆不旋转。", "只抬手或腿", "延长保持"),
      exercise("hip-split-squat", "分腿蹲", ["step", "glute", "single-leg"], "3组", "每侧8个", "前后站立，扶支撑垂直下蹲。", "髋膝足稳定，腰部不过度代偿。", "小幅并扶持", "加重量"),
      exercise("hip-side-walk", "侧向走", ["glute", "single-leg"], "3组", "每侧10步", "保持骨盆水平，小步侧移。", "臀外侧发力，不拖脚。", "不加弹力带", "弹力带移到脚踝"),
    ],
    return: [
      exercise("back-hinge", "髋铰链提物", ["hinge", "glute"], "3组", "每组8个", "物品靠近身体，从髋部折叠取放。", "动作和次日反应稳定。", "从高台取轻物", "降低高度或加重量"),
      exercise("hip-single-hinge", "单腿屈髋/硬拉", ["single-leg", "glute"], "3组", "每侧8个", "扶支撑单腿站，身体和后腿一起前倾。", "骨盆保持水平。", "脚尖点地", "不扶或加重量"),
      exercise("back-carry", "携物行走", ["carry", "core", "walk"], "3组", "每组40步", "单手或双手拿轻重量行走。", "躯干稳定，腿部症状不下移。", "减轻重量", "增加距离或重量"),
      exercise("hip-run-jump", "走跑与低幅跳跃", ["return", "walk", "single-leg"], "4轮", "每轮走2分钟＋慢跑1分钟", "日常动作稳定后再进入走跑；有运动目标再加低幅双脚跳。", "腰髋和次日反应稳定。", "只快走", "延长慢跑或加入方向变化"),
    ],
  },
};

export const FIRST_BATCH_MODULES: RehabModule[] = [knee, ankleFoot, lumbarHip];

export function inferModule(text: string): ModuleId | "" {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return "";
  let best: { id: ModuleId; score: number } | null = null;
  for (const module of FIRST_BATCH_MODULES) {
    const score = module.keywords.reduce((total, keyword) => total + (normalized.includes(keyword) ? keyword.length : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { id: module.id, score };
  }
  return best?.id ?? "";
}

