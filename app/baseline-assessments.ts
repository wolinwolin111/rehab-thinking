export type ComparisonMode = "side" | "usual" | "task" | "finding";

export type BaselineCheck = {
  id: string;
  label: string;
  instruction: string;
};

export type BaselineAssessment = {
  category:
    | "局部表现"
    | "各方向活动范围"
    | "相邻关节"
    | "力量与控制"
    | "负重与移动"
    | "日常使用";
  title: string;
  intro: string;
  compare: ComparisonMode;
  checks: BaselineCheck[];
  limitedMeaning: string;
  target: string;
  mobilityPlan?: {
    coach: string;
    professional: string;
    avoid: string;
  };
};

export const BASELINE_ASSESSMENTS: Record<string, BaselineAssessment[]> = {
  knee: [
    {
      category: "局部表现",
      title: "先看肿胀、压痛和髌骨活动",
      intro: "先找出问题集中在哪里；压痛只做一次定位，不反复重按。",
      compare: "finding",
      checks: [
        {
          id: "knee-local-swelling",
          label: "膝部肿胀",
          instruction: "比较两侧膝盖轮廓、髌骨周围和膝后方，记录患侧是否明显更肿。",
        },
        {
          id: "knee-local-tenderness",
          label: "压痛位置",
          instruction: "轻按髌腱、脂肪垫、关节线、鹅足和腘窝周围，记录最熟悉的疼痛位置。",
        },
        {
          id: "knee-local-patella",
          label: "髌骨活动",
          instruction: "膝盖放松时轻柔比较髌骨上下和左右移动；不熟悉时选择暂不测试。",
        },
      ],
      limitedMeaning: "先记录异常位置；肿胀明显时不急着测试深蹲和大角度屈膝。",
      target: "knee-load",
    },
    {
      category: "各方向活动范围",
      title: "膝关节两个方向",
      intro: "先做健侧，再用相同姿势检查患侧。",
      compare: "side",
      checks: [
        {
          id: "knee-rom-extension",
          label: "伸直",
          instruction: "坐着或躺着，把膝盖尽量自然伸直，看患侧是否更难贴平。",
        },
        {
          id: "knee-rom-flexion",
          label: "弯曲",
          instruction: "脚跟慢慢向臀部滑，比较两侧能弯到哪里。",
        },
      ],
      limitedMeaning: "哪一个方向更差，后续就先恢复那个方向，不急着增加负重。",
      target: "knee-quad",
      mobilityPlan: {
        coach: "用脚跟滑动和主动伸膝练习较差的方向，每次少量，练后重新走路或坐站。",
        professional: "如果肿胀已经稳定，活动范围仍长期明显落后，可请治疗师进一步判断是否存在关节本身的限制。",
        avoid: "大量肿胀、卡住、明显不稳或医生有限制时，不强压终点。",
      },
    },
    {
      category: "相邻关节",
      title: "再看髋和踝是否一起限制动作",
      intro: "膝部动作经常受髋旋转和踝背屈影响，但必须靠复测确认。",
      compare: "side",
      checks: [
        {
          id: "knee-chain-ankle",
          label: "踝背屈",
          instruction: "扶稳做膝向前移动，脚跟保持着地，比较两侧小腿前移距离。",
        },
        {
          id: "knee-chain-hip",
          label: "髋内外旋",
          instruction: "坐着屈髋屈膝，轻轻转动小腿，比较两侧髋旋转范围和症状。",
        },
      ],
      limitedMeaning: "相邻关节受限只作为候选来源；处理后必须回到原膝部动作复测。",
      target: "knee-ankle",
    },
    {
      category: "力量与控制",
      title: "膝、髋和小腿能否稳定用力",
      intro: "不测最大力量，比较两侧能否稳定完成和是否出现代偿。",
      compare: "side",
      checks: [
        {
          id: "knee-strength-extension",
          label: "坐姿伸膝",
          instruction: "坐着把小腿伸直并停住 5 秒，比较两侧稳定程度。",
        },
        {
          id: "knee-strength-hamstring",
          label: "屈膝压地",
          instruction: "坐着让脚跟轻压地面 5 秒，比较两侧后侧大腿发力。",
        },
        {
          id: "knee-strength-hip",
          label: "臀桥或侧向推墙",
          instruction: "用臀桥或侧向轻推墙比较臀肌参与，不追求最大力量。",
        },
        {
          id: "knee-strength-calf",
          label: "双脚提踵",
          instruction: "扶稳做 5 次双脚提踵，观察患侧是否明显少用力。",
        },
        {
          id: "knee-control-single-leg",
          label: "扶持单脚站",
          instruction: "手扶固定物单脚站 10 秒，比较晃动和信心。",
        },
      ],
      limitedMeaning: "明显差的一侧先从双脚或有扶持的版本开始。",
      target: "knee-control",
    },
    {
      category: "负重与移动",
      title: "下肢真实任务",
      intro: "按从容易到困难的顺序测试，做不到就停在上一项。",
      compare: "task",
      checks: [
        {
          id: "knee-function-walk",
          label: "走 10 步",
          instruction: "看是否跛行、缩短步幅或不敢落脚。",
        },
        {
          id: "knee-function-sit-stand",
          label: "坐下再站起",
          instruction: "不用手或少用手，观察是否明显偏向一侧。",
        },
        {
          id: "knee-function-squat",
          label: "扶持浅蹲",
          instruction: "只蹲到舒服深度，看两侧用力是否接近。",
        },
        {
          id: "knee-function-step",
          label: "上下一级台阶",
          instruction: "扶好栏杆，观察上台阶和下台阶哪一个更困难。",
        },
      ],
      limitedMeaning: "最先出现明显困难的任务，就是当前训练的起点。",
      target: "knee-load",
    },
  ],
  shoulder: [
    {
      category: "局部表现",
      title: "先看肩胛和肱骨位置",
      intro: "位置差异不是诊断，只用于决定后面是否值得做手动调整复测。",
      compare: "side",
      checks: [
        {
          id: "shoulder-local-scapula",
          label: "肩胛位置与控制",
          instruction: "自然站立和墙面推时，比较两侧是否明显耸肩、翘起或控制不同。",
        },
        {
          id: "shoulder-local-humerus",
          label: "肩前方位置",
          instruction: "放松站立，比较两侧肩前方轮廓；不根据外观看结果，只记录明显差异。",
        },
      ],
      limitedMeaning: "先用肩胛或肱骨位置调整做一次反应试验，再重复原抬手动作。",
      target: "shoulder-scap",
    },
    {
      category: "各方向活动范围",
      title: "肩关节六个方向",
      intro: "站直，先做健侧；患侧只做到舒适终点，不硬抬。",
      compare: "side",
      checks: [
        {
          id: "shoulder-rom-flexion",
          label: "向前举",
          instruction: "手臂从身体前方向上举，比较高度和是否耸肩。",
        },
        {
          id: "shoulder-rom-extension",
          label: "向后伸",
          instruction: "手臂贴近身体向后伸，比较两侧范围。",
        },
        {
          id: "shoulder-rom-abduction",
          label: "向侧面举",
          instruction: "手臂从身体侧面抬起，比较高度和疼痛位置。",
        },
        {
          id: "shoulder-rom-adduction",
          label: "横过胸前",
          instruction: "把手臂轻轻横向抱到胸前，比较紧张和范围。",
        },
        {
          id: "shoulder-rom-external",
          label: "向外旋",
          instruction: "肘贴身体弯 90°，前臂向外打开，比较两侧。",
        },
        {
          id: "shoulder-rom-internal",
          label: "向内旋",
          instruction: "手背沿腰后向上移动，比较能摸到的位置。",
        },
      ],
      limitedMeaning: "记录具体受限方向，训练时先使用接近但不明显加重的范围。",
      target: "shoulder-load",
      mobilityPlan: {
        coach: "用桌面滑动、墙面滑动或轻柔辅助动作练习较差方向，练后重做对应生活动作。",
        professional: "主动和辅助活动都持续明显受限时，可请治疗师区分关节、肌肉或保护性紧张。",
        avoid: "近期脱位、突然明显无力、持续麻木或医生有限制时，不做强力被动活动。",
      },
    },
    {
      category: "相邻关节",
      title: "检查颈、胸椎和前臂",
      intro: "只有改变相邻环节后原肩部动作也改变，才保留这个方向。",
      compare: "side",
      checks: [
        {
          id: "shoulder-chain-neck",
          label: "颈椎转动",
          instruction: "轻轻向左右转头，比较范围，并记录是否诱发肩臂症状。",
        },
        {
          id: "shoulder-chain-thoracic",
          label: "胸椎旋转",
          instruction: "坐着抱胸向左右转动，比较上背部活动和抬手前后的差别。",
        },
        {
          id: "shoulder-chain-forearm",
          label: "前臂旋前旋后",
          instruction: "肘贴身体弯 90°，掌心向上和向下转，比较两侧。",
        },
      ],
      limitedMeaning: "相邻环节只做一个变量的处理试验，随后回到原抬手或支撑动作。",
      target: "shoulder-thoracic",
    },
    {
      category: "力量与控制",
      title: "肩部能否稳定发力",
      intro: "使用墙面或自己的另一只手提供轻阻力。",
      compare: "side",
      checks: [
        {
          id: "shoulder-strength-external",
          label: "外旋顶手",
          instruction: "肘贴身体，用手背轻轻向外顶住另一只手 5 秒。",
        },
        {
          id: "shoulder-strength-internal",
          label: "内旋顶手",
          instruction: "肘贴身体，用手掌轻轻向内顶住另一只手 5 秒。",
        },
        {
          id: "shoulder-strength-abduction",
          label: "侧抬顶墙",
          instruction: "手臂贴墙，轻轻向侧面顶墙 5 秒，不追求大力。",
        },
        {
          id: "shoulder-control-wall",
          label: "墙面推",
          instruction: "双手推墙再回位，看患侧肩胛是否明显耸起或失控。",
        },
      ],
      limitedMeaning: "患侧明显更差时，先从不痛的轻等长和墙面动作开始。",
      target: "shoulder-cuff",
    },
    {
      category: "日常使用",
      title: "上肢生活动作",
      intro: "这些动作比单纯看角度更接近日常需要。",
      compare: "task",
      checks: [
        {
          id: "shoulder-function-overhead",
          label: "拿高处物品",
          instruction: "空手模拟从高处架子取一个轻物体。",
        },
        {
          id: "shoulder-function-head",
          label: "摸后脑",
          instruction: "模拟梳头或洗头，看动作是否顺畅。",
        },
        {
          id: "shoulder-function-back",
          label: "手伸到腰后",
          instruction: "模拟穿衣、系围裙或整理后腰衣物。",
        },
        {
          id: "shoulder-function-towel",
          label: "拧毛巾",
          instruction: "用干毛巾轻轻做拧转动作，观察疼痛和用力信心。",
        },
      ],
      limitedMeaning: "选择最受影响的一项，作为后续复测的固定生活动作。",
      target: "shoulder-load",
    },
  ],
  back: [
    {
      category: "各方向活动范围",
      title: "腰背六个方向",
      intro: "和本人平时状态比较，不追求摸得更远。",
      compare: "usual",
      checks: [
        {
          id: "back-rom-flexion",
          label: "向前弯",
          instruction: "双手沿大腿向下滑，记录舒服程度和范围。",
        },
        {
          id: "back-rom-extension",
          label: "向后伸",
          instruction: "双手扶髋，小幅度向后伸，观察是否更轻松或更不适。",
        },
        {
          id: "back-rom-left-bend",
          label: "向左侧弯",
          instruction: "左手沿大腿向下滑，骨盆尽量不移动。",
        },
        {
          id: "back-rom-right-bend",
          label: "向右侧弯",
          instruction: "右手沿大腿向下滑，和左侧比较。",
        },
        {
          id: "back-rom-left-turn",
          label: "向左转",
          instruction: "双手抱胸，身体轻轻向左转。",
        },
        {
          id: "back-rom-right-turn",
          label: "向右转",
          instruction: "双手抱胸，身体轻轻向右转。",
        },
      ],
      limitedMeaning: "先保留更轻松的方向；明显不适的方向用更小范围开始。",
      target: "back-exposure",
      mobilityPlan: {
        coach: "选择较舒服的方向做小范围重复，再复测坐站或弯腰。",
        professional: "持续明显受限并影响生活时，可请治疗师进一步判断关节、神经和肌肉因素。",
        avoid: "出现进行性无力、会阴感觉或大小便异常、重大创伤时，停止这些测试。",
      },
    },
    {
      category: "相邻关节",
      title: "检查髋部活动是否改变腰部任务",
      intro: "髋部受限只是候选来源；处理后必须回到弯腰、坐站或走路复测。",
      compare: "side",
      checks: [
        {
          id: "back-chain-hip-rotation",
          label: "髋内外旋",
          instruction: "坐着屈髋屈膝，轻轻转动小腿，比较两侧髋旋转范围。",
        },
        {
          id: "back-chain-hip-flexion",
          label: "屈髋",
          instruction: "仰卧抱膝到舒适位置，比较两侧屈髋是否明显不同或再现熟悉症状。",
        },
      ],
      limitedMeaning: "先单独处理一个髋部候选因素，再重复原腰部任务；没有变化就回到腰部检查。",
      target: "back-hip",
    },
    {
      category: "力量与控制",
      title: "躯干和髋部控制",
      intro: "动作过程中能正常呼吸，比坚持时间更重要。",
      compare: "usual",
      checks: [
        {
          id: "back-control-bridge",
          label: "双腿桥式",
          instruction: "抬起臀部并停 5 秒，看腰背是否过度紧张。",
        },
        {
          id: "back-control-bird-dog",
          label: "四点跪抬手或腿",
          instruction: "一次只抬一只手或腿，看身体能否保持稳定。",
        },
        {
          id: "back-control-hip",
          label: "臀肌与髋后伸",
          instruction: "做小幅臀桥，比较臀部参与和腰部是否过度紧张。",
        },
      ],
      limitedMeaning: "先缩短动作时间或杠杆，做到稳定再增加难度。",
      target: "back-capacity",
    },
    {
      category: "负重与移动",
      title: "腰背真实任务",
      intro: "用日常动作判断目前能做到哪一级。",
      compare: "task",
      checks: [
        {
          id: "back-function-sit-stand",
          label: "连续坐站 5 次",
          instruction: "观察速度、信心和是否需要用手。",
        },
        {
          id: "back-function-pickup",
          label: "从高处拿起轻物",
          instruction: "先从椅面高度拿空瓶，不必直接弯到地面。",
        },
        {
          id: "back-function-walk",
          label: "自然走 2 分钟",
          instruction: "观察走动后是更轻松、无变化还是更不适。",
        },
      ],
      limitedMeaning: "选择能稳定完成的最高一级，作为训练起点。",
      target: "back-hinge",
    },
  ],
  ankle: [
    {
      category: "各方向活动范围",
      title: "踝关节四个方向",
      intro: "坐着或躺着先做健侧，患侧只做到舒适范围。",
      compare: "side",
      checks: [
        {
          id: "ankle-rom-dorsiflexion",
          label: "脚尖向上",
          instruction: "把脚背勾向小腿，比较两侧范围。",
        },
        {
          id: "ankle-rom-plantarflexion",
          label: "脚尖向下",
          instruction: "像踩油门一样向下绷脚，比较两侧。",
        },
        {
          id: "ankle-rom-inversion",
          label: "脚底向内",
          instruction: "小幅度把脚底转向内侧，不要硬压。",
        },
        {
          id: "ankle-rom-eversion",
          label: "脚底向外",
          instruction: "小幅度把脚底转向外侧，比较控制和范围。",
        },
      ],
      limitedMeaning: "急性期受限常和肿胀、疼痛保护有关，先做舒适主动活动。",
      target: "ankle-motion",
      mobilityPlan: {
        coach: "从踝泵和小幅度四方向活动开始；能承重后再练膝盖向前移动。",
        professional: "骨折和明显不稳已排除、肿胀稳定后仍明显受限，可请治疗师进一步评估。",
        avoid: "明显变形、骨性压痛、无法承重或医生要求固定时，不强推活动范围。",
      },
    },
    {
      category: "力量与控制",
      title: "踝部能否稳定用力",
      intro: "先从双脚和有扶持的版本开始。",
      compare: "side",
      checks: [
        {
          id: "ankle-strength-calf",
          label: "扶持提踵",
          instruction: "先双脚提踵；可控后再比较单脚能否抬起脚跟。",
        },
        {
          id: "ankle-control-balance",
          label: "扶持单脚站",
          instruction: "手扶固定物站 10 秒，比较晃动和信心。",
        },
      ],
      limitedMeaning: "单脚明显困难时，继续用双脚或扶持版本。",
      target: "ankle-control",
    },
    {
      category: "负重与移动",
      title: "下肢真实任务",
      intro: "只有安全筛查允许时才测试，做不到可选“暂不测试”。",
      compare: "task",
      checks: [
        {
          id: "ankle-function-stand",
          label: "双脚站立",
          instruction: "观察能否把重量逐渐移到患侧。",
        },
        {
          id: "ankle-function-walk",
          label: "走 10 步",
          instruction: "观察是否跛行、步幅变短或不敢蹬地。",
        },
        {
          id: "ankle-function-step",
          label: "上下一级台阶",
          instruction: "扶好栏杆，观察患侧承重是否稳定。",
        },
      ],
      limitedMeaning: "最先受限的任务，就是当前承重训练的起点。",
      target: "ankle-load",
    },
  ],
  hamstring: [
    {
      category: "各方向活动范围",
      title: "髋、膝相关方向",
      intro: "急性期只看舒适活动，不追求拉伸感。",
      compare: "side",
      checks: [
        {
          id: "hamstring-rom-hip-flexion",
          label: "髋向前屈",
          instruction: "仰卧抬腿到舒适位置，膝盖可以微弯。",
        },
        {
          id: "hamstring-rom-hip-extension",
          label: "髋向后伸",
          instruction: "站立扶好，小幅度把腿向后移动。",
        },
        {
          id: "hamstring-rom-knee-flexion",
          label: "膝盖弯曲",
          instruction: "站立扶好，把脚跟向臀部方向抬起。",
        },
        {
          id: "hamstring-rom-knee-extension",
          label: "膝盖伸直",
          instruction: "坐着慢慢伸直小腿，不进入明显拉扯痛。",
        },
      ],
      limitedMeaning: "明显拉扯的方向先缩小范围，不用强拉伸解决。",
      target: "strain-length",
      mobilityPlan: {
        coach: "保留舒适步幅和小范围髋、膝主动活动，不做强拉伸。",
        professional: "如果髋或膝本身持续明显受限，可请治疗师进一步区分关节、神经和肌肉因素。",
        avoid: "明显淤青、凹陷、无力或拉长痛突出时，不进行强力拉伸和被动活动。",
      },
    },
    {
      category: "力量与控制",
      title: "后侧大腿能否轻轻发力",
      intro: "不做最大力量测试，只寻找不会加重的收缩起点。",
      compare: "side",
      checks: [
        {
          id: "hamstring-strength-heel",
          label: "脚跟压地",
          instruction: "坐着，用脚跟轻压地面 5 秒，比较两侧。",
        },
        {
          id: "hamstring-control-bridge",
          label: "双腿桥式",
          instruction: "如果走路已较稳定，再做小幅度双腿桥式。",
        },
      ],
      limitedMeaning: "患侧明显更差时，从更轻、更短的等长收缩开始。",
      target: "strain-contraction",
    },
    {
      category: "负重与移动",
      title: "下肢真实任务",
      intro: "从走路开始，不跨级测试跑跳。",
      compare: "task",
      checks: [
        {
          id: "hamstring-function-walk",
          label: "走 10 步",
          instruction: "观察是否缩短步幅、跛行或不敢向前迈。",
        },
        {
          id: "hamstring-function-sit-stand",
          label: "坐下再站起",
          instruction: "观察是否明显偏向健侧。",
        },
        {
          id: "hamstring-function-hinge",
          label: "小幅度髋铰链",
          instruction: "双手扶大腿，小幅度向前折髋，不追求拉伸。",
        },
      ],
      limitedMeaning: "最先出现明显困难的任务，就是当前活动量的上限。",
      target: "strain-protection",
    },
  ],
};
