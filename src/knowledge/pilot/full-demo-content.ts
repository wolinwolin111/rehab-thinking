/**
 * RehabMind 完整 Demo 内容库。
 *
 * 这里的候选均表示“下一步值得检查或做单变量反应试验的方向”，
 * 不是疾病诊断，也不能用单个特殊测试替代影像或专业医学评估。
 */

export type FullRegionId =
  | "neck"
  | "shoulder"
  | "thoracic-rib"
  | "elbow"
  | "wrist-hand"
  | "lumbar-pelvis"
  | "hip-thigh"
  | "thigh-local"
  | "knee"
  | "calf-local"
  | "ankle-foot";

export type FullAssessmentKind = "direction" | "strength" | "function" | "special-test";
export type FullAccess = "self" | "coach" | "therapist";
export type FullCandidateType = "muscle" | "joint" | "control" | "neural" | "swelling";
export type FullExerciseStage = 1 | 2 | 3 | 4 | 5;

import { THIGH_LOCAL_REGION, CALF_LOCAL_REGION } from "@/src/knowledge/pilot/local-limb-regions";
import { type KnowledgeEvidenceLineage } from "@/src/knowledge/rehab/knee-p0-runtime";

export type FullAssessment = {
  id: string;
  title: string;
  kind: FullAssessmentKind;
  access: FullAccess;
  how: string;
  observe: string;
  tags: string[];
  trigger?: string;
  caution?: string;
  resultOptions?: string[];
  /** 面向普通用户的简短解释，只说明这个结果接下来会怎么用。 */
  explain?: string;
  /**
   * 页面检查契约：纯被动项目不能渲染主动活动或力量问题；
   * 组合项目才允许在同一动作后继续记录主动/力量与被动结果。
   */
  testMode?: "active" | "passive" | "combined";
};

/**
 * 首发膝踝模块的方向链。页面按链合并重复处理与复测，避免全阳性时
 * 把同一块肌肉和同一个动作拆成很多轮。
 */
export const DIRECTION_CHAINS: Record<string, string> = {
  "ankle-dorsiflexion": "矢状面·前侧链",
  "ankle-dorsiflexor": "矢状面·前侧链",
  "ankle-plantarflexion": "矢状面·后侧链",
  "ankle-calf": "矢状面·后侧链",
  "ankle-inversion": "额状面·内侧链",
  "ankle-invertor": "额状面·内侧链",
  "ankle-eversion": "额状面·外侧链",
  "ankle-evertor": "额状面·外侧链",
  "ankle-squat": "功能动作",
  "ankle-single-leg": "功能动作",
  "ankle-heel-raise": "功能动作",
  "knee-extension": "膝伸直链",
  "knee-quadriceps": "膝伸直链",
  "knee-flexion": "膝屈曲链",
  "knee-hamstring": "膝屈曲链",
  "knee-adductor-pes": "膝内侧链",
  "knee-glute": "髋膝稳定链",
  "knee-calf": "髋膝稳定链",
  "knee-foot-arch": "髋膝稳定链",
  "knee-squat": "功能动作",
  "knee-single-leg": "功能动作",
  "knee-heel-raise": "功能动作",
  "thigh-front-length": "大腿前侧局部链",
  "thigh-front-strength": "大腿前侧局部链",
  "thigh-back-length": "大腿后侧局部链",
  "thigh-back-strength": "大腿后侧局部链",
  "thigh-medial-length": "大腿内侧局部链",
  "thigh-medial-strength": "大腿内侧局部链",
  "thigh-lateral-load": "大腿外侧局部链",
  "thigh-lateral-strength": "大腿外侧局部链",
  "calf-dorsiflexion": "小腿前侧局部链",
  "calf-dorsiflexor-strength": "小腿前侧局部链",
  "calf-plantarflexion": "小腿后侧局部链",
  "calf-heel-raise-strength": "小腿后侧局部链",
  "calf-inversion": "小腿内侧局部链",
  "calf-invertor-strength": "小腿内侧局部链",
  "calf-eversion": "小腿外侧局部链",
  "calf-evertor-strength": "小腿外侧局部链",
};

export type FullCandidate = {
  id: string;
  title: string;
  type: FullCandidateType;
  access: FullAccess;
  do: string;
  observe: string;
  retest: string;
  tags: string[];
  /**
   * 这项处理完成后需要一起复测的活动方向。
   * 用活动检查的原始 id，不含页面层的 `motion:` 前缀。
   */
  retestIds?: string[];
  /** 面向用户的拆分展示字段；未提供时由页面使用区域和标题生成保守回退。 */
  siteLabel?: string;
  targetLabel?: string;
  actionLabel?: string;
  /** Internal owner-reviewed relation/finding lineage; never rendered to users. */
  knowledgeEvidence?: KnowledgeEvidenceLineage;
};

export type FullCandidateGroup = {
  id: string;
  title: string;
  match: {
    locations: string[];
    feelings: string[];
    actions: string[];
  };
  note: string;
  candidates: FullCandidate[];
};

export type FullExercise = {
  id: string;
  title: string;
  stage: FullExerciseStage;
  sets: string;
  reps: string;
  how: string;
  observe: string;
  easier: string;
  harder: string;
  tags: string[];
  startPosition: "仰卧" | "坐位" | "站立" | "四点跪" | "侧卧";
};

export type FullRegion = {
  id: FullRegionId;
  name: string;
  shortName: string;
  summary: string;
  keywords: string[];
  locations: string[];
  directions: FullAssessment[];
  strengths: FullAssessment[];
  functions: FullAssessment[];
  specialTests: FullAssessment[];
  /** 按处理对象去重的活动度处理库；未提供时沿用 candidateGroups。 */
  mobilityInterventions?: FullCandidate[];
  candidateGroups: FullCandidateGroup[];
  exercises: FullExercise[];
};

const DIRECTION_RESULTS = [
  "接近健侧，没有熟悉的不适",
  "范围接近健侧，但出现熟悉的不适",
  "患侧明显更少",
  "不敢或不能完成",
  "暂不测试",
];

const STRENGTH_RESULTS = [
  "接近健侧",
  "患侧较弱或较快疲劳",
  "发力时出现熟悉的不适",
  "无法判断",
  "暂不测试",
];

const SPECIAL_RESULTS = ["阴性", "阳性线索", "只有疼痛，无法判断", "未检查"];

const check = (
  id: string,
  title: string,
  kind: FullAssessmentKind,
  access: FullAccess,
  how: string,
  observe: string,
  tags: string[],
  extra: Pick<FullAssessment, "trigger" | "caution" | "resultOptions"> = {},
): FullAssessment => ({
  id,
  title,
  kind,
  access,
  how,
  observe,
  tags,
  explain: kind === "direction"
    ? "如果这个方向偏小或会不舒服，后面会先处理相关肌肉，再安排控制训练。"
    : kind === "strength"
      ? "如果这一项偏弱，后面会安排对应的力量和动作控制训练。"
      : kind === "function"
        ? "这项结果用来决定后面的日常动作训练重点。"
        : "出现提示信号时，先考虑进一步专业评估。",
  ...extra,
});

const direction = (
  id: string,
  title: string,
  how: string,
  observe: string,
  tags: string[],
  caution?: string,
): FullAssessment =>
  check(id, title, "direction", "self", how, observe, tags, {
    caution,
    resultOptions: DIRECTION_RESULTS,
  });

const strength = (
  id: string,
  title: string,
  how: string,
  observe: string,
  tags: string[],
  caution?: string,
): FullAssessment =>
  check(id, title, "strength", "self", how, observe, tags, {
    caution,
    resultOptions: STRENGTH_RESULTS,
  });

const functional = (
  id: string,
  title: string,
  how: string,
  observe: string,
  tags: string[],
  caution?: string,
): FullAssessment =>
  check(id, title, "function", "self", how, observe, tags, {
    caution,
    resultOptions: DIRECTION_RESULTS,
  });

const special = (
  id: string,
  title: string,
  access: FullAccess,
  trigger: string,
  how: string,
  observe: string,
  tags: string[],
  caution: string,
): FullAssessment =>
  check(id, title, "special-test", access, how, observe, tags, {
    trigger,
    caution,
    resultOptions: SPECIAL_RESULTS,
  });

const candidate = (
  id: string,
  title: string,
  type: FullCandidateType,
  access: FullAccess,
  doText: string,
  observe: string,
  retest: string,
  tags: string[],
  extra: Pick<FullCandidate, "retestIds" | "siteLabel" | "targetLabel" | "actionLabel"> = {},
): FullCandidate => ({ id, title, type, access, do: doText, observe, retest, tags, ...extra });

const exercise = (
  id: string,
  title: string,
  stage: FullExerciseStage,
  sets: string,
  reps: string,
  how: string,
  observe: string,
  easier: string,
  harder: string,
  tags: string[],
): FullExercise => {
  const text = `${title} ${how}`;
  const startPosition: FullExercise["startPosition"] = /侧卧|蚌式/.test(text)
    ? "侧卧"
    : /仰卧|平躺|躺下|臀桥|死虫|脚跟滑动/.test(text)
      ? "仰卧"
      : /四点|鸟狗/.test(text)
        ? "四点跪"
        : /坐姿|坐位|坐在|坐好|坐站/.test(text)
          ? "坐位"
          : "站立";
  return { id, title, stage, sets, reps, how, observe, easier, harder, tags, startPosition };
};

const neck: FullRegion = {
  id: "neck",
  name: "颈部",
  shortName: "颈",
  summary: "逐项比较颈部活动，并把转头、低头、抬头和上肢伴随症状连接到胸椎、肩胛及神经相关检查。",
  keywords: ["颈", "脖子", "落枕", "枕下", "转头", "头痛", "手麻"],
  locations: ["枕骨下方", "颈后正中", "颈侧", "颈肩交界", "肩胛骨内侧", "向手臂或手指放射"],
  directions: [
    direction("neck-flexion", "低头 / 前屈", "坐直，肩膀放松，缓慢把下巴靠近胸口，记录自己平时可用范围和症状出现位置。", "低头幅度、颈后牵扯位置、是否耸肩或弓背代偿。", ["flexion", "neck-rom"]),
    direction("neck-extension", "抬头 / 后伸", "坐直，眼睛沿天花板方向缓慢上移，不甩头，也不把躯干后仰。", "后伸幅度、后侧挤压或酸胀、头晕及躯干代偿。", ["extension", "neck-rom"], "出现头晕、视物异常、恶心或突然剧烈头痛时停止。"),
    direction("neck-rotation-left", "向左转头", "坐姿固定肩膀，缓慢向左转头，看下巴能到达的位置。", "与向右比较角度、熟悉症状和肩膀是否跟着转。", ["rotation-left", "neck-rom"]),
    direction("neck-rotation-right", "向右转头", "坐姿固定肩膀，缓慢向右转头，看下巴能到达的位置。", "与向左比较角度、熟悉症状和肩膀是否跟着转。", ["rotation-right", "neck-rom"]),
    direction("neck-sidebend-left", "向左侧屈", "保持鼻尖朝前，让左耳缓慢靠近左肩；肩膀不能主动抬起。", "左右差异、对侧牵扯或同侧挤压、躯干是否侧倒。", ["sidebend-left", "neck-rom"]),
    direction("neck-sidebend-right", "向右侧屈", "保持鼻尖朝前，让右耳缓慢靠近右肩；肩膀不能主动抬起。", "左右差异、对侧牵扯或同侧挤压、躯干是否侧倒。", ["sidebend-right", "neck-rom"]),
  ],
  strengths: [
    strength("neck-deep-flexor", "颈前侧低负荷控制", "仰卧做轻微点头，像把下巴向喉咙方向收回，保持5秒。", "是否很快抖动、屏气，或用力抬头代替轻点头。", ["deep-neck-flexor", "control"]),
    strength("neck-isometric", "颈部四向等长", "手掌轻抵前额、后脑和左右侧头部，各方向轻用力5秒，头部不移动。", "四个方向的发力感、保持能力及是否诱发原症状。", ["neck-isometric", "endurance"]),
    strength("neck-scapular", "肩胛胸廓控制", "站在墙前做小幅墙面滑手，保持颈部自然延长。", "是否耸肩、伸颈，肩胛是否能贴住胸廓平顺移动。", ["scapular-control", "upper-chain"]),
  ],
  functions: [
    functional("neck-turn-task", "转头查看侧后方", "坐姿或模拟驾驶，固定躯干后分别向两侧转头。", "能否看到目标、是否用躯干代偿，以及0～10分不适。", ["turning", "daily"]),
    functional("neck-screen-task", "低头与看屏幕", "模拟平时使用手机或电脑的姿势30秒，再回到中立位。", "症状出现时间、位置，回正后是否缓解；不把耐受问题要求当场消失。", ["screen", "endurance"]),
    functional("neck-arm-lift-task", "抬手时颈肩控制", "保持颈部自然，双臂缓慢举到舒适高度再放下。", "抬手是否伴随耸肩、伸颈、头偏向一侧或手臂麻感。", ["arm-lift", "scapular-control"]),
  ],
  specialTests: [
    special("neck-neural-screen", "上肢神经相关动作筛查", "coach", "颈肩不适伴手臂或手指麻、电感、放射时", "由熟悉测试者轻柔比较正中、尺、桡神经相关动作；只到轻微牵拉，不追求诱发明显麻感。", "症状分布是否与原主诉相同，以及降低张力后是否立刻减轻。", ["neural", "arm-symptom"], "不熟悉神经测试直接跳过；进行性感觉或肌力下降转专业评估。"),
    special("neck-first-rib-response", "第一肋与肩胛支持反应", "coach", "转头或抬手伴颈肩交界紧、上肢症状时", "受训者分别给予轻柔肩胛支持或检查第一肋位置，一次只改变一个变量后重复原动作。", "转头或抬手范围、0～10分及麻感范围是否可重复改变。", ["first-rib", "scapular-assist"], "这是反应试验，不凭一次改善认定第一肋为病因。"),
  ],
  candidateGroups: [
    {
      id: "neck-turn-limited",
      title: "转头或侧屈受限",
      match: { locations: ["颈侧", "颈肩交界", "枕骨下方"], feelings: ["酸", "紧", "牵扯", "卡"], actions: ["转头", "侧屈", "驾驶"] },
      note: "按活动方向和触诊选择第一组候选，每次只测试一个方向。",
      candidates: [
        candidate("neck-turn-muscles", "检查颈肩与枕下肌群", "muscle", "coach", "分别比较上斜方肌、肩胛提肌、斜角肌、胸锁乳突肌和枕下肌；选择最相关的一组做轻柔处理。", "不直接重压疼痛中心，观察肌肉支持后活动是否更轻松。", "保持相同坐姿与速度，重新向原受限方向转头。", ["rotation", "muscle-response"]),
        candidate("neck-turn-joint", "检查上颈椎、颈椎与胸椎活动", "joint", "therapist", "肌肉处理后被动仍受限时，根据受限方向做颈椎、上颈椎或胸椎关节松动。", "只处理一个节段或方向，避免快速颈椎操作。", "先复测被动方向，再复测主动转头及问题复现动作。", ["joint-mobility", "rotation"]),
        candidate("neck-turn-control", "训练新范围内的主动控制", "control", "self", "在刚获得的舒适范围内做慢速转头，末端停1秒后回正。", "肩膀和躯干不跟着转，症状不持续增加。", "比较处理前后角度、0～10分和代偿。", ["active-control", "rotation"]),
      ],
    },
    {
      id: "neck-extension-compression",
      title: "后仰时后侧挤压或酸胀",
      match: { locations: ["枕骨下方", "颈后正中", "颈肩交界"], feelings: ["挤", "卡", "酸胀"], actions: ["抬头", "后仰", "仰头工作"] },
      note: "先排除伴随头晕、视物异常等优先确认信号，再比较颈部和胸椎贡献。",
      candidates: [
        candidate("neck-extension-muscles", "检查枕下与颈后肌群", "muscle", "coach", "轻柔比较枕下肌、颈后肌和上斜方肌紧张；只处理一个区域。", "不强压上颈椎，不诱发头晕。", "相同幅度缓慢后仰，记录挤压出现角度与评分。", ["extension", "posterior-neck"]),
        candidate("neck-extension-thoracic", "检查胸椎伸展是否相关", "joint", "coach", "在胸椎得到支撑或做一次温和胸椎伸展后再抬头。", "颈部不主动加大后仰，比较胸椎调整能否改变症状。", "重复原抬头动作；没有变化就不继续扩大胸椎方向。", ["thoracic-extension", "response-test"]),
      ],
    },
    {
      id: "neck-radiating",
      title: "手麻、电感或向手臂放射",
      match: { locations: ["颈肩交界", "肩胛骨内侧", "向手臂或手指放射"], feelings: ["麻", "电感", "放射", "烧灼"], actions: ["抬手", "转头", "久坐"] },
      note: "优先记录症状分布、感觉和肌力趋势；候选用于检查神经通路相关因素，不表示神经损伤诊断。",
      candidates: [
        candidate("neck-radiating-space", "检查颈部、第一肋与胸肌空间", "muscle", "coach", "比较斜角肌、胸小肌、第一肋和肩胛位置；选择一处轻柔调整。", "麻感不能向更远端扩大，不能出现新的无力。", "复测轻柔原动作及麻木范围，不反复拉到症状末端。", ["neural", "first-rib", "chest"]),
        candidate("neck-radiating-glide", "温和神经滑动方向", "neural", "therapist", "由专业人员确定相关神经方向，采用一端放松、一端移动的滑动方式。", "只允许轻微牵拉，出现麻感加重或范围扩大立即停止。", "记录当场分布、当天稍后及次日反应。", ["neural-glide", "follow-up"]),
      ],
    },
  ],
  exercises: [
    exercise("neck-active-rom", "舒适范围颈部主动活动", 1, "2组", "每个方向每组6个", "坐直，选受限但可接受的方向缓慢活动，末端不硬顶。", "动作后症状应回到基线，不用躯干代偿。", "减小幅度，每组4个。", "增加到每组10个，或加入眼睛先转再转头。", ["neck-rom", "symptom-control"]),
    exercise("neck-deep-nod", "仰卧轻点头", 2, "3组", "每组8个，每个保持5秒", "仰卧枕薄毛巾，轻收下巴，保持后脑贴床。", "喉咙前侧不过度紧，不抬头、不屏气。", "每个保持3秒。", "改为靠墙站立保持，或延长到8秒。", ["deep-neck-flexor", "control"]),
    exercise("neck-wall-slide", "墙面滑手与颈肩协同", 3, "3组", "每组10个", "前臂贴墙向上滑，同时保持颈部自然延长。", "不耸肩、不伸颈；肩胛能平顺上回旋。", "降低滑动高度。", "加轻弹力带或离墙完成。", ["scapular-control", "arm-lift"]),
    exercise("neck-daily-turn", "日常转头渐进", 4, "3组", "每组左右各8个", "模拟驾驶或观察侧后方，逐渐增加可控转头幅度。", "每次速度一致，不甩头；训练后不持续反跳。", "坐姿小幅转头。", "站立加入视线目标或轻步行转头。", ["daily", "turning"]),
    exercise("neck-reactive-control", "视线转换与颈部反应控制", 5, "3组", "每组左右各6个", "按口令把视线和头部快速但可控地转向不同目标。", "每次都能稳定停住，不头晕、不失衡。", "先只转眼睛，再慢速转头。", "加入上肢任务或专项移动。", ["speed", "sport"]),
  ],
};

