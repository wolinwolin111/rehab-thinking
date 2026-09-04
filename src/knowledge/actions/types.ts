import type { ActionTermKey } from "./terms.ts";

export type Register = "plain" | "pro";
export type LocalizedText = Record<Register, string>;
export type PilotRegionId = "knee" | "ankle-foot" | "thigh-local" | "calf-local";
export type ContentAccess = "self" | "coach" | "therapist";
export type StartPosition = "仰卧" | "坐位" | "站立" | "四点跪" | "侧卧";

export type AssessmentEntry = {
  id: string;
  region: PilotRegionId;
  kind: "direction" | "strength" | "function" | "special";
  access: ContentAccess;
  title: LocalizedText;
  actions: ActionTermKey[];
  how: LocalizedText;
  observe: LocalizedText;
  optionSet: string;
  /** plain / pro 两套剂量都必填；模板里引用的键必须存在于对应语域（运行时抛错兜底）。 */
  dose: Record<Register, Record<string, string | number>>;
};

export type TreatmentEntry = {
  id: string;
  region: PilotRegionId;
  type: "muscle" | "control" | "joint" | "swelling";
  access: ContentAccess;
  title: LocalizedText;
  actions: ActionTermKey[];
  doText: string;
  retestOf: string;
  dose: Record<string, string | number>;
};

export type TrainingEntry = {
  id: string;
  region: PilotRegionId;
  stage: number;
  actions: ActionTermKey[];
  title: string;
  how: string;
  purpose: string;
  observe: string;
  easier: string;
  harder: string;
  dose: { sets: string; reps: string };
  tags: string[];
  /** full-demo 的 exercise 没有这个实参（体位由 title+how 正则推断）；local-limb 必须显式传。 */
  startPosition: StartPosition;
};
