export type SpecialTestMode = "self" | "assisted";

export type SpecialTestOption = {
  label: string;
  delta: number;
  meaning: string;
  needsReview?: boolean;
};

export type SpecialTest = {
  id: string;
  title: string;
  mode: SpecialTestMode;
  when: string;
  instruction: string;
  positive: string;
  target: string;
  options: SpecialTestOption[];
};

const STANDARD_OPTIONS = {
  negative: (meaning: string): SpecialTestOption => ({
    label: "没有出现",
    delta: -4,
    meaning,
  }),
  unclear: {
    label: "无法判断",
    delta: 0,
    meaning: "不根据这一次结果调整方向",
  },
  skip: {
    label: "暂不测试",
    delta: 0,
    meaning: "跳过该项，不影响继续完成评估",
  },
};

export const SPECIAL_TESTS: Record<string, SpecialTest[]> = {
  knee: [
    {
      id: "knee-joint-line-tenderness",
      title: "关节线压痛定位",
      mode: "self",
      when: "膝内侧或外侧有一个比较明确的痛点时",
      instruction: "屈膝坐好，先按健侧，再在患侧相同位置沿关节缝轻按。",
      positive: "患侧出现清晰、集中的关节线压痛，健侧没有。",
      target: "knee-other",
      options: [
        STANDARD_OPTIONS.negative("关节线相关方向的优先级下降"),
        {
          label: "患侧集中压痛",
          delta: 12,
          meaning: "把关节线相关问题列入进一步检查，但不能单独判断半月板",
        },
        STANDARD_OPTIONS.unclear,
        STANDARD_OPTIONS.skip,
      ],
    },
    {
      id: "knee-mcmurray",
      title: "麦氏测试（McMurray）",
      mode: "assisted",
      when: "扭转后疼痛、卡顿或关节线不适时",
      instruction: "只由熟悉动作的人缓慢协助屈伸和旋转；不熟悉手法就直接跳过。",
      positive: "动作再现熟悉的关节线痛或明确卡顿，不把无痛弹响算阳性。",
      target: "knee-other",
      options: [
        STANDARD_OPTIONS.negative("半月板相关方向的优先级下降"),
        {
          label: "再现关节线症状",
          delta: 14,
          meaning: "结合病史与功能表现，优先补充专业膝关节检查",
        },
        STANDARD_OPTIONS.unclear,
        STANDARD_OPTIONS.skip,
      ],
    },
  ],
  shoulder: [
    {
      id: "shoulder-lift-off",
      title: "背手抬离测试（Lift-off）",
      mode: "self",
      when: "手能安全放到腰背部时",
      instruction: "手背贴在腰后，轻轻离开身体；先做健侧，再比较患侧。",
      positive: "患侧明显抬不离、很快掉回去，或力量明显差于健侧。",
      target: "shoulder-cuff",
      options: [
        STANDARD_OPTIONS.negative("该方向暂不作为最优先线索"),
        {
          label: "患侧明显更差",
          delta: 14,
          meaning: "肩袖相关能力值得优先检查和分级训练",
        },
        STANDARD_OPTIONS.unclear,
        STANDARD_OPTIONS.skip,
      ],
    },
    {
      id: "shoulder-scarf",
      title: "横抱测试（Scarf test）",
      mode: "self",
      when: "疼痛更靠近肩膀最上方时",
      instruction: "用患侧手臂横抱到对侧肩前，先比较健侧，不要强压终点。",
      positive: "患侧肩顶部出现清晰、局部的熟悉疼痛。",
      target: "shoulder-task",
      options: [
        STANDARD_OPTIONS.negative("肩顶部局部受力方向的优先级下降"),
        {
          label: "肩顶部局部痛",
          delta: 12,
          meaning: "先调整横抱、支撑和推举负荷，再结合压痛位置判断",
        },
        STANDARD_OPTIONS.unclear,
        STANDARD_OPTIONS.skip,
      ],
    },
    {
      id: "shoulder-drop-arm",
      title: "落臂测试（Drop arm）",
      mode: "assisted",
      when: "出现突然无力，或外伤后抬手明显困难时",
      instruction: "由他人扶到约肩高，再让手臂缓慢放下；不强行抬过疼痛位置。",
      positive: "手臂突然掉落，或完全无法控制下降。",
      target: "shoulder-ruleout",
      options: [
        STANDARD_OPTIONS.negative("没有发现这一项提示的明显功能缺失"),
        {
          label: "突然掉落 / 无法控制",
          delta: 28,
          meaning: "先补充肩部专业检查，再决定局部负荷测试",
          needsReview: true,
        },
        STANDARD_OPTIONS.unclear,
        STANDARD_OPTIONS.skip,
      ],
    },
  ],
  back: [
    {
      id: "back-straight-leg-raise",
      title: "直腿抬高测试（SLR）",
      mode: "assisted",
      when: "腰痛同时向臀部或腿部放射时",
      instruction: "仰卧，由他人缓慢抬起伸直的腿；出现放射症状就停，不追求角度。",
      positive: "再现熟悉的腿部放射痛或麻，不把单纯大腿后侧牵拉感算阳性。",
      target: "back-other",
      options: [
        STANDARD_OPTIONS.negative("神经相关方向的优先级下降"),
        {
          label: "再现腿部放射",
          delta: 20,
          meaning: "把神经相关检查提前，不只按局部腰部紧张处理",
          needsReview: true,
        },
        STANDARD_OPTIONS.unclear,
        STANDARD_OPTIONS.skip,
      ],
    },
    {
      id: "back-faber",
      title: "屈曲外展外旋测试（FABER）",
      mode: "assisted",
      when: "腰痛伴腹股沟、臀部或髋部活动受限时",
      instruction: "仰卧，把脚踝放到对侧膝上，由他人轻扶膝部，不向下强压。",
      positive: "患侧活动明显更少，或再现熟悉的腹股沟 / 臀部症状。",
      target: "back-hip",
      options: [
        STANDARD_OPTIONS.negative("髋部相关方向的优先级下降"),
        {
          label: "患侧受限 / 再现症状",
          delta: 13,
          meaning: "把髋部活动与症状位置加入后续检查",
        },
        STANDARD_OPTIONS.unclear,
        STANDARD_OPTIONS.skip,
      ],
    },
  ],
  ankle: [
    {
      id: "ankle-thompson",
      title: "小腿挤压测试（Thompson）",
      mode: "assisted",
      when: "小腿后侧或跟腱附近疼痛、无力时",
      instruction: "俯卧让脚伸出床边，由他人轻挤小腿肚并观察脚是否自然向下动。",
      positive: "患侧脚几乎不动，且与健侧差别明显。",
      target: "ankle-ruleout",
      options: [
        STANDARD_OPTIONS.negative("没有发现这一项提示的明显跟腱功能缺失"),
        {
          label: "患侧脚几乎不动",
          delta: 32,
          meaning: "先补充跟腱专业评估，再决定承重与力量训练",
          needsReview: true,
        },
        STANDARD_OPTIONS.unclear,
        STANDARD_OPTIONS.skip,
      ],
    },
    {
      id: "ankle-tinel",
      title: "踝管叩击测试（Tinel）",
      mode: "self",
      when: "内踝附近或足底有麻、刺、电击感时",
      instruction: "用指腹在内踝后方轻叩数次，并与健侧同位置比较。",
      positive: "患侧出现向足底扩散的熟悉麻刺或电击感。",
      target: "ankle-other",
      options: [
        STANDARD_OPTIONS.negative("踝管神经相关方向的优先级下降"),
        {
          label: "麻刺向足底扩散",
          delta: 18,
          meaning: "把感觉和神经相关检查提前，不只处理局部肿胀",
          needsReview: true,
        },
        STANDARD_OPTIONS.unclear,
        STANDARD_OPTIONS.skip,
      ],
    },
  ],
  hamstring: [],
};