const shoulder: FullRegion = {
  id: "shoulder",
  name: "肩关节与肩胛",
  shortName: "肩",
  summary: "把肩关节各方向、肩胛动态稳定和肩袖能力放回抬手、摸背、推拉及支撑动作中验证。",
  keywords: ["肩", "肩胛", "抬手", "摸背", "肩袖", "夹挤", "游泳", "投掷"],
  locations: ["肩前方", "肩顶部", "肩外侧", "肩后侧", "肩胛骨周围", "向上臂放射"],
  directions: [
    direction("shoulder-flexion", "肩前屈", "仰卧或背靠墙，拇指朝上，手臂从前方举过头；先做健侧，再做患侧。", "手臂高度、疼痛弧、腰背代偿及肩胛是否平顺上回旋。", ["flexion", "overhead"]),
    direction("shoulder-extension", "肩后伸", "站直，手臂伸直向身后抬，不挺腰、不转身。", "两侧高度、肩前方牵扯、肩胛前倾或躯干代偿。", ["extension", "shoulder-rom"]),
    direction("shoulder-abduction", "肩外展", "背靠墙，掌心向前，手臂从侧面缓慢上举。", "疼痛出现与消失角度、耸肩、肩胛上回旋和躯干侧弯。", ["abduction", "painful-arc"]),
    direction("shoulder-internal-rotation", "肩内旋 / 摸背", "一手从身后向上摸背，比较双侧能到达的高度；不扭腰帮忙。", "手背高度、肩前倾、疼痛或后侧牵扯。", ["internal-rotation", "hand-behind-back"]),
    direction("shoulder-external-rotation", "肩外旋", "肘贴身体屈曲90度，前臂向外转；先做健侧，再做患侧。", "外旋角度、肘是否离开身体、前方或后方疼痛。", ["external-rotation", "rotator-cuff"]),
  ],
  strengths: [
    strength("shoulder-external-rotation-strength", "肩外旋力量", "肘贴身体屈90度，用另一只手给轻阻力，患侧前臂向外推5秒。", "与健侧比较力量、抖动和疼痛，不追求最大力量。", ["external-rotation", "rotator-cuff"]),
    strength("shoulder-internal-rotation-strength", "肩内旋力量", "肘贴身体屈90度，用另一只手给轻阻力，前臂向内推5秒。", "与健侧比较力量和前方疼痛。", ["internal-rotation", "subscapularis"]),
    strength("shoulder-abduction-strength", "肩外展保持", "手臂在肩胛平面抬到约30～60度，用另一只手轻轻向下压，保持5秒。", "能否稳定保持、是否耸肩或再现肩外侧疼痛。", ["abduction", "cuff", "deltoid"]),
    strength("shoulder-serratus", "前锯肌与肩胛贴胸", "双手扶墙做墙面推加：肘伸直，把胸口轻推离墙再回到中立。", "肩胛内侧缘是否翘起、颈肩是否代偿、两侧推力是否接近。", ["serratus", "scapular-control"]),
    strength("shoulder-row-control", "中下斜方肌与拉回控制", "用轻弹力带做划船，肘向后拉，肩胛自然靠近后再慢慢放回。", "不耸肩、不挺胸过度，肩胛移动是否对称。", ["mid-lower-trap", "scapular-control"]),
  ],
  functions: [
    functional("shoulder-overhead-task", "举手拿高处物品", "用空手或很轻物品，从胸前举到头顶可达高度再放回。", "上举和下放分开记录0～10分、夹挤阶段和肩胛代偿。", ["overhead", "daily"]),
    functional("shoulder-dress-task", "穿衣与摸背", "模拟穿外套、摸后脑和摸背三个动作，逐项比较两侧。", "哪个阶段受限，是否靠耸肩、弯腰或转身完成。", ["dressing", "internal-rotation"]),
    functional("shoulder-push-pull", "推与拉", "先做墙面推，再用轻弹力带拉；负荷和次数保持一致。", "推拉时疼痛、力量感及肩胛是否翘起或耸肩。", ["push", "pull", "scapular-control"]),
    functional("shoulder-support", "上肢支撑", "从墙面支撑开始，保持10秒；能无痛完成再尝试桌面支撑。", "腕、肘、肩和肩胛是否稳定，是否出现不稳或熟悉疼痛。", ["closed-chain", "support"], "急性摔伤、明显不稳或负重痛时不进阶支撑。"),
  ],
  specialTests: [
    special("shoulder-scapular-assistance", "肩胛辅助反应", "coach", "抬臂时疼痛、夹挤或耸肩明显", "受训者轻柔帮助肩胛上回旋和后倾，用户以相同速度重复抬臂。", "原疼痛评分、活动范围或动作顺畅度是否可重复改善。", ["scapular-assist", "overhead"], "阳性只表示肩胛方向值得继续检查，不等于诊断肩胛运动障碍。"),
    special("shoulder-empty-can", "空罐 / 满罐对比", "coach", "肩上方或外侧抬手痛，且当前可安全抗阻", "手臂在肩胛平面轻抬，先拇指朝上、再拇指略向下，各用很轻阻力比较。", "是否出现熟悉肩外侧疼痛或明显力量差；只痛不等于肌腱撕裂。", ["cuff", "abduction"], "急性外伤后抬不起手、明显无力或剧痛时跳过并提高专业检查优先级。"),
    special("shoulder-lift-off", "背手抬离测试", "self", "摸背受限或怀疑肩内旋相关能力不足，且手能安全放到腰后", "手背放在腰后，轻轻离开身体；先做健侧，再做患侧。", "患侧是否明显抬不离、很快掉回，或诱发熟悉疼痛。", ["subscapularis", "internal-rotation"], "不能完成起始姿势就记为未检查，不强拉到背后。"),
  ],
  candidateGroups: [
    {
      id: "shoulder-lateral-overhead",
      title: "肩外侧或顶部抬手痛",
      match: { locations: ["肩顶部", "肩外侧"], feelings: ["夹", "刺", "疼", "无力"], actions: ["抬手", "拿高处物品", "游泳", "投掷"] },
      note: "肩袖、肩胛和关节囊都是检查候选；根据辅助反应和活动结果排序。",
      candidates: [
        candidate("shoulder-overhead-muscles", "检查肩袖、三角肌与上斜方肌", "muscle", "coach", "比较肩袖、三角肌和上斜方肌紧张或压痛，选一个与疼痛阶段最相关区域做轻柔反应试验。", "不在疼痛中心持续重压，不同时处理多块肌肉。", "以相同速度和高度重新抬手，记录评分和疼痛弧。", ["cuff", "deltoid", "overhead"]),
        candidate("shoulder-scapular-control", "检查肩胛上回旋与贴胸", "control", "coach", "给予肩胛辅助或发力提示后重复抬手，比较是否减少耸肩或夹挤。", "肩胛不是始终夹紧下压，上举时需要上回旋。", "连续重复两次抬手，确认改善可以复现。", ["scapular-assist", "serratus"]),
        candidate("shoulder-posterior-joint", "检查后侧关节囊与肱骨位置", "joint", "therapist", "主动和被动都受限，且软组织处理改善不足时，由专业人员检查后侧关节囊和肩关节方向。", "一次只选择一个松动方向，不用疼痛换活动。", "先比较被动前屈/内旋，再复测主动抬手。", ["posterior-capsule", "joint-mobility"]),
      ],
    },
    {
      id: "shoulder-anterior",
      title: "肩前方疼、弹响或推时不适",
      match: { locations: ["肩前方"], feelings: ["刺", "弹响", "酸", "挤"], actions: ["前举", "推", "夹胸", "穿衣"] },
      note: "优先检查疼痛出现阶段、肱骨位置和肩胛支持；弹响无痛时不单独标记问题。",
      candidates: [
        candidate("shoulder-anterior-muscles", "检查肱二头肌长头、胸肌和肩胛下肌", "muscle", "coach", "分别比较前侧肌肉触诊和轻柔屏蔽反应，一次选择一个区域。", "不直接把压痛等同于肌腱损伤。", "重复原前举或推的相同负荷动作。", ["anterior-shoulder", "biceps", "chest"]),
        candidate("shoulder-humeral-position", "检查肱骨位置与肩袖控制", "control", "coach", "轻柔调整肱骨位置或用低负荷肩袖等长后，重复原动作。", "避免把肩膀强行向后夹；只看原动作是否改变。", "比较0～10分、弹响阶段和发力感。", ["humeral-position", "cuff-control"]),
      ],
    },
    {
      id: "shoulder-posterior-internal-rotation",
      title: "肩后侧牵扯或摸背受限",
      match: { locations: ["肩后侧", "肩胛骨周围"], feelings: ["扯", "紧", "卡"], actions: ["摸背", "横抱", "前屈"] },
      note: "主动受限但被动接近健侧时偏向控制；两者都受限再进入肌肉与关节共同路径。",
      candidates: [
        candidate("shoulder-posterior-muscles", "检查后侧肩袖与背阔肌", "muscle", "coach", "比较后侧肩袖、背阔肌和肩胛提肌，只对相关区域做轻柔处理。", "保持肩胛稳定，不通过扭腰制造假改善。", "复测摸背高度、水平内收和原动作。", ["posterior-shoulder", "lat"]),
        candidate("shoulder-ir-joint", "检查后侧关节囊", "joint", "therapist", "肌肉处理后被动内旋仍明显受限时，由专业人员检查并选择肩关节囊松动。", "不在急性高刺激期强推末端。", "先复测被动内旋，再复测主动摸背。", ["internal-rotation", "posterior-capsule"]),
      ],
    },
    {
      id: "shoulder-radiating",
      title: "向手臂放射、麻或电感",
      match: { locations: ["肩胛骨周围", "向上臂放射"], feelings: ["麻", "电感", "放射"], actions: ["抬手", "久坐", "转头"] },
      note: "补查颈部、第一肋、胸肌和神经相关表现，不能只检查肩袖。",
      candidates: [
        candidate("shoulder-radiating-chain", "检查颈肩—第一肋—神经路径", "neural", "therapist", "记录感觉分布和肌力趋势，轻柔比较颈部、第一肋、胸肌和神经动作。", "症状不能向远端扩大，出现进行性无力停止普通路径。", "复测麻感范围和轻柔原动作，并记录次日变化。", ["neural", "cervical", "first-rib"]),
      ],
    },
  ],
  exercises: [
    exercise("shoulder-assisted-flexion", "仰卧主动抬手", 1, "3组", "每组10个", "仰卧，双手可借助木棍，把患侧带到舒适范围，再主动控制放下。", "不耸肩、不挺腰，范围内症状可接受。", "减小高度或用健侧更多协助。", "坐姿或站姿主动抬手。", ["flexion", "available-rom"]),
    exercise("shoulder-side-lying-er", "侧卧肩外旋", 2, "3组", "每组10个", "侧卧，患侧肘贴身体屈90度，前臂缓慢向上转再慢慢放下。", "肘不离开身体，肩前方不过度顶出。", "不加重量，减小范围。", "手持轻哑铃或弹力带外旋。", ["rotator-cuff", "external-rotation"]),
    exercise("shoulder-wall-slide-plus", "墙面滑手加前锯肌控制", 2, "3组", "每组12个", "前臂贴墙向上滑，到可控高度后轻推墙，再缓慢回落。", "肩胛贴胸并上回旋，不耸肩夹颈。", "只做墙面推加，不向上滑。", "前臂套轻弹力带或用滚筒滑墙。", ["serratus", "scapular-control"]),
    exercise("shoulder-quadruped-shift", "四点跪重心转移", 3, "3组", "每组前后左右各8个", "四点跪保持肘伸直，身体小幅向前后左右移动。", "肩胛不塌陷、不翼状，颈部保持自然。", "改为墙面或桌面重心转移。", "加入单手触肩或轻扰动。", ["closed-chain", "dynamic-stability"]),
    exercise("shoulder-carry-reach", "提物与高处拿取", 4, "3组", "每组8个", "用可控重量从腰侧提起，走几步后放到胸口或肩高位置。", "躯干不侧弯，肩胛与肱骨协同，症状不增加。", "减轻重量或降低放置高度。", "增加距离、重量或过顶高度，一次只加一项。", ["carry", "reach", "daily"]),
    exercise("shoulder-catch-throw", "轻球接抛与减速", 5, "4组", "每组6个", "从胸前轻抛接球，逐渐过渡到肩高或90/90位的短距离接抛。", "接球时能控制减速，不耸肩、不出现不稳。", "双手胸前接抛。", "增加速度、距离或专项投掷角度。", ["speed", "overhead", "sport"]),
  ],
};

const thoracicRib: FullRegion = {
  id: "thoracic-rib",
  name: "胸椎与肋骨",
  shortName: "胸椎",
  summary: "比较胸椎伸展、旋转、侧屈和呼吸活动，并用转体、抬手或呼吸动作确认它是否真正影响主诉。",
  keywords: ["胸椎", "上背", "肋骨", "肩胛内侧", "转体", "呼吸", "胸闷"],
  locations: ["上背正中", "肩胛骨内侧", "胸廓侧面", "胸前肋骨", "胸腰交界", "第一肋附近"],
  directions: [
    direction("thoracic-extension", "胸椎伸展", "坐在有靠背的椅子上，双手抱头，骨盆保持不动，让上背轻轻越过椅背伸展。", "上背伸展幅度、腰椎是否代偿、是否出现原卡顿或肋骨痛。", ["thoracic-extension", "upper-back"]),
    direction("thoracic-rotation-left", "胸椎向左旋转", "坐姿双臂交叉抱胸，夹住膝盖固定骨盆，向左转动上半身。", "与右侧比较角度、肩膀高度、骨盆是否跟着转及熟悉症状。", ["rotation-left", "thoracic-rom"]),
    direction("thoracic-rotation-right", "胸椎向右旋转", "坐姿双臂交叉抱胸，夹住膝盖固定骨盆，向右转动上半身。", "与左侧比较角度、肩膀高度、骨盆是否跟着转及熟悉症状。", ["rotation-right", "thoracic-rom"]),
    direction("thoracic-sidebend-left", "胸椎向左侧屈", "坐直，骨盆不动，左肩向左侧缓慢下降，避免同时旋转。", "左右差异、同侧挤压或对侧牵扯及骨盆移动。", ["sidebend-left", "thoracic-rom"]),
    direction("thoracic-sidebend-right", "胸椎向右侧屈", "坐直，骨盆不动，右肩向右侧缓慢下降，避免同时旋转。", "左右差异、同侧挤压或对侧牵扯及骨盆移动。", ["sidebend-right", "thoracic-rom"]),
  ],
  strengths: [
    strength("thoracic-extension-control", "胸椎伸展保持", "俯卧或坐姿挺起上背，保持5秒，腰部只保持自然位置。", "是否主要靠腰椎后仰、颈部抬头或屏气完成。", ["thoracic-extensor", "postural-control"]),
    strength("thoracic-rotation-control", "躯干抗旋转", "站立双手在胸前拉住弹力带，保持胸骨朝前5秒，左右比较。", "骨盆和胸廓能否保持对齐，是否向一侧更容易转动。", ["anti-rotation", "core"]),
    strength("thoracic-scapular", "肩胛胸廓协同", "做轻弹力带划船或墙面滑手，观察肩胛在胸廓上的移动。", "肩胛是否贴胸、能否上回旋，以及上背症状是否出现。", ["scapular-control", "upper-chain"]),
  ],
  functions: [
    functional("thoracic-turn-task", "坐姿或站姿转体", "固定骨盆，向左右转体，模拟回头、挥拍或转身拿物。", "左右角度、0～10分、呼吸是否受限和腰椎代偿。", ["turning", "daily"]),
    functional("thoracic-overhead-task", "抬手时胸椎参与", "背靠墙缓慢举手，比较自然动作和上背轻伸展后的动作。", "胸椎调整是否让抬手更顺或减少肩胛内侧症状。", ["overhead", "shoulder-chain"]),
    functional("thoracic-breath-task", "深呼吸与胸廓扩张", "双手环抱下胸廓，连续做3次缓慢深呼吸。", "左右扩张是否接近，吸气或呼气哪个阶段出现局部疼痛。", ["breathing", "rib"]),
  ],
  specialTests: [
    special("thoracic-rib-expansion", "胸廓扩张比较", "coach", "肋骨局部不适与呼吸、咳嗽或转体相关时", "软尺可用时在同一胸廓水平测平静呼气末与深吸气末；无工具时用双手轻贴比较左右扩张。", "一侧明显少、深吸气再现熟悉局部症状，或呼吸幅度明显受限。", ["rib-expansion", "breathing"], "胸痛伴呼吸困难、胸闷、出冷汗或近期明显外伤时不继续普通康复测试。"),
    special("thoracic-seated-rotation-fix", "骨盆固定旋转对比", "self", "转体、抬手或颈部转动时怀疑胸椎参与", "先自然转体，再夹住膝盖固定骨盆重复；两次速度与幅度要求相同。", "固定骨盆后胸椎角度明显不对称，且再现熟悉症状。", ["thoracic-rotation", "differentiation"], "只作为胸椎相关线索；左右差异但无症状不自动生成处理。"),
  ],
  candidateGroups: [
    {
      id: "thoracic-turn-limited",
      title: "转体时上背卡或牵扯",
      match: { locations: ["上背正中", "肩胛骨内侧", "胸腰交界"], feelings: ["卡", "扯", "酸", "紧"], actions: ["转体", "回头", "挥拍"] },
      note: "只有胸椎方向能改变问题复现动作时，才把它升为本次重点。",
      candidates: [
        candidate("thoracic-turn-muscles", "检查竖脊肌、菱形肌与背阔肌", "muscle", "coach", "按症状位置选择一组肌肉轻柔处理，不同时覆盖整片背部。", "避免直接重压棘突或锐痛点。", "固定骨盆，以相同速度复测原转体。", ["thoracic-rotation", "muscle-response"]),
        candidate("thoracic-turn-joint", "检查胸椎与相邻肋骨活动", "joint", "therapist", "主动和被动方向都受限、肌肉处理变化不足时，由专业人员检查胸椎分节或肋骨活动。", "一次只处理一个方向，局部锐痛或呼吸痛增加时停止。", "先复测胸椎旋转，再复测原颈肩或运动动作。", ["thoracic-joint", "rib"]),
        candidate("thoracic-turn-control", "训练骨盆固定下旋转控制", "control", "self", "在可用范围做四点跪或坐姿旋转，保持骨盆不跟随。", "范围不必大，重点是胸廓与骨盆分离。", "复测左右角度、代偿和主诉评分。", ["rotation-control", "core"]),
      ],
    },
    {
      id: "thoracic-overhead-extension",
      title: "抬手时上背伸不开或肩胛内侧不适",
      match: { locations: ["上背正中", "肩胛骨内侧"], feelings: ["卡", "酸", "夹"], actions: ["抬手", "拿高处物品", "划水"] },
      note: "先区分肩关节、肩胛和胸椎；胸椎改善但抬手不变时不继续扩大该方向。",
      candidates: [
        candidate("thoracic-overhead-muscles", "检查胸肌、背阔肌和肩胛周围", "muscle", "coach", "分别比较胸大/小肌、背阔肌与菱形肌的反应，选一个区域处理。", "不把姿势外观本身当成问题。", "做相同高度和速度的抬手，记录肩胛内侧症状。", ["overhead", "lat", "chest"]),
        candidate("thoracic-overhead-extension", "检查胸椎伸展支持", "joint", "coach", "用卷毛巾或椅背提供温和胸椎伸展后重新抬手。", "腰部保持自然，不用大幅后仰制造高度。", "比较抬手范围、夹挤评分与肩胛动作。", ["thoracic-extension", "response-test"]),
      ],
    },
    {
      id: "thoracic-rib-pain",
      title: "呼吸或局部转体时肋骨痛",
      match: { locations: ["胸廓侧面", "胸前肋骨", "第一肋附近"], feelings: ["刺", "痛", "牵扯"], actions: ["深呼吸", "咳嗽", "转体"] },
      note: "先确认外伤、呼吸和全身信号；普通候选只适用于已排除优先医学问题的低刺激情况。",
      candidates: [
        candidate("thoracic-rib-breath", "检查呼吸与胸廓控制", "control", "coach", "用手掌轻贴胸廓，引导缓慢呼吸到不痛范围，比较不同姿势。", "不强行深吸气，不反复刺激局部锐痛。", "比较同一呼吸深度或轻转体动作的评分。", ["breathing", "rib-control"]),
        candidate("thoracic-rib-joint", "检查肋骨与胸椎活动方向", "joint", "therapist", "由专业人员在医学问题已排除后检查相关肋骨与胸椎活动。", "近期骨折、骨质风险或呼吸症状时不用手法试验。", "复测呼吸、转体和原上肢动作。", ["rib", "professional"]),
      ],
    },
  ],
  exercises: [
    exercise("thoracic-open-book", "侧卧翻书", 1, "2组", "每侧每组8个", "侧卧屈髋屈膝，双手叠放，顶侧手臂随胸廓打开再回到起点。", "膝盖保持叠放，呼吸自然，不追求手碰地。", "减小打开幅度。", "手持轻物或增加末端呼吸。", ["thoracic-rotation", "available-rom"]),
    exercise("thoracic-extension-roll", "卷毛巾胸椎伸展", 2, "3组", "每组8个", "坐姿把卷毛巾放在上背，双手抱头，围绕毛巾轻伸展再回正。", "腰椎不明显后仰，颈部放松。", "毛巾变薄、幅度减小。", "在不同胸椎高度分段完成。", ["thoracic-extension", "control"]),
    exercise("thoracic-bird-dog", "鸟狗与躯干控制", 3, "3组", "每侧每组8个", "四点跪，伸出对侧手脚，停2秒后缓慢收回。", "骨盆和胸廓不过度旋转，肩胛不塌陷。", "只伸一只手或一条腿。", "增加停留时间或轻阻力。", ["core", "scapular-control"]),
    exercise("thoracic-carry-turn", "提物转身", 4, "3组", "每侧每组8个", "双手持轻物靠近胸前，用脚步配合完成转身和放置。", "胸椎、骨盆和脚步连续协同，不突然扭腰。", "空手小范围转身。", "增加物品重量或转身范围。", ["daily", "carry", "turn"]),
    exercise("thoracic-rotational-throw", "轻球旋转传递", 5, "4组", "每侧每组6个", "站立把轻球从一侧髋部传到对侧胸前，逐渐增加速度。", "力量从脚—髋—躯干—手臂连续传递，不在胸椎单点猛扭。", "慢速无球转体。", "增加速度、距离或专项方向。", ["rotation", "power", "sport"]),
  ],
};

