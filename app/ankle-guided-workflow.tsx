"use client";

import { useEffect, useMemo, useState } from "react";

type AnswerMap = Record<string, string>;
type CheckResultMap = Record<string, string>;
type TrialResult = "better" | "same" | "worse";

type QuestionOption = {
  value: string;
  label: string;
};

type Question = {
  id: string;
  title: string;
  why: string;
  options: QuestionOption[];
  multiple?: boolean;
};

type CheckOption = {
  value: string;
  label: string;
  meaning: string;
  needsReview?: boolean;
};

type AnkleCheck = {
  id: string;
  kind: "触诊" | "活动" | "特殊测试" | "动作";
  shortLabel?: string;
  mode: "单人可做" | "需要协助";
  title: string;
  why: string;
  instruction: string;
  positive: string;
  options: CheckOption[];
};

type Direction = {
  label: string;
  title: string;
  reason: string;
  tone: "primary" | "review" | "support";
};

type Intervention = {
  id: string;
  category: string;
  title: string;
  status: string;
  entry?: string;
  why: string;
  metric: string;
  action: string;
  dose: string;
  observe: string;
  retest: string;
  delayRetest: string;
  betterNext: string;
  sameNext: string;
  worseNext: string;
  resultLabels?: Record<TrialResult, string>;
  medicineOption?: boolean;
};

type ProblemItem = {
  id: string;
  title: string;
  evidence: string;
  next: string;
  timing: "立即复测" | "稍后观察" | "下次复查" | "先补充确认";
};

type RehabStage = "症状控制" | "活动恢复" | "力量恢复" | "稳定控制" | "功能回归";
type MotionType = "ankle-pump" | "weight-shift" | "knee-wall" | "heel-raise" | "balance" | "step" | "hop";

type ExerciseItem = {
  id: string;
  title: string;
  stage: RehabStage;
  dose: string;
  observe: string;
  easier: string;
  harder: string;
  motion: MotionType;
  video?: {
    embedUrl: string;
    sourceUrl: string;
    provider: string;
  };
};

type RehabSession = {
  visit: number;
  savedAt: string;
  stage: RehabStage;
  outcome: "建立基线" | "继续当前阶段" | "进入下一阶段" | "返回相关评估";
  focus: string[];
  problemStates?: Record<string, TrialResult>;
  treatmentResults?: Record<string, TrialResult>;
};

type FollowUpTreatment = {
  id: string;
  problemId: string;
  title: string;
  timing: "当场复测" | "稍后观察" | "训练解决" | "先补充确认";
  steps: string[];
  observe: string;
  retest: string;
  nextIfSame: string;
};

const REHAB_STAGES: RehabStage[] = ["症状控制", "活动恢复", "力量恢复", "稳定控制", "功能回归"];

const EXERCISE_LIBRARY: ExerciseItem[] = [
  {
    id: "ankle-pump",
    title: "踝泵与四向轻活动",
    stage: "症状控制",
    dose: "每方向 8 次，2 轮",
    observe: "范围舒适，肿胀和疼痛不因练习扩大",
    easier: "只做无痛的小幅度踝泵",
    harder: "增加四个方向的主动控制",
    motion: "ankle-pump",
  },
  {
    id: "weight-shift",
    title: "扶持下重心转移",
    stage: "症状控制",
    dose: "前后左右各 8 次",
    observe: "患侧能逐步接受重量，不靠突然躲开完成",
    easier: "双手扶稳，只转移少量重量",
    harder: "减少手扶并延长患侧停留",
    motion: "weight-shift",
  },
  {
    id: "knee-wall",
    title: "膝触墙背屈练习",
    stage: "活动恢复",
    dose: "2 组 × 8 次",
    observe: "脚跟不抬，膝盖沿第二脚趾方向前移",
    easier: "缩短脚与墙的距离",
    harder: "逐步把脚向后移动",
    motion: "knee-wall",
  },
  {
    id: "gait-roll",
    title: "脚跟到脚趾步态练习",
    stage: "活动恢复",
    dose: "10 步 × 3 轮",
    observe: "步幅接近，不拖脚，不急着增加距离",
    easier: "扶墙慢走并缩短步幅",
    harder: "逐步恢复正常步速",
    motion: "step",
  },
  {
    id: "calf-stretch-straight",
    title: "直膝小腿后侧拉伸",
    stage: "活动恢复",
    dose: "每侧 3 次 × 20 秒",
    observe: "后脚跟贴地，脚尖向前，不用疼痛换幅度",
    easier: "缩短前后站距并减少前移",
    harder: "逐步增加站距，保持脚跟不抬",
    motion: "knee-wall",
    video: {
      embedUrl: "https://player.vimeo.com/video/196741941?dnt=1",
      sourceUrl: "https://vimeo.com/196741941",
      provider: "Torbay and South Devon NHS",
    },
  },
  {
    id: "calf-stretch-bent",
    title: "屈膝小腿后侧拉伸",
    stage: "活动恢复",
    dose: "每侧 3 次 × 20 秒",
    observe: "后脚跟贴地，后膝轻微弯曲，足弓不塌陷",
    easier: "减小屈膝和身体前移幅度",
    harder: "增加停留时间，不增加疼痛",
    motion: "knee-wall",
    video: {
      embedUrl: "https://player.vimeo.com/video/196741973?dnt=1",
      sourceUrl: "https://vimeo.com/196741973",
      provider: "Torbay and South Devon NHS",
    },
  },
  {
    id: "heel-raise",
    title: "双脚到单脚提踵",
    stage: "力量恢复",
    dose: "3 组 × 8 次",
    observe: "脚跟垂直上升，不向外翻，不靠弹跳",
    easier: "双脚提踵，患侧只承担部分重量",
    harder: "增加患侧比例，再过渡到单脚",
    motion: "heel-raise",
    video: {
      embedUrl: "https://player.vimeo.com/video/196741841?dnt=1",
      sourceUrl: "https://vimeo.com/196741841",
      provider: "Torbay and South Devon NHS",
    },
  },
  {
    id: "band-eversion",
    title: "弹力带外翻力量",
    stage: "力量恢复",
    dose: "3 组 × 8 次",
    observe: "膝盖不跟着转，脚掌向外时动作缓慢可控",
    easier: "减小弹力或先做无阻力主动外翻",
    harder: "增加弹力并放慢回程",
    motion: "ankle-pump",
    video: {
      embedUrl: "https://player.vimeo.com/video/196741765?dnt=1",
      sourceUrl: "https://vimeo.com/196741765",
      provider: "Torbay and South Devon NHS",
    },
  },
  {
    id: "tibialis-strength",
    title: "胫骨肌群力量练习",
    stage: "力量恢复",
    dose: "3 组 × 8 次",
    observe: "小腿保持稳定，踝部主动控制回程",
    easier: "先做无阻力勾脚和缓慢回程",
    harder: "逐步增加弹力，不追求更快速度",
    motion: "ankle-pump",
    video: {
      embedUrl: "https://player.vimeo.com/video/196741766?dnt=1",
      sourceUrl: "https://vimeo.com/196741766",
      provider: "Torbay and South Devon NHS",
    },
  },
  {
    id: "band-inversion",
    title: "弹力带内翻力量",
    stage: "力量恢复",
    dose: "3 组 × 8 次",
    observe: "小腿保持不动，足部向内时不出现刺痛",
    easier: "减小弹力或先做无阻力主动内翻",
    harder: "增加弹力并控制回程",
    motion: "ankle-pump",
    video: {
      embedUrl: "https://player.vimeo.com/video/196741867?dnt=1",
      sourceUrl: "https://vimeo.com/196741867",
      provider: "Torbay and South Devon NHS",
    },
  },
  {
    id: "step-up",
    title: "低台阶上台阶",
    stage: "力量恢复",
    dose: "每侧 3 组 × 6 次",
    observe: "患侧主动蹬起，膝盖与脚尖方向一致",
    easier: "降低台阶并增加扶持",
    harder: "提高台阶或减慢下落速度",
    motion: "step",
  },
  {
    id: "single-balance",
    title: "扶持单脚平衡",
    stage: "稳定控制",
    dose: "每侧 3 组 × 20 秒",
    observe: "足底保持三点支撑，身体不持续向一侧倒",
    easier: "指尖扶墙或缩短时间",
    harder: "减少扶持并加入缓慢转头",
    motion: "balance",
  },
  {
    id: "step-control",
    title: "台阶下落控制",
    stage: "稳定控制",
    dose: "每侧 3 组 × 6 次",
    observe: "缓慢落地，不突然塌下，骨盆保持平稳",
    easier: "降低台阶并手扶支撑",
    harder: "增加下落时间或台阶高度",
    motion: "step",
  },
  {
    id: "balance-board",
    title: "平衡板重心控制",
    stage: "稳定控制",
    dose: "3 组 × 20 秒",
    observe: "在可扶持环境进行，控制板面而不是快速摆动",
    easier: "先在地面完成单脚平衡",
    harder: "减少手扶并增加缓慢重心移动",
    motion: "balance",
    video: {
      embedUrl: "https://player.vimeo.com/video/197399842?dnt=1",
      sourceUrl: "https://vimeo.com/197399842",
      provider: "Torbay and South Devon NHS",
    },
  },
  {
    id: "hop-stick",
    title: "小跳落地停稳",
    stage: "功能回归",
    dose: "3 组 × 5 次",
    observe: "落地能停稳，踝膝髋共同缓冲，没有打软",
    easier: "从双脚小跳开始",
    harder: "过渡到单脚和不同方向",
    motion: "hop",
  },
  {
    id: "return-task",
    title: "目标动作分级恢复",
    stage: "功能回归",
    dose: "选择 1 个目标动作，完成 3 轮",
    observe: "当下和第二天疼痛、肿胀与稳定感保持可接受",
    easier: "降低速度、幅度或总量",
    harder: "每次只增加一个变量",
    motion: "hop",
  },
];

const CORE_QUESTIONS: Record<string, Question> = {
  location: {
    id: "location",
    title: "症状最集中在哪里？",
    why: "位置决定先检查外侧韧带、高位踝、跟腱，还是足部骨性结构。",
    options: [
      { value: "lateral", label: "外踝前方或下方" },
      { value: "high", label: "踝关节上方或前方" },
      { value: "medial", label: "内踝周围" },
      { value: "posterior", label: "后方或跟腱附近" },
      { value: "midfoot", label: "足背或中足" },
      { value: "diffuse", label: "范围较散，说不清" },
    ],
  },
  mechanism: {
    id: "mechanism",
    title: "受伤时脚是怎样受力的？",
    why: "受伤机制比单独一个疼痛位置更能帮助选择特殊测试。",
    options: [
      { value: "inversion", label: "脚底向内翻" },
      { value: "external", label: "脚被固定，身体向外转" },
      { value: "push", label: "蹬地或加速时突然疼" },
      { value: "impact", label: "被踩踏或直接撞击" },
      { value: "unclear", label: "当时太快，不确定" },
    ],
  },
  energy: {
    id: "energy",
    title: "受伤时有没有明显的大力量冲击？",
    why: "不用判断“高能量”这个专业词，只选择当时发生的具体场景。",
    options: [
      { value: "ordinary", label: "平地踩空或普通运动扭伤" },
      { value: "fixedTwist", label: "脚被固定后身体猛烈旋转" },
      { value: "height", label: "从明显高度落地，脚先着地" },
      { value: "collision", label: "车辆、高速碰撞或重物挤压" },
      { value: "unclear", label: "不确定" },
    ],
  },
  timing: {
    id: "timing",
    title: "距离受伤过去多久？",
    why: "伤后时间会改变触诊、承重和关节活动测试的剂量。",
    options: [
      { value: "day1", label: "24 小时内" },
      { value: "day3", label: "1–3 天" },
      { value: "day14", label: "4–14 天" },
      { value: "longer", label: "超过 2 周" },
    ],
  },
  trend: {
    id: "trend",
    title: "从受伤到现在，整体变化怎么样？",
    why: "同样的疼痛和跛行，正在改善与持续恶化代表不同的处理优先级。",
    options: [
      { value: "better", label: "逐渐好转" },
      { value: "same", label: "基本没有变化" },
      { value: "worse", label: "疼痛或功能继续变差" },
      { value: "tooSoon", label: "刚受伤，还看不出趋势" },
    ],
  },
  painQuality: {
    id: "painQuality",
    title: "疼痛更接近哪一种？",
    why: "疼痛性质会改变后面的试验：酸胀可试肌肉处理，刺痛先缩小诱发动作，麻电感先看感觉分布。",
    options: [
      { value: "sore", label: "酸胀、紧绷" },
      { value: "dull", label: "钝痛、隐痛" },
      { value: "sharp", label: "刺痛、锐痛" },
      { value: "burning", label: "烧灼、麻电感" },
      { value: "unclear", label: "说不清" },
    ],
  },
  functionLimits: {
    id: "functionLimits",
    title: "目前哪些动作明显受限？",
    why: "可多选；后面的动作检查和训练只跟随这里记录的问题。",
    multiple: true,
    options: [
      { value: "walk", label: "走路或承重" },
      { value: "stairs", label: "上下楼" },
      { value: "push", label: "踮脚或蹬地" },
      { value: "squat", label: "下蹲或小腿向前" },
      { value: "balance", label: "单脚站、转身或不稳" },
      { value: "none", label: "暂无明显功能受限" },
    ],
  },
  bearing: {
    id: "bearing",
    title: "现在能连续走四步吗？",
    why: "承重能力是急性踝损伤中非常重要的功能信息。",
    options: [
      { value: "normal", label: "可以，基本正常" },
      { value: "limp", label: "可以，但明显跛行" },
      { value: "unable", label: "无法连续走四步" },
    ],
  },
  swelling: {
    id: "swelling",
    title: "肿胀是怎样出现的？",
    why: "肿胀速度和范围会影响当天是否适合继续负重与手法测试。",
    options: [
      { value: "none", label: "没有明显肿胀" },
      { value: "mild", label: "逐渐出现，范围不大" },
      { value: "rapid", label: "短时间内明显肿起" },
    ],
  },
  bruising: {
    id: "bruising",
    title: "有没有淤青或皮下出血？",
    why: "局部淤青和向脚趾方向扩散的陈旧淤血可以是损伤后的常见表现，不等同于循环异常。",
    options: [
      { value: "none", label: "没有明显淤青" },
      { value: "local", label: "受伤位置周围有紫红或青黄淤青" },
      { value: "tracking", label: "淤青逐渐向足部或脚趾方向移动" },
    ],
  },
  tenderness: {
    id: "tenderness",
    title: "轻按后，最痛的是哪一种位置？",
    why: "触诊在这里用于定位，不要求判断韧带撕裂等级。",
    options: [
      { value: "soft", label: "骨头旁边的软组织" },
      { value: "boneFocal", label: "骨头突起上一个点很集中" },
      { value: "boneDiffuse", label: "骨头附近一片都痛" },
      { value: "broad", label: "整个区域都比较敏感" },
      { value: "unsure", label: "找不准位置" },
    ],
  },
  boneLocation: {
    id: "boneLocation",
    title: "这个骨点大约在哪里？",
    why: "骨点压痛不能单独证明骨折；位置、受伤机制和承重能力要放在一起判断。",
    options: [
      { value: "malleolus", label: "内踝或外踝尖端 / 后缘" },
      { value: "fifth", label: "小脚趾侧足背的骨性突起" },
      { value: "navicular", label: "足弓内上方的骨性突起" },
      { value: "other", label: "其他位置或说不清" },
    ],
  },
  achilles: {
    id: "achilles",
    title: "蹬地或踮脚的能力有没有突然下降？",
    why: "后方症状或蹬地机制下，需要先确认跟腱功能。",
    options: [
      { value: "normal", label: "与平时接近" },
      { value: "weak", label: "明显无力或疼痛" },
      { value: "unable", label: "完全不能蹬地或踮脚" },
    ],
  },
  sensation: {
    id: "sensation",
    title: "除了局部淤青，脚趾或整个足部有没有异常？",
    why: "这里看的是全足或脚趾的循环、温度和感觉变化，不把局部淤青算作异常变色。",
    options: [
      { value: "normal", label: "只有局部淤青，脚趾温度和感觉正常" },
      { value: "brief", label: "包扎后短暂麻凉，松开后已恢复" },
      { value: "persistent", label: "脚趾或全足仍发凉、麻木、苍白或青紫" },
    ],
  },
  goal: {
    id: "goal",
    title: "目前最想先恢复什么？",
    why: "最终方案要围绕真实任务，而不是只追求“不痛”。",
    options: [
      { value: "walk", label: "正常走路" },
      { value: "stairs", label: "上下楼与日常活动" },
      { value: "training", label: "力量训练" },
      { value: "sport", label: "跑跳、球类或变向" },
    ],
  },
};

