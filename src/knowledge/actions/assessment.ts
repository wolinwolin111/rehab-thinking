import type { AssessmentEntry } from "./types.ts";

export const ASSESSMENT_ENTRIES: AssessmentEntry[] = [
  {
    id: "knee-calf", region: "knee", kind: "strength", access: "self",
    title: { plain: "踮脚力量", pro: "小腿三头肌" },
    actions: ["heel-raise-standing", "heel-raise-single"],
    how: {
      plain: "扶住墙，双脚慢慢踮起再落下，做{dose.both}次。两边都能稳定完成时，再分别用单脚试做。",
      pro: "双脚踮脚尖{dose.both}个；允许时再左右单脚各做最多{dose.each}个。",
    },
    observe: {
      plain: "哪边抬得更低、更容易累，或用力时会不舒服。",
      pro: "高度、节奏、膝是否弯曲及患侧能完成的高质量个数。",
    },
    optionSet: "strength",
    dose: { plain: { both: 10 }, pro: { both: 10, each: 10 } },
  },
  {
    id: "knee-heel-raise", region: "knee", kind: "function", access: "self",
    title: { plain: "双脚提踵", pro: "双脚提踵" },
    actions: ["heel-raise-standing"],
    how: {
      plain: "扶住墙面，双脚同时缓慢抬起脚跟，再慢慢落下，完成{dose.both}次。",
      pro: "扶住墙面，双脚同时缓慢抬起脚跟，再慢慢落下，完成{dose.both}次。",
    },
    observe: {
      plain: "两侧高度是否接近，身体是否晃动，患侧是否明显更难完成。",
      pro: "两侧高度是否接近，身体是否晃动，患侧是否明显更难完成。",
    },
    optionSet: "function",
    dose: { plain: { both: 10 }, pro: { both: 10 } },
  },
  {
    id: "ankle-calf", region: "ankle-foot", kind: "strength", access: "self",
    title: { plain: "踮脚力量", pro: "小腿三头肌 / 提踵" },
    actions: ["heel-raise-standing", "heel-raise-single"],
    how: {
      plain: "扶住墙，双脚慢慢踮起再落下，做{dose.both}次。能稳定完成时，再分别用单脚试做。",
      pro: "先双脚提踵{dose.both}个；稳定后扶墙做单脚提踵，最多记录{dose.each}个高质量次数。",
    },
    observe: {
      plain: "哪边抬得更低、更容易累，或用力时会不舒服。",
      pro: "提踵高度、节奏、膝是否弯曲和患侧耐力。",
    },
    optionSet: "strength",
    dose: { plain: { both: 10 }, pro: { both: 10, each: 10 } },
  },
  {
    id: "ankle-heel-raise", region: "ankle-foot", kind: "function", access: "self",
    title: { plain: "踮脚", pro: "提踵" },
    actions: ["heel-raise-standing", "heel-raise-single"],
    how: {
      plain: "扶住墙，双脚慢慢踮起再落下，做{dose.both}次。",
      pro: "先双脚同步提踵{dose.both}个，再根据耐受做单脚提踵。",
    },
    observe: {
      plain: "两边脚跟抬起的高度是否接近；哪里不舒服；身体是否明显偏向一边。",
      pro: "高度、节奏、足弓、跟腱/小腿症状和高质量次数。",
    },
    optionSet: "function",
    dose: { plain: { both: 10 }, pro: { both: 10 } },
  },
  {
    id: "calf-heel-raise-strength", region: "calf-local", kind: "strength", access: "self",
    title: { plain: "小腿后侧发力", pro: "小腿后侧发力" },
    actions: ["heel-raise-standing"],
    how: {
      plain: "扶墙做{dose.both}次双脚提踵；稳定时再分别单脚尝试。",
      pro: "扶墙做{dose.both}次双脚提踵；稳定时再分别单脚尝试。",
    },
    observe: {
      plain: "比较高度、个数和症状。",
      pro: "比较高度、个数和症状。",
    },
    optionSet: "strength",
    dose: { plain: { both: 10 }, pro: { both: 10 } },
  },
  {
    id: "calf-heel-raise", region: "calf-local", kind: "function", access: "self",
    title: { plain: "提踵", pro: "提踵" },
    actions: ["heel-raise-standing"],
    how: {
      plain: "扶墙做{dose.both}次双脚提踵。",
      pro: "扶墙做{dose.both}次双脚提踵。",
    },
    observe: {
      plain: "局部症状、高度和左右差异。",
      pro: "局部症状、高度和左右差异。",
    },
    optionSet: "function",
    dose: { plain: { both: 10 }, pro: { both: 10 } },
  },
];

export const ASSESSMENT_BY_ID = new Map(ASSESSMENT_ENTRIES.map((entry) => [entry.id, entry]));