const elbow: FullRegion = {
  id: "elbow",
  name: "肘关节",
  shortName: "肘",
  summary: "检查屈伸和前臂旋转，把局部力量与握持、提物、推拉和投掷任务连接起来。",
  keywords: ["肘", "网球肘", "高尔夫球肘", "伸不直", "前臂", "小指麻", "提物"],
  locations: ["肘外侧", "肘内侧", "肘前方", "肘后方", "前臂外侧", "向小指或手掌放射"],
  directions: [
    direction("elbow-flexion", "肘屈曲", "上臂贴身体，掌心朝上，慢慢弯肘让手靠近肩膀。", "两侧角度、肘前或后方疼痛、肩膀是否前移。", ["elbow-flexion"]),
    direction("elbow-extension", "肘伸直", "上臂贴身体，掌心向前，缓慢把肘伸直到自然末端。", "两侧末端角度、肘窝间隙、疼痛及肩膀是否代偿。", ["elbow-extension"]),
    direction("elbow-pronation", "前臂旋前", "肘贴身体屈90度，手握轻棒或拇指朝上，把掌心缓慢转向下。", "旋转角度、肘是否离开身体、前臂或腕部症状。", ["pronation", "forearm"]),
    direction("elbow-supination", "前臂旋后", "肘贴身体屈90度，手握轻棒或拇指朝上，把掌心缓慢转向上。", "旋转角度、肘是否离开身体、前臂或腕部症状。", ["supination", "forearm"]),
  ],
  strengths: [
    strength("elbow-flexor-strength", "屈肘力量", "肘屈90度，掌心向上，用另一只手轻压前臂，患侧保持5秒。", "与健侧比较力量，肘前或前臂是否疼。", ["biceps", "brachioradialis"]),
    strength("elbow-extensor-strength", "伸肘力量", "肘微屈，用另一只手抵住前臂，患侧尝试伸直并保持5秒。", "肱三头肌发力、抖动和肘后疼痛。", ["triceps", "extension"]),
    strength("elbow-wrist-extensor-strength", "腕伸肌群", "前臂放桌上掌心向下，手腕抬起，另一只手给轻阻力5秒。", "肘外侧是否出现熟悉疼痛，患侧是否较弱。", ["wrist-extensor", "lateral-elbow"]),
    strength("elbow-flexor-pronator-strength", "屈腕—旋前肌群", "前臂放桌上掌心向上，分别做屈腕和旋前轻抗阻。", "肘内侧疼痛、力量和动作控制。", ["flexor-pronator", "medial-elbow"]),
  ],
  functions: [
    functional("elbow-grip-lift", "握持与提物", "用固定重量的水瓶，保持相同握法从桌面提起并放下5次。", "疼痛出现阶段、握力感和是否靠耸肩或甩腕完成。", ["grip", "lift"]),
    functional("elbow-push-task", "推门或墙面推", "先做墙面推5次，保持手腕中立和肩胛稳定。", "伸肘末端、肘内外侧疼痛及肩胛代偿。", ["push", "closed-chain"]),
    functional("elbow-throw-task", "投掷分解", "无负重模拟慢速投掷，分别观察准备、加速和减速阶段。", "肘内外侧症状出现阶段，以及肩、腕和躯干是否协同。", ["throw", "sport"], "急性外翻伤或明显不稳时不做投掷测试。"),
  ],
  specialTests: [
    special("elbow-resisted-wrist-extension", "抗阻伸腕反应", "self", "肘外侧在握物、鼠标或球拍动作时疼", "前臂放桌面，手腕轻抬，用另一只手给逐渐增加的轻阻力，保持3秒。", "是否准确再现熟悉的肘外侧疼痛，并比较健侧力量。", ["lateral-elbow", "wrist-extensor"], "只作负荷相关线索，不凭阳性确认肌腱病；急性剧痛时跳过。"),
    special("elbow-resisted-pronation", "抗阻屈腕 / 旋前反应", "coach", "肘内侧在握物或投掷时疼", "肘屈90度，分别做轻抗阻屈腕和前臂旋前。", "是否再现熟悉内侧疼痛；麻电感要单独记录。", ["medial-elbow", "flexor-pronator"], "急性外翻受伤、明显肿胀或不稳时不强测。"),
    special("elbow-ulnar-neural", "尺神经相关动作", "coach", "肘内侧电感或小指、无名指麻", "由熟悉者在轻柔范围比较肘屈曲、腕位和肩位变化对症状分布的影响。", "症状是否沿小指侧再现，降低张力后能否缓解。", ["ulnar-nerve", "neural"], "不反复诱发麻感；持续感觉减退或手部无力需专业评估。"),
  ],
  candidateGroups: [
    {
      id: "elbow-lateral",
      title: "肘外侧握物或提物痛",
      match: { locations: ["肘外侧", "前臂外侧"], feelings: ["酸", "刺", "胀", "无力"], actions: ["握物", "提物", "球拍", "鼠标"] },
      note: "腕伸肌、肱桡肌、前臂旋转和肩胛能力均为候选，按抗阻和功能反应排序。",
      candidates: [
        candidate("elbow-lateral-muscles", "检查腕伸肌群与肱桡肌", "muscle", "coach", "比较腕伸肌、肱桡肌和前臂外侧触诊及低负荷等长反应。", "只处理一组，避免在外上髁痛点反复重压。", "用相同重量和握法重新提物。", ["lateral-elbow", "wrist-extensor"]),
        candidate("elbow-lateral-joint", "检查桡尺关节与前臂旋转", "joint", "therapist", "旋前旋后同时受限时，由专业人员检查近端桡尺关节和肘关节活动。", "关节调整保持轻柔，不能用弹响判断有效。", "复测旋转，再复测握物或提物。", ["radioulnar", "pronation", "supination"]),
        candidate("elbow-lateral-load", "选择可耐受的腕伸肌负荷", "control", "self", "从等长、向心或慢放中选症状最可接受的一种，先做一组。", "完成后症状不持续上升，动作质量稳定。", "记录第一组与次日反应，不要求当场力量变强。", ["loading", "wrist-extensor"]),
      ],
    },
    {
      id: "elbow-medial",
      title: "肘内侧疼或投掷不适",
      match: { locations: ["肘内侧"], feelings: ["痛", "牵扯", "不稳"], actions: ["投掷", "握物", "屈腕"] },
      note: "先区分反复负荷和急性外翻伤；急性不稳不进入普通松解训练。",
      candidates: [
        candidate("elbow-medial-muscles", "检查屈肌—旋前肌群", "muscle", "coach", "比较屈腕、旋前发力和肌肉触诊，选择一处轻柔松解。", "不直接重压尺神经沟。", "复测相同握物或慢速投掷分解。", ["flexor-pronator", "medial-elbow"]),
        candidate("elbow-medial-stability", "检查内侧稳定与投掷负荷", "joint", "therapist", "急性机制、明显不稳或投掷末端痛时，由专业人员检查内侧稳定结构和整个投掷链。", "不由普通用户自行做外翻应力测试。", "根据专业结论决定是否继续负荷或影像确认。", ["medial-stability", "throw"]),
      ],
    },
    {
      id: "elbow-extension-limited",
      title: "肘伸不直或末端痛",
      match: { locations: ["肘前方", "肘后方"], feelings: ["卡", "紧", "痛"], actions: ["伸肘", "推", "支撑"] },
      note: "主动受限但被动接近健侧偏向控制；主动被动都受限再检查肌肉、肿胀和关节。",
      candidates: [
        candidate("elbow-extension-muscles", "检查肱二头、肱桡肌与肱三头肌", "muscle", "coach", "按疼痛位置比较前后侧肌肉，轻柔处理一组后复测。", "术后或急性损伤遵守医嘱，不强推末端。", "先复测被动伸肘，再主动伸肘和墙面推。", ["elbow-extension", "muscle-response"]),
        candidate("elbow-extension-joint", "检查肘关节伸直方向", "joint", "therapist", "软组织处理后被动仍明显受限时，根据受限方向做肘关节松动。", "出现锐痛、硬性阻挡或明显肿胀不继续。", "比较被动末端、主动末端和原功能动作。", ["joint-mobility", "extension"]),
      ],
    },
    {
      id: "elbow-neural",
      title: "肘内侧电感或手指麻",
      match: { locations: ["肘内侧", "向小指或手掌放射"], feelings: ["麻", "电感", "放射"], actions: ["屈肘", "打电话", "睡觉"] },
      note: "检查尺神经全路径和感觉肌力趋势，不把肘部单点压痛当作完整解释。",
      candidates: [
        candidate("elbow-neural-path", "检查尺神经相关路径", "neural", "therapist", "比较颈肩、第一肋、肘和腕位对症状的影响，选择温和滑动而非拉伸。", "麻感不向远端扩大，不出现新的抓握无力。", "记录症状范围、持续时间和次日反应。", ["ulnar-nerve", "neural-glide"]),
      ],
    },
  ],
  exercises: [
    exercise("elbow-active-motion", "肘屈伸与前臂旋转", 1, "2组", "每个方向每组10个", "上臂贴身体，分别做屈伸、旋前和旋后，动作慢而完整。", "不甩动，不借肩膀代偿；训练后症状回到基线。", "减小范围，每组6个。", "手持轻棒增加控制要求。", ["elbow-rom", "forearm-rom"]),
    exercise("elbow-wrist-isometric", "腕伸或屈腕等长", 2, "3组", "每组5次，每次10秒", "选择检查中耐受较好的方向，用另一只手提供不产生动作的轻阻力。", "疼痛可接受且不逐次增加，呼吸自然。", "减小用力或保持5秒。", "增加到15秒或改轻弹力带动态训练。", ["forearm-strength", "isometric"]),
    exercise("elbow-grip-row", "握持与划船协同", 3, "3组", "每组10个", "握住轻弹力带做划船，同时保持腕中立、肘沿身体两侧移动。", "不耸肩、不折腕，肘部症状稳定。", "减轻握力或用更轻弹力带。", "加重或改为分腿站姿。", ["grip", "pull", "upper-chain"]),
    exercise("elbow-carry-push", "提物与墙面推", 4, "3组", "每项每组8个", "用可控重量提物行走，再做墙面推，分别记录反应。", "腕肘肩保持一条稳定力传导链。", "减轻重量或减少墙面倾斜。", "增加距离或转桌面推。", ["carry", "push", "daily"]),
    exercise("elbow-throw-return", "投掷与减速进阶", 5, "4组", "每组6个", "从短距离轻球双手传递开始，再过渡到单手慢速投掷。", "发力和减速都可控，肘内外侧不出现不稳。", "只做无球投掷分解。", "逐渐增加距离、速度或专项次数。", ["throw", "speed", "sport"]),
  ],
};

const wristHand: FullRegion = {
  id: "wrist-hand",
  name: "腕与手",
  shortName: "腕手",
  summary: "逐项检查腕、前臂和拇指活动，从轻握与共同收缩进阶到旋拧、提物、撑地和专项操作。",
  keywords: ["手腕", "手", "拇指", "鼠标", "TFCC", "尺侧", "撑地", "握力"],
  locations: ["拇指侧 / 桡侧", "小指侧 / 尺侧", "腕背侧", "腕掌侧", "拇指根部", "手指或掌心"],
  directions: [
    direction("wrist-flexion", "腕屈曲", "前臂放桌上，手伸出桌边，掌心向下，让手掌向下弯。", "两侧角度、腕背或掌侧疼痛、手指是否紧握代偿。", ["wrist-flexion"]),
    direction("wrist-extension", "腕背伸", "前臂放桌上，手伸出桌边，掌心向下，把手背向上抬。", "两侧角度、腕背卡痛和手指代偿；另记录负重时是否不同。", ["wrist-extension"]),
    direction("wrist-radial-deviation", "腕桡偏", "前臂和掌心贴桌，手向拇指侧移动，不抬起前臂。", "桡侧角度、拇指侧疼痛及前臂是否旋转。", ["radial-deviation"]),
    direction("wrist-ulnar-deviation", "腕尺偏", "前臂和掌心贴桌，手向小指侧移动，不抬起前臂。", "尺侧角度、尺侧疼痛及前臂是否旋转。", ["ulnar-deviation"]),
    direction("wrist-pronation", "前臂旋前", "肘贴身体屈90度，手握笔，缓慢把掌心转向下。", "与健侧比较角度、尺桡侧症状和肘是否外移。", ["pronation", "forearm"]),
    direction("wrist-supination", "前臂旋后", "肘贴身体屈90度，手握笔，缓慢把掌心转向上。", "与健侧比较角度、尺桡侧症状和肘是否外移。", ["supination", "forearm"]),
  ],
  strengths: [
    strength("wrist-grip", "握力", "用相同软球或卷毛巾，左右分别用约七成力握5秒。", "患侧力量、疼痛位置、是否很快疲劳或用肩膀代偿。", ["grip", "hand-strength"]),
    strength("wrist-flex-ext-strength", "腕屈伸力量", "前臂有支撑，用另一只手分别给屈腕和伸腕轻阻力，保持5秒。", "与健侧比较力量及腕背、掌侧或肘部症状。", ["wrist-flexor", "wrist-extensor"]),
    strength("wrist-deviation-strength", "桡偏与尺偏力量", "前臂放桌上，另一只手从拇指侧和小指侧给轻阻力。", "左右方向力量、稳定性和局部疼痛。", ["radial-deviation", "ulnar-deviation"]),
    strength("wrist-thumb-strength", "拇指外展与对掌", "拇指向掌面外抬，再与小指对碰；另一只手给予轻阻力。", "拇指根部或桡侧痛、动作幅度和与健侧的力量差。", ["thumb", "thenar"]),
  ],
  functions: [
    functional("wrist-mouse-task", "鼠标与拇指操作", "模拟平时鼠标、滑屏或点赞动作30秒，保持平常速度。", "症状出现时间、手腕位置及是否过度抬腕或夹紧拇指。", ["mouse", "thumb", "endurance"]),
    functional("wrist-twist-task", "拧毛巾或开瓶盖", "用干毛巾或空瓶盖，以固定握法轻旋拧3次。", "尺桡侧疼痛、旋前旋后范围和握力感。", ["twist", "grip"]),
    functional("wrist-support-task", "墙面支撑", "双手扶墙，腕背伸到可接受角度，身体小幅前移并保持5秒。", "左右负重、腕背或尺侧疼痛及肩胛稳定。", ["support", "closed-chain"], "急性摔撑、明显肿胀或不稳时跳过。"),
    functional("wrist-carry-task", "提与搬", "用固定重量水瓶，腕保持中立，完成提起、行走和放下。", "握力、腕位、肘肩代偿和症状出现阶段。", ["carry", "grip", "daily"]),
  ],
  specialTests: [
    special("wrist-finkelstein-gentle", "拇指侧牵拉反应", "self", "拇指侧或桡骨茎突在滑屏、抓握时疼", "拇指轻放掌内，手指松松包住，再把腕部小幅向小指侧移动；先比较健侧。", "患侧准确再现熟悉的拇指侧疼痛。", ["radial-wrist", "thumb-tendon"], "不要强压末端；出现熟悉症状时继续检查拇指肌腱。"),
    special("wrist-press-test", "轻支撑 / 椅面按压反应", "self", "尺侧腕痛与撑起、推椅或提物相关，且能安全负重", "先在桌面用双手轻按逐渐增加负重，不直接做完整撑起。", "尺侧腕出现熟悉疼痛或明显不稳感。", ["ulnar-wrist", "load"], "急性摔撑、持续肿胀或明显不稳时跳过并优先专业检查。"),
    special("wrist-druj-screen", "远端尺桡关节稳定检查", "therapist", "尺侧腕痛伴旋前旋后痛、弹动或不稳", "由专业人员比较远端尺桡关节稳定、琴键样表现及旋转负荷。", "患侧稳定性或症状与健侧明显不同。", ["druj", "tfcc"], "普通用户不自行反复推压；结果只用于进一步检查方向。"),
  ],
  candidateGroups: [
    {
      id: "wrist-radial-thumb",
      title: "拇指侧或桡侧疼",
      match: { locations: ["拇指侧 / 桡侧", "拇指根部"], feelings: ["刺", "酸", "牵扯"], actions: ["鼠标", "滑屏", "点赞", "抓握"] },
      note: "拇指肌腱、鱼际、第一腕掌关节和前臂桡侧均为候选，按动作反应排序。",
      candidates: [
        candidate("wrist-radial-muscles", "检查拇指肌腱、鱼际与前臂桡侧", "muscle", "coach", "轻柔比较拇指外展/伸展相关组织和前臂桡侧肌群，选择一组反应试验。", "避免沿疼痛肌腱反复摩擦或重压。", "重复相同的拇指、鼠标或抓握动作。", ["thumb", "radial-wrist"]),
        candidate("wrist-thumb-joint", "检查拇指与腕骨活动", "joint", "therapist", "主动和被动都受限、肌肉处理变化不足时，由专业人员检查第一腕掌关节与相关腕骨。", "关节松动不用弹响或疼痛判断效果。", "先复测拇指活动，再复测原操作动作。", ["thumb-joint", "carpal"]),
        candidate("wrist-thumb-control", "训练拇指低负荷控制", "control", "self", "在无明显疼痛范围做拇指外展、对掌与轻握放。", "手腕保持中立，拇指不突然弹回。", "比较操作耐受，力量变化留待下次复查。", ["thumb-control", "grip"]),
      ],
    },
    {
      id: "wrist-ulnar",
      title: "尺侧腕痛或旋拧不适",
      match: { locations: ["小指侧 / 尺侧"], feelings: ["刺", "不稳", "卡", "痛"], actions: ["旋拧", "提物", "撑地", "挥拍"] },
      note: "尺侧肌腱、远端尺桡关节、腕骨和TFCC只是候选；急性不稳或持续肿胀优先专业检查。",
      candidates: [
        candidate("wrist-ulnar-muscles", "检查尺侧屈伸肌与前臂旋转肌", "muscle", "coach", "分别比较尺侧屈腕、伸腕和旋前旋后抗阻反应。", "不反复按压尺骨头周围痛点。", "用相同重量和握法复测旋拧或提物。", ["ulnar-wrist", "forearm"]),
        candidate("wrist-ulnar-stability", "检查远端尺桡关节与腕骨稳定", "joint", "therapist", "由专业人员检查DRUJ、腕骨及TFCC相关稳定线索，决定是否需要影像或保护。", "未明确结构时不进入高负荷松动或撑地。", "按检查结论复测旋转与轻负重。", ["druj", "tfcc", "professional"]),
        candidate("wrist-ulnar-co-contraction", "低负荷共同收缩", "control", "self", "腕中立位，手握软球，同时用另一手提供轻微多方向扰动。", "腕部保持中立，不出现不稳或锐痛。", "记录第一组及次日反应，再决定是否加负荷。", ["co-contraction", "stability"]),
      ],
    },
    {
      id: "wrist-extension-support",
      title: "腕背伸受限或撑地痛",
      match: { locations: ["腕背侧", "腕掌侧"], feelings: ["卡", "顶", "痛", "无力"], actions: ["撑地", "俯卧撑", "起身"] },
      note: "先区分活动角度、负重耐受和肩肘力传导，不直接把撑地痛归为腕关节问题。",
      candidates: [
        candidate("wrist-extension-muscles", "检查前臂屈肌与伸肌", "muscle", "coach", "比较前臂屈伸肌紧张和低负荷屏蔽反应。", "不强拉腕背伸末端。", "复测主动背伸，再复测墙面轻支撑。", ["wrist-extension", "forearm"]),
        candidate("wrist-extension-joint", "检查腕骨与桡尺关节活动", "joint", "therapist", "主动和被动都受限时，由专业人员检查腕骨与桡尺关节方向。", "急性摔撑、肿胀或不稳时先做结构排查。", "先复测被动与主动背伸，再逐级负重。", ["carpal", "joint-mobility"]),
        candidate("wrist-support-chain", "检查肩胛—肘—腕支撑链", "control", "coach", "调整肩胛支持、肘位或手掌受力后重复低负荷支撑，一次只变一个变量。", "手掌压力分布均匀，肩胛不塌陷。", "比较同一墙面距离的疼痛与稳定感。", ["support", "upper-chain"]),
      ],
    },
  ],
  exercises: [
    exercise("wrist-active-rom", "腕与前臂主动活动", 1, "2组", "每个方向每组10个", "前臂有支撑，分别做腕屈伸、桡尺偏和旋前旋后。", "每个方向单独完成，不用肘肩代偿。", "减小范围，每组6个。", "手持轻棒控制旋转。", ["wrist-rom", "forearm-rom"]),
    exercise("wrist-neutral-isometric", "腕中立位四向等长", 2, "3组", "每个方向5次，每次8秒", "用另一只手分别抵住屈、伸、桡偏、尺偏方向，患侧保持不动。", "用力适中，不出现锐痛或不稳。", "缩短到5秒、减小用力。", "延长到12秒或改弹力带动态训练。", ["isometric", "wrist-stability"]),
    exercise("wrist-ball-perturbation", "软球握持与小幅扰动", 3, "3组", "每组10个方向变化", "轻握软球，另一手从不同方向小幅推动，患侧保持腕中立。", "前臂共同收缩但不屏气，腕不突然偏移。", "只做静态轻握。", "改用更硬球或更长杠杆。", ["grip", "proprioception", "stability"]),
    exercise("wrist-wall-to-table", "墙面到桌面支撑", 4, "3组", "每组8次重心转移", "双手支撑，身体缓慢向前再回，先墙面后桌面。", "掌面均匀受力，肘肩稳定，症状可接受。", "站得更靠近墙。", "降低支撑面或增加单侧重心。", ["support", "closed-chain", "daily"]),
    exercise("wrist-catch-tool", "接抛与工具专项", 5, "4组", "每组6个", "从轻球翻转接住开始，逐渐加入球拍、工具或专项握持动作。", "腕能在速度变化中回到中立，握力不过早耗尽。", "双手慢速传球。", "增加速度、重量或专项持续时间。", ["speed", "grip", "sport"]),
  ],
};