function getQuestions(answers: AnswerMap) {
  const questions = [
    CORE_QUESTIONS.location,
    CORE_QUESTIONS.mechanism,
    CORE_QUESTIONS.energy,
    CORE_QUESTIONS.timing,
    CORE_QUESTIONS.trend,
    CORE_QUESTIONS.painQuality,
    CORE_QUESTIONS.functionLimits,
    CORE_QUESTIONS.bearing,
    CORE_QUESTIONS.swelling,
    CORE_QUESTIONS.bruising,
    CORE_QUESTIONS.tenderness,
  ];

  if (answers.tenderness === "boneFocal") {
    questions.push(CORE_QUESTIONS.boneLocation);
  }

  if (
    answers.location === "posterior" ||
    answers.mechanism === "push"
  ) {
    questions.push(CORE_QUESTIONS.achilles);
  }

  questions.push(CORE_QUESTIONS.sensation, CORE_QUESTIONS.goal);
  return questions;
}

function labelFor(question: Question, value: string) {
  if (question.multiple) {
    return value
      .split(",")
      .map(
        (item) =>
          question.options.find((option) => option.value === item)?.label ?? item,
      )
      .join("、");
  }
  return question.options.find((option) => option.value === value)?.label ?? value;
}

function hasFunctionLimit(answers: AnswerMap, value: string) {
  return (answers.functionLimits ?? "").split(",").includes(value);
}

function isHighEnergy(answers: AnswerMap) {
  return ["fixedTwist", "height", "collision"].includes(answers.energy);
}

function buildDirections(answers: AnswerMap): Direction[] {
  const directions: Direction[] = [];
  const focalBoneTenderness = answers.tenderness === "boneFocal";
  const needsBoneReview =
    (focalBoneTenderness &&
      (isHighEnergy(answers) || answers.bearing === "unable" || answers.trend === "worse")) ||
    (answers.bearing === "unable" &&
      (isHighEnergy(answers) ||
        answers.timing === "longer" ||
        answers.trend === "worse")) ||
    answers.location === "midfoot";

  if (needsBoneReview) {
    directions.push({
      label: "先补充",
      title: "骨性风险与影像需要",
      reason: "骨点集中压痛、无法走四步或中足症状，需要先把是否需要影像检查说清楚。",
      tone: "review",
    });
  }

  if (answers.location === "posterior" || answers.mechanism === "push") {
    directions.push({
      label: "重点方向",
      title: "跟腱与小腿后侧功能",
      reason: "后方症状或蹬地机制，需要结合踮脚能力和 Thompson 测试。",
      tone: "primary",
    });
  } else if (answers.location === "high" || answers.mechanism === "external") {
    directions.push({
      label: "重点方向",
      title: "高位踝扭伤方向",
      reason: "症状位于踝上方或出现外旋机制，需要加入胫腓联合相关检查。",
      tone: "primary",
    });
  } else if (answers.location === "lateral" || answers.mechanism === "inversion") {
    directions.push({
      label: "重点方向",
      title: "外侧踝扭伤恢复路径",
      reason: "外踝前下方症状与内翻机制，更符合常见外侧踝扭伤表现。",
      tone: "primary",
    });
  } else {
    directions.push({
      label: "重点方向",
      title: "踝部急性损伤的功能分级",
      reason: "当前机制不够典型，先用位置、活动和承重表现缩小范围。",
      tone: "primary",
    });
  }

  directions.push(
    {
      label: "共同检查",
      title: "肿胀与四方向活动",
      reason: "急性期的活动受限可能来自肿胀和保护性紧张，需要与健侧逐项比较。",
      tone: "support",
    },
    {
      label: "共同检查",
      title: "承重、步态与踝部控制",
      reason: "能否稳定站立和行走，直接决定训练从保护、扶持还是正常负重开始。",
      tone: "support",
    },
  );

  return directions.slice(0, 4);
}

const BASE_CHECKS: Record<string, AnkleCheck> = {
  palpation: {
    id: "palpation",
    kind: "触诊",
    mode: "单人可做",
    title: "疼痛位置地图",
    why: "先区分骨点、软组织和大范围敏感，不要求摸出具体韧带等级。",
    instruction: "先按健侧，再用指腹轻按患侧外踝、内踝和足部骨性突起周围；不要反复重压。",
    positive: "骨性突起上出现非常集中、清晰的压痛，需要优先补充专业判断。",
    options: [
      { value: "soft", label: "软组织更明显", meaning: "软组织损伤方向更值得继续检查" },
      { value: "boneFocal", label: "一个骨点很集中", meaning: "结合位置、承重、机制和趋势决定是否需要影像" },
      { value: "boneDiffuse", label: "骨头附近一片都痛", meaning: "先按局部炎症、肿胀和功能反应继续分级" },
      { value: "broad", label: "范围较散", meaning: "以肿胀、活动和功能分级为主" },
      { value: "skip", label: "位置找不准", meaning: "不根据触诊下结论" },
    ],
  },
  dorsiflexion: {
    id: "rom-dorsiflexion",
    kind: "活动",
    shortLabel: "背屈",
    mode: "单人可做",
    title: "背屈：脚背向小腿靠近",
    why: "背屈会影响胫骨向前移动、站立中期和步幅。",
    instruction: "坐着，脚跟保持接触地面；先做健侧，再把患侧脚背向小腿方向抬起；只到舒适位置。",
    options: [
      { value: "close", label: "接近健侧", meaning: "背屈不是当前主要限制" },
      { value: "limited", label: "患侧更少", meaning: "记录背屈为优先恢复方向" },
      { value: "sharp", label: "有刺痛但能返回", meaning: "降低幅度，并测试周围肌肉和疼痛保护是否参与" },
      { value: "locked", label: "明显卡住或锁住", meaning: "不要继续追求终点，先补充关节内问题判断", needsReview: true },
      { value: "skip", label: "暂不测试", meaning: "当前先以保护和记录为主" },
    ],
    positive: "患侧脚背抬起明显更少，或前方卡住、后方牵拉明显。",
  },
  plantarflexion: {
    id: "rom-plantarflexion",
    kind: "活动",
    shortLabel: "跖屈",
    mode: "单人可做",
    title: "跖屈：脚尖向下",
    why: "跖屈会影响离地推蹬和提踵。",
    instruction: "坐着让小腿放松；先做健侧，再把患侧脚尖缓慢向下；膝盖不要代偿移动。",
    positive: "患侧脚尖向下明显更少，或后方、前方出现锐痛或卡住。",
    options: [
      { value: "close", label: "接近健侧", meaning: "跖屈不是当前主要限制" },
      { value: "limited", label: "患侧更少", meaning: "记录跖屈为优先恢复方向" },
      { value: "sharp", label: "有刺痛但能返回", meaning: "降低幅度，并测试周围肌肉和疼痛保护是否参与" },
      { value: "locked", label: "明显卡住或锁住", meaning: "不要继续追求终点，先补充关节内问题判断", needsReview: true },
      { value: "skip", label: "暂不测试", meaning: "当前先以保护和记录为主" },
    ],
  },
  inversion: {
    id: "rom-inversion",
    kind: "活动",
    shortLabel: "内翻",
    mode: "单人可做",
    title: "内翻：脚底轻轻向内",
    why: "内翻常会牵涉外侧踝症状，急性期只做小范围主动比较。",
    instruction: "坐着让脚悬空；先做健侧，再让患侧脚底轻轻向内；不要用手扳，也不要追求终点。",
    positive: "患侧明显更少，或外踝疼痛被清晰再现。",
    options: [
      { value: "close", label: "接近健侧", meaning: "内翻不是当前主要限制" },
      { value: "limited", label: "患侧更少", meaning: "记录内翻为受限方向，先用小范围主动活动" },
      { value: "sharp", label: "有刺痛但能返回", meaning: "降低幅度，并测试外侧肌群和疼痛保护是否参与" },
      { value: "locked", label: "明显卡住或锁住", meaning: "停止继续内翻并补充关节内问题判断", needsReview: true },
      { value: "skip", label: "暂不测试", meaning: "急性反应较高时可以跳过" },
    ],
  },
  eversion: {
    id: "rom-eversion",
    kind: "活动",
    shortLabel: "外翻",
    mode: "单人可做",
    title: "外翻：脚底轻轻向外",
    why: "外翻活动与小腿外侧肌群的控制有关。",
    instruction: "坐着让脚悬空；先做健侧，再让患侧脚底轻轻向外；膝盖保持朝前。",
    positive: "患侧明显更少，外侧肌群不敢发力，或动作被疼痛打断。",
    options: [
      { value: "close", label: "接近健侧", meaning: "外翻不是当前主要限制" },
      { value: "limited", label: "患侧更少", meaning: "记录外翻活动与外侧肌群控制不足" },
      { value: "sharp", label: "有刺痛但能返回", meaning: "降低幅度，并测试内侧肌群和疼痛保护是否参与" },
      { value: "locked", label: "明显卡住或锁住", meaning: "停止加大幅度并补充关节内问题判断", needsReview: true },
      { value: "skip", label: "暂不测试", meaning: "当前先以保护和记录为主" },
    ],
  },
  accessory: {
    id: "accessory-joints",
    kind: "活动",
    shortLabel: "关节链",
    mode: "需要协助",
    title: "距骨、腓骨与足部关节活动",
    why: "线下记录里，背屈、跖屈和外翻受限经常会继续检查距骨、腓骨两端、骰骨或跟骨，但它们只能作为候选来源。",
    instruction: "仅由受过训练的人轻柔比较两侧距骨前后滑动、腓骨近端和远端活动，以及骰骨、跟骨活动；一次只检查一个位置，不熟悉就跳过。",
    positive: "某一位置与健侧差异明显，而且轻柔调整后原受限方向或走路立刻改变。",
    options: [
      { value: "close", label: "未见明显差异", meaning: "先回到肿胀、肌肉和主动控制" },
      { value: "talus", label: "距骨差异明显", meaning: "把距小腿关节活动列为候选来源" },
      { value: "fibula", label: "腓骨差异明显", meaning: "把腓骨近端或远端活动列为候选来源" },
      { value: "foot", label: "骰骨或跟骨差异明显", meaning: "把距下关节或中足活动列为候选来源" },
      { value: "skip", label: "无人协助", meaning: "跳过该项，不影响继续评估" },
    ],
  },
  weightShift: {
    id: "weight-shift",
    kind: "动作",
    shortLabel: "承重",
    mode: "单人可做",
    title: "扶持下重心转移",
    why: "它比直接单脚站更适合判断急性期的安全承重起点。",
    instruction: "双手扶稳，双脚站立，缓慢把一部分重量移向患侧，不追求完全单脚。",
    positive: "无法把重量移向患侧，或出现明显塌软和不敢落脚。",
    options: [
      { value: "controlled", label: "可以控制", meaning: "可以从渐进承重开始" },
      { value: "limited", label: "明显受限", meaning: "训练先从小幅度、有扶持的版本开始" },
      { value: "unable", label: "无法完成", meaning: "结合受伤时间、力量机制、骨点压痛和变化趋势分流" },
      { value: "skip", label: "暂不测试", meaning: "不强行进入承重检查" },
    ],
  },
  walk: {
    id: "walk",
    kind: "动作",
    shortLabel: "步态",
    mode: "单人可做",
    title: "四步与短距离步态",
    why: "记录步幅、推蹬和跛行，直接决定当天的训练起点。",
    instruction: "在有扶持和安全筛查允许时走四步；能完成再观察十步，不用距离换训练量。",
    positive: "无法连续走四步，或明显跛行、缩短步幅和不敢推蹬。",
    options: [
      { value: "normal", label: "基本正常", meaning: "可以进入轻量力量与平衡检查" },
      { value: "limp", label: "明显跛行", meaning: "先恢复承重和步态，不急着跑跳" },
      { value: "unable", label: "无法走四步", meaning: "不能只按步态判断，需结合时间、机制、骨点压痛和趋势" },
      { value: "skip", label: "暂不测试", meaning: "当前不强行走路" },
    ],
  },
  heelRaise: {
    id: "heel-raise",
    kind: "动作",
    shortLabel: "提踵",
    mode: "单人可做",
    title: "坐姿或双脚提踵",
    why: "只在踮脚、蹬地、走路或楼梯受限时检查小腿输出。",
    instruction: "先比较两侧坐姿提踵；能舒适承重时，再扶稳做双脚提踵 5 次；不要直接尝试患侧单脚提踵。",
    positive: "患侧明显少用力、提踵高度更低，或疼痛让动作中断。",
    options: [
      { value: "close", label: "两侧接近", meaning: "小腿输出暂不是主要限制" },
      { value: "weak", label: "患侧明显较弱", meaning: "后续加入分级小腿力量训练" },
      { value: "pain", label: "疼痛限制动作", meaning: "从更轻的坐姿或等长版本开始" },
      { value: "skip", label: "暂不测试", meaning: "当前不强行进入提踵" },
    ],
  },
  balance: {
    id: "balance-check",
    kind: "动作",
    shortLabel: "平衡",
    mode: "单人可做",
    title: "扶持下单脚站",
    why: "只在不稳、转身、走路或运动目标相关时检查。",
    instruction: "站在稳固支撑物旁；先测健侧，再扶着让患侧单脚站最多 10 秒；随时可以落脚。",
    positive: "患侧更依赖扶持、晃动明显，或不能稳定完成。",
    options: [
      { value: "close", label: "两侧接近", meaning: "基础静态平衡接近健侧" },
      { value: "wobble", label: "患侧更晃", meaning: "后续从有扶持的平衡训练开始" },
      { value: "unable", label: "不能完成", meaning: "先从双脚承重和步态恢复开始" },
      { value: "skip", label: "暂不测试", meaning: "当前不强行单脚站" },
    ],
  },
  step: {
    id: "step-check",
    kind: "动作",
    shortLabel: "台阶",
    mode: "单人可做",
    title: "低台阶上步与下步",
    why: "只有上下楼受限或楼梯是当前目标时才检查。",
    instruction: "扶栏使用同一个低台阶；先比较两侧各做 3 次上步，再比较 3 次缓慢下步。",
    positive: "患侧推不上去、下台阶时突然掉落，或明显依赖扶手和健侧。",
    options: [
      { value: "close", label: "两侧接近", meaning: "低台阶功能暂不构成主要限制" },
      { value: "upLimited", label: "上步更困难", meaning: "重点补小腿推蹬与臀腿力量" },
      { value: "downLimited", label: "下步更困难", meaning: "重点补背屈与下肢离心控制" },
      { value: "skip", label: "暂不测试", meaning: "当前不强行进入台阶" },
    ],
  },
  squat: {
    id: "squat-check",
    kind: "动作",
    shortLabel: "下蹲",
    mode: "单人可做",
    title: "扶持下蹲与小腿前移",
    why: "只有下蹲或小腿向前受限时才检查闭链背屈和下肢控制。",
    instruction: "双手扶稳，双脚同宽做小幅下蹲；保持脚跟着地，让膝盖沿脚尖方向前移；比较两侧承重。",
    positive: "患侧脚跟提前抬起、膝盖不敢前移，或身体明显躲向健侧。",
    options: [
      { value: "close", label: "两侧接近", meaning: "下蹲暂不构成主要限制" },
      { value: "ankleLimited", label: "脚跟抬起或膝前移少", meaning: "重点复查背屈与小腿后侧" },
      { value: "shift", label: "明显躲向健侧", meaning: "重点恢复患侧承重与下肢控制" },
      { value: "skip", label: "暂不测试", meaning: "当前不强行下蹲" },
    ],
  },
};

