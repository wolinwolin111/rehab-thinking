/**
 * RehabMind 生产区域内容库（运行时知识面只含已验证区域；未发布区域不得回流）。
 *
 * 这里的候选均表示“下一步值得检查或做单变量反应试验的方向”，
 * 不是疾病诊断，也不能用单个特殊测试替代影像或专业医学评估。
 */

/** 运行时知识面只含已验证的生产区域；未发布区域不得进入本类型。 */
export type FullRegionId =
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
  /** 一句大白话：这个动作练的是什么、为什么现在安排它。低发力感动作（等长/激活类）必须提供。 */
  purpose?: string;
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
  purpose?: string,
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
  return { id, title, stage, sets, reps, purpose, how, observe, easier, harder, tags, startPosition };
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
    { ...direction("knee-scar-mobility", "术后瘢痕活动", "由专业人员轻柔比较瘢痕各方向活动，并观察它是否随膝屈伸或髌骨活动受限。", "记录瘢痕活动较少的方向，以及与膝屈伸或髌骨受限是否同步。", ["postoperative", "scar", "knee-rom"], "伤口未愈合、红热渗液或异常肿胀时不检查。"), access: "therapist", testMode: "passive" },
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
    special("knee-acute-fracture-screen", "急性膝外伤骨折风险判断", "therapist", "急性外伤后的膝部问题", "按 Ottawa 膝规则逐条记录：年龄是否55岁以上，髌骨和腓骨头是否有明确骨点压痛，能否把膝屈到90度，受伤当时与现在能否走四步。", "逐条记录是否满足，不合并为模糊的高风险；这些答案只影响拍片优先级，不能单独诊断骨折。", ["bone-screen", "imaging", "acute"], "满足任一条件时先安排影像或医学评估，再回到康复流程。"),
    special("knee-acl-stability", "前交叉韧带稳定性检查", "therapist", "扭转外伤、快速肿胀、打软腿或明显不稳", "由专业人员做 Lachman 检查，并与健侧比较；不把普通前抽屉作为默认替代。", "与健侧相比的前移、终末感、疼痛和防御。", ["acl", "ligament", "stability"], "明显急性不稳或检查无法可靠完成时转医学评估；其余进入专业稳定性处理。"),
    special("knee-pcl-stability", "后交叉韧带稳定性检查", "therapist", "屈膝位撞击、跌倒跪地或后向不稳", "由专业人员先观察后沉征，再做后抽屉检查，并与健侧比较。", "后移程度、终末感和与健侧的差异。", ["pcl", "ligament", "stability"], "明显松弛或合并急性外伤风险时转医学评估；其余进入专业稳定性处理。"),
    special("knee-collateral-stability", "内外侧副韧带稳定性检查", "therapist", "明确内翻或外翻外伤、局部韧带区疼痛或侧向不稳", "由专业人员在膝屈约30度做外翻/内翻应力；只有怀疑更广泛损伤时再比较伸直位。", "疼痛位置、松弛度、终末感和健侧差异。", ["collateral", "ligament", "stability"], "明显急性松弛或伸直位也不稳时转医学评估；轻度稳定损伤走专业低负荷路径。"),
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
        candidate("knee-scar-mobility-treatment", "术后瘢痕活动处理", "joint", "therapist", "仅处理检查中确认活动较少、并与膝屈伸或髌骨活动受限同步的瘢痕方向。", "伤口未愈合、红热渗液、异常肿胀或处理时锐痛应停止。", "复查瘢痕活动和刚才同步受限的膝屈伸或髌骨方向。", ["postoperative", "scar", "joint-mobility"], { retestIds: ["knee-scar-mobility"], siteLabel: "膝部术后瘢痕", targetLabel: "活动受限的瘢痕方向", actionLabel: "瘢痕活动处理" }),
      ],
    },
  ],
  exercises: [
    exercise("knee-heel-slide-quad-set", "脚跟滑动与膝后下压", 1, "3组", "每项每组10个", "仰卧，脚跟贴床缓慢滑向臀部，滑到发紧处停10～15秒再放回；然后腿伸直，绷紧大腿把膝后压向床面，保持5秒后放松。", "停在发紧的位置时不出现锐痛；膝后下压时大腿前侧能真正绷起来，臀部不不自觉抬起。", "减小滑动范围，膝后下压保持3秒。", "在新范围加入终末伸膝弹力带。", ["knee-rom", "quad-activation", "quadriceps", "terminal-extension"], "弯曲靠“滑到紧处停住”一点点找回来；膝后下压练的是“绷直”这个开关——肿痛时大腿常常想绷绷不上，开关不修好，后面的力量练习都白练。"),
    exercise("knee-bridge", "臀桥", 2, "3组", "每组10～12个", "仰卧屈膝，轻收腹后抬起臀部，停1秒再缓慢落下。", "臀部和大腿后侧发力，腰部不向上顶。", "减小高度或每组6个。", "脚垫高或进阶单腿臀桥。", ["glute", "hamstring", "posterior-chain"], "让臀部和大腿后侧接管发力，替膝盖分担压力，是起身、上楼和站稳的基础力量。"),
    exercise("knee-single-leg-bridge", "单腿臀桥", 3, "3组", "每侧每组6～10个", "先做一次稳定的双脚臀桥，再抬起一只脚，用另一侧臀部把骨盆抬起，停1秒后缓慢落下。", "两侧胯高度一致（可拍10秒回看），主要由臀部和大腿后侧发力，腰部不过度顶起。", "继续双脚臀桥，或只把一只脚轻轻离地。", "增加次数，再进阶站立屈髋（臀部向后）。", ["glute", "hamstring", "posterior-chain", "single-leg", "pelvic-stability"], "练一条腿承重时两侧胯保持一样高、膝盖不打软，这是上下楼和慢跑前的必经台阶。"),
    exercise("knee-supine-adductor", "仰卧夹枕", 2, "3组", "每组8～12个", "仰卧屈膝，在两膝之间夹软枕，轻轻向内夹住3秒后放松。", "大腿内侧均匀发力，不用疼痛顶住。", "减小夹力或每组6个。", "进阶到坐位或桥式夹枕。", ["adductor", "medial-knee"], "大腿内侧没劲，膝内侧的压力就更大。轻轻夹枕头是唤醒内侧肌肉，不刺激膝盖。"),
    exercise("knee-side-abduction", "侧卧髋外展", 2, "3组", "每侧每组8～12个", "侧卧，下侧腿屈曲保持稳定，上侧腿伸直并稍向后放，脚尖朝前，缓慢抬起再落下。", "骨盆不要向后翻，大腿外侧不过度抢力。", "减小抬腿高度或每组6个。", "增加次数或加入轻弹力带。", ["glute", "glute-med", "hip-abduction", "pelvic-stability"], "臀中肌是膝盖的“方向盘”，它有力，走路时膝盖才不会往内扣。"),
    exercise("knee-hamstring-isometric", "大腿后侧等长保持（脚跟轻拉地面）", 2, "3组", "每侧每组8～10个，每次保持5秒", "坐稳或仰卧屈膝，脚跟踩稳地面，保持脚不移动，轻轻向后拉地面并保持。", "感受大腿后侧发力，膝内侧和膝后不要出现刺痛。", "减小发力或每组6个。", "增加保持时间，再进阶臀桥或站立屈髋（臀部向后）。", ["hamstring", "knee-flexion", "posterior-chain"], "大腿后侧和前侧是一对拮抗搭档，后侧肯发力，膝盖前侧负担就小。绷住不动，是在不磨损膝盖的前提下练它。"),
    exercise("knee-supine-ankle-press", "仰卧踝跖屈（绷脚背）", 2, "3组", "每组10～15个", "仰卧或半躺，用脚掌轻推弹力带向下压，缓慢回到原位。", "小腿后侧发力，脚趾不要抓紧。", "去掉弹力带，只做主动下压。", "进阶到坐姿提踵，再到站立提踵。", ["calf", "heel-raise"], "小腿是走路蹬地的发动机。先躺着用轻阻力找到发力感，膝盖不用承重。"),
    exercise("knee-anterior-lower-leg-control", "踝背屈控制（勾脚）", 2, "3组", "每组10个", "仰卧或坐稳，脚跟放地，缓慢把脚背向小腿方向勾起，再缓慢放下，全程只动脚踝。", "脚背整体抬起，不只抬脚趾；小腿前侧发力，膝盖不跟着转。", "减小范围，每组6个。", "加入轻弹力带，或站立时练习脚跟着地后的缓慢放脚。", ["tibialis-anterior", "dorsiflexion", "knee-weight-bearing"], "小腿前侧失控，走路落脚会“啪叽”砸地，冲击直接传膝盖。练缓慢勾脚、慢慢放脚。"),
    exercise("knee-calf-raise", "扶墙双脚提踵", 2, "3组", "每组10～15个", "双手轻扶墙，脚跟垂直抬起，停1秒后缓慢落下。", "两侧高度接近，膝盖保持稳定，脚踝不向内外倒。", "坐姿提踵或减少高度。", "单脚提踵或增加轻负重。", ["calf", "heel-raise", "gait"], "小腿力量回来了，走路蹬地才有劲，站立时膝盖也更稳。"),
    exercise("knee-standing-hip-flexion", "站立屈髋（臀部向后）", 3, "3组", "每组10个", "背对墙站立约一脚距离，膝盖微屈，臀部向后移动轻碰墙面，身体从髋部向前折叠，再用臀腿站起；熟练后离开墙面做。", "髋膝踝方向一致，脚掌稳定，腰部不抢先弯曲；碰不到墙或腰先酸了，说明动作做成了弯腰。", "减小臀部向后幅度，扶支撑。", "增加折髋范围、轻负重或改单腿。", ["hip-hinge", "movement-pattern", "standing-hip-flexion", "stairs"], "练“用髋不用膝”的动作模式——捡东西、坐下、下楼都靠它；碰墙是唯一能自己验证的反馈，膝盖疼的人最该重新学会。"),
    exercise("knee-sit-stand-squat", "坐站与浅蹲", 3, "3组", "每组10个", "从合适高度椅子坐站，进阶到不碰椅子的浅蹲。", "髋膝踝同向、左右承重接近、下降可控。", "提高椅子并扶手。", "降低椅子或手持轻重量。", ["sit-to-stand", "squat", "movement-pattern"], "把前面练的肌肉放进真实动作里：坐站是最安全的下蹲替身，先找回膝盖受控弯曲的感觉。"),
    exercise("knee-step", "低台阶上台与下台", 4, "3组", "每侧每组8个", "先练患侧上台，稳定后练患侧支撑慢慢下台。", "骨盆稳定，膝与足方向一致，不突然掉落。", "降低台阶、增加扶持。", "增加高度、连续次数或负重。", ["step-up", "step-down", "stairs"], "下楼梯是多数膝痛最难的一关。慢速下台阶专门练膝盖的“刹车”能力。"),
    exercise("knee-drop-landing", "低台阶落地下定", 4, "3组", "每侧每组8个", "站在低台阶上，患侧脚慢慢踏下落地，膝盖微弯缓冲，落地后定住2秒不动，再借双脚帮助回到台阶。", "膝盖不往内扣，落地轻没有“咚”的一声；出现锐痛或打软就退回台阶练习。", "先在平地上练双脚缓冲屈膝落地。", "增加台阶高度，或改为向前一步落地。", ["landing", "single-leg", "deceleration", "control"], "跳之前先学会落地那一下的“刹车”。踏下台阶是冲击最小、最可控的落地，定得住才有资格练跳。"),
    exercise("knee-single-leg-strength", "分腿蹲与单腿屈髋", 4, "3组", "每侧每组8个", "前后站位做分腿蹲，再用手扶支撑练单腿屈髋。", "前脚稳定，骨盆不旋转，患侧可控承重。", "减小幅度或双手扶持。", "增加负重或减少扶持。", ["single-leg", "strength", "daily"], "从双腿过渡到一条腿承重，让患侧膝盖能独立站稳、可控发力，为跑跳做准备。"),
    exercise("knee-jump-decelerate", "跳跃落地与减速", 5, "4组", "每组5个", "从双脚小跳落地开始，进阶到前向落地、单脚和变向。", "髋膝踝共同缓冲，每次落地都能稳定停住。", "退回低台阶落地下定或快速提踵。", "增加高度、速度、方向或专项组合。", ["jump", "landing", "change-direction"], "跳回来的关键不是跳多高，而是落地那一下膝盖不内扣、稳得住。先练“落地刹车”。"),
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
    functional("ankle-step-down", "下台阶", "扶住栏杆，站在固定高度台阶上，患侧支撑，健侧脚跟慢慢点地再回起。", "患侧承重阶段、踝足方向与足弓稳定、下降控制和0～10分。", ["step-down", "eccentric", "stairs", "ankle-control"], "急性明显肿胀、不能稳定负重或走路仍明显疼时暂不测试。"),
    functional("ankle-heel-raise", "提踵", "先双脚同步提踵10个，再根据耐受做单脚提踵。", "高度、节奏、足弓、跟腱/小腿症状和高质量次数。", ["heel-raise", "push-off"]),
    functional("ankle-single-leg", "单腿站", "靠近墙，先做健侧，再用患侧单腿站立20秒，必要时手指轻扶。", "身体是否明显晃动，患侧是否明显更难站稳。", ["balance", "single-leg"]),
    functional("ankle-hop", "小跳与落地", "只在步态、提踵和单腿站稳定后，完成双脚小跳，再考虑单脚。", "落地疼痛、不稳、缓冲和再次起跳能力。", ["hop", "landing", "sport"], "急性损伤、肿胀、走路仍疼或提踵明显不足时不测试。"),
  ],
  specialTests: [
    special("ankle-bone-weight-screen", "急性踝足骨折风险判断", "coach", "急性踝或中足外伤后", "按 Ottawa 踝足规则通过问答逐条记录：内外踝后缘、舟骨、第五跖骨基底是否有明确骨点压痛，受伤当时与现在能否走四步，以及是否已有影像。", "逐条记录部位和负重能力；这些答案只影响拍片优先级，不能单独诊断骨折。", ["bone-screen", "imaging", "acute"], "这组问答放在关键确认环节，满足任一条件时先安排影像或医学评估。"),
    special("ankle-thompson", "跟腱连续性检查", "coach", "突然蹬地或跳跃后踝后方剧痛、听到响声、塌陷感或无法正常提踵", "俯卧或跪姿让脚伸出床边，由熟悉者轻挤小腿，比较足部自然跖屈反应；结果不清时结合静息足位和可触及缺口。", "是否出现正常跖屈反应，以及辅助征象。", ["achilles", "calf-squeeze", "continuity"], "异常或结果可疑都停止训练，进入医学评估，不用反复测试。"),
    special("ankle-anterior-drawer", "踝外侧韧带稳定性检查", "therapist", "内翻崴伤后反复不稳、打软腿或外踝前方症状", "由专业人员做前外侧距骨触诊＋前抽屉检查；怀疑跟腓韧带时再做距骨倾斜，并与健侧比较。", "熟悉症状、前移/倾斜、终末感和健侧差异。", ["lateral-ligament", "stability"], "明显急性不稳转医学评估；其余进入专业稳定性处理和复查。"),
    special("ankle-syndesmosis-screen", "下胫腓联合损伤筛查", "therapist", "外旋或外翻受伤机制、踝上方疼痛，或恢复明显慢于普通外侧踝扭伤", "由专业人员先做下胫腓韧带触诊和背屈弓步检查；仍可疑时再加挤压检查。", "熟悉症状位置、背屈反应和挤压检查结果。", ["syndesmosis", "stability"], "任何单项阳性都不直接诊断；整体可疑时转影像或医学评估。"),
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
    exercise("ankle-four-way-motion", "踝四方向活动（勾、压、内、外）", 1, "3组", "每个方向每组10个", "仰卧或半躺，小腿放松，分别缓慢做勾脚、下压、脚掌向内转和向外转。", "小腿不跟着转，不硬顶肿胀或刺痛末端。", "每组6个、减小幅度。", "加入弹力带轻阻力。", ["ankle-rom"], "伤后脚踝最先僵；四个方向都缓慢动一遍，是防粘连、恢复滑利最安全的一步。"),
    exercise("ankle-achilles-isometric", "坐姿提踵保持", 1, "2组", "每组5次，每次保持30秒", "坐稳，前脚掌踩地，缓慢抬起脚跟到可接受高度，保持30秒（均匀呼吸不憋气）再轻轻放下。", "跟腱症状不逐次增加；当天晚些时候和第二天没有持续加重。", "减小抬起高度或保持10秒。", "保持30秒不变，缩短组间休息，再进入双脚慢速提踵。", ["achilles", "tendon-loading", "heel-raise", "isometric"], "跟腱疼痛时静态保持是最安全的负荷：撑满30秒才能真正抑制肌腱痛感，几秒钟只是动一下。"),
    exercise("ankle-achilles-eccentric-drop", "台阶边缘缓慢下落", 2, "3组", "每组8～12个", "前脚掌踩在台阶边缘，扶稳后缓慢把脚跟降到台阶面以下（心里数3秒），用健侧脚帮忙回到起点；直腿做一组、弯膝做一组交替进行。", "跟腱有酸胀的用力感但不出现锐痛；第二天没有持续加重。", "先在平地上做慢速小幅提踵和落下。", "在专业人员指导下增加下落深度或手持轻负重。", ["achilles", "eccentric", "heel-raise", "tendon-loading"], "跟腱病康复里证据最扎实的负荷动作：慢速离心下落让肌腱在可控受力中重新变强，比静态保持更接近走路蹬地的真实需求。"),
    exercise("ankle-bridge", "臀桥", 2, "3组", "每组10个", "仰卧屈膝，双脚稳定踩地，轻收腹后抬起臀部，停1秒再缓慢落下。", "两侧胯保持一样高（可对镜子看），臀部和大腿后侧发力，脚踝保持稳定。", "减小抬起高度或每组6个。", "能够稳定完成后进阶单腿臀桥。", ["glute-max", "hamstring", "posterior-chain", "pelvic-stability"], "臀和腿后侧有力，走路蹬地时脚踝分担的压力就小——恢复链从最上游开始。"),
    exercise("ankle-single-leg-bridge", "单腿臀桥", 3, "3组", "每侧每组6～10个", "先完成双脚臀桥，再抬起一只脚，用另一侧臀部抬起骨盆。", "两侧胯高度一致（可拍10秒回看），支撑脚稳定，不用腰部顶起。", "继续双脚臀桥，或只把一只脚轻轻离地。", "进阶站立屈髋（臀部向后）和重心转移。", ["glute-max", "hamstring", "posterior-chain", "single-leg", "pelvic-stability"], "练一条腿承重时骨盆和支撑踝一起稳住，这是跑跳前的必经台阶。"),
    exercise("ankle-standing-hip-flexion", "站立屈髋（臀部向后）", 3, "3组", "每组10个", "背对墙站立约一脚距离，膝盖微屈，臀部向后移动轻碰墙面，身体从髋部向前折叠，再用臀腿站起；熟练后离开墙面做。", "骨盆稳定，髋膝踝方向一致，脚掌保持接触地面；碰不到墙说明做成了弯腰。", "臀部向后碰墙并扶住固定物。", "增加范围、轻负重或改单腿屈髋。", ["hip-hinge", "standing-hip-flexion", "posterior-chain", "hip-knee-ankle"], "学会用髋发力，踝膝少代偿——捡东西、上下坡都靠这个模式。"),
    exercise("ankle-dorsiflexion-control", "背屈控制（勾脚）", 2, "3组", "每组10～15个", "仰卧或半躺，小腿放松，主动把脚背向小腿方向勾起；需要增加负荷时再加入轻弹力带。", "脚踝带动，不只抬脚趾；小腿不向外转。", "先做无阻力，每组6～8个。", "进阶到坐位弹力带，再到站立脚跟走的短距离控制。", ["tibialis-anterior", "dorsiflexion", "ankle-dorsiflexor"], "勾脚没劲会拖步绊脚；先把主动勾脚的控制找回来，迈步才利索。"),
    exercise("ankle-plantarflexion-control", "跖屈控制（下压脚背）", 2, "3组", "每组10～15个", "仰卧或半躺，脚掌轻推弹力带做向下压脚背；能稳定完成后再进阶坐姿提踵。", "动作来自脚踝，脚趾不过度抓地。", "去掉弹力带，只做主动下压。", "进阶到坐姿、扶墙双脚提踵，再到单脚提踵。", ["calf", "plantarflexion", "heel-raise", "ankle-calf"], "下压脚背练的是蹬地发动机——走路最后那一下推进全靠它。"),
    exercise("ankle-eversion-control", "外翻控制", 2, "3组", "每组10～15个", "仰卧或半躺，小腿不动，先做脚掌向外转；能稳定完成后再加入轻弹力带。", "动作来自脚踝，不用膝盖或整条小腿向外转。", "去掉弹力带，只做小幅主动外翻。", "进阶到坐位弹力带，再进入单腿站和侧向控制。", ["peroneal", "eversion", "ankle-evertor"], "外翻肌是脚踝的“防崴弹簧”；崴脚后它最先偷懒，也最该先练回来。"),
    exercise("ankle-band-heelraise", "踝四方向弹力带抗阻与提踵", 2, "3组", "每项每组12个", "按力量缺口选1～2个弹力带方向，再做双脚提踵。", "动作来自踝足，膝和脚趾不过度代偿。", "改为等长或扶墙小幅提踵。", "单脚提踵或加轻负重。", ["ankle-strength", "calf", "peroneal"], "把弹力带抗阻和提踵拼在一节课里，一次补齐查出来的力量缺口。"),
    exercise("ankle-gait-weightshift", "重心转移与步态滚动", 3, "3组", "每组10次重心转移 + 10米步行", "先练双脚前后重心转移；慢走时只记两件事：脚跟先着地、脚趾最后离开。", "步幅自然，骨盆、髋、膝、踝连续协同。", "扶桌原地转移。", "增加连续步数或不同速度。", ["gait", "weight-shift", "hip-knee-ankle"], "崴脚后人会不自觉避开患侧承重；把重心移回去、把落脚走顺，步态才算回归。"),
    exercise("ankle-single-leg-step", "单腿站、提踵与台阶", 4, "3组", "每项每侧8个", "先单腿站，再单脚提踵和低台阶上下。", "足弓、踝、膝和骨盆稳定，台阶下降可控。", "扶墙、双脚提踵或降低台阶。", "增加高度、连续次数或轻负重。", ["single-leg", "heel-raise", "step"], "单腿承重加台阶高度，把恢复的脚踝送回真实生活场景。"),
    exercise("ankle-split-squat-deceleration", "分腿蹲与减速", 4, "3组", "每侧每组8个", "做分腿蹲和前跨一步后稳定停住，训练下肢协同承重。", "足弓稳定，髋膝踝共同缓冲，不让踝足专项被髋训练替代。", "减小幅度并扶墙。", "增加负重或侧向跨步。", ["lower-chain", "deceleration"], "练“前冲之后刹得住”，防止跑步变向时脚踝再次受伤。"),
    exercise("ankle-hop-change-direction", "快提踵、跳跃与变向", 5, "4组", "每组5个", "从快节律双脚提踵、双脚小跳，进阶到单脚落地、侧跳和变向。", "每次落地稳定，踝不打软，髋膝踝连续吸收和释放力量。", "回到慢提踵或双脚小幅落地。", "增加速度、距离、方向或专项组合。", ["hop", "landing", "change-direction", "sport"], "跳、落、变向是回归运动的验收考：落地稳、踝不软才算过关。"),
  ],
};