const lumbarPelvis: FullRegion = {
  id: "lumbar-pelvis",
  name: "腰椎与骨盆",
  shortName: "腰骨盆",
  summary: "区分腰椎、髋和神经相关表现，评估躯干与骨盆控制，并回到坐、弯腰、翻身、走路和提物任务。",
  keywords: ["腰", "腰骶", "骨盆", "坐骨", "弯腰", "久坐", "腿麻", "翻身"],
  locations: ["腰部正中", "腰部单侧", "腰骶交界", "臀部", "腹股沟", "向大腿或小腿放射"],
  directions: [
    direction("lumbar-flexion", "腰髋前屈 / 弯腰", "双脚与髋同宽，膝自然，缓慢向前弯，手沿大腿向下。", "症状出现阶段、腰与髋的分配、左右偏移和回起是否困难。", ["lumbar-flexion", "bend"]),
    direction("lumbar-extension", "腰椎后伸", "双手扶髋，骨盆保持稳定，缓慢向后伸展到舒适范围。", "后侧挤压位置、左右差异、是否主要挺髋或屈膝代偿。", ["lumbar-extension"]),
    direction("lumbar-sidebend-left", "向左侧屈", "站直，左手沿左大腿向下滑，身体不前倾或旋转。", "与右侧比较手到达位置、同侧挤压和对侧牵扯。", ["sidebend-left", "lumbar-rom"]),
    direction("lumbar-sidebend-right", "向右侧屈", "站直，右手沿右大腿向下滑，身体不前倾或旋转。", "与左侧比较手到达位置、同侧挤压和对侧牵扯。", ["sidebend-right", "lumbar-rom"]),
    direction("lumbar-rotation-left", "躯干向左旋转", "坐姿双臂抱胸并固定骨盆，胸口缓慢转向左侧。", "腰胸旋转分配、左右差异及臀腿症状是否出现。", ["rotation-left", "lumbar-thoracic"]),
    direction("lumbar-rotation-right", "躯干向右旋转", "坐姿双臂抱胸并固定骨盆，胸口缓慢转向右侧。", "腰胸旋转分配、左右差异及臀腿症状是否出现。", ["rotation-right", "lumbar-thoracic"]),
  ],
  strengths: [
    strength("lumbar-abdominal-control", "躯干前侧控制", "仰卧屈膝，呼气时轻收下腹，交替抬起一只脚离地再放下。", "骨盆是否晃动、腰部是否拱起、是否屏气。", ["core", "dead-bug"]),
    strength("lumbar-bridge", "臀肌与骨盆伸展", "仰卧屈膝做臀桥，停3秒；先双腿，再比较单侧发力感。", "臀肌是否参与、骨盆是否旋转、腰或腘绳肌是否代偿。", ["glute", "posterior-chain"]),
    strength("lumbar-side-control", "侧向骨盆稳定", "侧卧屈膝做短杠杆侧桥，保持10秒，比较两侧。", "躯干是否下沉或旋转，肩和腰是否不适。", ["lateral-core", "pelvic-stability"]),
    strength("lumbar-hip-flexor", "抬膝发力", "坐稳，一侧膝盖向上抬；用同侧手轻轻向下压大腿，腿保持5秒不落下。", "比较两侧发力，留意髋前、腹股沟或腰部是否不舒服，以及身体是否后仰借力。", ["hip-flexor", "anterior", "psoas"]),
    strength("lumbar-hamstring", "腘绳肌与髋伸协同", "俯卧屈膝约90度，用另一只脚轻压脚跟，患侧保持5秒。", "后侧大腿发力、抽筋及腰部是否替代髋伸。", ["hamstring", "hip-extension"]),
  ],
  functions: [
    functional("lumbar-sit-rise", "坐下与起身", "从固定高度椅子坐下再站起5次，脚位和速度保持一致。", "腰痛阶段、左右承重、是否用手撑或憋气。", ["sit-to-stand", "daily"]),
    functional("lumbar-bend-lift", "弯腰取物", "用空盒或轻物，从膝下高度拿起放回，先按平时方式完成。", "腰髋分配、物品与身体距离、回起阶段评分。", ["lift", "hip-hinge"]),
    functional("lumbar-roll-bed", "翻身与起床", "在垫上向主诉侧翻身，再侧卧撑起坐起。", "哪个阶段出现腰骶痛，躯干和骨盆是否能一起转动。", ["rolling", "bed-mobility"]),
    functional("lumbar-walk-task", "步行与单腿支撑", "自然走10米，再做左右单腿站各10秒。", "步幅、骨盆摆动、臀腿症状和单腿稳定。", ["gait", "single-leg"]),
  ],
  specialTests: [
    special("lumbar-straight-leg-raise", "直腿抬高相关筛查", "coach", "弯腰或坐姿伴臀腿牵扯、麻、电感时", "仰卧，由熟悉者缓慢抬起伸直的腿，只到首次轻微症状；可轻微放松脚踝或屈膝比较。", "是否再现原臀腿症状，降低神经张力后是否明显改变。", ["slr", "neural", "posterior-chain"], "不追求最大角度，不反复拉到麻痛；进行性无力或大小便异常需及时医学评估。"),
    special("lumbar-prone-knee-bend", "俯卧屈膝相关筛查", "coach", "后仰或髋后伸时前侧髋/大腿牵扯，或需要区分股直肌与神经相关表现", "俯卧缓慢屈膝，保持骨盆不前倾，比较两侧；由熟悉者轻柔协助。", "前侧大腿牵扯、骨盆提前抬起或是否再现原神经样症状。", ["pkb", "femoral-neural", "rectus-femoris"], "锐痛或麻电感加重时停止。"),
    special("lumbar-repeated-direction", "重复方向反应", "self", "某一腰椎方向明显影响臀腿症状，且已排除急性高风险表现", "选择较舒适的弯腰或后伸方向，小幅重复5次，每次记录症状位置。", "症状是否向腰部集中、向腿部扩大或保持不变。", ["directional-response", "retest"], "任何向远端扩大的麻痛、无力或持续加重都停止；结果不用于自行诊断椎间盘。"),
  ],
  candidateGroups: [
    {
      id: "lumbar-flexion-pull",
      title: "弯腰时后侧牵扯或酸痛",
      match: { locations: ["腰部正中", "腰部单侧", "臀部", "向大腿或小腿放射"], feelings: ["牵扯", "酸", "紧", "麻"], actions: ["弯腰", "穿鞋", "坐久起身"] },
      note: "比较腰髋活动、后侧肌群和神经相关表现；牵扯感不能直接等同于肌肉短。",
      candidates: [
        candidate("lumbar-flexion-muscles", "检查竖脊肌、臀肌与后侧链", "muscle", "coach", "按触诊和动作阶段选择腰方肌、竖脊肌、臀肌或腘绳肌中的一组做反应试验。", "不同时松解整条后侧链，不直接重压放射痛路径。", "用相同站距和膝位重新弯腰。", ["flexion", "posterior-chain"]),
        candidate("lumbar-flexion-hip", "检查髋屈曲与腰髋分配", "joint", "coach", "稳定骨盆比较髋屈曲，或用髋铰链提示后再弯腰。", "提示只改变动作分配，不强行保持腰椎完全不动。", "复测弯腰范围、症状阶段和回起。", ["hip-flexion", "hip-hinge"]),
        candidate("lumbar-flexion-neural", "检查神经相关张力", "neural", "therapist", "臀腿有麻电或放射时，由专业人员比较直腿抬高及相关神经滑动反应。", "不拉到末端，不以越拉越远为目标。", "复测症状分布和轻柔原动作，记录次日反应。", ["neural", "slr"]),
      ],
    },
    {
      id: "lumbar-extension-compression",
      title: "后仰时腰部挤、卡或痛",
      match: { locations: ["腰部正中", "腰部单侧", "腰骶交界"], feelings: ["挤", "卡", "刺", "酸胀"], actions: ["后仰", "久站", "弓步"] },
      note: "比较髋后伸、前侧髋肌群和躯干控制，不凭后仰痛认定单一腰椎结构。",
      candidates: [
        candidate("lumbar-extension-muscles", "检查腰大肌、股直肌与腰背肌", "muscle", "coach", "分别比较前侧髋肌和腰背肌反应，一次处理一个区域。", "不对腰椎痛点直接强压。", "控制骨盆后复测相同后仰或弓步。", ["extension", "hip-flexor"]),
        candidate("lumbar-extension-hip", "检查髋后伸与骨盆控制", "control", "coach", "在弓步中轻收骨盆或缩小步幅，比较髋后伸增加是否减少腰部代偿。", "腰椎不被强行压平，只看原动作反应。", "重复相同弓步或站立后仰并评分。", ["hip-extension", "pelvic-control"]),
        candidate("lumbar-extension-joint", "检查腰椎、髋或骶髂相关活动", "joint", "therapist", "主动与专业被动/分节都受限时，由专业人员检查并选一个关节方向。", "骨盆位置只作候选，不以腿长或单一标志点下结论。", "先复测对应活动，再复测原功能动作。", ["joint-mobility", "professional"]),
      ],
    },
    {
      id: "lumbar-roll-sacral",
      title: "翻身、起床或腰骶单侧痛",
      match: { locations: ["腰骶交界", "臀部"], feelings: ["刺", "卡", "酸"], actions: ["翻身", "起床", "单腿站"] },
      note: "骨盆或骶髂方向只有在调整能重复改变原动作时才保留。",
      candidates: [
        candidate("lumbar-roll-muscles", "检查腰方肌、臀肌和梨状肌", "muscle", "coach", "根据翻身阶段和触诊选择一组肌肉轻柔处理。", "不直接把臀部压痛归为梨状肌问题。", "按相同方向和速度重新翻身或起床。", ["rolling", "glute", "quadratus-lumborum"]),
        candidate("lumbar-roll-pelvis", "检查骨盆稳定与转动策略", "control", "coach", "用呼气、腹部轻收或夹枕提示，让胸廓与骨盆协调完成翻身。", "不憋气，不用腰部突然扭转。", "复测翻身评分和动作顺畅度。", ["pelvic-control", "bed-mobility"]),
      ],
    },
    {
      id: "lumbar-radiating",
      title: "臀腿麻、电感或放射",
      match: { locations: ["臀部", "向大腿或小腿放射"], feelings: ["麻", "电感", "烧灼", "放射"], actions: ["久坐", "弯腰", "走路"] },
      note: "优先跟踪分布、感觉、肌力和功能趋势；候选用于分流与低刺激检查。",
      candidates: [
        candidate("lumbar-radiating-neural", "检查腰髋—神经相关路径", "neural", "therapist", "比较腰椎方向、髋周组织和神经相关动作，选择温和滑动或减敏方向。", "症状不向远端扩大，不出现新发肌力下降。", "记录麻感区域、0～10分和走路/坐姿耐受。", ["neural", "radiating"]),
        candidate("lumbar-radiating-referral", "确认需要医学评估的变化", "control", "coach", "检查进行性无力、持续感觉减退、鞍区感觉和大小便异常等优先信号。", "任何优先信号不进入普通松解复测路径。", "保存记录并按医学评估结果重新生成方案。", ["triage", "medical-review"]),
      ],
    },
  ],
  exercises: [
    exercise("lumbar-breath-pelvis", "呼吸与骨盆轻控制", 1, "3组", "每组6次呼吸", "仰卧屈膝，吸气放松，呼气时轻收下腹并找到舒适骨盆位置。", "不屏气、不用力压腰，症状不向腿部扩大。", "只练自然腹式呼吸。", "呼气时交替抬脚。", ["breathing", "pelvic-control"]),
    exercise("lumbar-bridge", "臀桥", 2, "3组", "每组10个", "仰卧屈膝，呼气时轻收腹，臀部向上抬起，停1秒后缓慢落下。", "臀部和大腿后侧发力，腰部不向上顶。", "减小高度或每组6个。", "脚垫高或进阶单腿臀桥。", ["glute", "posterior-chain", "pelvic-stability"]),
    exercise("lumbar-deadbug", "死虫基础控制", 2, "3组", "每侧每组6～8个", "仰卧屈髋屈膝，呼气轻收下腹，交替放下一只脚再收回。", "骨盆不晃，腰部不突然拱起，保持自然呼吸。", "只做脚跟轻点地。", "逐渐伸远腿或加入对侧手臂。", ["core", "deep-core", "pelvic-control"]),
    exercise("lumbar-hip-hinge", "站立屈髋", 3, "3组", "每组10个", "双脚站稳，膝盖微屈，臀部向后移动，身体从髋部向前折叠，再用臀腿站起。", "脚掌稳定，骨盆和躯干一起控制，不蹲下、不把膝盖锁死。", "臀部向后碰墙或用木棍辅助。", "离墙更远、手持轻重量或改单腿屈髋。", ["hip-hinge", "movement-pattern", "standing-hip-flexion"]),
    exercise("lumbar-lift-carry", "地面取物与负重行走", 4, "3组", "每组6次取物 + 20米行走", "用靠近身体的轻物练取放，再双手或单手行走。", "动作可重复、呼吸自然，次日不持续反跳。", "提高物品起始高度或减轻重量。", "增加重量、距离或单侧负荷，一次只加一项。", ["lift", "carry", "daily"]),
    exercise("lumbar-power-return", "负重髋铰链与跑跳准备", 5, "4组", "每组5个", "从快速但可控的髋铰链、轻壶铃硬拉或小幅落地中选择符合目标的一项。", "髋膝踝共同缓冲，躯干能稳定传递力量。", "回到慢速双腿髋铰链。", "增加速度、负重、单腿或专项旋转。", ["power", "sport", "load"]),
  ],
};