const SPECIAL_CHECKS: Record<string, AnkleCheck> = {
  thompson: {
    id: "thompson",
    kind: "特殊测试",
    shortLabel: "跟腱",
    mode: "需要协助",
    title: "小腿挤压测试（Thompson）",
    why: "只有出现后方疼痛、蹬地机制或踮脚能力突然下降时才需要。",
    instruction: "俯卧让脚伸出床边，由他人轻挤小腿肚，比较两侧脚是否自然向下动。",
    positive: "患侧脚几乎不动，且与健侧差别明显。",
    options: [
      { value: "normal", label: "两侧反应接近", meaning: "明显跟腱功能缺失的可能性下降" },
      { value: "abnormal", label: "患侧脚几乎不动", meaning: "先补充跟腱专业检查", needsReview: true },
      { value: "unclear", label: "无法判断", meaning: "不根据这次结果下结论" },
      { value: "skip", label: "无人协助", meaning: "跳过该项，不影响继续整理" },
    ],
  },
  squeeze: {
    id: "squeeze",
    kind: "特殊测试",
    shortLabel: "高位踝",
    mode: "需要协助",
    title: "小腿挤压测试（Squeeze test）",
    why: "只有踝上方疼痛或外旋机制时，才用于检查高位踝方向。",
    instruction: "由熟悉动作的人在小腿中段轻柔挤压胫骨和腓骨；不熟悉就跳过。",
    positive: "挤压小腿时，症状在远端踝上方被清晰再现。",
    options: [
      { value: "negative", label: "没有再现", meaning: "高位踝方向的优先级下降" },
      { value: "positive", label: "再现踝上方痛", meaning: "优先补充胫腓联合专业检查", needsReview: true },
      { value: "unclear", label: "无法判断", meaning: "保留该方向，不单独下结论" },
      { value: "skip", label: "暂不测试", meaning: "跳过需要手法经验的测试" },
    ],
  },
  drawer: {
    id: "drawer",
    kind: "特殊测试",
    shortLabel: "稳定性",
    mode: "需要协助",
    title: "踝前抽屉（训练者协助项）",
    why: "外侧踝扭伤方向下，用于补充稳定性信息；急性期并非必须完成。",
    instruction: "仅由熟悉手法的人在骨折风险已排除、反应可控时轻柔比较两侧；不熟悉就跳过。",
    positive: "患侧前移明显更多或终点感明显不同；疼痛本身不能等同于松弛。",
    options: [
      { value: "close", label: "两侧接近", meaning: "没有发现明显侧间差异" },
      { value: "loose", label: "患侧明显更松", meaning: "把外侧韧带稳定性列入专业检查" },
      { value: "unclear", label: "无法判断", meaning: "不根据手感下结论" },
      { value: "skip", label: "暂不测试", meaning: "不具备手法条件时直接跳过" },
    ],
  },
};

function buildChecks(answers: AnswerMap) {
  const special =
    answers.location === "posterior" || answers.mechanism === "push"
      ? SPECIAL_CHECKS.thompson
      : answers.location === "high" || answers.mechanism === "external"
        ? SPECIAL_CHECKS.squeeze
        : SPECIAL_CHECKS.drawer;

  const checks = [
    BASE_CHECKS.palpation,
    BASE_CHECKS.dorsiflexion,
    BASE_CHECKS.plantarflexion,
    BASE_CHECKS.inversion,
    BASE_CHECKS.eversion,
    BASE_CHECKS.accessory,
    special,
  ];

  const needsWalkingCheck =
    answers.bearing !== "normal" ||
    hasFunctionLimit(answers, "walk") ||
    hasFunctionLimit(answers, "stairs") ||
    hasFunctionLimit(answers, "push");
  const needsBalanceCheck =
    hasFunctionLimit(answers, "balance") ||
    answers.goal === "training" ||
    answers.goal === "sport";

  if (needsWalkingCheck || needsBalanceCheck) checks.push(BASE_CHECKS.weightShift);
  if (needsWalkingCheck) checks.push(BASE_CHECKS.walk);
  if (
    hasFunctionLimit(answers, "push") ||
    hasFunctionLimit(answers, "stairs") ||
    answers.goal === "training" ||
    answers.goal === "sport"
  ) {
    checks.push(BASE_CHECKS.heelRaise);
  }
  if (needsBalanceCheck) checks.push(BASE_CHECKS.balance);
  if (hasFunctionLimit(answers, "stairs") || answers.goal === "stairs") {
    checks.push(BASE_CHECKS.step);
  }
  if (hasFunctionLimit(answers, "squat")) checks.push(BASE_CHECKS.squat);

  return checks;
}

const ROM_CHECK_IDS = [
  "rom-dorsiflexion",
  "rom-plantarflexion",
  "rom-inversion",
  "rom-eversion",
] as const;

const ROM_LABELS: Record<(typeof ROM_CHECK_IDS)[number], string> = {
  "rom-dorsiflexion": "背屈",
  "rom-plantarflexion": "跖屈",
  "rom-inversion": "内翻",
  "rom-eversion": "外翻",
};

function getLimitedDirections(results: CheckResultMap) {
  return ROM_CHECK_IDS.filter(
    (id) => results[id] === "limited" || results[id] === "sharp",
  ).map((id) => ROM_LABELS[id]);
}

function getMuscleCandidates(answers: AnswerMap, results: CheckResultMap) {
  if (answers.location === "lateral" || answers.mechanism === "inversion") {
    return "外侧疼痛先比较腓骨长肌、腓骨短肌和小腿外侧肌腹；若足底也紧或推蹬受限，再比较足底内在肌和比目鱼肌。";
  }
  if (answers.location === "posterior" || answers.mechanism === "push") {
    return "后侧疼痛先比较腓肠肌与比目鱼肌肌腹，必要时再看足底屈肌群；避开跟腱本体和最痛点。";
  }
  if (answers.location === "medial") {
    return "内侧疼痛先比较胫骨后肌、小腿内后侧屈肌群与足底内在肌；避开内踝骨点和肌腱最痛处。";
  }
  if (answers.location === "midfoot") {
    return "中足或足底症状先确认没有集中骨点压痛，再比较足底内在肌、胫骨后肌和腓骨长肌。";
  }
  if (answers.location === "high" || answers.mechanism === "external") {
    return "踝上方疼痛不直接按压胫腓联合；只比较胫骨前肌、腓骨肌群和近端小腿肌腹是否存在可复测的紧张。";
  }
  if (answers.location === "diffuse") {
    return "疼痛范围较散时不预设肌肉；先用四向活动和走路找出最受限动作，再比较对应肌群。";
  }
  if (results["rom-dorsiflexion"] === "limited") {
    return "先比较腓肠肌和比目鱼肌；它们紧张时常会限制背屈，但仍要靠复测确认。";
  }
  return "先与健侧比较腓骨肌群、腓肠肌—比目鱼肌和足底内在肌，只选择真正紧张的一组。";
}

function getJointMobilizationOptions(limitedDirections: string[]) {
  const options: string[] = [];

  if (limitedDirections.includes("背屈")) {
    options.push("背屈受限：优先试距小腿关节距骨后滑，或负重位胫骨前移伴随松动");
  }
  if (limitedDirections.includes("跖屈")) {
    options.push("跖屈受限：可试距小腿关节距骨前滑；外侧韧带仍敏感时只做低等级、小幅度");
  }
  if (limitedDirections.includes("内翻")) {
    options.push("内翻受限：比较距下关节与中足活动，选择不牵拉外侧痛点的低等级内翻相关松动");
  }
  if (limitedDirections.includes("外翻")) {
    options.push("外翻受限：比较距下关节与中足活动，选择不挤压内踝痛点的低等级外翻相关松动");
  }

  return options.join("；");
}

function getMobilityCandidates(limitedDirections: string[]) {
  const candidates: string[] = [];

  if (limitedDirections.includes("背屈")) {
    candidates.push("背屈可排查腓肠肌、比目鱼肌、后方软组织、肿胀与距小腿关节后滑");
  }
  if (limitedDirections.includes("跖屈")) {
    candidates.push("跖屈可排查胫骨前肌、趾伸肌群、前方软组织、肿胀与距小腿关节前滑");
  }
  if (limitedDirections.includes("内翻")) {
    candidates.push("内翻可排查腓骨肌群、外侧疼痛保护，以及距下关节和中足活动");
  }
  if (limitedDirections.includes("外翻")) {
    candidates.push("外翻可排查胫骨后肌、屈肌群、内侧疼痛保护，以及距下关节和中足活动");
  }

  return candidates.join("；");
}

function getAccessoryCandidate(results: CheckResultMap) {
  if (results["accessory-joints"] === "talus") {
    return "本次比较中距骨活动差异更明显，先把距小腿关节作为一个独立候选；";
  }
  if (results["accessory-joints"] === "fibula") {
    return "本次比较中腓骨活动差异更明显，分别确认近端或远端，不要两处一起处理；";
  }
  if (results["accessory-joints"] === "foot") {
    return "本次比较中骰骨或跟骨活动差异更明显，先把距下关节或中足作为一个独立候选；";
  }
  return "";
}