type MobilityMuscleCluster = {
  id: string;
  site: string;
  target: string;
  retestIds: string[];
  tags: string[];
};

function buildRegionalMobilityLibrary(region: FullRegion, clusters: MobilityMuscleCluster[]): FullCandidate[] {
  const directionIds = region.directions.map((item) => item.id);
  const muscleCandidates = clusters.map((cluster) => candidate(
    `${region.id}-mobility-${cluster.id}`,
    cluster.target,
    "muscle",
    "coach",
    `先在${cluster.site}找到与当前不适、紧张或受限方向最相关的一组肌肉，只做一次轻柔松解。`,
    "没有明显紧张、按压不适或动作关联时，不因为名称相关就默认松解。",
    "回到主诉动作，并一次比较这组肌肉关联的全部未解决方向；已经恢复的方向退出后续处理。",
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
  const controls = region.directions.map((item) => candidate(
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
  knee: [
    { id: "anterior", site: "大腿前侧与膝前", target: "股四头肌、股直肌与髌骨周围软组织", retestIds: ["knee-flexion", "knee-extension", "knee-patella-superior", "knee-patella-inferior"], tags: ["anterior", "quadriceps", "rectus-femoris", "patella"] },
    { id: "lateral", site: "大腿外侧与膝外侧", target: "股外侧肌、阔筋膜张肌、髂胫束周围与腘肌", retestIds: ["knee-extension", "knee-flexion", "knee-patella-medial", "knee-patella-lateral"], tags: ["lateral", "lateral-chain", "tfl", "extension"] },
    { id: "medial", site: "大腿内侧与膝内侧", target: "内收肌、鹅足相关肌群与股内侧肌", retestIds: ["knee-extension", "knee-flexion", "knee-patella-medial", "knee-patella-lateral"], tags: ["medial", "adductor", "pes-anserine", "medial-knee"] },
    { id: "posterior-thigh", site: "大腿后侧与膝后两侧", target: "腘绳肌与腘肌", retestIds: ["knee-extension", "knee-flexion"], tags: ["posterior", "hamstring", "posterior-chain"] },
    { id: "posterior-calf", site: "小腿后侧肌群", target: "腓肠肌与比目鱼肌", retestIds: ["knee-extension"], tags: ["posterior", "calf", "gastrocnemius"] },
  ],
};

export const FULL_REGIONS: FullRegion[] = [
  THIGH_LOCAL_REGION,
  withRegionalMobility(knee, REGIONAL_MOBILITY_CLUSTERS.knee),
  CALF_LOCAL_REGION,
  ankleFoot,
];

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

