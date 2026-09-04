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

  "knee-straighten": { plain: "把膝盖压向床面", pro: "膝伸直" },
  "knee-bend": { plain: "弯膝盖", pro: "膝屈曲" },
  "patella-glide-up": { plain: "把髌骨向上推", pro: "髌骨向上活动" },
  "patella-glide-down": { plain: "把髌骨向下推", pro: "髌骨向下活动" },
  "patella-glide-medial": { plain: "把髌骨向内推", pro: "髌骨向内活动" },
  "patella-glide-lateral": { plain: "把髌骨向外推", pro: "髌骨向外活动" },
  "ankle-dorsiflex": { plain: "把脚背向小腿靠近", pro: "踝背屈" },
  "ankle-plantarflex": { plain: "把脚背向下压", pro: "踝跖屈" },
  "ankle-invert": { plain: "把脚掌转向身体中间", pro: "足踝内翻" },
  "ankle-evert": { plain: "把脚掌向外转", pro: "足踝外翻" },
  "great-toe-extend": { plain: "把大脚趾向上抬", pro: "第一跖趾背伸" },
  "toe-flex": { plain: "抬起再弯曲脚趾", pro: "足趾屈曲与伸展" },
  "pillow-squeeze": { plain: "夹住软枕", pro: "夹枕等长发力" },
} as const;

export type ActionTermKey = keyof typeof ACTION_TERMS;