function buildInterventions(
  answers: AnswerMap,
  results: CheckResultMap,
  trialResults: Record<string, TrialResult>,
): Intervention[] {
  const limitedDirections = getLimitedDirections(results);
  const limitedDirectionText =
    limitedDirections.length > 0 ? limitedDirections.join("、") : "原受限方向";
  const hasSharpMotion = ROM_CHECK_IDS.some((id) => results[id] === "sharp");
  const hasLockedMotion = ROM_CHECK_IDS.some((id) => results[id] === "locked");
  const muscleCandidates = getMuscleCandidates(answers, results);
  const highEnergy = isHighEnergy(answers);
  const cannotLoad =
    answers.bearing === "unable" ||
    results["weight-shift"] === "unable" ||
    results.walk === "unable";
  const persistentFunctionLoss =
    cannotLoad &&
    (highEnergy ||
      answers.timing === "longer" ||
      answers.trend === "worse" ||
      (answers.timing === "day14" && answers.trend !== "better"));
  const focalBoneTenderness =
    answers.tenderness === "boneFocal" || results.palpation === "boneFocal";
  const focalBoneNeedsPriority =
    focalBoneTenderness &&
    (highEnergy ||
      cannotLoad ||
      answers.location === "midfoot" ||
      answers.trend === "worse" ||
      answers.timing === "longer");
  const acutePainLimitedWeightBearing =
    cannotLoad &&
    !persistentFunctionLoss &&
    !focalBoneNeedsPriority;
  const needsPriorityReview =
    focalBoneNeedsPriority ||
    answers.sensation === "persistent" ||
    hasLockedMotion ||
    persistentFunctionLoss ||
    results.thompson === "abnormal" ||
    results.squeeze === "positive";
  const mustPauseForMedical =
    answers.sensation === "persistent" ||
    results.thompson === "abnormal";
  const reviewTriggers = [
    ...(focalBoneNeedsPriority ? ["骨点集中压痛，同时伴随承重下降、较大力量、中足位置或持续变差"] : []),
    ...(answers.sensation === "persistent" ? ["脚趾或全足持续发凉、麻木、苍白或青紫"] : []),
    ...(hasLockedMotion ? ["关节活动出现明显卡住或锁住"] : []),
    ...(persistentFunctionLoss ? ["无法承重并且持续不改善、变差或伴较大力量机制"] : []),
    ...(results.thompson === "abnormal" ? ["小腿挤压后足部反应异常，需要确认跟腱连续性"] : []),
    ...(results.squeeze === "positive" ? ["小腿挤压测试诱发远端踝上方疼痛，需要确认高位踝方向"] : []),
  ];
  const romLimited = limitedDirections.length > 0;
  const bearingLimited =
    answers.bearing !== "normal" ||
    results["weight-shift"] === "limited" ||
    results["weight-shift"] === "unable" ||
    results.walk === "limp" ||
    results.walk === "unable";
  const hasReportedFunctionLimit =
    Boolean(answers.functionLimits) && !hasFunctionLimit(answers, "none");
  const strengthRelevant =
    hasFunctionLimit(answers, "walk") ||
    hasFunctionLimit(answers, "stairs") ||
    hasFunctionLimit(answers, "push") ||
    hasFunctionLimit(answers, "balance") ||
    results["heel-raise"] === "weak" ||
    results["heel-raise"] === "pain" ||
    results["weight-shift"] === "limited" ||
    answers.goal === "training" ||
    answers.goal === "sport";
  const gaitRelevant =
    hasFunctionLimit(answers, "walk") ||
    hasFunctionLimit(answers, "stairs") ||
    answers.goal === "walk" ||
    answers.goal === "stairs" ||
    results.walk === "limp";
  const balanceRelevant =
    hasFunctionLimit(answers, "balance") ||
    results["balance-check"] === "wobble" ||
    results["balance-check"] === "unable" ||
    answers.goal === "training" ||
    answers.goal === "sport";
  const stairsRelevant =
    hasFunctionLimit(answers, "stairs") ||
    results["step-check"] === "upLimited" ||
    results["step-check"] === "downLimited" ||
    answers.goal === "stairs";
  const squatRelevant =
    hasFunctionLimit(answers, "squat") ||
    results["squat-check"] === "ankleLimited" ||
    results["squat-check"] === "shift";
  const muscleTrialAllowed =
    answers.painQuality === "sore" ||
    answers.painQuality === "dull" ||
    answers.painQuality === "unclear";
  const earlyReactive =
    answers.timing === "day1" ||
    answers.swelling === "rapid";

  const interventions: Intervention[] = [];

  if (needsPriorityReview) {
    interventions.push({
      id: "review",
      category: "优先确认",
      title: "这项异常需要进一步确认",
      status: mustPauseForMedical ? "确认前暂停手法与负重测试" : "先确认，同时保留低风险活动",
      why: reviewTriggers.join("；"),
      metric: "把触发这一分支的原测试结果保存下来",
      action: `触发原因：${reviewTriggers.join("；")}；不要反复重做阳性测试；保存受伤机制、最痛位置、承重能力和变化趋势；由医生判断是否需要 X 线、超声或 MRI。`,
      dose: "记录一次完整基线即可",
      observe: "脚趾或全足的温度、感觉、颜色，以及静息痛和承重能力是否继续变化",
      retest: "按照专业评估给出的安全范围，重新做原来的功能测试",
      delayRetest: "拿到检查结论或明确活动限制后再更新方案",
      betterNext: "按允许范围进入主动活动和逐级承重，不把影像描述直接当成症状原因。",
      sameNext: "补充尚未明确的结构与功能信息，不用更强手法继续试。",
      worseNext: "停止诱发测试，及时完成医学评估。",
      resultLabels: {
        better: "功能允许增加",
        same: "限制未改变",
        worse: "异常加重",
      },
    });

    if (mustPauseForMedical) {
      interventions.push({
        id: "comfort",
        category: "确认前可做",
        title: "只保留舒适活动和症状记录",
        status: "可做",
        why: "等待确认不等于完全不动，但不能靠更大负荷验证严重程度。",
        metric: "活动前后的静息反应和足部感觉",
        action: "只做脚趾活动和不牵涉锐痛的轻柔踝泵；不强压终点，也不做负重背屈松动。",
        dose: "每次 5–8 次，动作轻柔",
        observe: "动作中不出现锁住、持续麻木、发凉或脚趾及全足异常变色",
        retest: "活动后再次确认静息反应是否稳定",
        delayRetest: "2–4 小时后记录一次，第二天早晨再记录一次",
        betterNext: "保留轻柔活动，等待针对性检查结果。",
        sameNext: "不加量，也不自动升级到关节松动。",
        worseNext: "撤回这一活动，并把变化加入医学评估信息。",
        resultLabels: {
          better: "静息更稳定",
          same: "没有变化",
          worse: "反应加重",
        },
      });
      return interventions;
    }
  }

  if (focalBoneTenderness) {
    interventions.push({
      id: "bone-monitor",
      category: "骨点压痛",
      title: "保护这个点，同时继续看功能变化",
      status: "可继续低风险处理",
      why: "单独骨点压痛不能证明骨折；低能量、能承重且趋势改善时，不必锁死全部康复。",
      metric: "同一骨点的压痛范围、走路能力和肿胀",
      action: "避免反复重压痛点；按耐受做轻柔踝泵和短距离走路。若骨点越来越集中、承重下降或数日不改善，再补充 X 线或医学评估。",
      dose: "当天少量多次，以不加重跛行为准",
      observe: "骨点压痛是否扩大，肿胀是否增加，原本能走是否变成不能走",
      retest: "重新轻按同一点，并走相同的 4–10 步",
      delayRetest: "24–48 小时比较压痛范围、肿胀和承重趋势",
      betterNext: "保留保护，继续进入活动度、力量和步态恢复。",
      sameNext: "维持低负荷；若仍是明确骨点集中压痛，可安排影像确认但不必完全停动。",
      worseNext: "停止增加负荷，保存本次记录并补充影像或医学评估。",
      resultLabels: {
        better: "压痛 / 走路改善",
        same: "变化不明显",
        worse: "压痛或承重变差",
      },
    });
  }

  if (acutePainLimitedWeightBearing) {
    interventions.push({
      id: "acute-bearing",
      category: "承重复测",
      title: "先降低急性疼痛，再复测四步",
      status: "短期观察",
      why: "伤后时间较短时，疼痛和保护性紧张可能暂时限制承重，但仍要用趋势确认。",
      metric: "扶持下患侧可承担的重量，以及能否连续走四步",
      action: "使用扶持或辅助工具减少患侧负荷；在舒适范围做踝泵和轻柔主动活动；不强行走远；保留骨点触诊和症状趋势记录。",
      dose: "当天分散完成 2–3 轮，每轮只做少量舒适活动",
      observe: "能否逐渐增加患侧承重，是否新出现骨点集中压痛、快速肿胀或功能继续下降",
      retest: "休息和低剂量活动后，再扶持尝试连续四步",
      delayRetest: "12–24 小时后再次记录四步能力和整体趋势",
      betterNext: "进入渐进承重和步态训练，不急于增加距离。",
      sameNext: "如果仍完全无法走四步，结合骨点压痛和受伤机制考虑影像或专业评估。",
      worseNext: "停止增加承重；功能继续下降或出现骨点压痛时优先检查。",
      resultLabels: {
        better: "承重增加",
        same: "仍不能四步",
        worse: "功能更差",
      },
    });
  }

  if (answers.swelling !== "none") {
    interventions.push({
      id: "swelling",
      category: "肿胀",
      title: "控制肿胀，保留活动",
      status: answers.swelling === "rapid" ? "优先观察" : "当前可试",
      why: "肿胀会影响活动和承重，但不需要追求几分钟内完全消失。",
      metric: "同一角度照片中的外踝轮廓、肿胀边界和皮肤纹理",
      action: "先记录基线；使用合适支撑或加压并抬高；在舒适范围做轻柔踝泵。",
      dose: earlyReactive ? "踝泵 8–10 次；2–4 小时后再记录" : "踝泵 10–15 次；当天记录 2 次",
      observe: "支撑不过紧；肿胀边界不继续扩大，足部不出现发凉、变色或麻木",
      retest: "15–30 分钟后用同一角度观察肿胀是否减轻",
      delayRetest: "2–4 小时和第二天早晨，再比较同角度照片",
      betterNext: "保留有效支持，随后进入舒适主动活动与逐级承重。",
      sameNext: "先检查使用时间、支撑松紧和当天负荷，不直接升级到强力手法。",
      worseNext: "撤回过紧支撑；若肿胀快速增加或功能下降，补充医学评估。",
      resultLabels: {
        better: "肿胀减轻",
        same: "没有变化",
        worse: "肿胀增加",
      },
      medicineOption: true,
    });
  }

  if (
    muscleTrialAllowed &&
    (
      answers.tenderness === "soft" ||
      answers.tenderness === "boneDiffuse" ||
      answers.tenderness === "broad" ||
      results.palpation === "soft" ||
      results.palpation === "boneDiffuse" ||
      results.palpation === "broad"
    )
  ) {
    interventions.push({
      id: "tenderness",
      category: "按压痛",
      title: "放松相关肌肉，再复测",
      status: "一次试验",
      why: "按压痛用于定位，不需要把局部按到完全不痛。",
      metric: bearingLimited ? "轻压同一位置 + 扶持重心转移" : "轻压同一位置 + 主动背屈",
      action: `避开骨点、韧带区、肌腱和肿胀最明显处；${muscleCandidates}；只选一组肌腹轻柔处理，随后立即重复原功能动作。`,
      dose: earlyReactive ? "30–45 秒 × 1 轮" : "45–60 秒 × 1–2 轮",
      observe: "局部敏感是否下降，以及真实动作是否一起变得更容易",
      retest: bearingLimited ? "轻压同一位置，再做扶持重心转移" : "轻压同一位置，再做患侧主动背屈",
      delayRetest: "当天晚些时候确认压痛和功能是否反弹",
      betterNext: "把松解作为短暂辅助，立刻衔接改善后的主动动作。",
      sameNext: "不要继续重压；转去检查活动、负荷和动作策略。",
      worseNext: "停止局部处理；持续集中压痛并伴功能受限时补充专业评估。",
      resultLabels: {
        better: "压痛减轻",
        same: "没有变化",
        worse: "压痛增加",
      },
    });
  }

  if (answers.painQuality === "sharp" || hasSharpMotion) {
    interventions.push({
      id: "sharp-pain",
      category: "刺痛动作",
      title: "处理周围肌肉，复测刺痛动作",
      status: "先定位",
      why: "刺痛可以包含肌肉紧张或疼痛保护，但一次改善不能排除其他组织问题。",
      metric: "同一个诱发动作中，刺痛出现的方向和动作位置",
      action: `重做一次诱发动作并停在刺痛前；${muscleCandidates}；避开骨点、韧带、肌腱、淤血中心和刺痛点，只选一组周围肌腹轻柔处理；随后用相同幅度和承重重复原动作。`,
      dose: earlyReactive ? "周围肌腹 30–45 秒 × 1 轮" : "周围肌腹 45–60 秒 × 1–2 轮",
      observe: "刺痛是否更晚出现或范围缩小，动作不能出现卡住、锁住或打软",
      retest: "用相同幅度和承重重复原动作，比较刺痛",
      delayRetest: "当天晚些时候再次做同一低剂量动作",
      betterNext: "保留周围肌肉处理作为辅助，立刻训练改善后的动作范围。",
      sameNext: "不继续重压，转去复查活动方向、肿胀、关节活动和触诊位置。",
      worseNext: "停止诱发动作；若固定骨点痛、卡住或功能继续下降，补充医学评估。",
      resultLabels: {
        better: "刺痛减轻",
        same: "没有变化",
        worse: "刺痛加重",
      },
    });
  }

  if (answers.painQuality === "burning") {
    interventions.push({
      id: "sensory-pain",
      category: "麻电感",
      title: "先比较感觉分布和支撑压力",
      status: "先观察",
      why: "烧灼或麻电感不按普通肌肉酸痛处理。",
      metric: "足背、足底和脚趾轻触感觉与健侧的差别",
      action: "松开可能压迫局部的鞋带或支撑；轻触比较两侧足背、足底和脚趾；记录麻电感的边界，不在麻木区强力按压。",
      dose: "比较 1 轮，不反复刺激",
      observe: "感觉范围是否扩大，是否同时出现发凉、变色或明显无力",
      retest: "10–15 分钟后再比较同一区域的轻触感觉",
      delayRetest: "当天晚些时候再确认感觉是否恢复或扩大",
      betterNext: "避免局部压迫，并继续观察感觉是否稳定恢复。",
      sameNext: "若持续不恢复，补充神经与循环相关专业评估。",
      worseNext: "停止加压和负重测试，尽快完成专业评估。",
      resultLabels: {
        better: "感觉恢复",
        same: "没有变化",
        worse: "范围扩大",
      },
    });
  }

  if (romLimited) {
    interventions.push({
      id: "mobility",
      category: "活动受限",
      title:
        !earlyReactive && results["weight-shift"] !== "unable"
          ? `恢复${limitedDirectionText}`
          : `先恢复${limitedDirectionText}`,
      status: "优先复测",
      why: "先区分肿胀、疼痛保护、肌肉紧张和关节活动不足，不预设原因。",
      metric: `与健侧比较${limitedDirectionText}，并重复原来的承重动作`,
      action: `${getAccessoryCandidate(results)}${getMobilityCandidates(limitedDirections)}；结合疼痛位置，从${muscleCandidates}中只选一组做轻柔试验；随后练${limitedDirectionText}的舒适主动范围；若即时复测没有改善，记录“没有变化”并进入下一张关节松动卡。`,
      dose: "主动活动 6–10 次；软组织试验最多 60 秒",
      observe: "受限方向是否增加、终点感觉是否改变、原动作是否更容易",
      retest: `重复${limitedDirectionText}，再做原承重动作`,
      delayRetest: "当天晚上和第二天早晨复测同一方向",
      betterNext: "保留有效方法，但用主动活动和力量训练巩固新范围。",
      sameNext: "不继续加大肌肉处理力度，进入一项独立的关节松动试验。",
      worseNext: "撤回当前处理，回到更小范围；出现锐痛或卡住则补充医学评估。",
      resultLabels: {
        better: "范围增加",
        same: "没有变化",
        worse: "范围更小",
      },
    });

    if (trialResults.mobility === "same" && !needsPriorityReview) {
      interventions.push({
        id: "joint-mobilization",
        category: "关节松动",
        title: `改试${limitedDirectionText}的关节松动`,
        status: "第二步",
        entry: "主动活动或肌肉试验后，原受限方向没有明显改善",
        why: "肌肉不是活动受限的唯一来源；关节附属活动不足可作为下一项独立假设。",
        metric: `与健侧比较${limitedDirectionText}，并保留原功能动作作为基线`,
        action: `确认没有骨点压痛、明显不稳、锐痛或卡住；由受过关节松动训练的人操作；${getAccessoryCandidate(results)}${getJointMobilizationOptions(limitedDirections)}；本轮只选一个关节和一个方向，不再叠加肌肉处理。`,
        dose: earlyReactive
          ? "I–II 级小幅度 30–45 秒 × 1 轮"
          : "I–II 级起步 30–60 秒 × 1–2 轮",
        observe: "手法过程中不出现锐痛、卡住、明显不稳、麻木或症状向远端扩散",
        retest: `立即重复${limitedDirectionText}，再做原受限功能动作`,
        delayRetest: "当天晚些时候和第二天复测同一方向与原功能动作",
        betterNext: "保留这一方向，用主动活动和力量训练巩固新范围；不必继续增加手法强度。",
        sameNext: "停止继续加级或增加次数，改查肿胀、稳定性、疼痛来源和相邻关节。",
        worseNext: "立即停止手法并回到舒适主动活动；出现持续锐痛、卡住或功能下降时补充医学评估。",
        resultLabels: {
          better: "范围增加",
          same: "没有变化",
          worse: "出现不适",
        },
      });
    }
  }

  if (strengthRelevant) interventions.push({
    id: "strength",
    category: "小腿力量",
    title: bearingLimited || earlyReactive ? "先找回四向发力" : "恢复提踵与四向力量",
    status: "步态基础",
    why: "步态不仅需要活动范围，还需要背屈、跖屈、内翻和外翻肌群共同控制。",
    metric: bearingLimited ? "坐姿提踵与外翻等长的两侧差别" : "双脚提踵的高度、节奏和患侧分担",
    action: bearingLimited || earlyReactive
      ? "坐位保持脚踝中立，用健侧脚或毛巾提供轻阻力，依次做背屈、跖屈、内翻、外翻等长；再做双脚坐姿提踵；外侧扭伤优先观察腓骨肌群外翻发力是否敢用。"
      : "用弹力带依次练背屈、跖屈、内翻、外翻；做双脚提踵，能保持两侧同高同速后再逐渐增加患侧分担；最后加入扶持单腿站。",
    dose: bearingLimited || earlyReactive
      ? "每方向 5 秒 × 5 次；坐姿提踵 2 组 × 8 次"
      : "四向力量各 2 组 × 8–12 次；提踵 2 组 × 8–12 次",
    observe: "疼痛不明显上升，动作不靠膝和髋代偿，训练后肿胀不扩大",
    retest: bearingLimited ? "再做扶持重心转移和坐姿提踵" : "再做 10 次双脚提踵并比较两侧高度",
    delayRetest: "当天晚些时候和第二天确认肿胀、走路和肌肉酸痛没有明显反弹",
    betterNext: "保留当前力量版本；先增加动作质量或患侧分担，不同时增加阻力和次数。",
    sameNext: "检查是否选错方向或阻力过轻；仍无变化时转去复查活动度和步态。",
    worseNext: "降低阻力和次数；若承重或肿胀持续变差，回到保护阶段并补充评估。",
    resultLabels: {
      better: "完成更稳",
      same: "没有变化",
      worse: "反应加重",
    },
  });

  if (gaitRelevant) interventions.push({
    id: "movement",
    category: "步态",
    title: bearingLimited ? "重建脚跟到脚趾的步态" : "把力量带回走路",
    status: "功能核心",
    why: "疼痛动作首先是一个负荷任务，肌肉松解只是其中一个可验证方向。",
    metric: bearingLimited ? "相同步数下的跛行、疼痛和信心" : "同一动作、同一幅度和同一负荷",
    action: bearingLimited
      ? "扶稳做患侧重心转移；用较短步幅练习脚跟落地、全脚掌承重、前脚掌推蹬；不能自然推蹬时先回到坐姿提踵和小腿力量；再走 10 步。"
      : "保持自然步幅走 10–20 步；观察患侧站立时间和前脚掌推蹬；再逐步加入快走、台阶或目标动作，一次只增加一个变量。",
    dose: "每轮 10–20 步，共 2–3 轮；明显跛行时缩短步幅和轮次",
    observe: "左右站立时间、步幅和推蹬是否更接近，疼痛和肿胀不因距离增加而上升",
    retest: "同样走 10 步，比较跛行、步幅和推蹬",
    delayRetest: "当晚及第二天确认没有症状反弹",
    betterNext: "训练刚刚改善的动作版本，再逐步恢复原幅度和负荷。",
    sameNext: "改查关节活动、控制或负荷来源；一次只换一个方向。",
    worseNext: "撤回修改并降低任务难度；若功能继续下降则补充医学评估。",
    resultLabels: {
      better: "跛行减少",
      same: "没有变化",
      worse: "跛行加重",
    },
  });

  if (hasReportedFunctionLimit && (gaitRelevant || stairsRelevant)) interventions.push({
    id: "hip-leg-strength",
    category: "臀腿力量",
    title: "让髋、膝、踝一起承担日常动作",
    status: "恢复走路后",
    entry: "可以连续走 10 步，且练习后疼痛和肿胀没有持续上升",
    why: "走路和楼梯不是踝关节单独完成，还需要髋膝控制身体重心。",
    metric: "5 次坐站或低台阶上步时，两侧用力和膝盖方向",
    action: "先做双脚坐站，保持两脚均匀承重；再做臀桥或扶持分腿站，补充臀肌与大腿力量；最后加入低台阶上步，患侧脚掌保持稳定。",
    dose: "每个动作 2 组 × 8–12 次；一次只选 2 个动作",
    observe: "躯干不明显偏向健侧，膝盖朝向第二脚趾，患侧脚掌不塌陷或突然卸力",
    retest: "再做 5 次坐站或 5 次低台阶上步，比较两侧用力",
    delayRetest: "第二天确认走路、楼梯和肿胀没有反弹",
    betterNext: "先增加患侧承担比例，再增加台阶高度或外部负重。",
    sameNext: "降低动作难度，检查是否仍受踝背屈、疼痛或信心限制。",
    worseNext: "退回双脚均匀承重版本；若日常功能持续下降则重新评估。",
    resultLabels: {
      better: "动作更对称",
      same: "没有变化",
      worse: "代偿增加",
    },
  });

  if (balanceRelevant) interventions.push({
    id: "balance",
    category: "平衡稳定",
    title: "从双脚稳定过渡到单脚控制",
    status: "日常必做",
    entry: "患侧可以舒适承重，平地走路没有持续加重",
    why: "静态和动态平衡决定患侧能否在走路、楼梯和转身时及时控制重心。",
    metric: "健侧与患侧的站立时间、身体晃动和是否需要扶持",
    action: "先做前后脚站立；再扶着做患侧单脚站；稳定后加入前、侧、后方轻触地面；每次只增加时间或方向。",
    dose: "每个版本 20–30 秒 × 3 轮",
    observe: "脚趾不过度抓地，骨盆不过度偏移，踝关节可以小幅调整而不是突然塌软",
    retest: "比较两侧单脚站立时间和晃动，再走 10 步",
    delayRetest: "第二天确认没有新增肿胀、打软或不稳感",
    betterNext: "减少扶持，随后增加触地方向或轻微外界干扰。",
    sameNext: "回到更稳定的站姿，先补足小腿与臀腿力量。",
    worseNext: "停止单脚版本，回到双脚或前后脚站立并重新检查承重能力。",
    resultLabels: {
      better: "站得更稳",
      same: "没有变化",
      worse: "更加不稳",
    },
  });

  if (stairsRelevant) interventions.push({
    id: "stairs",
    category: "上下楼",
    title: "把小腿推蹬和臀腿控制带上台阶",
    status: answers.goal === "stairs" ? "当前目标" : "日常进阶",
    entry: "平地走路不明显跛行，能完成 10 次双脚提踵和低台阶承重",
    why: "上楼需要小腿推蹬和髋膝伸展，下楼还需要踝背屈与下肢离心控制。",
    metric: "同一台阶高度下的扶手依赖、推蹬、膝盖方向和下落控制",
    action: "扶栏做低台阶上步，患侧脚完全踩稳后再起身；练习低台阶下步，控制身体缓慢下降；能稳定完成后再减少扶手或增加台阶高度。",
    dose: "上步、下步各 2 组 × 5–8 次",
    observe: "不靠健侧跳上台阶，不突然落下，膝盖与脚尖方向一致，训练后肿胀不增加",
    retest: "用同一台阶连续完成 5 次上步和 5 次下步",
    delayRetest: "当天晚些时候和第二天记录楼梯后的疼痛与肿胀",
    betterNext: "先减少扶手，再增加次数或台阶高度；一次只进一个变量。",
    sameNext: "回查背屈、小腿提踵力量和臀腿控制哪一项仍限制动作。",
    worseNext: "降低台阶或只练上步；下楼持续困难时先恢复背屈与离心力量。",
    resultLabels: {
      better: "上下更顺",
      same: "没有变化",
      worse: "更加困难",
    },
  });

  if (squatRelevant) interventions.push({
    id: "squat",
    category: "下蹲",
    title: "恢复小腿前移与患侧承重",
    status: "对应功能",
    entry: earlyReactive ? "平地承重稳定，练习后肿胀没有持续增加" : undefined,
    why: "下蹲受限可能来自背屈不足、疼痛回避或下肢控制，需用同一动作区分。",
    metric: "同一深度下的脚跟、膝盖前移和左右承重",
    action: "扶稳做小幅下蹲；脚跟保持着地，膝盖沿脚尖方向前移；若脚跟先抬，先练舒适背屈；若身体躲向健侧，先缩小深度并增加患侧承重。",
    dose: "2 组 × 6–8 次",
    observe: "脚跟不提前抬起，膝盖方向稳定，身体不明显躲向健侧",
    retest: "用相同站距和深度再做 5 次下蹲",
    delayRetest: "当天晚些时候和第二天比较下蹲与肿胀反应",
    betterNext: "保留当前深度，再逐步增加幅度或负荷。",
    sameNext: "回查背屈、疼痛位置和患侧承重哪一项仍受限。",
    worseNext: "缩小深度或退回坐站；若功能继续下降则补充评估。",
    resultLabels: {
      better: "下蹲更对称",
      same: "没有变化",
      worse: "代偿增加",
    },
  });

  if (answers.goal === "training" || answers.goal === "sport") {
    interventions.push({
      id: "return-to-sport",
      category: answers.goal === "sport" ? "跑跳变向" : "回到训练",
      title: answers.goal === "sport" ? "从直线跑跳进阶到变向" : "把踝部能力带回力量训练",
      status: "后期阶段",
      entry: "活动度接近健侧，走路和楼梯正常，单脚提踵与单脚平衡接近健侧，次日无肿胀反弹",
      why: "无痛不等于已经具备力量、耐力、平衡和专项负荷能力。",
      metric: answers.goal === "sport" ? "单脚提踵、单脚跳、落地和计划性变向的侧间差别" : "目标训练动作的幅度、负荷、稳定和次日反应",
      action: answers.goal === "sport"
        ? "先双脚跳和原地落地；再单脚小跳和直线慢跑；最后加入加速、减速与计划性变向；通过后再回到随机对抗。"
        : "先恢复双侧闭链力量动作；再增加患侧单腿动作；最后逐步恢复原训练重量、速度和总量。",
      dose: "每次只增加速度、方向、负重或总量中的一个变量",
      observe: "动作中没有打软和明显回避，训练后及第二天疼痛、肿胀和信心保持稳定",
      retest: answers.goal === "sport" ? "复测单脚提踵、单脚平衡和当前专项动作" : "用相同负荷复测目标训练动作",
      delayRetest: "训练后即刻、当天晚些时候和第二天早晨各记录一次",
      betterNext: "保持动作质量，下一次只增加一个专项变量。",
      sameNext: "继续当前级别，补足最落后的力量、平衡或落地环节。",
      worseNext: "退回上一级稳定版本，减少本次新增变量并重新评估。",
      resultLabels: {
        better: "完成更稳",
        same: "没有变化",
        worse: "反应加重",
      },
    });
  }

  if (interventions.length === 0) {
    interventions.push({
      id: "observe",
      category: "继续观察",
      title: "维持舒适活动，不增加额外处理",
      status: "当前即可",
      why: "询问和检查没有发现需要单独处理的肿胀、活动或功能问题。",
      metric: "原症状与日常动作表现",
      action: "保持目前可完成的日常活动；不额外按压、松动或增加训练量；第二天用同一动作再比较。",
      dose: "按日常需要活动",
      observe: "是否新出现肿胀、活动受限、跛行或感觉变化",
      retest: "第二天用同一日常动作比较症状",
      delayRetest: "24 小时后记录一次",
      betterNext: "继续原活动，再逐步恢复目标任务。",
      sameNext: "维持当前负荷，重新走一遍症状与功能询问。",
      worseNext: "根据新出现的问题补充对应检查。",
      resultLabels: {
        better: "症状减轻",
        same: "没有变化",
        worse: "出现异常",
      },
    });
  }

  return interventions;
}