const hipThigh: FullRegion = {
  id: "hip-thigh",
  name: "髋关节与大腿",
  shortName: "髋",
  summary: "稳定骨盆后逐方向比较髋活动，检查臀肌、内收肌与后侧链，并在走路、下蹲、台阶和单腿任务中验证。",
  keywords: ["髋", "腹股沟", "大腿", "臀部", "髂胫束", "内收肌", "单腿", "跑步"],
  locations: ["腹股沟 / 髋前方", "髋外侧", "臀部 / 髋后侧", "大腿前侧", "大腿内侧", "大腿后侧"],
  directions: [
    direction("hip-flexion", "髋屈曲", "仰卧，一侧膝盖向胸口靠近，另一条腿保持放松；先做健侧。", "大腿靠近胸口的程度、骨盆是否卷起及腹股沟夹痛。", ["hip-flexion"]),
    direction("hip-extension", "髋后伸", "俯卧屈膝或站立扶墙，保持骨盆朝前，把大腿向后移动。", "后伸角度、腰椎是否后仰、前侧牵扯和臀肌发力。", ["hip-extension"]),
    direction("hip-abduction", "髋外展", "仰卧或侧卧，保持脚尖朝前，把腿向外侧移动。", "两侧角度、骨盆是否侧翻、髋外侧疼痛。", ["hip-abduction"]),
    direction("hip-adduction", "髋内收", "仰卧，一条腿保持伸直，缓慢越过身体中线，骨盆不旋转。", "两侧角度、大腿内侧牵扯和骨盆代偿。", ["hip-adduction"]),
    direction("hip-internal-rotation", "髋内旋", "坐姿髋膝屈90度，保持大腿不动，把小腿向外摆。", "两侧角度、腹股沟或臀部症状及骨盆是否移动。", ["hip-internal-rotation"]),
    direction("hip-external-rotation", "髋外旋", "坐姿髋膝屈90度，保持大腿不动，把小腿向内摆。", "两侧角度、腹股沟或臀部症状及骨盆是否移动。", ["hip-external-rotation"]),
  ],
  strengths: [
    strength("hip-glute-max", "臀大肌 / 髋伸力量", "俯卧屈膝90度，向上抬大腿；或做臀桥保持5秒。", "臀肌发力、腰部代偿、腘绳肌抽筋及左右差异。", ["glute-max", "hip-extension"]),
    strength("hip-glute-med", "臀中肌 / 外展力量", "侧卧下面腿弯曲，上面腿伸直向上抬，用墙保持脚尖朝前。", "骨盆是否后滚、TFL是否代偿、患侧能否保持。", ["glute-med", "hip-abduction"]),
    strength("hip-adductor", "内收肌力量", "仰卧屈膝，把枕头夹在膝间，逐渐用力保持5秒。", "两侧内收发力感、腹股沟或膝内侧是否不适。", ["adductor", "medial-chain"]),
    strength("hip-hamstring", "腘绳肌力量", "坐姿脚跟踩地向后拉但不移动，保持5秒；左右比较。", "后侧大腿发力、抽筋和小腿是否代偿。", ["hamstring", "posterior-chain"]),
    strength("hip-flexor", "屈髋力量", "坐姿抬起一侧膝盖，用手轻压大腿，保持5秒。", "腹股沟疼痛、腰部后仰及左右力量差。", ["hip-flexor"]),
  ],
  functions: [
    functional("hip-squat", "下蹲", "双脚同宽，慢慢下蹲到舒适深度再站起，保持脚位与速度一致。", "髋膝踝联动、骨盆偏移、症状阶段和0～10分。", ["squat", "lower-chain"]),
    functional("hip-single-leg", "单腿站", "靠近墙，左右单腿站各20秒。", "骨盆是否下沉或旋转、足弓和膝是否稳定、髋外侧症状。", ["single-leg", "pelvic-stability"]),
    functional("hip-step", "台阶上下", "用固定高度台阶，左右分别上台阶和下台阶各3次。", "髋部症状、骨盆控制、膝内扣和患侧承重阶段。", ["step", "daily"]),
    functional("hip-gait", "步态", "自然走10米，观察从脚着地、身体越过支撑脚到蹬地。", "步幅、髋伸展、骨盆稳定和疼痛出现阶段。", ["gait", "hip-knee-ankle"]),
  ],
  specialTests: [
    special("hip-fadir", "髋屈曲—内收—内旋相关筛查", "coach", "腹股沟或髋前方在深蹲、坐低凳时夹、刺或卡", "仰卧，由熟悉者把髋屈曲后轻轻向内收和内旋，只到首次症状。", "是否准确再现熟悉的腹股沟/髋前方症状，与健侧是否明显不同。", ["fadir", "anterior-hip"], "阳性只提高关节内或前侧髋方向的检查优先级；不反复压到末端。"),
    special("hip-faber", "髋外展外旋相关筛查", "coach", "腹股沟、髋外侧或臀后方不适与盘腿、穿袜相关", "仰卧把脚踝放到对侧大腿上，由熟悉者稳定骨盆并轻柔比较膝下降高度。", "活动差异、症状具体位置及骨盆是否提前抬起。", ["faber", "hip-rom"], "不用下压膝盖追求碰床；结果不用于单独诊断髋或骶髂问题。"),
    special("hip-trendelenburg", "单腿骨盆稳定观察", "self", "走路、台阶或单腿动作时髋外侧不适或不稳", "面对镜子单腿站10秒，双手轻扶墙防跌倒。", "支撑侧骨盆是否明显外移，对侧骨盆是否下沉，症状是否出现。", ["trendelenburg", "pelvic-stability"], "单次外观差异不是诊断；结合外展力量和功能表现。"),
  ],
  candidateGroups: [
    {
      id: "hip-anterior-groin",
      title: "腹股沟或髋前方夹、刺、卡",
      match: { locations: ["腹股沟 / 髋前方", "大腿前侧"], feelings: ["夹", "刺", "卡", "弹响"], actions: ["屈髋", "深蹲", "弓步", "抬腿"] },
      note: "肌肉、前侧关节囊和关节内结构均为检查候选；一次处理改善不能排除结构性问题。",
      candidates: [
        candidate("hip-anterior-muscles", "检查腰大肌、股直肌与内收肌", "muscle", "coach", "根据触诊、屈髋和后伸反应选择一组前侧或内侧肌肉轻柔处理。", "不直接深入重压腹股沟。", "以相同深度复测屈髋、弓步或下蹲。", ["hip-flexor", "adductor", "anterior-hip"]),
        candidate("hip-anterior-joint", "检查髋关节活动与前侧空间", "joint", "therapist", "主动和被动活动都受限或FADIR线索明显时，由专业人员检查髋关节方向。", "持续卡锁、弹响伴痛或负荷反复加重时结合医学评估。", "先复测髋活动，再复测原负重动作。", ["hip-joint", "anterior-hip"]),
        candidate("hip-anterior-control", "检查骨盆与屈髋控制", "control", "coach", "稳定骨盆或调整屈髋路径后重复动作，比较是否减少前方夹挤。", "一次只改变骨盆或股骨方向。", "连续两次复测同一深度和速度。", ["movement-control", "hip-flexion"]),
      ],
    },
    {
      id: "hip-lateral",
      title: "髋外侧酸痛或单腿不稳",
      match: { locations: ["髋外侧"], feelings: ["酸", "紧", "痛", "无力"], actions: ["单腿站", "走路", "侧卧", "台阶"] },
      note: "臀中小肌、TFL/髂胫束、髋活动和单腿负荷均为候选。",
      candidates: [
        candidate("hip-lateral-muscles", "检查臀中小肌与TFL", "muscle", "coach", "比较髋外侧与前外侧肌肉触诊、外展力量和轻柔处理反应。", "避免直接长时间重压大转子痛点。", "复测相同单腿站时长或台阶。", ["glute-med", "tfl", "lateral-hip"]),
        candidate("hip-lateral-control", "检查骨盆稳定和单腿路径", "control", "coach", "用侧向推墙或骨盆提示后重复单腿动作。", "膝、足和躯干一起观察，不只盯住髋部。", "比较骨盆晃动、评分和动作完成度。", ["pelvic-stability", "single-leg"]),
        candidate("hip-lateral-joint", "检查髋旋转与关节囊", "joint", "therapist", "活动受限且肌肉处理变化不足时，由专业人员检查髋关节囊方向。", "无活动或功能缺口时不因触诊痛自动松动。", "复测受限方向和原单腿任务。", ["hip-joint", "rotation"]),
      ],
    },
    {
      id: "hip-posterior",
      title: "臀部或髋后侧卡、扯、酸",
      match: { locations: ["臀部 / 髋后侧", "大腿后侧"], feelings: ["卡", "牵扯", "酸", "麻"], actions: ["久坐", "屈髋", "走路", "翻身"] },
      note: "同时比较腰椎、神经、腘绳肌起点和髋后侧活动。",
      candidates: [
        candidate("hip-posterior-muscles", "检查臀肌、梨状肌与腘绳肌", "muscle", "coach", "根据具体位置和动作选择一组后侧肌肉做轻柔反应试验。", "不把所有臀部症状统一归为梨状肌。", "复测原坐姿、屈髋或步行动作。", ["posterior-hip", "hamstring", "glute"]),
        candidate("hip-posterior-neural", "检查腰椎与神经相关表现", "neural", "therapist", "有麻电、放射或直腿抬高相关反应时，补查腰椎和神经路径。", "不反复拉到症状末端。", "记录症状分布和轻柔原动作。", ["neural", "lumbar-chain"]),
      ],
    },
    {
      id: "hip-rotation-limited",
      title: "髋内旋或外旋受限",
      match: { locations: ["腹股沟 / 髋前方", "髋外侧", "臀部 / 髋后侧"], feelings: ["紧", "卡", "扯"], actions: ["盘腿", "下蹲", "转身"] },
      note: "先稳定骨盆区分真实髋活动；主动受限但被动接近健侧时重点训练控制。",
      candidates: [
        candidate("hip-rotation-muscles", "检查臀深层、TFL与内收肌", "muscle", "coach", "按受限方向和触诊结果选择一组肌肉处理。", "不一次松解全部旋转肌群。", "稳定骨盆复测被动和主动旋转。", ["hip-rotation", "muscle-response"]),
        candidate("hip-rotation-joint", "检查髋关节囊活动", "joint", "therapist", "主动被动均受限且肌肉处理改善不足时，由专业人员选择髋关节松动。", "出现深部锐痛或卡锁不强推。", "先复测被动，再主动，最后复测问题动作。", ["hip-joint", "joint-mobility"]),
        candidate("hip-rotation-control", "训练新范围内旋转控制", "control", "self", "坐姿在新获得范围内做主动内外旋，骨盆保持不动。", "不借躯干和膝盖移动制造幅度。", "比较主动范围是否更接近被动。", ["active-control", "hip-rotation"]),
      ],
    },
  ],
  exercises: [
    exercise("hip-active-rotation", "髋主动旋转与屈伸", 1, "2组", "每个方向每组10个", "在坐姿或仰卧分别练受限方向，骨盆保持稳定。", "症状不持续增加，动作范围左右可比较。", "减小范围，每组6个。", "增加末端停留或转到站姿。", ["hip-rom", "active-control"]),
    exercise("hip-bridge", "臀桥", 2, "3组", "每组10个", "仰卧屈膝，轻收腹后抬起臀部，停1秒再缓慢落下。", "骨盆不旋转，腰部不过度顶起。", "减小高度或每组6个。", "脚垫高或进阶单腿臀桥。", ["glute-max", "hip-extension", "pelvic-stability"]),
    exercise("hip-side-abduction", "侧卧髋外展", 2, "3组", "每侧每组10个", "侧卧保持骨盆稳定，上侧腿向后上方小幅抬起，再缓慢放下。", "脚尖朝前，不用腰侧或阔筋膜张肌抢力。", "屈膝做小幅外展。", "增加轻弹力带或站立侧向控制。", ["glute-med", "hip-abduction", "pelvic-stability"]),
    exercise("hip-sit-stand-hinge", "站立屈髋与坐站", 3, "3组", "每组10个", "先练臀部向后移动的站立屈髋，再保持相同髋部发力完成坐站。", "髋膝踝方向一致，左右承重接近，腰部不抢先弯曲。", "臀部触墙练屈髋，或提高椅子并扶手。", "降低椅子或手持轻重量。", ["sit-to-stand", "hip-hinge", "standing-hip-flexion"]),
    exercise("hip-step-single-leg", "台阶与单腿控制", 4, "3组", "每侧每组8个", "从低台阶上台开始，再练慢速下台和单腿站。", "骨盆不明显下沉，膝足方向稳定。", "降低台阶、手扶支撑。", "增加高度、连续次数或负重。", ["step", "single-leg", "daily"]),
    exercise("hip-run-cut", "跑跳落地与变向", 5, "4组", "每组5个", "从双脚小跳落地开始，进阶到单脚、侧向减速和切步。", "髋膝踝共同缓冲，骨盆和躯干能稳定。", "快速坐站或小幅双脚落地。", "增加速度、方向、负重或专项要求。", ["run", "jump", "change-direction"]),
  ],
};

const knee: FullRegion = {
  id: "knee",
  name: "膝关节",
  shortName: "膝",
  summary: "从肿胀、触诊、伸屈和髌骨活动进入检查，再把结果放回走路、下蹲、台阶、单腿和跑跳任务。",
  keywords: ["膝", "髌骨", "髌腱", "鹅足", "半月板", "韧带", "下楼", "下蹲", "跑跳"],
  locations: ["膝前 / 髌骨周围", "髌骨下方", "膝内侧", "膝外侧", "膝后侧 / 腘窝", "关节线", "小腿上端"],
  directions: [
    direction("knee-extension", "膝伸直", "仰卧双腿自然伸直，主动绷紧大腿前侧，把膝后侧向床面靠近；先做健侧再做患侧。", "膝后间隙、下压发力感、末端角度、疼痛和左右差异。", ["knee-extension", "terminal-extension"]),
    direction("knee-flexion", "膝屈曲", "仰卧，双侧脚跟分别向臀部滑动，骨盆保持稳定。", "脚跟到臀部距离、前膝或腘窝症状、肿胀阻挡和骨盆代偿。", ["knee-flexion"]),
    { ...direction("knee-patella-superior", "髌骨向上活动", "仰卧放松膝盖，用两指轻触髌骨边缘，先在健侧感受，再轻柔向上移动患侧。", "与健侧相比是否明显更少，是否出现原疼痛。", ["patella", "superior-glide"], "不熟悉可跳过；明显肿胀或急性外伤时不反复推动。"), testMode: "passive" },
    { ...direction("knee-patella-inferior", "髌骨向下活动", "仰卧放松膝盖，轻柔比较髌骨向下移动。", "与健侧差异，以及是否与屈膝受限同时出现。", ["patella", "inferior-glide"], "不熟悉可跳过；术后按医嘱。"), testMode: "passive" },
    { ...direction("knee-patella-medial", "髌骨向内活动", "仰卧放松膝盖，轻柔比较髌骨向内侧移动。", "左右差异、疼痛和末端弹性。", ["patella", "medial-glide"], "只做轻柔比较，不做压磨。"), testMode: "passive" },
    { ...direction("knee-patella-lateral", "髌骨向外活动", "仰卧放松膝盖，轻柔比较髌骨向外侧移动。", "左右差异、疼痛和末端弹性。", ["patella", "lateral-glide"], "只做轻柔比较，不做压磨。"), testMode: "passive" },
  ],
  strengths: [
    strength("knee-quadriceps", "把膝盖伸直的力量", "先仰卧，把膝后侧向床面压住5秒；再坐好，把小腿慢慢抬到能到的位置并保持5秒。", "和健侧比较下压和抬腿的力量；留意不舒服的一侧是否明显抖动，或因为疼痛不敢用力。", ["quadriceps", "terminal-extension"]),
    strength("knee-hamstring", "腘绳肌", "坐姿脚跟踩地向后拉但不移动，保持5秒，左右比较。", "后侧大腿发力、抽筋及小腿是否代偿。", ["hamstring"]),
    strength("knee-posterior-chain", "臀部与大腿后侧基础力量", "仰卧屈膝做臀桥，左右脚均匀踩地，抬起臀部并保持5秒；能够稳定完成时，再分别让一侧承担更多重量进行比较。", "臀部和大腿后侧是否能共同发力，骨盆是否歪斜，是否由腰部顶起或大腿后侧容易抽筋。", ["glute-max", "hamstring", "posterior-chain", "pelvic-stability"]),
    strength("knee-adductor-pes", "大腿内侧力量", "仰卧屈膝，在两膝之间夹软枕5秒，分别侧重一侧发力进行比较。", "大腿内侧发力和膝内侧症状。", ["adductor", "medial-knee"]),
    strength("knee-glute", "臀肌与骨盆稳定", "用侧向推墙或单腿站比较两侧臀部参与。", "骨盆是否下沉、躯干侧倾和患侧承重感。", ["glute", "pelvic-stability"]),
    strength("knee-calf", "小腿三头肌", "双脚提踵10个；允许时再左右单脚各做最多10个。", "高度、节奏、膝是否弯曲及患侧能完成的高质量个数。", ["calf", "heel-raise"]),
    strength("knee-foot-arch", "胫骨后肌与足弓控制", "站立保持脚趾放松，轻抬足弓；再用另一只脚给内翻方向轻阻力。", "足弓、胫骨后肌发力和脚趾是否抓地代偿。", ["tibialis-posterior", "arch"]),
  ],
  functions: [
    functional("knee-gait", "走路", "自然走10米，记录脚着地、患侧承重、身体越过支撑脚和蹬地。", "跛行阶段、步幅、膝能否伸直及0～10分。", ["gait", "daily"]),
    functional("knee-squat", "下蹲", "双脚固定位置，以相同速度下蹲到舒适深度再站起。", "深度、疼痛阶段、髋膝踝联动、左右承重及膝足方向。", ["squat", "lower-chain"]),
    functional("knee-sit-stand", "坐下再站起", "从同一把稳固椅子慢慢坐下再站起3次；需要时可以轻扶。", "坐下和起身哪个阶段不舒服，是否明显偏向一侧用力。", ["sit-to-stand", "daily"]),
    functional("knee-heel-raise", "双脚提踵", "扶住墙面，双脚同时缓慢抬起脚跟，再慢慢落下，完成5次。", "两侧高度是否接近，身体是否晃动，患侧是否明显更难完成。", ["heel-raise", "calf", "balance"]),
    functional("knee-step-up", "上楼 / 上台阶", "用固定高度台阶，患侧先上，轻扶栏杆，完成3次。", "起身阶段、股四头与臀肌发力、疼痛和借力。", ["step-up", "stairs"]),
    functional("knee-step-down", "下楼 / 下台阶", "站在固定高度台阶上，患侧支撑，健侧脚跟慢慢点地再回起。", "患侧承重阶段、下降控制、膝内外偏移和0～10分。", ["step-down", "eccentric", "stairs"]),
    functional("knee-single-leg", "单腿站", "靠近墙，先做健侧，再用患侧单腿站立20秒，必要时手指轻扶。", "身体是否明显晃动，患侧是否明显更难站稳。", ["single-leg", "balance"]),
    functional("knee-single-leg-squat", "扶物单腿浅蹲", "只有下蹲和单腿站都能稳定完成时再做。靠近固定物，单腿小幅下蹲3次，不追求深度。", "骨盆能否保持稳定，膝盖是否明显向内偏，足弓是否塌下，以及是否出现原来的不适。", ["single-leg-squat", "single-leg", "pelvic-stability", "lower-chain"], "下蹲或单腿站仍明显疼、不稳或无法完成时，先不测试。"),
    functional("knee-hop-landing", "小跳与落地", "只在走路、台阶和单腿任务稳定后，做双脚小跳落地3次。", "落地缓冲、膝髋屈曲、左右受力和不稳。", ["jump", "landing", "sport"], "急性损伤、肿胀、走路仍明显疼或不稳时不测试。"),
  ],
  specialTests: [
    special("knee-patella-tenderness-self", "髌骨周围轻按定位", "self", "膝前、髌骨周围或髌骨下方不适", "膝盖放松，先在健侧找到髌骨边缘，再用一根手指轻按患侧髌骨四周和下方，每处只按一次。", "记录最熟悉的痛点位于髌骨上方、下方、内侧还是外侧。", ["patella", "anterior-knee", "tenderness"], "不推动髌骨，不在明显刺痛点反复重按。"),
    special("knee-joint-line-tenderness", "轻按膝盖内外两侧", "self", "膝内或外侧有明确痛点，尤其扭转后卡顿时", "屈膝坐好，先按健侧，再沿患侧膝盖内外两侧的凹陷处轻按一次。", "是否有一个位置出现集中而熟悉的疼痛。", ["joint-line", "meniscal-screen"], "集中压痛不能单独判断半月板；不要反复重按。"),
    special("knee-mcmurray", "麦氏测试相关筛查", "therapist", "扭转受伤后有关节线痛、卡顿或伸屈受限", "只由熟悉手法的专业人员缓慢完成屈伸和旋转比较。", "是否再现熟悉的关节线症状或明确卡顿；无痛弹响不算阳性。", ["meniscal-screen", "rotation"], "非专业用户直接跳过；高刺激期不反复做。"),
    special("knee-ligament-screen", "膝韧带稳定检查", "therapist", "急性扭伤、打软腿、明显不稳或影像提示韧带问题", "由专业人员按机制选择前后向或内外侧稳定测试，并与健侧比较。", "终末感、松弛度和是否再现不稳，而不只看疼痛。", ["ligament", "stability"], "普通用户不自行做强应力测试；阳性线索需结合影像或医学评估。"),
    special("knee-patellar-assist", "髌骨 / 胫骨位置反应", "coach", "下蹲、上下楼或跑步时膝前或内外侧痛", "受训者轻柔调整髌骨或胫骨位置，一次只调整一个方向，重复相同动作。", "0～10分、动作深度或下降控制能否稳定改善。", ["patella", "tibia", "response-test"], "反应试验不等于髌骨或胫骨错位诊断。"),
  ],
  candidateGroups: [
    {
      id: "knee-anterior",
      title: "膝前或髌骨下方，蹲起 / 楼梯痛",
      match: { locations: ["膝前 / 髌骨周围", "髌骨下方"], feelings: ["刺", "胀", "挤", "酸"], actions: ["下蹲", "上楼", "下楼", "跑步"] },
      note: "股四头、髌骨、髌腱/脂肪垫、踝背屈及髋控制均为候选，按动作反应排序。",
      candidates: [
        candidate("knee-anterior-muscles", "大腿前外侧轻柔松解", "muscle", "self", "用手或泡沫轴轻柔放松大腿前侧和外侧，每个紧张区域30～60秒。", "避开髌腱、髌骨下方和明显刺痛点。", "重复原来的下蹲或台阶动作。", ["quadriceps", "lateral-chain", "anterior-knee"]),
        candidate("knee-anterior-patella", "检查髌骨活动与位置反应", "joint", "therapist", "根据受限方向做髌骨或膝关节松动。", "不以压磨疼痛作为处理目标。", "先复测伸屈，再复测下蹲或台阶。", ["patella", "joint-mobility"]),
        candidate("knee-anterior-control", "膝髋踝控制练习", "control", "self", "扶住固定物做5～8个小幅坐站或浅蹲，让膝盖朝脚尖方向移动。", "动作保持舒适，不追求蹲深。", "重复原来的下蹲或台阶动作。", ["movement-control", "hip-knee-ankle"]),
      ],
    },
    {
      id: "knee-medial-downstairs",
      title: "下楼或承重时膝内侧疼",
      match: { locations: ["膝内侧", "关节线"], feelings: ["刺", "酸", "牵扯", "胀"], actions: ["下楼", "下蹲", "走路", "跑步"] },
      note: "优先回到主诉下楼动作；外侧链、鹅足肌群、内收肌、足弓与离心控制都只是候选。",
      candidates: [
        candidate("knee-medial-lateral-chain", "大腿外侧轻柔松解", "muscle", "self", "用手或泡沫轴轻柔放松大腿外侧和髋外侧，每个紧张区域30～60秒。", "不沿髂胫束整条重压。", "重复原来的下楼或承重动作。", ["lateral-chain", "step-down"]),
        candidate("knee-medial-pes", "大腿内侧轻柔松解", "muscle", "self", "轻柔放松大腿内侧和内侧大腿后方，每个区域30～60秒。", "避开膝内下方的明确刺痛点，不反复重按。", "重复原来的下楼或承重动作。", ["pes-anserine", "adductor", "medial-hamstring"]),
        candidate("knee-medial-adductor", "大腿内收肌轻柔松解", "muscle", "self", "轻柔放松检查中更紧或更酸的大腿内收肌区域30～60秒。", "避开膝内侧明确刺痛点，不反复重按。", "重复原来的下楼或承重动作。", ["adductor", "medial-knee"]),
        candidate("knee-medial-foot", "足弓与踝部控制练习", "control", "self", "脚趾放松，轻轻抬起足弓，再做5～8个小幅膝盖向前移动。", "脚跟不抬起，膝盖自然朝脚尖方向。", "重复原来的下楼或承重动作。", ["arch", "tibialis-posterior", "ankle"]),
        candidate("knee-medial-joint", "检查髌骨、胫骨与膝关节方向", "joint", "therapist", "软组织和控制试验变化不足，且活动受限时，由专业人员检查髌骨、胫骨和膝关节。", "结构测试阳性或扭转卡顿明显时先提高医学检查优先级。", "先复测活动，再复测下楼。", ["patella", "tibia", "joint-mobility"]),
      ],
    },
    {
      id: "knee-lateral",
      title: "膝外侧走跑或下蹲痛",
      match: { locations: ["膝外侧", "小腿上端"], feelings: ["刺", "紧", "摩擦感", "酸"], actions: ["跑步", "走路", "下蹲", "台阶"] },
      note: "外侧链、腘肌、腓骨、腓骨肌和髋足控制都需按结果排序。",
      candidates: [
        candidate("knee-lateral-muscles", "大腿外侧与后外侧轻柔松解", "muscle", "self", "用手或泡沫轴轻柔放松大腿外侧和后外侧，每个紧张区域30～60秒。", "避开膝外侧骨点和腘窝，不直接重压疼痛中心。", "重复原来的走路、跑步或下蹲动作。", ["lateral-chain", "popliteus"]),
        candidate("knee-lateral-fibula", "腓骨近端辅助反应试验", "joint", "therapist", "由专业人员轻柔固定或辅助腓骨近端一个方向，保持同样条件重复原来的膝盖动作。", "不要求用户判断微动、末端感觉或是否错位；只记录原动作是否出现可重复变化。", "只复测原来的膝盖动作和相关活动范围；没有变化就结束这一项。", ["proximal-fibula", "response-test"], { retestIds: ["knee-extension", "knee-flexion"] }),
        candidate("knee-lateral-control", "髋与足部稳定练习", "control", "self", "扶墙做5～8次重心转移或小幅单腿站，保持骨盆和足弓稳定。", "不憋气，不让膝盖突然内外晃。", "重复原来的走路或下蹲动作。", ["hip-control", "foot-support"]),
      ],
    },
    {
      id: "knee-extension-limited",
      title: "膝后紧、伸不直或站立不敢伸",
      match: { locations: ["膝后侧 / 腘窝", "膝前 / 髌骨周围"], feelings: ["紧", "卡", "扯", "无力"], actions: ["伸膝", "站立", "走路"] },
      note: "主动受限、被动接近健侧进入控制路径；两者都受限进入肌肉与关节共同路径。",
      candidates: [
        candidate("knee-extension-muscles", "大腿外侧与后侧候选", "muscle", "self", "只处理检查中明确更紧或更酸的一处：大腿外侧、大腿后侧或小腿后侧，轻柔松解30～60秒。", "避开腘窝正中和明显刺痛点；其他相关区域只保留为候选，不默认全部处理。", "重新比较膝盖伸直和原来的不适动作。", ["extension", "posterior-chain", "lateral-chain"], { retestIds: ["knee-extension"] }),
        candidate("knee-extension-anterior-muscles", "大腿前侧与股直肌轻柔松解", "muscle", "self", "如果大腿前侧比另一侧更紧或更酸，轻柔放松大腿前侧与股直肌周围30～60秒。", "避开髌骨、髌腱和明确刺痛点；没有前侧紧张差别时不做这一项。", "重新比较膝盖伸直和原来的不适动作。", ["extension", "quadriceps", "rectus-femoris", "anterior-knee"], { retestIds: ["knee-extension"], siteLabel: "大腿前侧", targetLabel: "股直肌与股四头肌前侧", actionLabel: "大腿前侧轻柔松解" }),
        candidate("knee-extension-anterior-lateral", "大腿前侧与外侧链轻柔松解", "muscle", "self", "处理检查中明确紧张的股直肌、大腿前侧或外侧链区域，每处30～60秒。", "避开髌骨、髌腱和明确刺痛点，不沿髂胫束整条重压。", "统一比较膝盖伸直和原来的不适动作。", ["extension", "quadriceps", "rectus-femoris", "lateral-chain"], { retestIds: ["knee-extension"], siteLabel: "大腿前侧与外侧链", targetLabel: "股直肌、股四头肌前侧与外侧链", actionLabel: "大腿前侧与外侧链轻柔松解" }),
        candidate("knee-extension-anterior-lower-leg", "小腿前侧肌群轻柔松解", "muscle", "self", "如果检查时发现小腿前侧比另一边更紧或更酸，轻柔松解胫骨前肌与趾伸肌周围30～60秒。", "避开胫骨骨面和明确刺痛点；没有紧张差别时不做这一项。", "重新比较膝盖伸直和原来的不适动作。", ["extension", "tibialis-anterior", "toe-extensor"], { retestIds: ["knee-extension"], siteLabel: "小腿前侧肌群", targetLabel: "胫骨前肌与趾伸肌周围", actionLabel: "小腿前侧肌群轻柔松解" }),
        candidate("knee-extension-joints", "检查髌骨、膝关节与近端腓骨", "joint", "therapist", "肌肉处理后被动伸直仍受限时，由专业人员选择髌骨上推、胫股或近端腓骨方向。", "出现硬性阻挡、明显肿胀或锐痛不强推。", "被动伸直 → 主动伸直 → 站立或走路。", ["patella", "tibiofemoral", "fibula"]),
        candidate("knee-extension-control", "训练股四头末端控制", "control", "self", "在现有被动范围内做膝后下压或终末伸膝，末端停2秒。", "主动范围逐渐追上被动，不靠髋抬起代偿。", "复测站立伸膝与步态，力量留待后续复查。", ["quad", "terminal-extension"]),
      ],
    },
    {
      id: "knee-swelling-irritable",
      title: "肿胀、局部刺痛或压痛",
      match: { locations: ["膝前 / 髌骨周围", "髌骨下方", "膝内侧", "膝外侧", "膝后侧 / 腘窝"], feelings: ["肿", "胀", "刺", "压痛"], actions: ["受伤后", "术后", "负重"] },
      note: "肿胀和压痛主要看时间趋势，不要求处理后当场消失。",
      candidates: [
        candidate("knee-swelling-care", "肿胀管理", "swelling", "self", "休息时垫高小腿；在疼痛允许范围缓慢滑动脚跟、伸屈膝盖10～20次。", "肿胀不会在一次处理后立刻消失，不反复按压检查。", "当天晚些时候或第二天再观察肿胀边界和轮廓。", ["swelling", "acute"]),
        candidate("knee-irritability-cause", "检查持续刺激来源", "control", "coach", "先调整负重、关节活动或肌肉牵拉中的一项，再做原动作。", "刺痛减轻也不能排除结构性问题。", "复测安全的问题动作；压痛不当场反复验证。", ["irritability", "load-management"]),
      ],
    },
  ],
  exercises: [
    exercise("knee-heel-slide-quad-set", "脚跟滑动与膝后下压", 1, "3组", "每项每组10个", "仰卧，先做脚跟滑动恢复屈曲，再绷紧大腿把膝后向床面下压。", "活动在可接受范围，膝后下压时髋不抬起。", "减小范围，每组6个。", "在新范围加入终末伸膝弹力带。", ["knee-rom", "quad-activation", "quadriceps", "terminal-extension"]),
    exercise("knee-bridge", "臀桥", 2, "3组", "每组10～12个", "仰卧屈膝，轻收腹后抬起臀部，停1秒再缓慢落下。", "臀部和大腿后侧发力，腰部不向上顶。", "减小高度或每组6个。", "脚垫高或进阶单腿臀桥。", ["glute", "hamstring", "posterior-chain"]),
    exercise("knee-single-leg-bridge", "单腿臀桥", 3, "3组", "每侧每组6～10个", "先做一次稳定的双脚臀桥，再抬起一只脚，用另一侧臀部把骨盆抬起，停1秒后缓慢落下。", "骨盆不歪斜，主要由臀部和大腿后侧发力，腰部不过度顶起。", "继续双脚臀桥，或只把一只脚轻轻离地。", "增加次数，再进阶站立屈髋。", ["glute", "hamstring", "posterior-chain", "single-leg", "pelvic-stability"]),
    exercise("knee-supine-adductor", "仰卧夹枕", 2, "3组", "每组8～12个", "仰卧屈膝，在两膝之间夹软枕，轻轻向内夹住3秒后放松。", "大腿内侧均匀发力，不用疼痛顶住。", "减小夹力或每组6个。", "进阶到坐位或桥式夹枕。", ["adductor", "medial-knee"]),
    exercise("knee-side-abduction", "侧卧髋外展", 2, "3组", "每侧每组8～12个", "侧卧，下侧腿屈曲保持稳定，上侧腿伸直并稍向后放，脚尖朝前，缓慢抬起再落下。", "骨盆不要向后翻，大腿外侧不过度抢力。", "减小抬腿高度或每组6个。", "增加次数或加入轻弹力带。", ["glute", "glute-med", "hip-abduction", "pelvic-stability"]),
    exercise("knee-hamstring-isometric", "脚跟后拉发力", 2, "3组", "每侧每组8～10个，每次保持5秒", "坐稳或仰卧屈膝，脚跟踩稳地面，保持脚不移动，轻轻向后拉地面并保持。", "感受大腿后侧发力，膝内侧和膝后不要出现刺痛。", "减小发力或每组6个。", "增加保持时间，再进阶臀桥或站立屈髋。", ["hamstring", "knee-flexion", "posterior-chain"]),
    exercise("knee-supine-ankle-press", "仰卧下压脚背", 2, "3组", "每组10～15个", "仰卧或半躺，用脚掌轻推弹力带向下压，缓慢回到原位。", "小腿后侧发力，脚趾不要抓紧。", "去掉弹力带，只做主动下压。", "进阶到坐姿提踵，再到站立提踵。", ["calf", "heel-raise"]),
    exercise("knee-supine-arch-control", "仰卧足弓控制", 2, "3组", "每组8～12个", "仰卧屈膝，脚掌轻贴床面，脚趾放松，轻轻收起足弓后保持3秒。", "脚趾不抓床，小腿和膝盖不跟着转。", "只保持2秒或每组6个。", "进阶到坐位，再到站立保持足弓。", ["tibialis-posterior", "arch", "foot-intrinsic"]),
    exercise("knee-anterior-lower-leg-control", "勾脚与抬脚趾控制", 2, "3组", "每组10个", "仰卧或坐稳，先把脚背向上勾，再保持脚踝不动抬起脚趾；两个动作分别缓慢完成。", "小腿前侧发力，膝盖不跟着转；只保留不会让原膝部不适加重的动作。", "去掉阻力，每组6个。", "加入轻弹力带，或站立时练习脚跟着地后的抬脚控制。", ["tibialis-anterior", "toe-extensor", "dorsiflexion", "knee-weight-bearing"]),
    exercise("knee-calf-raise", "扶墙双脚提踵", 2, "3组", "每组10～15个", "双手轻扶墙，脚跟垂直抬起，停1秒后缓慢落下。", "两侧高度接近，膝盖保持稳定，脚踝不向内外倒。", "坐姿提踵或减少高度。", "单脚提踵或增加轻负重。", ["calf", "heel-raise", "gait"]),
    exercise("knee-standing-hip-flexion", "站立屈髋", 3, "3组", "每组10个", "双脚站稳，膝盖微屈，臀部向后移动，身体从髋部向前折叠，再用臀腿站起。", "髋膝踝方向一致，脚掌稳定，腰部不抢先弯曲。", "臀部向后碰墙并扶支撑。", "增加屈髋范围、轻负重或改单腿屈髋。", ["hip-hinge", "movement-pattern", "standing-hip-flexion", "stairs"]),
    exercise("knee-sit-stand-squat", "坐站与浅蹲", 3, "3组", "每组10个", "从合适高度椅子坐站，进阶到不碰椅子的浅蹲。", "髋膝踝同向、左右承重接近、下降可控。", "提高椅子并扶手。", "降低椅子或手持轻重量。", ["sit-to-stand", "squat", "movement-pattern"]),
    exercise("knee-step", "低台阶上台与下台", 4, "3组", "每侧每组8个", "先练患侧上台，稳定后练患侧支撑慢慢下台。", "骨盆稳定，膝与足方向一致，不突然掉落。", "降低台阶、增加扶持。", "增加高度、连续次数或负重。", ["step-up", "step-down", "stairs"]),
    exercise("knee-single-leg-strength", "分腿蹲与单腿屈髋", 4, "3组", "每侧每组8个", "前后站位做分腿蹲，再用手扶支撑练单腿屈髋。", "前脚稳定，骨盆不旋转，患侧可控承重。", "减小幅度或双手扶持。", "增加负重或减少扶持。", ["single-leg", "strength", "daily"]),
    exercise("knee-jump-decelerate", "跳跃落地与减速", 5, "4组", "每组5个", "从双脚小跳落地开始，进阶到前向落地、单脚和变向。", "髋膝踝共同缓冲，每次落地都能稳定停住。", "快速提踵或小幅蹲起。", "增加高度、速度、方向或专项组合。", ["jump", "landing", "change-direction"]),
  ],
};

