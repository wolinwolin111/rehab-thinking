export type ActionTerm = { plain: string; pro: string };

export const ACTION_TERMS = {
  "heel-raise-standing": { plain: "踮脚尖", pro: "提踵" },
  "heel-raise-seated": { plain: "坐着踮脚尖", pro: "坐位提踵" },
  "heel-raise-single": { plain: "单脚踮脚尖", pro: "单脚提踵" },
  "heel-raise-hold": { plain: "保持", pro: "提踵等长保持" },
  "heel-raise-fast": { plain: "快速踮脚尖", pro: "快速提踵" },

  "walk": { plain: "走路", pro: "步行" },
  "squat": { plain: "下蹲", pro: "下蹲" },
  "sit-to-stand": { plain: "坐下再站起", pro: "坐站转移" },
  "step-up": { plain: "上台阶", pro: "上台阶" },
  "step-down": { plain: "下台阶", pro: "下台阶" },
  "single-leg-stand": { plain: "单腿站立", pro: "单腿站立" },
  "hop-landing": { plain: "小跳落地", pro: "跳跃落地" },
  "hip-hinge": { plain: "臀部向后", pro: "屈髋" },
  "jog": { plain: "原地慢跑", pro: "原地慢跑" },

  "hip-flexion": { plain: "把大腿向腹部方向抬", pro: "髋关节屈曲" },
  "hip-extension": { plain: "把腿向身后伸", pro: "髋关节伸展" },
  "hip-abduction": { plain: "把腿向外打开", pro: "髋关节外展" },
  "hip-adduction": { plain: "把腿向身体中线靠拢", pro: "髋关节内收" },
} as const;

export type ActionTermKey = keyof typeof ACTION_TERMS;