function buildProblemItems(
  answers: AnswerMap,
  results: CheckResultMap,
  reviewSignals: string[],
): ProblemItem[] {
  const items: ProblemItem[] = [];
  const limitedDirections = getLimitedDirections(results);
  const hasSharpMotion = ROM_CHECK_IDS.some((id) => results[id] === "sharp");

  if (reviewSignals.length > 0) {
    items.push({
      id: "medical-confirmation",
      title: "有结果需要进一步确认",
      evidence: reviewSignals[0],
      next: "保存现有检查结果，必要时结合影像或医生意见后重新评估。",
      timing: "先补充确认",
    });
  }
  if (answers.swelling === "mild" || answers.swelling === "rapid") {
    items.push({
      id: "swelling",
      title: answers.swelling === "rapid" ? "肿胀反应明显" : "仍有局部肿胀",
      evidence: answers.swelling === "rapid" ? "短时间内明显肿起" : "肿胀逐渐出现、范围不大",
      next: "先控制肿胀并保留舒适活动；肿胀明显时不追求活动终点。",
      timing: "稍后观察",
    });
  }
  if (limitedDirections.length > 0) {
    items.push({
      id: "mobility",
      title: `${limitedDirections.join("、")}活动受限`,
      evidence: "与健侧比较后，患侧活动范围更小",
      next: "先处理相关肌肉；改善不明显时再考虑适合的关节松动。",
      timing: "立即复测",
    });
  }
  if (
    answers.tenderness === "soft" ||
    answers.tenderness === "boneDiffuse" ||
    answers.tenderness === "broad" ||
    results.palpation === "soft" ||
    results.palpation === "boneDiffuse" ||
    results.palpation === "broad"
  ) {
    items.push({
      id: "tissue-sensitivity",
      title: "局部软组织紧张或按压敏感",
      evidence: "触诊时软组织或较大范围更敏感",
      next: "避免反复重压；处理周围肌肉后主要复测活动和疼痛动作。",
      timing: "稍后观察",
    });
  }
  if (hasSharpMotion || answers.painQuality === "sharp") {
    items.push({
      id: "painful-movement",
      title: "存在会诱发刺痛的动作",
      evidence: "活动检查或症状询问中出现可重复的刺痛",
      next: "改变肌肉参与、支撑或动作路径，再复测同一个动作。",
      timing: "立即复测",
    });
  }
  if (
    results["heel-raise"] === "weak" ||
    results["heel-raise"] === "pain" ||
    hasFunctionLimit(answers, "push")
  ) {
    items.push({
      id: "strength",
      title: "小腿力量或蹬地能力不足",
      evidence: "提踵、蹬地或相关功能与健侧存在差距",
      next: "安排四向力量和提踵训练，不要求当场力量提高。",
      timing: "下次复查",
    });
  }
  if (
    answers.bearing === "limp" ||
    answers.bearing === "unable" ||
    results.walk === "limp" ||
    results.walk === "unable"
  ) {
    items.push({
      id: "gait",
      title: "承重或步态受到影响",
      evidence: "走路时跛行，或当前无法完成基本行走",
      next: "从可耐受承重和短距离步态练习开始，逐步恢复脚跟到脚趾推进。",
      timing: "下次复查",
    });
  }
  if (
    results["balance-check"] === "wobble" ||
    results["balance-check"] === "unable" ||
    hasFunctionLimit(answers, "balance")
  ) {
    items.push({
      id: "balance",
      title: "平衡和踝部稳定性不足",
      evidence: "单脚控制与健侧存在明显差距",
      next: "从双脚或有扶持的单脚稳定训练开始。",
      timing: "下次复查",
    });
  }

  if (items.length === 0) {
    items.push({
      id: "monitor",
      title: "目前未发现明显功能问题",
      evidence: "当前询问和检查结果基本稳定",
      next: "保持日常活动，下一次只确认原症状是否继续减轻。",
      timing: "下次复查",
    });
  }

  return items;
}

function getStartingStage(problems: ProblemItem[]): RehabStage {
  const problemIds = new Set(problems.map((item) => item.id));
  if (problemIds.has("swelling") || problemIds.has("painful-movement") || problemIds.has("medical-confirmation")) {
    return "症状控制";
  }
  if (problemIds.has("mobility") || problemIds.has("gait")) return "活动恢复";
  if (problemIds.has("strength")) return "力量恢复";
  if (problemIds.has("balance")) return "稳定控制";
  return "功能回归";
}