const ankleFoot: FullRegion = {
  id: "ankle-foot",
  name: "踝关节与足",
  shortName: "踝足",
  summary: "急性损伤先确认机制、肿胀、负重和影像，再检查踝关节各方向；只有脚趾、前脚掌或足底相关主诉才增加足趾检查，之后逐步恢复步态、提踵、平衡和跑跳。",
  keywords: ["踝", "脚踝", "崴脚", "足", "足弓", "跟腱", "足底", "外踝", "内踝", "肿胀"],
  locations: ["外踝 / 前外侧", "内踝 / 足弓内侧", "踝前方", "足背", "足底 / 足跟", "跟腱 / 踝后方", "足趾根部"],
  directions: [
    direction("ankle-dorsiflexion", "踝背屈", "坐姿脚跟着地，把脚背向小腿靠近；能稳定负重后再做膝碰墙比较。", "主动角度、踝前卡痛、小腿后侧牵扯和两侧膝碰墙距离。", ["dorsiflexion", "ankle-rom"]),
    direction("ankle-dorsiflexion-knee-flexed", "屈膝位踝背屈", "坐姿屈膝、脚跟着地，把脚背向小腿靠近；保持脚跟和膝盖方向不变。", "与伸膝位分别记录主动、被动范围，比较屈膝后是否仍受限。", ["dorsiflexion", "ankle-rom", "knee-flexed"]),
    direction("ankle-plantarflexion", "踝跖屈", "坐稳并放松小腿，把脚背缓慢向下压；先做健侧，再做不舒服的一侧。", "跖屈角度、踝前后症状和脚趾是否过度卷曲。", ["plantarflexion", "ankle-rom"]),
    direction("ankle-inversion", "足踝内翻", "坐姿小腿固定，把脚掌缓慢转向内侧，不动膝盖。", "两侧角度、外踝牵扯或内侧疼痛，以及小腿是否跟着转。", ["inversion", "ankle-rom"]),
    direction("ankle-eversion", "足踝外翻", "坐姿小腿固定，把脚掌缓慢转向外侧，不动膝盖。", "两侧角度、外侧肌肉发力、内外踝疼痛及小腿代偿。", ["eversion", "ankle-rom"]),
    direction("ankle-great-toe-extension", "第一跖趾背伸", "脚掌放松，用手轻抬大脚趾；先做健侧，再比较患侧。", "大脚趾角度、足底牵扯和足弓是否随之变化。", ["great-toe", "toe-extension"]),
    direction("ankle-toe-flexion", "足趾屈曲与伸展", "脚跟着地，脚趾全部抬起再放下，然后轻轻屈曲，不抓地用力。", "足趾独立控制、疼痛和是否只有大脚趾或小趾侧受限。", ["toe-control", "foot"]),
    { ...direction("ankle-cuboid-mobility", "骰骨与足外侧柱活动", "由专业人员固定足跟，轻柔比较两侧骰骨及足外侧柱活动。", "只记录足外侧柱活动是否小于对侧，以及是否复现原来的外侧症状。", ["cuboid", "lateral-column", "joint-mobility"], "急性肿胀、骨性风险或明显不稳时不检查。"), access: "therapist", testMode: "passive" },
  ],
  strengths: [
    strength("ankle-dorsiflexor", "勾脚力量", "坐着主动勾脚，用另一只脚或手在脚背轻轻向下压，保持5秒。", "和健侧比较力量，留意脚趾有没有使劲代替脚踝发力。", ["tibialis-anterior", "dorsiflexion"]),
    strength("ankle-evertor", "脚掌向外推的力量（腓骨肌）", "坐稳。把另一只脚挡在不舒服这只脚的外侧，再用不舒服这只脚向外顶住5秒；两边各做一次。", "比较哪边更容易被挡住；同时留意外踝会不会不舒服。", ["peroneal", "eversion"]),
    strength("ankle-invertor", "脚掌向内推的力量（胫骨后肌）", "坐稳。把另一只脚挡在不舒服这只脚的内侧，再用不舒服这只脚向内顶住5秒；两边各做一次。", "比较哪边更容易被挡住；同时留意内踝后方会不会不舒服。", ["tibialis-posterior", "inversion", "arch"]),
    strength("ankle-calf", "小腿三头肌 / 提踵", "先双脚提踵10个；稳定后扶墙做单脚提踵，最多记录20个高质量次数。", "提踵高度、节奏、膝是否弯曲和患侧耐力。", ["calf", "heel-raise"]),
    strength("ankle-intrinsic", "足部小肌群", "站立保持脚趾放松，尝试缩短脚掌、轻抬足弓5秒。", "足弓是否可控，脚趾是否抓地或卷曲。", ["foot-intrinsic", "arch"]),
  ],
  functions: [
    functional("ankle-squat", "下蹲", "双脚自然站立，扶住固定物，慢慢下蹲到舒适深度再站起。", "两边膝盖高度、膝盖方向和脚跟是否提前抬起。", ["squat", "dorsiflexion", "lower-chain"]),
    functional("ankle-weight-bearing", "走路与患侧承重", "在可扶持环境下走一小段。先看患侧能否承重，再观察脚跟着地、身体经过支撑脚和脚尖蹬地是否连贯。", "记录能否承重、是否跛行、哪一步出现症状，以及左右步幅是否明显不同。", ["weight-bearing", "gait", "rocker", "push-off"], "明显错位或足部持续发白、发凉、麻木时不测试；急性疼痛明显时不用硬走。"),
    functional("ankle-knee-wall", "膝碰墙背屈", "脚跟不离地，膝盖向墙移动；从容易距离开始，左右比较最远可控距离。", "脚跟、足弓和膝方向，踝前卡痛或小腿牵扯。", ["weight-bearing-dorsiflexion", "squat"], "急性明显肿胀或不能稳定负重时暂不测试。"),
    functional("ankle-heel-raise", "提踵", "先双脚同步提踵10个，再根据耐受做单脚提踵。", "高度、节奏、足弓、跟腱/小腿症状和高质量次数。", ["heel-raise", "push-off"]),
    functional("ankle-single-leg", "单腿站", "靠近墙，先做健侧，再用患侧单腿站立20秒，必要时手指轻扶。", "身体是否明显晃动，患侧是否明显更难站稳。", ["balance", "single-leg"]),
    functional("ankle-hop", "小跳与落地", "只在步态、提踵和单腿站稳定后，完成双脚小跳，再考虑单脚。", "落地疼痛、不稳、缓冲和再次起跳能力。", ["hop", "landing", "sport"], "急性损伤、肿胀、走路仍疼或提踵明显不足时不测试。"),
  ],
  specialTests: [
    special("ankle-bone-weight-screen", "急性崴脚后的拍片优先判断", "coach", "急性外伤后有明确骨点压痛或负重困难", "通过问答记录具体骨点、受伤当时与现在能否走四步，以及是否已有影像。", "这些答案只影响拍片优先级，不能单独诊断骨折。", ["bone-screen", "imaging", "acute"], "这组问答放在关键确认环节，不通过反复重按或强行走四步证明安全。"),
    special("ankle-anterior-drawer", "踝外侧稳定检查", "therapist", "内翻崴脚后反复打软、不稳或外踝前方症状", "由熟悉手法的专业人员比较前抽屉及相关外侧韧带稳定。", "患侧松弛度、终末感和不稳是否与健侧明显不同。", ["lateral-ligament", "stability"], "非专业用户跳过；阳性线索结合受伤时间、功能和必要影像。"),
    special("ankle-thompson", "小腿挤压 / 跟腱连续性筛查", "coach", "突然蹬地或跳跃后踝后方剧痛、听到响声、无法正常提踵", "俯卧或跪姿让脚伸出床边，由熟悉者轻挤小腿，比较足部自然跖屈反应。", "患侧足部反应明显少于健侧，且功能表现吻合。", ["achilles", "calf-squeeze"], "可疑结果停止普通训练并及时专业评估，不用反复测试。"),
    special("ankle-windlass", "大脚趾—足底张力反应", "self", "足底或足跟痛与晨起、走路、提踵相关", "坐姿或站立轻抬大脚趾，比较足弓变化和足底症状。", "是否准确再现熟悉足底症状，以及足弓是否能随大脚趾抬起。", ["windlass", "plantar", "great-toe"], "阳性只表示足底—大脚趾链值得检查，不排除其他足跟痛来源。"),
  ],
  mobilityInterventions: [
    candidate(
      "ankle-rom-calf-release",
      "小腿后侧肌群",
      "muscle",
      "self",
      "用手或泡沫轴轻柔放松小腿后侧，每个紧张区域30～60秒。",
      "不重压跟腱或急性损伤中心；只处理本次检查确实紧张或会牵扯受限方向的区域。",
      "一次比较仍未解决的背屈和跖屈；达到健侧的方向立即从后续清单移除。",
      ["calf", "dorsiflexion", "plantarflexion"],
      { retestIds: ["ankle-dorsiflexion", "ankle-plantarflexion"], siteLabel: "小腿后侧肌群", targetLabel: "腓肠肌、比目鱼肌", actionLabel: "小腿后侧肌群轻柔松解" },
    ),
    candidate(
      "ankle-rom-anterior-release",
      "小腿前侧肌群",
      "muscle",
      "self",
      "用手轻柔放松小腿前侧，每个紧张区域30～60秒。",
      "先看触诊、主动发力和受限方向是否对应；力量偏弱但不紧张时不以松解替代训练。",
      "一次比较仍未解决的背屈和跖屈；记录哪一个方向真正改变。",
      ["tibialis-anterior", "toe-extensor", "dorsiflexion", "plantarflexion"],
      { retestIds: ["ankle-dorsiflexion", "ankle-plantarflexion"], siteLabel: "小腿前侧肌群", targetLabel: "胫骨前肌、趾伸肌群", actionLabel: "小腿前侧肌群轻柔松解" },
    ),
    candidate(
      "ankle-rom-lateral-release",
      "小腿外侧肌群",
      "muscle",
      "self",
      "用手或泡沫轴轻柔放松小腿外侧，每个紧张区域30～60秒。",
      "外翻力量偏弱时后续应训练腓骨肌，不因为做过松解就省略力量检查。",
      "一次比较仍未解决的内翻和外翻；达到健侧的方向不再重复复测。",
      ["peroneal", "inversion", "eversion"],
      { retestIds: ["ankle-inversion", "ankle-eversion"], siteLabel: "小腿外侧肌群", targetLabel: "腓骨长肌、腓骨短肌", actionLabel: "腓骨肌群轻柔松解" },
    ),
    candidate(
      "ankle-rom-medial-release",
      "小腿深后侧与内侧肌群",
      "muscle",
      "coach",
      "轻柔比较并松解胫骨后肌、趾长屈肌和拇长屈肌中紧张或牵扯明显的区域；它们参与内翻和足弓支撑，也可能在过紧时限制外翻。",
      "避开内踝后方神经血管区域，不深压；力量偏弱时把胫骨后肌和足弓控制留给训练。",
      "一次比较仍未解决的内翻和外翻；记录哪一个方向真正改变。",
      ["tibialis-posterior", "toe-flexor", "inversion", "eversion"],
      { retestIds: ["ankle-inversion", "ankle-eversion"], siteLabel: "小腿后内侧肌群", targetLabel: "胫骨后肌、趾屈肌群", actionLabel: "小腿后内侧肌群轻柔松解" },
    ),
    candidate(
      "ankle-rom-sagittal-joint",
      "踝关节背屈与跖屈方向",
      "joint",
      "therapist",
      "肌肉处理后仍未达到健侧时，根据受限方向做踝关节松动；背屈和跖屈分别按检查结果处理。",
      "未排除骨性问题、急性高刺激、明显不稳或肿胀过大时不强推末端。",
      "只复测本次关节松动实际针对的背屈或跖屈，再比较主动范围和原疼痛动作。",
      ["joint-mobility", "dorsiflexion", "plantarflexion"],
      { retestIds: ["ankle-dorsiflexion", "ankle-plantarflexion"], siteLabel: "踝关节", targetLabel: "距小腿关节", actionLabel: "背屈/跖屈方向关节松动" },
    ),
    candidate(
      "ankle-rom-frontal-joint",
      "距下关节与足部内外翻方向",
      "joint",
      "therapist",
      "肌肉处理后内翻或外翻仍未达到健侧时，根据受限方向做距下关节、腓骨或中足关节松动。",
      "不凭静态足位判断错位；急性不稳、骨性风险或明显加重时停止。",
      "只复测本次实际针对的内翻或外翻，再比较主动范围和原疼痛动作。",
      ["joint-mobility", "inversion", "eversion"],
      { retestIds: ["ankle-inversion", "ankle-eversion"], siteLabel: "踝足内外侧", targetLabel: "距下关节、腓骨与中足", actionLabel: "内翻/外翻方向关节松动" },
    ),
    candidate(
      "ankle-rom-dorsiflexion-control",
      "背屈主动控制训练",
      "control",
      "self",
      "坐姿或站姿在可用范围主动勾脚，必要时用轻弹力带训练胫骨前肌、趾长伸肌和拇长伸肌；重点让脚踝带动，不用脚趾代偿。",
      "只在被动接近健侧、主动仍较少或对应背屈力量偏弱时进入；先做一组5～8个。",
      "复测主动背屈；被动不需要跟着每一组训练反复测。",
      ["control", "tibialis-anterior", "dorsiflexion"],
      { retestIds: ["ankle-dorsiflexion"], siteLabel: "踝关节前侧", targetLabel: "胫骨前肌、趾伸肌群", actionLabel: "背屈主动控制训练" },
    ),
    candidate(
      "ankle-rom-plantarflexion-control",
      "跖屈主动控制训练",
      "control",
      "self",
      "从坐姿提踵或无负重脚背下压开始，训练腓肠肌、比目鱼肌及协同跖屈肌；能稳定承重后再进阶到双脚提踵。",
      "只在被动接近健侧、主动仍较少或提踵力量偏弱时进入；不靠卷脚趾代偿。",
      "复测主动跖屈或同条件提踵，不要求力量一组后立刻达到健侧。",
      ["control", "calf", "plantarflexion", "heel-raise"],
      { retestIds: ["ankle-plantarflexion"], siteLabel: "小腿后侧", targetLabel: "腓肠肌、比目鱼肌", actionLabel: "跖屈主动控制训练" },
    ),
    candidate(
      "ankle-rom-inversion-control",
      "内翻主动控制训练",
      "control",
      "self",
      "用小幅主动内翻或轻弹力带训练胫骨后肌与胫骨前肌的协同，同时保持脚趾放松和足弓可控。",
      "只在被动接近健侧、主动仍较少或内翻力量偏弱时进入；不要转动整条小腿代偿。",
      "复测主动内翻和足弓控制，不重复测试已经接近健侧的其他方向。",
      ["control", "tibialis-posterior", "tibialis-anterior", "inversion"],
      { retestIds: ["ankle-inversion"], siteLabel: "踝足内侧", targetLabel: "胫骨后肌、胫骨前肌与足弓", actionLabel: "内翻主动控制训练" },
    ),
    candidate(
      "ankle-rom-eversion-control",
      "外翻主动控制训练",
      "control",
      "self",
      "用小幅主动外翻或轻弹力带训练腓骨长肌、腓骨短肌和腓骨第三肌，保持脚趾和膝盖放松。",
      "只在被动接近健侧、主动仍较少或外翻力量偏弱时进入；不要用小腿整体旋转代偿。",
      "复测主动外翻，不重复测试已经接近健侧的其他方向。",
      ["control", "peroneal", "eversion"],
      { retestIds: ["ankle-eversion"], siteLabel: "踝足外侧", targetLabel: "腓骨肌群", actionLabel: "外翻主动控制训练" },
    ),
    candidate(
      "ankle-p0-cuboid-mobility",
      "骰骨与足外侧柱活动",
      "joint",
      "therapist",
      "只有骰骨与足外侧柱活动检查明确受限时，才进行对应的低刺激处理。",
      "急性肿胀、骨性风险或明显不稳时停止；不能用外踝位置或外侧不适代替检查结果。",
      "只复查骰骨与足外侧柱活动，不把背屈、外翻或足趾结果合并代替。",
      ["cuboid", "lateral-column", "joint-mobility"],
      { retestIds: ["ankle-cuboid-mobility"], siteLabel: "足外侧柱", targetLabel: "骰骨", actionLabel: "骰骨与足外侧柱低刺激处理" },
    ),
  ],
  candidateGroups: [
    {
      id: "ankle-calf-anterolateral-chain",
      title: "小腿前侧或外侧活动时不舒服",
      match: { locations: ["小腿前侧", "小腿外侧"], feelings: ["酸", "紧", "扯", "不舒服", "发力"], actions: ["勾脚", "走路", "跑步", "抬脚", "外翻"] },
      note: "先按用户实际选择区分小腿前侧和外侧；如果局部处理变化不明显，再把大腿外侧链作为一次反应试验，不直接归因为髂胫束。",
      candidates: [
        candidate("ankle-calf-anterior-local", "小腿前侧肌群", "muscle", "self", "检查支持小腿前侧时，轻柔松解胫骨前肌或趾伸肌周围30～60秒。", "避开胫骨骨面和明确刺痛点；力量偏弱时仍需安排勾脚控制。", "复测原来的勾脚、走路或发力动作。", ["tibialis-anterior", "toe-extensor", "dorsiflexion"], { retestIds: ["ankle-dorsiflexion"], siteLabel: "小腿前侧肌群", targetLabel: "胫骨前肌与趾伸肌群", actionLabel: "小腿前侧肌群轻柔松解" }),
        candidate("ankle-calf-lateral-local", "小腿外侧肌群", "muscle", "self", "检查支持小腿外侧时，轻柔松解腓骨肌周围30～60秒。", "避开腓骨骨面和明确刺痛点；力量偏弱时仍需安排外翻控制。", "复测原来的外翻、走路或发力动作。", ["peroneal", "eversion"], { retestIds: ["ankle-eversion"], siteLabel: "小腿外侧肌群", targetLabel: "腓骨肌群", actionLabel: "小腿外侧肌群轻柔松解" }),
        candidate("ankle-calf-anterolateral-tfl-response", "大腿外侧链反应试验", "muscle", "coach", "如果处理小腿前外侧后变化不明显，轻柔处理阔筋膜张肌与髂胫束周围肌肉，再重复原动作。", "这是根据线下案例加入的候选试验；只有原动作稳定改善，才保留为后续重点。不要沿髂胫束整条重压。", "复测同一个勾脚、走路或发力动作，记录是否真正变化。", ["tfl", "lateral-chain", "calf-anterolateral", "response-test"], { siteLabel: "大腿外侧与髋外侧", targetLabel: "阔筋膜张肌与髂胫束周围肌肉", actionLabel: "大腿外侧链轻柔松解" }),
      ],
    },
    {
      id: "ankle-lateral-sprain",
      title: "外踝或前外侧，崴脚后 / 走路痛",
      match: { locations: ["外踝 / 前外侧", "足背"], feelings: ["肿", "刺", "酸", "不稳"], actions: ["崴脚", "走路", "内翻", "下楼"] },
      note: "先按时间、肿胀、负重和骨性风险分流；肌肉与关节反应不能排除韧带或骨性问题。",
      candidates: [
        candidate("ankle-lateral-swelling", "肿胀管理", "swelling", "self", "休息时垫高患侧小腿；在疼痛允许范围内缓慢勾脚、下压10～20次。", "本次不要求肿胀马上消失，不反复按压检查。", "当天晚些时候或第二天再比较肿胀边界和踝骨轮廓。", ["swelling", "acute-sprain"], { targetLabel: "肿胀区域", actionLabel: "垫高与踝泵活动" }),
        candidate("ankle-lateral-anterior-muscles", "小腿前侧肌群", "muscle", "self", "如果检查发现小腿前侧更紧或更酸，轻柔松解胫骨前肌或趾伸肌周围30～60秒。", "避开胫骨骨面、肿胀中心和明确刺痛点。", "复测仍未恢复的勾脚和原来的不适动作。", ["tibialis-anterior", "toe-extensor", "dorsiflexion"], { retestIds: ["ankle-dorsiflexion"], siteLabel: "小腿前侧肌群", targetLabel: "胫骨前肌与趾伸肌群", actionLabel: "小腿前侧肌群轻柔松解" }),
        candidate("ankle-lateral-peroneal-muscles", "小腿外侧肌群", "muscle", "self", "如果检查发现小腿外侧更紧或更酸，轻柔松解腓骨肌周围30～60秒。", "避开腓骨骨面、肿胀中心和明确刺痛点。", "复测仍未恢复的外翻和原来的不适动作。", ["peroneal", "eversion"], { retestIds: ["ankle-eversion"], siteLabel: "小腿外侧肌群", targetLabel: "腓骨肌群", actionLabel: "小腿外侧肌群轻柔松解" }),
        candidate("ankle-lateral-joints", "检查距骨、腓骨与外侧足部关节", "joint", "therapist", "肌肉处理后被动仍受限时，由专业人员按结果检查距骨、近远端腓骨或骰骨。", "未排除骨性问题、急性高刺激或明显不稳时不松动。", "被动方向 → 主动方向 → 走路或台阶。", ["talus", "fibula", "cuboid"]),
        candidate("ankle-lateral-control", "训练外翻与足弓控制", "control", "self", "在无明显疼痛范围做主动外翻、足弓控制和逐步重心转移。", "膝与脚尖方向自然，脚趾不抓地。", "复测走路和单腿站；力量留待后续。", ["eversion", "arch", "weight-shift"]),
      ],
    },
    {
      id: "ankle-medial-arch",
      title: "内踝或足弓内侧疼",
      match: { locations: ["内踝 / 足弓内侧", "足底 / 足跟"], feelings: ["酸", "刺", "牵扯", "塌"], actions: ["走路", "提踵", "久站", "跑步"] },
      note: "胫骨后肌、屈趾肌、足底组织、足舟骨和足弓支撑均为候选。",
      candidates: [
        candidate("ankle-medial-muscles", "检查胫骨后肌、屈趾肌与足底组织", "muscle", "coach", "比较内翻抗阻、提踵和内踝后方/足底触诊，选择一组反应试验。", "不直接重压内踝后方神经血管区域。", "复测相同提踵、走路或足弓负重。", ["tibialis-posterior", "plantar", "medial-ankle"]),
        candidate("ankle-medial-joints", "检查足舟骨与第一跖趾活动", "joint", "therapist", "主动被动活动均受限时，由专业人员检查足舟骨、距骨和第一跖趾关节。", "不凭静态足弓高低诊断问题。", "复测活动、足弓控制和原功能。", ["navicular", "great-toe", "joint-mobility"]),
        candidate("ankle-medial-control", "足弓与提踵控制练习", "control", "self", "脚趾放松，轻轻抬起足弓5次；再扶墙做5个双脚提踵。", "脚跟垂直抬起，不向内外偏。", "重新比较走路、提踵或单腿站。", ["arch", "heel-raise", "lower-chain"]),
      ],
    },
    {
      id: "ankle-anterior-dorsiflexion",
      title: "踝前卡或背屈受限",
      match: { locations: ["踝前方"], feelings: ["卡", "顶", "刺", "紧"], actions: ["下蹲", "膝碰墙", "下楼", "走路"] },
      note: "小腿、胫骨前/趾伸肌、距骨和局部刺激是第一批候选。",
      candidates: [
        candidate("ankle-df-muscles", "小腿后侧轻柔松解", "muscle", "self", "用手或泡沫轴轻柔放松小腿后侧，每个紧张区域30～60秒。", "不要持续重压踝前刺痛点。", "重新比较勾脚和原来的不适动作。", ["dorsiflexion", "calf", "posterior-chain"]),
        candidate("ankle-df-joint", "检查距骨与踝关节背屈方向", "joint", "therapist", "肌肉处理后被动背屈仍明显受限时，由专业人员检查距骨后滑和踝关节方向。", "出现锐痛、急性肿胀或骨性风险不强推。", "被动背屈 → 主动背屈 → 膝碰墙 / 下蹲。", ["talus", "joint-mobility", "dorsiflexion"]),
        candidate("ankle-df-control", "训练新范围内胫骨前移", "control", "self", "在墙前做小幅膝碰墙，保持脚跟和足弓稳定。", "膝盖沿脚趾方向移动，不塌足弓、不抬脚跟。", "复测膝碰墙距离和原下蹲/台阶。", ["weight-bearing-dorsiflexion", "control"]),
      ],
    },
    {
      id: "ankle-posterior-achilles",
      title: "跟腱或踝后方疼",
      match: { locations: ["跟腱 / 踝后方"], feelings: ["酸", "痛", "僵", "突然撕裂感"], actions: ["提踵", "跑步", "跳跃", "晨起"] },
      note: "先排除急性撕裂线索；非急性负荷问题才进入渐进提踵路径。",
      candidates: [
        candidate("ankle-achilles-muscles", "小腿后侧轻柔松解", "muscle", "self", "用手或泡沫轴轻柔放松小腿肌肉，每个紧张区域30～60秒。", "不压跟腱疼痛点，不做强力拉伸。", "重新比较固定个数提踵或原来的走路动作。", ["calf", "achilles", "dorsiflexion"]),
        candidate("ankle-achilles-load", "双脚提踵起步", "control", "self", "确认没有突然断裂线索后，扶墙做一组5～8个双脚提踵。", "疼痛不逐个明显上升；第二天没有持续加重。", "记录提踵高度、个数和次日反应。", ["tendon-loading", "heel-raise"]),
      ],
    },
    {
      id: "ankle-plantar-heel",
      title: "足底或足跟疼",
      match: { locations: ["足底 / 足跟", "足趾根部"], feelings: ["刺", "酸", "晨起僵", "牵扯"], actions: ["晨起第一步", "走路", "久站", "提踵"] },
      note: "足底组织、足趾、足弓、小腿和步态共同检查；晨起反应主要用于随访。",
      candidates: [
        candidate("ankle-plantar-muscles", "足底与足弓轻柔松解", "muscle", "self", "用软球轻滚足底和足弓周围，每个区域30～60秒。", "避开足跟刺痛点，不反复重压。", "重新比较走路或提踵；晨起反应第二天再记录。", ["plantar", "great-toe"]),
        candidate("ankle-plantar-joints", "检查第一跖趾和足部关节", "joint", "therapist", "主动被动均受限时，由专业人员检查第一跖趾、足舟骨及相关足部关节。", "不把足跟痛固定套用跟腱或足底筋膜单一路径。", "复测足趾活动、步态推进和提踵。", ["great-toe", "foot-joint"]),
        candidate("ankle-plantar-control", "足弓与走路推蹬练习", "control", "self", "脚趾放松，轻抬足弓5次；再慢走一小段，感受脚跟着地到前脚掌推地。", "脚趾不抓地，步幅保持自然。", "重新比较原来的走路或提踵动作。", ["arch", "gait", "push-off"]),
      ],
    },
  ],
  exercises: [
    exercise("ankle-four-way-motion", "踝关节四方向活动", 1, "3组", "每个方向每组10个", "仰卧或半躺，小腿放松，分别缓慢做勾脚、下压、脚掌向内转和向外转。", "小腿不跟着转，不硬顶肿胀或刺痛末端。", "每组6个、减小幅度。", "加入弹力带轻阻力。", ["ankle-rom"]),
    exercise("ankle-achilles-isometric", "坐姿提踵保持", 1, "2组", "每组5次，每次保持5秒", "坐稳，前脚掌踩地，缓慢抬起脚跟到可接受高度并保持，再轻轻放下。", "跟腱症状不逐次增加；当天晚些时候和第二天没有持续加重。", "减小抬起高度或保持3秒。", "先增加到每组8次，再进入双脚慢速提踵。", ["achilles", "tendon-loading", "heel-raise", "isometric"]),
    exercise("ankle-bridge", "臀桥", 2, "3组", "每组10个", "仰卧屈膝，双脚稳定踩地，轻收腹后抬起臀部，停1秒再缓慢落下。", "骨盆不歪斜，臀部和大腿后侧发力，脚踝保持稳定。", "减小抬起高度或每组6个。", "能够稳定完成后进阶单腿臀桥。", ["glute-max", "hamstring", "posterior-chain", "pelvic-stability"]),
    exercise("ankle-single-leg-bridge", "单腿臀桥", 3, "3组", "每侧每组6～10个", "先完成双脚臀桥，再抬起一只脚，用另一侧臀部抬起骨盆。", "骨盆不旋转，支撑脚稳定，不用腰部顶起。", "继续双脚臀桥，或只把一只脚轻轻离地。", "进阶站立屈髋和重心转移。", ["glute-max", "hamstring", "posterior-chain", "single-leg", "pelvic-stability"]),
    exercise("ankle-standing-hip-flexion", "站立屈髋", 3, "3组", "每组10个", "双脚站稳，膝盖微屈，臀部向后移动，身体从髋部向前折叠，再用臀腿站起。", "骨盆稳定，髋膝踝方向一致，脚掌保持接触地面。", "臀部向后碰墙并扶住固定物。", "增加范围、轻负重或改单腿屈髋。", ["hip-hinge", "standing-hip-flexion", "posterior-chain", "hip-knee-ankle"]),
    exercise("ankle-dorsiflexion-control", "背屈控制（勾脚）", 2, "3组", "每组10～15个", "仰卧或半躺，小腿放松，主动把脚背向小腿方向勾起；需要增加负荷时再加入轻弹力带。", "脚踝带动，不只抬脚趾；小腿不向外转。", "先做无阻力，每组6～8个。", "进阶到坐位弹力带，再到站立脚跟走的短距离控制。", ["tibialis-anterior", "dorsiflexion", "ankle-dorsiflexor"]),
    exercise("ankle-plantarflexion-control", "跖屈控制（下压脚背）", 2, "3组", "每组10～15个", "仰卧或半躺，脚掌轻推弹力带做向下压脚背；能稳定完成后再进阶坐姿提踵。", "动作来自脚踝，脚趾不过度抓地。", "去掉弹力带，只做主动下压。", "进阶到坐姿、扶墙双脚提踵，再到单脚提踵。", ["calf", "plantarflexion", "heel-raise", "ankle-calf"]),
    exercise("ankle-inversion-control", "内翻与足弓控制", 2, "3组", "每组10～15个", "仰卧或半躺，小腿不动，先做小幅脚掌向内转；能稳定完成后再加入轻弹力带。", "小腿不跟着旋转，内踝后方不过度刺痛。", "去掉弹力带，只做小幅主动内翻。", "进阶到坐位弹力带，再在站立中保持足弓。", ["tibialis-posterior", "tibialis-anterior", "inversion", "arch", "ankle-invertor"]),
    exercise("ankle-eversion-control", "外翻控制", 2, "3组", "每组10～15个", "仰卧或半躺，小腿不动，先做脚掌向外转；能稳定完成后再加入轻弹力带。", "动作来自脚踝，不用膝盖或整条小腿向外转。", "去掉弹力带，只做小幅主动外翻。", "进阶到坐位弹力带，再进入单腿站和侧向控制。", ["peroneal", "eversion", "ankle-evertor"]),
    exercise("ankle-toe-control", "足趾主动控制", 2, "3组", "每组8～10个", "坐稳、脚跟着地，分别抬起和放下脚趾；只练检查中仍然控制不足的动作。", "脚趾分别活动，脚踝和膝盖保持稳定，不用抓地代偿。", "减小幅度，每组5个。", "能够稳定完成后再增加保持时间。", ["toe-control", "toe-extensor", "foot"]),
    exercise("ankle-band-heelraise", "四方向抗阻与双脚提踵", 2, "3组", "每项每组12个", "按力量缺口选1～2个弹力带方向，再做双脚提踵。", "动作来自踝足，膝和脚趾不过度代偿。", "改为等长或扶墙小幅提踵。", "单脚提踵或加轻负重。", ["ankle-strength", "calf", "peroneal"]),
    exercise("ankle-gait-weightshift", "重心转移与步态滚动", 3, "3组", "每组10次重心转移 + 10米步行", "从双脚前后重心转移，练到脚跟着地—胫骨前移—前足蹬地。", "步幅自然，骨盆、髋、膝、踝连续协同。", "扶桌原地转移。", "增加连续步数或不同速度。", ["gait", "weight-shift", "hip-knee-ankle"]),
    exercise("ankle-single-leg-step", "单腿站、提踵与台阶", 4, "3组", "每项每侧8个", "先单腿站，再单脚提踵和低台阶上下。", "足弓、踝、膝和骨盆稳定，台阶下降可控。", "扶墙、双脚提踵或降低台阶。", "增加高度、连续次数或轻负重。", ["single-leg", "heel-raise", "step"]),
    exercise("ankle-split-squat-deceleration", "分腿蹲与减速", 4, "3组", "每侧每组8个", "做分腿蹲和前跨一步后稳定停住，训练下肢协同承重。", "足弓稳定，髋膝踝共同缓冲，不让踝足专项被髋训练替代。", "减小幅度并扶墙。", "增加负重或侧向跨步。", ["lower-chain", "deceleration"]),
    exercise("ankle-hop-change-direction", "快提踵、跳跃与变向", 5, "4组", "每组5个", "从快节律双脚提踵、双脚小跳，进阶到单脚落地、侧跳和变向。", "每次落地稳定，踝不打软，髋膝踝连续吸收和释放力量。", "回到慢提踵或双脚小幅落地。", "增加速度、距离、方向或专项组合。", ["hop", "landing", "change-direction", "sport"]),
  ],
};

