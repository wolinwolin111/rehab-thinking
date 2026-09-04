import type { TreatmentEntry } from "./types.ts";

export const TREATMENT_ENTRIES: TreatmentEntry[] = [
  {
    id: "ankle-medial-control", region: "ankle-foot", type: "control", access: "self",
    title: { plain: "足弓与提踵控制练习", pro: "足弓与提踵控制练习" },
    actions: ["heel-raise-standing"],
    doText: "坐着，用脚趾把地上的毛巾一点点抓向自己，做 {dose.grasp} 次；再扶墙做 {dose.raise} 个双脚踮脚尖。",
    retestOf: "ankle-calf", dose: { grasp: 5, raise: 5 },
  },
  {
    id: "ankle-achilles-load", region: "ankle-foot", type: "control", access: "self",
    title: { plain: "双脚提踵起步", pro: "双脚提踵起步" },
    actions: ["heel-raise-standing"],
    doText: "先确认没有突然断裂的感觉、也没有踩不实的情况，再扶墙做一组{dose.reps}个双脚踮脚尖。",
    retestOf: "ankle-heel-raise", dose: { reps: "5～8" },
  },
];

export const TREATMENT_BY_ID = new Map(TREATMENT_ENTRIES.map((entry) => [entry.id, entry]));