function getExercisePlan(stage: RehabStage, problems: ProblemItem[], answers: AnswerMap) {
  const problemIds = new Set(problems.map((item) => item.id));
  const selected: ExerciseItem[] = [];
  const add = (id: string) => {
    const item = EXERCISE_LIBRARY.find((exercise) => exercise.id === id);
    if (item && !selected.some((exercise) => exercise.id === id)) selected.push(item);
  };

  if (problemIds.has("swelling") || stage === "症状控制") add("ankle-pump");
  if (problemIds.has("gait") || stage === "症状控制") add("weight-shift");
  if (problemIds.has("mobility") || stage === "活动恢复") add("knee-wall");
  if (problemIds.has("gait") || stage === "活动恢复") add("gait-roll");
  if (problemIds.has("strength") || stage === "力量恢复") add("heel-raise");
  if (stage === "力量恢复") {
    if (answers.location === "lateral") add("band-eversion");
    if (answers.location === "medial") add("band-inversion");
    add("step-up");
  }
  if (problemIds.has("balance") || stage === "稳定控制") add("single-balance");
  if (stage === "稳定控制") add("step-control");
  if (stage === "功能回归") {
    add("hop-stick");
    add("return-task");
  }

  EXERCISE_LIBRARY.filter((exercise) => exercise.stage === stage).forEach((exercise) => add(exercise.id));
  return selected.slice(0, 4);
}

function buildFollowUpTreatments(
  problems: ProblemItem[],
  followUpResults: Record<string, TrialResult>,
  answers: AnswerMap,
  checkResults: CheckResultMap,
) {
  const limitedDirections = getLimitedDirections(checkResults);
  const limitedText = limitedDirections.length > 0 ? limitedDirections.join("、") : "上次受限方向";
  const muscleCandidates = getMuscleCandidates(answers, checkResults) || "症状周围的一组肌腹";
  const treatments: FollowUpTreatment[] = [];

  for (const problem of problems) {
    if (followUpResults[problem.id] === "better") continue;

    if (problem.id === "medical-confirmation") {
      treatments.push({
        id: "followup-review",
        problemId: problem.id,
        title: "先补齐异常检查信息",
        timing: "先补充确认",
        steps: ["保存触发异常的原测试", "补充影像或医生给出的活动限制", "按允许范围重新评估功能"],
        observe: "确认前不反复做阳性测试，也不增加手法强度",
        retest: "得到明确限制后，再重复原来的功能动作",
        nextIfSame: "继续补充结构与功能信息，不靠更强处理继续试。",
      });
    }

    if (problem.id === "swelling") {
      treatments.push({
        id: "followup-swelling",
        problemId: problem.id,
        title: "继续处理仍存在的肿胀",
        timing: "稍后观察",
        steps: ["同一角度比较肿胀轮廓", "进行舒适踝泵、抬高和适当支撑", "受过训练时再加入回流手法或物理因子"],
        observe: "支撑不过紧，肿胀边界不扩大，足部温度和感觉正常",
        retest: "2–4 小时及第二天，用同角度照片比较肿胀",
        nextIfSame: "检查当天负荷、支撑时间和是否遗漏结构或循环问题。",
      });
    }

    if (problem.id === "mobility") {
      treatments.push({
        id: "followup-mobility",
        problemId: problem.id,
        title: `重新处理${limitedText}活动受限`,
        timing: "当场复测",
        steps: [`先重复${limitedText}，记录当前范围`, `只选择一组候选肌肉轻柔处理：${muscleCandidates}`, "立即重复同一方向；无明显变化且无禁忌时，再由受训者做单方向关节松动"],
        observe: "一次只改变一个变量，不在骨点、韧带、淤血中心或锐痛点重压",
        retest: `复测${limitedText}和上次受限的功能动作`,
        nextIfSame: "停止增加肌肉处理力度，改查肿胀、关节附属活动、相邻关节或关节内因素。",
      });
    }

    if (problem.id === "painful-movement") {
      treatments.push({
        id: "followup-painful-movement",
        problemId: problem.id,
        title: "重新处理仍会疼的动作",
        timing: "当场复测",
        steps: ["用相同幅度重现原疼痛动作", `选择一组可能参与的肌肉做屏蔽或轻柔处理：${muscleCandidates}`, "立即重复原动作；无变化时再单独尝试支撑、动作路径或关节位置调整"],
        observe: "刺痛是否更晚出现、范围缩小或动作更顺，不直接重压疼痛中心",
        retest: "用相同幅度、速度和负荷重复原疼痛动作",
        nextIfSame: "换一个候选来源，不重复加力；再查活动方向、肿胀和触诊位置。",
      });
    }

    if (problem.id === "tissue-sensitivity") {
      treatments.push({
        id: "followup-tissue",
        problemId: problem.id,
        title: "处理压痛点周围的软组织",
        timing: "稍后观察",
        steps: ["标记压痛范围，不反复重压中心", `选择周围一组肌腹轻柔处理：${muscleCandidates}`, "用活动或功能动作判断是否有变化"],
        observe: "处理后不出现压痛范围扩大、淤青增加或静息痛上升",
        retest: "当场主要复测活动和疼痛动作；压痛范围在次日比较",
        nextIfSame: "不要继续追压痛点，转查关节活动、负荷和组织恢复时间。",
      });
    }

    if (problem.id === "gait") {
      treatments.push({
        id: "followup-gait",
        problemId: problem.id,
        title: "先调整承重和步态，再增加距离",
        timing: "当场复测",
        steps: ["用相同速度走 10 步记录跛行", "调整扶持、步幅、重心和脚跟到脚趾推进", "重复 10 步，确认哪一个提示有效"],
        observe: "患侧停留时间、步幅和推蹬是否接近健侧",
        retest: "相同速度走 10 步，比较跛行和疼痛动作",
        nextIfSame: "回查踝活动度、小腿力量、疼痛保护和髋部推进能力。",
      });
    }

    if (["strength", "balance"].includes(problem.id)) {
      treatments.push({
        id: `followup-${problem.id}`,
        problemId: problem.id,
        title: problem.id === "strength" ? "继续分级力量训练" : "继续稳定与平衡训练",
        timing: "训练解决",
        steps: ["选择当前能稳定完成的难度", "按计划完成训练，不要求当场提高", "记录当晚和第二天反应"],
        observe: problem.id === "strength" ? "动作质量、患侧参与和次日反应" : "扶持程度、站立时间和身体摆动",
        retest: "下一次康复与健侧比较",
        nextIfSame: "降低难度或增加支撑，确认动作是否真正由目标肌群完成。",
      });
    }
  }

  return treatments;
}

function getFollowUpDecision(results: Record<string, TrialResult>, problemCount: number) {
  const values = Object.values(results);
  if (values.some((value) => value === "worse")) return "返回相关评估" as const;
  if (values.length === problemCount && values.every((value) => value === "better")) return "进入下一阶段" as const;
  return "继续当前阶段" as const;
}

function ExerciseMotion({ type, paused }: { type: MotionType; paused: boolean }) {
  return (
    <div className={`exercise-motion motion-${type} ${paused ? "paused" : ""}`} aria-hidden="true">
      <div className="motion-floor" />
      <div className="motion-wall" />
      <div className="motion-person">
        <i className="motion-head" />
        <i className="motion-body" />
        <i className="motion-thigh" />
        <i className="motion-shin" />
        <i className="motion-foot" />
      </div>
      <span>动作轨迹</span>
    </div>
  );
}