type MobilityMuscleCluster = {
  id: string;
  site: string;
  target: string;
  retestIds: string[];
  tags: string[];
};

type SpinalControlPlan = {
  id: string;
  title: string;
  action: string;
  observe: string;
  retestIds: string[];
  tags: string[];
  actionLabel: string;
};

const SPINAL_CONTROL_PLANS: Partial<Record<FullRegionId, SpinalControlPlan[]>> = {
  neck: [
    {
      id: "deep-stability",
      title: "颈部深层稳定控制",
      action: "仰卧，后脑勺轻放，先做轻微点头但不抬头，保持5秒，做2组，每组6～8次。能够稳定完成后，用手从前、后或不舒服一侧轻轻推头，头部保持不动，每个方向5秒，做5次。",
      observe: "不抬头、不憋气、不耸肩；重点是轻柔稳定，不反复做到疼痛末端。",
      retestIds: ["neck-flexion", "neck-extension", "neck-rotation-left", "neck-rotation-right", "neck-sidebend-left", "neck-sidebend-right"],
      tags: ["deep-neck-flexor", "neck-stability", "isometric", "control"],
      actionLabel: "颈部中立位深层稳定训练",
    },
  ],
  "thoracic-rib": [
    {
      id: "segmental-stability",
      title: "胸廓呼吸与躯干分离控制",
      action: "坐姿或四点跪保持骨盆不动，先做5次缓慢胸廓呼吸。随后交替向前抬一只手，胸口保持朝下或朝前，每侧做6～8次，共2组；稳定后再进阶为四点跪交替抬手。",
      observe: "腰部不过度代偿，肩胛不耸起；不反复冲击原来受限或疼痛的末端。",
      retestIds: ["thoracic-extension", "thoracic-rotation-left", "thoracic-rotation-right", "thoracic-sidebend-left", "thoracic-sidebend-right"],
      tags: ["core", "anti-rotation", "breathing", "thoracic-control"],
      actionLabel: "胸廓呼吸与躯干稳定训练",
    },
  ],
  "lumbar-pelvis": [
    {
      id: "deep-core",
      title: "腰腹深层稳定控制",
      action: "仰卧屈膝，呼气时轻收下腹，保持腰和骨盆不晃，先维持5次呼吸。随后交替抬起一只脚，每侧6～8次，共2组；能稳定完成后再进阶到四点跪交替抬手或抬腿。",
      observe: "腰部不反复弯到末端，不用力压腰、不憋气；腹部与多裂肌保持轻柔持续发力。",
      retestIds: ["lumbar-flexion", "lumbar-extension", "lumbar-rotation-left", "lumbar-rotation-right", "lumbar-sidebend-left", "lumbar-sidebend-right"],
      tags: ["core", "deep-core", "multifidus", "pelvic-stability", "dead-bug"],
      actionLabel: "腰腹深层稳定训练",
    },
    {
      id: "hip-spine-separation",
      title: "髋与腰部分离控制",
      action: "站在墙前约一脚距离，腰部保持舒适，臀部向后碰墙再站起，先做2组，每组8～10次。能够保持腰部稳定后，再逐渐增加后坐距离或手持轻物。",
      observe: "动作来自髋部，腰部不突然弯曲或后仰；只在无明显加重的范围练习。",
      retestIds: ["lumbar-flexion", "lumbar-extension"],
      tags: ["hip-hinge", "pelvic-control", "movement-control", "core"],
      actionLabel: "髋与腰部分离控制训练",
    },
  ],
};

