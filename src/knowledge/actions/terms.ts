export type ActionTerm = { plain: string; pro: string };

export const ACTION_TERMS = {
  "heel-raise-standing": { plain: "踮脚尖", pro: "提踵" },
  "heel-raise-seated": { plain: "坐着踮脚尖", pro: "坐位提踵" },
  "heel-raise-single": { plain: "单脚踮脚尖", pro: "单脚提踵" },
  "heel-raise-hold": { plain: "保持", pro: "提踵等长保持" },
  "heel-raise-fast": { plain: "快速踮脚尖", pro: "快速提踵" },
} as const;

export type ActionTermKey = keyof typeof ACTION_TERMS;