function ExerciseCards({ exercises }: { exercises: ExerciseItem[] }) {
  const [pausedMotions, setPausedMotions] = useState<Record<string, boolean>>({});
  const [adjustments, setAdjustments] = useState<Record<string, "easier" | "harder">>({});
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const activeVideo = exercises.find((exercise) => exercise.id === activeVideoId);

  return (
    <>
      <section className="exercise-plan">
        <header>
          <span>本阶段训练</span>
          <strong>今天只做这 {exercises.length} 个动作</strong>
        </header>
        <div className="exercise-card-grid">
          {exercises.map((exercise) => {
            const adjustment = adjustments[exercise.id];
            return (
              <article className="exercise-card" key={exercise.id}>
                <div className={`exercise-demo ${exercise.video ? "has-video" : ""}`}>
                  <ExerciseMotion type={exercise.motion} paused={Boolean(pausedMotions[exercise.id])} />
                  {exercise.video ? (
                    <button
                      className="video-launch"
                      type="button"
                      aria-label={`查看${exercise.title}视频演示`}
                      onClick={() => setActiveVideoId(exercise.id)}
                    >
                      <i aria-hidden="true">▶</i>
                      看视频
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label={`${pausedMotions[exercise.id] ? "播放" : "暂停"}${exercise.title}动画演示`}
                      onClick={() => setPausedMotions((current) => ({ ...current, [exercise.id]: !current[exercise.id] }))}
                    >
                      {pausedMotions[exercise.id] ? "播放" : "暂停"}
                    </button>
                  )}
                </div>
                <div className="exercise-copy">
                  <small>{exercise.video ? "专业视频演示" : exercise.stage}</small>
                  <h3>{exercise.title}</h3>
                  <b>{exercise.dose}</b>
                  <p><span>观察</span>{exercise.observe}</p>
                </div>
                <div className="exercise-adjust">
                  <button
                    type="button"
                    className={adjustment === "easier" ? "selected" : ""}
                    onClick={() => setAdjustments((current) => ({ ...current, [exercise.id]: "easier" }))}
                  >做不了</button>
                  <button
                    type="button"
                    className={adjustment === "harder" ? "selected" : ""}
                    onClick={() => setAdjustments((current) => ({ ...current, [exercise.id]: "harder" }))}
                  >太轻松</button>
                </div>
                {adjustment && (
                  <div className="exercise-adjustment-result">
                    {adjustment === "easier" ? exercise.easier : exercise.harder}
                  </div>
                )}
              </article>
            );
          })}
        </div>
        <small className="exercise-source-note">视频来自公开的医疗机构动作库；系统只负责匹配，正式使用前仍需完成内容授权与专业复核。</small>
      </section>

      {activeVideo?.video && (
        <div className="exercise-video-backdrop" role="presentation" onClick={() => setActiveVideoId(null)}>
          <section
            className="exercise-video-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`${activeVideo.title}动作视频`}
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span>动作演示</span>
                <strong>{activeVideo.title}</strong>
              </div>
              <button type="button" aria-label="关闭动作视频" onClick={() => setActiveVideoId(null)}>×</button>
            </header>
            <div className="exercise-video-frame">
              <iframe
                src={activeVideo.video.embedUrl}
                title={`${activeVideo.title}演示视频`}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
            <footer>
              <span>来源：{activeVideo.video.provider}</span>
              <a href={activeVideo.video.sourceUrl} target="_blank" rel="noreferrer">打开原视频</a>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

function responseMode(intervention: Intervention) {
  if (["mobility", "joint-mobilization", "sharp-pain", "movement", "acute-bearing", "squat"].includes(intervention.id)) {
    return "immediate" as const;
  }
  if (["strength", "hip-leg-strength", "balance", "stairs", "return-to-sport"].includes(intervention.id)) {
    return "training" as const;
  }
  return "delayed" as const;
}

function resultCopy(result: TrialResult, intervention: Intervention) {
  if (result === "better") return intervention.betterNext;
  if (result === "same") return intervention.sameNext;
  return intervention.worseNext;
}

function splitSteps(text: string) {
  return text
    .split(/[；。]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AnkleGuidedWorkflow({
  phase,
  onNavigate,
  imagingLabel,
  guidanceLabel,
  clinicianNote,
  onSaveForImaging,
  onSummaryChange,
}: {
  phase: number;
  onNavigate: (step: number) => void;
  imagingLabel: string;
  guidanceLabel: string;
  clinicianNote: string;
  onSaveForImaging: (summary: string) => void;
  onSummaryChange: (summary: string[]) => void;
}) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [multiSelections, setMultiSelections] = useState<Record<string, string[]>>({});
  const [checkResults, setCheckResults] = useState<CheckResultMap>({});
  const [activeCheckIndex, setActiveCheckIndex] = useState(0);
  const [activeInterventionIndex, setActiveInterventionIndex] = useState(0);
  const [trialResults, setTrialResults] = useState<Record<string, TrialResult>>({});
  const [delayedResults, setDelayedResults] = useState<Record<string, TrialResult>>({});
  const [medicineChoice, setMedicineChoice] = useState<"none" | "self-confirmed">("none");
  const [assessmentStage, setAssessmentStage] = useState<"interview" | "checks">("interview");
  const [sessionSaved, setSessionSaved] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [hasNewSymptom, setHasNewSymptom] = useState<"unknown" | "no" | "yes">("unknown");
  const [followUpResults, setFollowUpResults] = useState<Record<string, TrialResult>>({});
  const [followUpTreatmentResults, setFollowUpTreatmentResults] = useState<Record<string, TrialResult>>({});
  const [sessionHistory, setSessionHistory] = useState<RehabSession[]>([]);
  const [stageIndex, setStageIndex] = useState(0);
  const [currentVisit, setCurrentVisit] = useState(2);
  const [followUpSaved, setFollowUpSaved] = useState(false);
  const [toast, setToast] = useState("");

  const questions = useMemo(() => getQuestions(answers), [answers]);
  const currentQuestion = questions.find((question) => !answers[question.id]);
  const answeredQuestions = questions.filter((question) => answers[question.id]);
  const directions = useMemo(() => buildDirections(answers), [answers]);
  const checks = useMemo(() => buildChecks(answers), [answers]);
  const activeCheck = checks[Math.min(activeCheckIndex, checks.length - 1)];
  const checksComplete = checks.every((check) => checkResults[check.id]);

  const checkReviewSignals = checks.flatMap((check) => {
    const selected = check.options.find(
      (option) => option.value === checkResults[check.id],
    );
    return selected?.needsReview ? [`${check.title}：${selected.label}`] : [];
  });
  const interviewFocalBoneNeedsPriority =
    answers.tenderness === "boneFocal" &&
    (isHighEnergy(answers) ||
      answers.bearing === "unable" ||
      answers.location === "midfoot" ||
      answers.trend === "worse" ||
      answers.timing === "longer");
  const interviewReviewSignals = [
    ...(interviewFocalBoneNeedsPriority
      ? ["骨点集中压痛同时伴有高风险机制、承重下降、足中部位置或趋势变差"]
      : []),
    ...(answers.bearing === "unable" &&
    (isHighEnergy(answers) ||
      answers.timing === "longer" ||
      answers.trend === "worse" ||
      (answers.timing === "day14" && answers.trend !== "better"))
      ? ["无法连续走四步，且机制、时间或趋势需要优先确认"]
      : []),
    ...(answers.sensation === "persistent"
      ? ["除局部淤青外，脚趾或全足仍有发凉、麻木或异常变色"]
      : []),
  ];
  const reviewSignals = Array.from(
    new Set([...interviewReviewSignals, ...checkReviewSignals]),
  );
  const interventions = useMemo(
    () => buildInterventions(answers, checkResults, trialResults),
    [answers, checkResults, trialResults],
  );
  const problemItems = useMemo(
    () => buildProblemItems(answers, checkResults, reviewSignals),
    [answers, checkResults, reviewSignals],
  );
  const startingStage = useMemo(() => getStartingStage(problemItems), [problemItems]);
  const currentStage = sessionHistory.length > 0 ? REHAB_STAGES[stageIndex] : startingStage;
  const displayStageIndex = sessionHistory.length > 0 ? stageIndex : REHAB_STAGES.indexOf(startingStage);
  const currentExercises = useMemo(
    () => getExercisePlan(currentStage, problemItems, answers),
    [currentStage, problemItems, answers],
  );
  const followUpDecision = getFollowUpDecision(followUpResults, problemItems.length);
  const followUpComplete =
    hasNewSymptom === "no" && Object.keys(followUpResults).length === problemItems.length;
  const followUpTreatments = useMemo(
    () => buildFollowUpTreatments(problemItems, followUpResults, answers, checkResults),
    [problemItems, followUpResults, answers, checkResults],
  );
  const immediateFollowUpTreatments = followUpTreatments.filter((item) => item.timing === "当场复测");
  const followUpTreatmentsComplete = immediateFollowUpTreatments.every(
    (item) => Boolean(followUpTreatmentResults[item.id]),
  );
  const treatmentHasWorse = Object.values(followUpTreatmentResults).some((value) => value === "worse");
  const hasFollowUpReview = followUpTreatments.some((item) => item.timing === "先补充确认");
  const effectiveFollowUpDecision =
    treatmentHasWorse || hasFollowUpReview ? "返回相关评估" : followUpDecision;
  const previousProblemStates = sessionHistory[sessionHistory.length - 1]?.problemStates ?? {};
  const repeatedSameProblems = problemItems.filter(
    (item) => followUpResults[item.id] === "same" && previousProblemStates[item.id] === "same",
  );
  const plannedStageIndex =
    followUpComplete && effectiveFollowUpDecision === "进入下一阶段"
      ? Math.min(stageIndex + 1, REHAB_STAGES.length - 1)
      : stageIndex;
  const plannedFollowUpStage = REHAB_STAGES[plannedStageIndex];
  const plannedFollowUpExercises = useMemo(
    () => getExercisePlan(plannedFollowUpStage, problemItems, answers),
    [plannedFollowUpStage, problemItems, answers],
  );
  const selectedCheckOption = activeCheck.options.find(
    (option) => option.value === checkResults[activeCheck.id],
  );
  const activeIntervention =
    interventions[Math.min(activeInterventionIndex, interventions.length - 1)];
  const activeResponseMode = responseMode(activeIntervention);

  const specialCheck = checks.find((check) =>
    ["thompson", "squeeze", "drawer"].includes(check.id),
  );
  const specialResult = specialCheck ? checkResults[specialCheck.id] : undefined;
  const primaryPattern =
    specialCheck?.id === "thompson" && specialResult === "abnormal"
      ? "跟腱功能需要优先确认"
      : specialCheck?.id === "squeeze" && specialResult === "positive"
        ? "高位踝扭伤方向更受支持"
        : answers.location === "lateral" || answers.mechanism === "inversion"
          ? "更符合外侧踝扭伤恢复路径"
          : "先按踝部急性损伤做功能分级";

  useEffect(() => {
    const summary = questions
      .filter((question) => answers[question.id])
      .map((question) => `${question.title.replace("？", "")}：${labelFor(question, answers[question.id])}`);
    onSummaryChange(summary);
  }, [answers, questions, onSummaryChange]);

  useEffect(() => {
    const stored = window.localStorage.getItem("rehabmind-ankle-history");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as RehabSession[];
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      const lastSession = parsed[parsed.length - 1];
      const savedStageIndex = Math.max(0, REHAB_STAGES.indexOf(lastSession.stage));
      setSessionHistory(parsed);
      setStageIndex(savedStageIndex);
      setCurrentVisit(lastSession.visit + 1);
      setSessionSaved(true);
    } catch {
      window.localStorage.removeItem("rehabmind-ankle-history");
    }
  }, []);

  function editAnswer(questionId: string) {
    const questionIndex = questions.findIndex((question) => question.id === questionId);
    const affectedIds = questions.slice(questionIndex).map((question) => question.id);
    setAnswers((current) => Object.fromEntries(
      Object.entries(current).filter(([key]) => !affectedIds.includes(key)),
    ));
    setMultiSelections((current) => Object.fromEntries(
      Object.entries(current).filter(([key]) => !affectedIds.includes(key)),
    ));
    setCheckResults({});
    setTrialResults({});
    setDelayedResults({});
    setAssessmentStage("interview");
  }

  function recordCheck(check: AnkleCheck, value: string) {
    const nextResults = { ...checkResults, [check.id]: value };
    setCheckResults(nextResults);
    const nextMissing = checks.findIndex(
      (item, index) => index > activeCheckIndex && !nextResults[item.id],
    );
    if (nextMissing >= 0) setActiveCheckIndex(nextMissing);
  }

  async function copySummary() {
    const lines = [
      "【急性踝损伤｜检查与处理草案】",
      `影像资料：${imagingLabel}`,
      `医生限制：${guidanceLabel}`,
      ...(clinicianNote.trim() ? [`医生说明：${clinicianNote.trim()}`] : []),
      `当前方向：${primaryPattern}`,
      ...questions.map(
        (question) =>
          `${question.title}：${labelFor(question, answers[question.id])}`,
      ),
      ...checks.map((check) => {
        const result = check.options.find(
          (option) => option.value === checkResults[check.id],
        );
        return `${check.kind}｜${check.title}：${result?.label ?? "未记录"}`;
      }),
      ...(reviewSignals.length
        ? [`优先补充确认：${reviewSignals.join("；")}`]
        : []),
      ...interventions.map(
        (item) =>
          `${item.category}｜${item.title}：${item.action}（基线：${item.metric}；即时复测：${item.retest}；延迟复测：${item.delayRetest}；即时结果：${trialResults[item.id] ?? "未记录"}；次日结果：${delayedResults[item.id] ?? "未记录"}）`,
      ),
      ...(interventions.some((item) => item.medicineOption)
        ? [`外用药记录：${medicineChoice === "self-confirmed" ? "使用者已自行阅读说明书或咨询药师后决定使用" : "本轮未使用外用药"}`]
        : []),
      "执行规则：一次只改变一个变量；即时变化不是诊断；还要确认当天及次日反应。",
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setToast("检查与处理草案已复制");
    window.setTimeout(() => setToast(""), 1800);
  }

  function saveSession() {
    const initialStageIndex = REHAB_STAGES.indexOf(startingStage);
    const record = {
      savedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      problems: problemItems,
      interventions: interventions.map((item) => ({
        id: item.id,
        title: item.title,
        mode: responseMode(item),
        result: trialResults[item.id] ?? "未记录",
      })),
    };
    window.localStorage.setItem("rehabmind-last-ankle-session", JSON.stringify(record));
    const firstSession: RehabSession = {
      visit: 1,
      savedAt: record.savedAt,
      stage: startingStage,
      outcome: "建立基线",
      focus: problemItems.slice(0, 4).map((item) => item.title),
    };
    const nextHistory = sessionHistory.some((item) => item.visit === 1)
      ? sessionHistory
      : [firstSession];
    window.localStorage.setItem("rehabmind-ankle-history", JSON.stringify(nextHistory));
    setSessionHistory(nextHistory);
    setStageIndex(Math.max(0, initialStageIndex));
    setCurrentVisit(Math.max(2, nextHistory[nextHistory.length - 1].visit + 1));
    setSessionSaved(true);
    setToast("本次康复记录已保存");
    window.setTimeout(() => setToast(""), 1800);
  }

  function saveFollowUp() {
    if (!followUpComplete || (effectiveFollowUpDecision !== "返回相关评估" && !followUpTreatmentsComplete)) return;
    const nextStageIndex =
      effectiveFollowUpDecision === "进入下一阶段"
        ? Math.min(stageIndex + 1, REHAB_STAGES.length - 1)
        : stageIndex;
    const nextSession: RehabSession = {
      visit: currentVisit,
      savedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      stage: REHAB_STAGES[nextStageIndex],
      outcome: effectiveFollowUpDecision,
      focus: problemItems
        .filter((item) => followUpResults[item.id] !== "better")
        .slice(0, 4)
        .map((item) => item.title),
      problemStates: followUpResults,
      treatmentResults: followUpTreatmentResults,
    };
    const nextHistory = [...sessionHistory.filter((item) => item.visit !== currentVisit), nextSession]
      .sort((a, b) => a.visit - b.visit);
    window.localStorage.setItem("rehabmind-ankle-history", JSON.stringify(nextHistory));
    setSessionHistory(nextHistory);
    setStageIndex(nextStageIndex);
    setFollowUpSaved(true);
    setToast(`第 ${currentVisit} 次康复已保存`);
    window.setTimeout(() => setToast(""), 1800);
  }

  function startNextVisit() {
    setCurrentVisit((visit) => visit + 1);
    setHasNewSymptom("unknown");
    setFollowUpResults({});
    setFollowUpTreatmentResults({});
    setFollowUpSaved(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <section className="stage-content ankle-workflow">
      <header className="ankle-workflow-head">
        <div>
          <span>本次康复</span>
          <h1>
            {phase === 2 && (assessmentStage === "interview" ? "先问清楚，再做检查" : "按症状完成必要检查")}
            {phase === 3 && "把本次发现的问题列清楚"}
            {phase === 4 && "针对发现的问题处理和训练"}
            {phase === 5 && "保存本次结果和下次复查项"}
          </h1>
        </div>
        <div className="ankle-case-chip">
          <small>已知信息</small>
          <strong>{imagingLabel}</strong>
          <span>{guidanceLabel}</span>
        </div>
      </header>

      {phase === 2 && assessmentStage === "interview" && (
        <div className="ankle-interview-layout compact">
          <section className="question-deck">
            {answeredQuestions.length > 0 && (
              <div className="answered-question-strip">
                <span>已收集</span>
                <div>
                  {answeredQuestions.map((question) => (
                    <button type="button" key={question.id} onClick={() => editAnswer(question.id)}>
                      <b>{question.title.replace("？", "")}</b>
                      <small>{labelFor(question, answers[question.id])}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {currentQuestion ? (
              <>
                <div className="question-counter">
                  <span>问题</span>
                  <strong>{answeredQuestions.length + 1} / {questions.length}</strong>
                </div>
                <div className="question-copy">
                  <h2>{currentQuestion.title}</h2>
                  {currentQuestion.id === "sensation" && (
                    <p className="safety-question-note">
                      局部紫红、青黄淤青不算这一项；这里只看脚趾或整个足部是否发凉、麻木、苍白或青紫。
                    </p>
                  )}
                </div>
                <div className="question-options">
                  {currentQuestion.options.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      className={
                        currentQuestion.multiple &&
                        (multiSelections[currentQuestion.id] ?? []).includes(option.value)
                          ? "selected"
                          : ""
                      }
                      onClick={() => {
                        if (!currentQuestion.multiple) {
                          setAnswers((current) => ({
                            ...current,
                            [currentQuestion.id]: option.value,
                          }));
                          return;
                        }
                        setMultiSelections((current) => {
                          const selected = current[currentQuestion.id] ?? [];
                          if (option.value === "none") {
                            return {
                              ...current,
                              [currentQuestion.id]: selected.includes("none") ? [] : ["none"],
                            };
                          }
                          const withoutNone = selected.filter((item) => item !== "none");
                          return {
                            ...current,
                            [currentQuestion.id]: withoutNone.includes(option.value)
                              ? withoutNone.filter((item) => item !== option.value)
                              : [...withoutNone, option.value],
                          };
                        });
                      }}
                    >
                      <span>{option.label}</span>
                      <i>
                        {currentQuestion.multiple
                          ? (multiSelections[currentQuestion.id] ?? []).includes(option.value)
                            ? "✓"
                            : "+"
                          : "→"}
                      </i>
                    </button>
                  ))}
                </div>
                {currentQuestion.multiple && (
                  <button
                    className="solid-button dark multi-question-confirm"
                    type="button"
                    disabled={(multiSelections[currentQuestion.id] ?? []).length === 0}
                    onClick={() =>
                      setAnswers((current) => ({
                        ...current,
                        [currentQuestion.id]: (
                          multiSelections[currentQuestion.id] ?? []
                        ).join(","),
                      }))
                    }
                  >
                    确认这些情况 <span>→</span>
                  </button>
                )}
                {answeredQuestions.length > 0 && (
                  <button
                    className="previous-question-button"
                    type="button"
                    onClick={() => editAnswer(answeredQuestions[answeredQuestions.length - 1].id)}
                  >
                    ← 返回上一个问题
                  </button>
                )}
              </>
            ) : (
              <div className="interview-complete">
                <span>症状信息已确认</span>
                <h2>根据这些信息生成 {checks.length} 项检查</h2>
                <button className="solid-button dark" type="button" onClick={() => setAssessmentStage("checks")}>
                  开始评估检查 <span>→</span>
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {phase === 3 && (
        <>
          <section className="problem-ledger">
            <header>
              <div>
                <span>本次检查结果</span>
                <h2>发现 {problemItems.length} 个问题</h2>
              </div>
            </header>
            <div className="problem-ledger-list">
              {problemItems.map((item, index) => (
                <article
                  key={item.id}
                  className={`${item.timing === "先补充确认" ? "review" : ""} timing-${item.timing === "立即复测" ? "now" : item.timing === "稍后观察" ? "later" : item.timing === "下次复查" ? "next" : "review"}`}
                >
                  <i>{String(index + 1).padStart(2, "0")}</i>
                  <div>
                    <span>{item.timing}</span>
                    <h3>{item.title}</h3>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="stage-actions end">
            <button className="outline-button" type="button" onClick={() => onNavigate(2)}>
              返回修改检查
            </button>
            <button className="solid-button dark" type="button" onClick={() => onNavigate(4)}>
              开始针对性处理 <span>→</span>
            </button>
          </div>
        </>
      )}

      {phase === 2 && assessmentStage === "checks" && (
        <>
          <div className="assessment-focus-line">
            <span>根据症状优先检查</span>
            <strong>{directions.find((item) => item.tone === "primary")?.title}</strong>
          </div>
          <div className="ankle-test-layout compact">
            <nav className="compact-check-tabs" aria-label="检查项目">
              {checks.map((check, index) => (
                <button
                  type="button"
                  key={check.id}
                  className={activeCheckIndex === index ? "active" : checkResults[check.id] ? "complete" : ""}
                  onClick={() => setActiveCheckIndex(index)}
                >
                  <i>{checkResults[check.id] ? "✓" : index + 1}</i>
                  <span>{check.shortLabel ?? check.kind}</span>
                </button>
              ))}
            </nav>

            <article className="active-test-card">
              <header>
                <div>
                  <span>{activeCheck.kind}</span>
                  <b>{activeCheck.mode}</b>
                </div>
                <strong>{activeCheckIndex + 1} / {checks.length}</strong>
              </header>
              <div className="test-task-title">
                <h2>{activeCheck.title}</h2>
              </div>
              <section className="test-focus-block">
                <span>怎么做</span>
                <ol>
                  {splitSteps(activeCheck.instruction).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </section>
              <section className="test-focus-block observe">
                <span>看什么</span>
                <strong>{activeCheck.positive}</strong>
              </section>
              <div className="active-test-options">
                <span>记录结果</span>
                <div>
                {activeCheck.options.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={checkResults[activeCheck.id] === option.value ? "selected" : ""}
                    onClick={() => recordCheck(activeCheck, option.value)}
                  >
                    {option.label}
                  </button>
                ))}
                </div>
              </div>
              {selectedCheckOption && (
                <div className="check-adjustment">
                  <span>下一步</span>
                  <strong>{selectedCheckOption.meaning}</strong>
                </div>
              )}
            </article>
          </div>

          {checksComplete && (
            <section className="check-synthesis compact">
              <strong>
                {reviewSignals.length > 0
                  ? `先确认：${reviewSignals[0]}`
                  : "检查完成"}
              </strong>
            </section>
          )}

          <div className="stage-actions end">
            <button className="outline-button" type="button" onClick={() => setAssessmentStage("interview")}>
              返回修改症状
            </button>
            <button className="solid-button dark" type="button" disabled={!checksComplete} onClick={() => onNavigate(3)}>
              查看本次问题清单 <span>→</span>
            </button>
          </div>
        </>
      )}

      {phase === 4 && (
        <>
          {reviewSignals.length > 0 && (
            <section className="specific-review compact">
              <span>先确认</span>
              <strong>{reviewSignals[0]}</strong>
            </section>
          )}

          <div className="intervention-focus-layout compact">
            <nav className="focus-strip" aria-label="选择要处理的表现">
              {interventions.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  className={activeInterventionIndex === index ? "active" : trialResults[item.id] ? "complete" : ""}
                  onClick={() => setActiveInterventionIndex(index)}
                >
                  <i>{trialResults[item.id] ? "✓" : index + 1}</i>
                  <span>{item.category}</span>
                  <em>{responseMode(item) === "immediate" ? "当场复测" : responseMode(item) === "training" ? "安排训练" : "稍后观察"}</em>
                </button>
              ))}
            </nav>

            <article className="active-intervention compact">
              <div className="intervention-task-title">
                <h2>{activeIntervention.title}</h2>
              </div>

              {activeIntervention.entry && (
                <div className="intervention-entry">
                  <span>达到后开始</span>
                  <strong>{activeIntervention.entry}</strong>
                </div>
              )}

              <div className="trial-runway">
                <section className="intervention-focus-block">
                  <span>怎么做</span>
                  <ol>
                    {splitSteps(activeIntervention.action).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                  <b>{activeIntervention.dose}</b>
                </section>
                <section className="intervention-focus-block observe">
                  <span>做的时候观察什么</span>
                  <strong>{activeIntervention.observe}</strong>
                </section>
              </div>

              {activeResponseMode === "immediate" ? (
                <section className="retest-station">
                  <div className="retest-station-copy">
                    <span>当场只复测这一项</span>
                    <strong>{activeIntervention.retest}</strong>
                  </div>
                  <div className="trial-result">
                    <div>
                      {([
                        ["better", activeIntervention.resultLabels?.better ?? "改善"],
                        ["same", activeIntervention.resultLabels?.same ?? "没有变化"],
                        ["worse", activeIntervention.resultLabels?.worse ?? "加重"],
                      ] as Array<[TrialResult, string]>).map(([value, label]) => (
                        <button
                          type="button"
                          key={value}
                          className={trialResults[activeIntervention.id] === value ? `selected ${value}` : ""}
                          onClick={() => {
                            setTrialResults((current) => ({ ...current, [activeIntervention.id]: value }));
                            if (activeIntervention.id === "mobility" && value === "same") {
                              setActiveInterventionIndex(activeInterventionIndex + 1);
                            }
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              ) : activeResponseMode === "training" ? (
                <section className="scheduled-response training">
                  <span>这是训练安排，不要求当场变强</span>
                  <strong>下次康复再比较：{activeIntervention.retest}</strong>
                </section>
              ) : (
                <section className="scheduled-response delayed">
                  <span>这个问题需要时间恢复</span>
                  <strong>{activeIntervention.delayRetest}</strong>
                </section>
              )}

              {activeIntervention.medicineOption && (
                <details className="medicine-choice compact">
                  <summary>记录外用药（可选）</summary>
                  <div>
                    <button
                      type="button"
                      className={medicineChoice === "none" ? "selected" : ""}
                      onClick={() => setMedicineChoice("none")}
                    >
                      本轮不用
                    </button>
                    <button
                      type="button"
                      className={medicineChoice === "self-confirmed" ? "selected" : ""}
                      onClick={() => setMedicineChoice("self-confirmed")}
                    >
                      使用者已确认
                    </button>
                  </div>
                </details>
              )}

              {trialResults[activeIntervention.id] && (
                <>
                  <div className={`treatment-adjustment ${trialResults[activeIntervention.id]}`}>
                    <span>下一步</span>
                    <strong>{resultCopy(trialResults[activeIntervention.id], activeIntervention)}</strong>
                  </div>
                  <details className="delayed-retest">
                    <summary>稍后或第二天再看一次</summary>
                    <strong>{activeIntervention.delayRetest}</strong>
                    <div>
                      {([
                        ["better", "改善保持"],
                        ["same", "回到原样"],
                        ["worse", "出现反弹"],
                      ] as Array<[TrialResult, string]>).map(([value, label]) => (
                        <button
                          type="button"
                          key={value}
                          className={delayedResults[activeIntervention.id] === value ? `selected ${value}` : ""}
                          onClick={() =>
                            setDelayedResults((current) => ({
                              ...current,
                              [activeIntervention.id]: value,
                            }))
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </details>
                </>
              )}
            </article>
          </div>

          <div className="final-bar">
            {reviewSignals.length > 0 && (
              <button
                className="outline-button imaging-save-button"
                type="button"
                onClick={() => onSaveForImaging(`${reviewSignals.join("；")}｜当前方向：${primaryPattern}`)}
              >
                保存并等待影像
              </button>
            )}
            <button className="solid-button coral" type="button" onClick={() => onNavigate(5)}>
              整理本次记录 <span>→</span>
            </button>
          </div>
        </>
      )}

      {phase === 5 && (
        <section className="rehab-continuity">
          <div className="rehab-stage-board">
            <div className="rehab-stage-title">
              <span>康复档案</span>
              <strong>{currentStage}</strong>
            </div>
            <div className="rehab-stage-rail" aria-label="康复阶段">
              {REHAB_STAGES.map((stage, index) => (
                <div
                  className={index < displayStageIndex ? "done" : index === displayStageIndex ? "active" : ""}
                  key={stage}
                >
                  <i>{index + 1}</i>
                  <span>{stage}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="session-timeline">
            {(sessionHistory.length > 0 ? sessionHistory.slice(-3) : [{
              visit: 1,
              savedAt: "本次尚未保存",
              stage: startingStage,
              outcome: "建立基线" as const,
              focus: problemItems.slice(0, 3).map((item) => item.title),
            }]).map((session) => (
              <article key={session.visit}>
                <i>{session.visit}</i>
                <div>
                  <small>第 {session.visit} 次康复 · {session.stage}</small>
                  <strong>{session.outcome}</strong>
                  <span>{session.focus.length > 0 ? session.focus.join(" · ") : "当前问题均有改善"}</span>
                </div>
              </article>
            ))}
            {sessionHistory.length > 0 && (
              <article className="upcoming">
                <i>{followUpOpen ? currentVisit : sessionHistory[sessionHistory.length - 1].visit + 1}</i>
                <div>
                  <small>下一次康复</small>
                  <strong>复查变化后再调整</strong>
                  <span>只看上次留下的问题和新症状</span>
                </div>
              </article>
            )}
          </div>
        </section>
      )}

      {phase === 5 && !followUpOpen && (
        <>
          <section className="session-record session-record-compact">
            <div className="session-record-column">
              <span>本次发现</span>
              <div>
                {problemItems.map((item) => (
                  <article key={item.id}>
                    <strong>{item.title}</strong>
                    <small>{item.timing}</small>
                  </article>
                ))}
              </div>
            </div>
            <div className="session-record-column next-visit">
              <span>下次复查</span>
              <div>
                {problemItems.map((item) => (
                  <article key={item.id}>
                    <strong>{item.title}</strong>
                    <small>{item.timing === "立即复测" ? "确认改善是否保持" : item.timing}</small>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <ExerciseCards exercises={currentExercises} />

          <div className="final-bar session-record-actions">
            <button className="outline-button" type="button" onClick={copySummary}>复制本次记录</button>
            <button className="solid-button dark" type="button" onClick={saveSession} disabled={sessionSaved}> 
              {sessionSaved ? "本次已保存" : "保存本次康复"}
            </button>
            {sessionSaved && (
              <button className="solid-button coral" type="button" onClick={() => setFollowUpOpen(true)}>
                开始第 {currentVisit} 次康复 <span>→</span>
              </button>
            )}
          </div>
        </>
      )}

      {phase === 5 && followUpOpen && (
        <section className="return-visit return-visit-continuous">
          <header>
            <span>第 {currentVisit} 次康复</span>
            <h2>先确认变化，再处理和训练</h2>
          </header>
          <div className="return-signal-choice">
            <button type="button" className={hasNewSymptom === "no" ? "selected" : ""} onClick={() => setHasNewSymptom("no")}>没有新症状</button>
            <button type="button" className={hasNewSymptom === "yes" ? "selected danger" : ""} onClick={() => setHasNewSymptom("yes")}>出现新症状</button>
          </div>

          {hasNewSymptom === "yes" && (
            <div className="return-reroute">
              <strong>重新做相关评估</strong>
              <p>记录新症状的位置、性质、出现时间和诱发动作。</p>
              <button className="solid-button dark" type="button" onClick={() => onNavigate(1)}>重新开始症状询问</button>
            </div>
          )}

          {hasNewSymptom === "no" && (
            <>
              <div className="targeted-recheck">
                <div className="targeted-recheck-head">
                  <span>复查上次留下的 {problemItems.length} 项</span>
                  <strong>{Object.keys(followUpResults).length}/{problemItems.length}</strong>
                </div>
                {problemItems.map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.timing === "立即复测" ? "复查疼痛动作或活动范围" : "与上次记录比较"}</small>
                    </div>
                    <div>
                      {(["better", "same", "worse"] as TrialResult[]).map((value) => (
                        <button
                          type="button"
                          key={value}
                          className={followUpResults[item.id] === value ? `selected ${value}` : ""}
                          onClick={() => {
                            setFollowUpResults((current) => ({ ...current, [item.id]: value }));
                            setFollowUpTreatmentResults({});
                            setFollowUpSaved(false);
                          }}
                        >
                          {value === "better" ? "改善" : value === "same" ? "不变" : "变差"}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>

              {followUpComplete && (
                <div className={`return-decision decision-${effectiveFollowUpDecision === "返回相关评估" ? "review" : effectiveFollowUpDecision === "进入下一阶段" ? "progress" : "hold"}`}>
                  <span>复查结果</span>
                  <strong>{effectiveFollowUpDecision}</strong>
                  <small>
                    {effectiveFollowUpDecision === "返回相关评估"
                      ? treatmentHasWorse
                        ? "本次处理后反应加重，回到对应检查，不直接提高训练量。"
                        : "只重新检查需要确认或变差的项目，不直接提高训练量。"
                      : effectiveFollowUpDecision === "进入下一阶段"
                        ? `训练从“${currentStage}”进入“${plannedFollowUpStage}”。`
                        : "未改善的问题先继续处理，再进入本次训练。"}
                  </small>
                </div>
              )}

              {followUpComplete && repeatedSameProblems.length > 0 && (
                <div className="repeat-no-change-alert">
                  <span>连续两次没有变化</span>
                  <strong>{repeatedSameProblems.map((item) => item.title).join("、")}</strong>
                  <small>本次不要照搬上次方法，换一个候选来源后再复测。</small>
                </div>
              )}

              {followUpComplete && followUpDecision !== "返回相关评估" && followUpTreatments.some((item) => item.timing !== "训练解决") && (
                <section className="followup-treatment-plan">
                  <header>
                    <span>本次先处理</span>
                    <strong>仍存在的问题继续处理</strong>
                  </header>
                  <div>
                    {followUpTreatments.filter((item) => item.timing !== "训练解决").map((treatment, index) => (
                      <article key={treatment.id}>
                        <div className="followup-treatment-title">
                          <i>{index + 1}</i>
                          <div>
                            <small>{treatment.timing}</small>
                            <h3>{treatment.title}</h3>
                          </div>
                        </div>
                        <ol>
                          {treatment.steps.map((step) => <li key={step}>{step}</li>)}
                        </ol>
                        <div className="followup-treatment-check">
                          <p><span>观察</span>{treatment.observe}</p>
                          <p><span>复测</span>{treatment.retest}</p>
                        </div>
                        {treatment.timing === "当场复测" ? (
                          <div className="followup-treatment-result">
                            {(["better", "same", "worse"] as TrialResult[]).map((value) => (
                              <button
                                type="button"
                                key={value}
                                className={followUpTreatmentResults[treatment.id] === value ? `selected ${value}` : ""}
                                onClick={() => {
                                  setFollowUpTreatmentResults((current) => ({ ...current, [treatment.id]: value }));
                                  setFollowUpSaved(false);
                                }}
                              >
                                {value === "better" ? "原动作改善" : value === "same" ? "没有变化" : "反应加重"}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="followup-delayed-note">稍后记录，不要求当场改善</div>
                        )}
                        {followUpTreatmentResults[treatment.id] === "same" && (
                          <div className="followup-next-hypothesis">{treatment.nextIfSame}</div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {followUpComplete && effectiveFollowUpDecision !== "返回相关评估" && followUpTreatmentsComplete && (
                <ExerciseCards exercises={plannedFollowUpExercises} />
              )}

              {followUpComplete && (
                <div className="final-bar followup-save-actions">
                  {effectiveFollowUpDecision === "返回相关评估" && (
                    <button className="outline-button" type="button" onClick={() => onNavigate(2)}>
                      返回相关评估
                    </button>
                  )}
                  <button
                    className="solid-button dark"
                    type="button"
                    onClick={saveFollowUp}
                    disabled={followUpSaved || (effectiveFollowUpDecision !== "返回相关评估" && !followUpTreatmentsComplete)}
                  >
                    {followUpSaved
                      ? `第 ${currentVisit} 次已保存`
                      : effectiveFollowUpDecision !== "返回相关评估" && !followUpTreatmentsComplete
                        ? "先完成当场复测"
                        : `保存第 ${currentVisit} 次康复`}
                  </button>
                  {followUpSaved && (
                    <button className="solid-button coral" type="button" onClick={startNextVisit}>
                      开始第 {currentVisit + 1} 次康复 <span>→</span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {toast && <div className="toast-v2">{toast}</div>}
    </section>
  );
}