function buildRegionalMobilityLibrary(region: FullRegion, clusters: MobilityMuscleCluster[]): FullCandidate[] {
  const directionIds = region.directions.map((item) => item.id);
  const spinalRegion = ["neck", "thoracic-rib", "lumbar-pelvis"].includes(region.id);
  const muscleCandidates = clusters.map((cluster) => candidate(
    `${region.id}-mobility-${cluster.id}`,
    cluster.target,
    "muscle",
    "coach",
    spinalRegion
      ? `先在${cluster.site}找到与当前不适动作、牵扯方向或按压反应最相关的一组肌肉，只做一次轻柔松解。`
      : `先在${cluster.site}找到与当前不适、紧张或受限方向最相关的一组肌肉，只做一次轻柔松解。`,
    "没有明显紧张、按压不适或动作关联时，不因为名称相关就默认松解。",
    spinalRegion
      ? "先回到原来会不适的动作并重新评分，同时记录活动范围变化；不为了追求角度反复处理。"
      : "回到主诉动作，并一次比较这组肌肉关联的全部未解决方向；已经恢复的方向退出后续处理。",
    cluster.tags,
    { retestIds: cluster.retestIds, siteLabel: cluster.site, targetLabel: cluster.target, actionLabel: "轻柔肌肉松解" },
  ));
  const jointCandidate = candidate(
    `${region.id}-mobility-joint`,
    `${region.shortName}关节活动`,
    "joint",
    "therapist",
    "根据仍然受限的具体方向，选择一个对应的低刺激关节松动方向。",
    "只在专业被动检查仍小于比较目标时进入，不把疼痛或主动控制不足直接当成关节受限。",
    "先复测仍受限的方向，再回到主诉动作；达到比较目标的方向不再重复处理。",
    ["joint-mobility", ...directionIds],
    { retestIds: directionIds, siteLabel: region.name, targetLabel: "仍然受限的方向", actionLabel: "根据受限方向做关节松动" },
  );
  const spinalPlans = SPINAL_CONTROL_PLANS[region.id];
  const controls = spinalPlans?.length
    ? spinalPlans.map((plan) => candidate(
      `${region.id}-mobility-${plan.id}-control`,
      plan.title,
      "control",
      "self",
      plan.action,
      plan.observe,
      "完成后只复测一次原动作和相关活动范围，不把复测动作当成训练反复练习。",
      plan.tags,
      { retestIds: plan.retestIds, siteLabel: region.name, targetLabel: plan.title, actionLabel: plan.actionLabel },
    ))
    : region.directions.map((item) => candidate(
      `${region.id}-mobility-${item.id}-control`,
      `${item.title}主动控制`,
      "control",
      "self",
      `在当前可用范围内缓慢完成“${item.title}”5～8次，每次到舒适末端后停1秒再回来。`,
      "只训练这个仍然主动不足的方向，不借其他部位制造幅度。",
      "只复测该方向的主动范围和动作不适，不要求一组训练后力量立刻达到健侧。",
      ["active-control", ...item.tags],
      { retestIds: [item.id], siteLabel: region.name, targetLabel: item.title, actionLabel: `${item.title}主动控制训练` },
    ));
  return [...muscleCandidates, jointCandidate, ...controls];
}

function withRegionalMobility(region: FullRegion, clusters: MobilityMuscleCluster[]): FullRegion {
  return { ...region, mobilityInterventions: region.mobilityInterventions ?? buildRegionalMobilityLibrary(region, clusters) };
}

const REGIONAL_MOBILITY_CLUSTERS: Record<Exclude<FullRegionId, "ankle-foot" | "thigh-local" | "calf-local">, MobilityMuscleCluster[]> = {
  neck: [
    { id: "posterior", site: "颈后与枕骨下方", target: "枕下肌、颈后肌群与上斜方肌", retestIds: ["neck-flexion", "neck-extension", "neck-rotation-left", "neck-rotation-right", "neck-sidebend-left", "neck-sidebend-right"], tags: ["posterior", "neck-rom", "flexion", "extension"] },
    { id: "anterolateral", site: "颈部前侧与侧面", target: "胸锁乳突肌、斜角肌与肩胛提肌", retestIds: ["neck-extension", "neck-rotation-left", "neck-rotation-right", "neck-sidebend-left", "neck-sidebend-right"], tags: ["anterior", "lateral", "rotation-left", "rotation-right", "sidebend-left", "sidebend-right"] },
  ],
  shoulder: [
    { id: "anterior", site: "肩前与胸前", target: "胸大肌、胸小肌、三角肌前束与肱二头肌周围", retestIds: ["shoulder-flexion", "shoulder-extension", "shoulder-external-rotation"], tags: ["anterior", "flexion", "extension", "overhead"] },
    { id: "posterior", site: "肩后与肩胛外侧", target: "冈下肌、小圆肌、三角肌后束与背阔肌", retestIds: ["shoulder-flexion", "shoulder-internal-rotation", "shoulder-external-rotation"], tags: ["posterior", "rotator-cuff", "internal-rotation", "external-rotation"] },
    { id: "superior-lateral", site: "肩上方与外侧", target: "上斜方肌、肩胛提肌、三角肌与肩袖周围", retestIds: ["shoulder-flexion", "shoulder-abduction"], tags: ["superior", "lateral", "abduction", "painful-arc"] },
  ],
  "thoracic-rib": [
    { id: "posterior", site: "上背与肩胛骨之间", target: "胸椎旁肌、竖脊肌与菱形肌", retestIds: ["thoracic-extension", "thoracic-rotation-left", "thoracic-rotation-right", "thoracic-sidebend-left", "thoracic-sidebend-right"], tags: ["posterior", "thoracic-rom", "upper-back"] },
    { id: "anterior", site: "胸前", target: "胸大肌、胸小肌与胸廓前侧软组织", retestIds: ["thoracic-extension", "thoracic-rotation-left", "thoracic-rotation-right"], tags: ["anterior", "thoracic-extension", "overhead"] },
    { id: "lateral", site: "胸廓侧面与背阔肌区域", target: "背阔肌、肋间肌与胸廓侧面肌群", retestIds: ["thoracic-rotation-left", "thoracic-rotation-right", "thoracic-sidebend-left", "thoracic-sidebend-right"], tags: ["lateral", "rib", "sidebend-left", "sidebend-right"] },
  ],
  elbow: [
    { id: "anterior", site: "肘前与上臂前侧", target: "肱二头肌、肱肌与肱桡肌", retestIds: ["elbow-flexion", "elbow-extension", "elbow-supination"], tags: ["anterior", "biceps", "elbow-flexion", "supination"] },
    { id: "posterior", site: "肘后与上臂后侧", target: "肱三头肌与肘后软组织", retestIds: ["elbow-flexion", "elbow-extension"], tags: ["posterior", "triceps", "elbow-extension"] },
    { id: "lateral", site: "肘外侧与前臂背侧", target: "腕伸肌群与旋后肌群", retestIds: ["elbow-pronation", "elbow-supination", "elbow-flexion", "elbow-extension"], tags: ["lateral", "wrist-extensor", "pronation", "supination"] },
    { id: "medial", site: "肘内侧与前臂掌侧", target: "屈腕—旋前肌群", retestIds: ["elbow-pronation", "elbow-supination", "elbow-flexion", "elbow-extension"], tags: ["medial", "flexor-pronator", "pronation"] },
  ],
  "wrist-hand": [
    { id: "dorsal", site: "手腕背侧与前臂背面", target: "腕伸肌与手指伸肌群", retestIds: ["wrist-flexion", "wrist-extension", "wrist-radial-deviation", "wrist-ulnar-deviation"], tags: ["posterior", "dorsal", "wrist-extensor"] },
    { id: "volar", site: "手腕掌侧与前臂掌面", target: "腕屈肌与手指屈肌群", retestIds: ["wrist-flexion", "wrist-extension", "wrist-pronation", "wrist-supination"], tags: ["anterior", "volar", "wrist-flexor"] },
    { id: "radial", site: "手腕拇指侧", target: "桡侧腕肌与拇指周围肌群", retestIds: ["wrist-radial-deviation", "wrist-ulnar-deviation", "wrist-pronation", "wrist-supination"], tags: ["radial", "thumb", "radial-deviation"] },
    { id: "ulnar", site: "手腕小指侧", target: "尺侧腕屈伸肌与前臂旋转相关肌群", retestIds: ["wrist-radial-deviation", "wrist-ulnar-deviation", "wrist-pronation", "wrist-supination"], tags: ["ulnar", "ulnar-deviation", "forearm"] },
  ],
  "lumbar-pelvis": [
    { id: "posterior", site: "腰背后侧", target: "竖脊肌、多裂肌与腰背筋膜周围", retestIds: ["lumbar-flexion", "lumbar-extension", "lumbar-rotation-left", "lumbar-rotation-right"], tags: ["posterior", "lumbar-flexion", "lumbar-extension", "bend"] },
    { id: "lateral", site: "腰部两侧与骨盆上缘", target: "腰方肌与躯干侧面肌群", retestIds: ["lumbar-sidebend-left", "lumbar-sidebend-right", "lumbar-rotation-left", "lumbar-rotation-right", "lumbar-flexion"], tags: ["lateral", "sidebend-left", "sidebend-right", "quadratus-lumborum"] },
    { id: "anterior", site: "髋前与大腿前侧", target: "腰大肌、髂肌、股直肌与阔筋膜张肌", retestIds: ["lumbar-flexion", "lumbar-extension", "lumbar-sidebend-left", "lumbar-sidebend-right"], tags: ["anterior", "hip-flexor", "rectus-femoris", "lumbar-extension", "hip-extension"] },
    { id: "posterolateral-hip", site: "臀部与髋后外侧", target: "臀肌、梨状肌与髋后侧肌群", retestIds: ["lumbar-flexion", "lumbar-extension", "lumbar-rotation-left", "lumbar-rotation-right", "lumbar-sidebend-left", "lumbar-sidebend-right"], tags: ["glute", "posterior-chain", "pelvic-stability", "rotation-left", "rotation-right"] },
  ],
  "hip-thigh": [
    { id: "anterior", site: "髋前与大腿前侧", target: "腰大肌、髂肌、股直肌、缝匠肌与阔筋膜张肌", retestIds: ["hip-flexion", "hip-extension", "hip-internal-rotation", "hip-external-rotation"], tags: ["anterior", "hip-flexor", "rectus-femoris", "hip-extension"] },
    { id: "posterior", site: "臀部与大腿后侧", target: "臀肌、深层外旋肌与腘绳肌", retestIds: ["hip-flexion", "hip-extension", "hip-internal-rotation", "hip-external-rotation"], tags: ["posterior", "glute", "hamstring", "posterior-chain"] },
    { id: "lateral", site: "髋外侧", target: "臀中小肌、阔筋膜张肌与髂胫束周围", retestIds: ["hip-adduction", "hip-abduction", "hip-internal-rotation", "hip-external-rotation"], tags: ["lateral", "glute-med", "tfl", "hip-abduction"] },
    { id: "medial", site: "大腿内侧", target: "内收肌群、耻骨肌与股薄肌", retestIds: ["hip-adduction", "hip-abduction", "hip-flexion", "hip-internal-rotation", "hip-external-rotation"], tags: ["medial", "adductor", "hip-adduction"] },
  ],
  knee: [
    { id: "anterior", site: "大腿前侧与膝前", target: "股四头肌、股直肌与髌骨周围软组织", retestIds: ["knee-flexion", "knee-extension", "knee-patella-superior", "knee-patella-inferior"], tags: ["anterior", "quadriceps", "rectus-femoris", "patella"] },
    { id: "lateral", site: "大腿外侧与膝外侧", target: "股外侧肌、阔筋膜张肌、髂胫束周围与腘肌", retestIds: ["knee-extension", "knee-flexion", "knee-patella-medial", "knee-patella-lateral"], tags: ["lateral", "lateral-chain", "tfl", "extension"] },
    { id: "medial", site: "大腿内侧与膝内侧", target: "内收肌、鹅足相关肌群与股内侧肌", retestIds: ["knee-extension", "knee-flexion", "knee-patella-medial", "knee-patella-lateral"], tags: ["medial", "adductor", "pes-anserine", "medial-knee"] },
    { id: "posterior-thigh", site: "大腿后侧与膝后两侧", target: "腘绳肌与腘肌", retestIds: ["knee-extension", "knee-flexion"], tags: ["posterior", "hamstring", "posterior-chain"] },
    { id: "posterior-calf", site: "小腿后侧肌群", target: "腓肠肌与比目鱼肌", retestIds: ["knee-extension"], tags: ["posterior", "calf", "gastrocnemius"] },
  ],
};

export const FULL_REGIONS: FullRegion[] = [
  withRegionalMobility(neck, REGIONAL_MOBILITY_CLUSTERS.neck),
  withRegionalMobility(shoulder, REGIONAL_MOBILITY_CLUSTERS.shoulder),
  withRegionalMobility(thoracicRib, REGIONAL_MOBILITY_CLUSTERS["thoracic-rib"]),
  withRegionalMobility(elbow, REGIONAL_MOBILITY_CLUSTERS.elbow),
  withRegionalMobility(wristHand, REGIONAL_MOBILITY_CLUSTERS["wrist-hand"]),
  withRegionalMobility(lumbarPelvis, REGIONAL_MOBILITY_CLUSTERS["lumbar-pelvis"]),
  withRegionalMobility(hipThigh, REGIONAL_MOBILITY_CLUSTERS["hip-thigh"]),
  THIGH_LOCAL_REGION,
  withRegionalMobility(knee, REGIONAL_MOBILITY_CLUSTERS.knee),
  CALF_LOCAL_REGION,
  ankleFoot,
];

export const FULL_REGION_BY_ID: Record<FullRegionId, FullRegion> = FULL_REGIONS.reduce(
  (index, region) => {
    index[region.id] = region;
    return index;
  },
  {} as Record<FullRegionId, FullRegion>,
);

export const FULL_STAGE_LABELS: Record<FullExerciseStage, string> = {
  1: "症状与可用活动",
  2: "稳定与局部力量",
  3: "基础动作模式",
  4: "日常与一般运动",
  5: "高强度与专项",
};

export const FULL_ACCESS_LABELS: Record<FullAccess, string> = {
  self: "可自行完成",
  coach: "建议教练协助",
  therapist: "由受训专业人员完成",
};

export function getFullRegion(id: FullRegionId): FullRegion {
  return FULL_REGION_BY_ID[id];
}

export function getFullExercises(id: FullRegionId, stage?: FullExerciseStage): FullExercise[] {
  const exercises = FULL_REGION_BY_ID[id].exercises;
  return stage ? exercises.filter((item) => item.stage === stage) : exercises;
}

export function matchFullCandidateGroups(
  id: FullRegionId,
  input: { location?: string; feeling?: string; action?: string },
): FullCandidateGroup[] {
  const normalize = (value?: string) => value?.trim().toLowerCase() ?? "";
  const location = normalize(input.location);
  const feeling = normalize(input.feeling);
  const action = normalize(input.action);

  return FULL_REGION_BY_ID[id].candidateGroups
    .map((group) => {
      const fields = [
        [location, group.match.locations],
        [feeling, group.match.feelings],
        [action, group.match.actions],
      ] as const;
      const score = fields.reduce((total, [query, values]) => {
        if (!query) return total;
        return total + (values.some((value) => query.includes(value.toLowerCase()) || value.toLowerCase().includes(query)) ? 1 : 0);
      }, 0);
      return { group, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.group);
}
