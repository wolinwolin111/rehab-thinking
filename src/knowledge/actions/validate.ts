import type { AssessmentEntry, TreatmentEntry, TrainingEntry, OptionGroup } from "./types.ts";
import { OPTION_BASES } from "./option-sets.ts";

export type CatalogIssue = { code: string; entryId: string; detail: string };

const DOSE_IN_SENTENCE = /\d+\s*(次|组)|每组|做\s*\d|保持\d+\s*秒/;
/** 句内数字是动作定义本身、不是处方的例外（等长保持的秒数）。 */
const DOSE_EXCEPTIONS = new Set(["ankle-achilles-isometric"]);
const ACCESS = new Set(["self", "coach", "therapist"]);
const REGION = new Set(["knee", "ankle-foot", "thigh-local", "calf-local"]);

export function validateActionCatalog(input: {
  terms: string[];
  assessment: AssessmentEntry[];
  treatment: TreatmentEntry[];
  training: TrainingEntry[];
}): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const termSet = new Set(input.terms);
  const assessmentIds = new Set(input.assessment.map((entry) => entry.id));
  const seen = new Set<string>();

  const checkCommon = (entry: { id: string; region: string; actions: readonly string[]; access?: string }, library: string) => {
    if (!REGION.has(entry.region)) issues.push({ code: "CAT-BAD-REGION", entryId: entry.id, detail: entry.region });
    if ("access" in entry && entry.access !== undefined && !ACCESS.has(entry.access)) {
      issues.push({ code: "CAT-BAD-ACCESS", entryId: entry.id, detail: String(entry.access) });
    }
    for (const key of entry.actions) {
      if (!termSet.has(key)) issues.push({ code: "CAT-MISSING-TERM", entryId: entry.id, detail: key });
    }
    const dedupeKey = `${library}:${entry.id}`;
    if (seen.has(dedupeKey)) issues.push({ code: "CAT-DUPLICATE-ID", entryId: entry.id, detail: library });
    seen.add(dedupeKey);
  };

  const checkOptions = (entryId: string, group: OptionGroup | undefined, field: string) => {
    if (!group) return;
    const base = OPTION_BASES[group.base];
    if (!base) {
      issues.push({ code: "CAT-BAD-OPTION-BASE", entryId, detail: `${field}: ${group.base}` });
      return;
    }
    for (const [value, localized] of Object.entries(group.labels ?? {})) {
      if (!localized) continue;
      if (!base.values.includes(value)) {
        issues.push({ code: "CAT-BAD-OPTION-VALUE", entryId, detail: `${field}: "${value}" 不在 ${group.base} 值契约中` });
      }
      for (const register of ["plain", "pro"] as const) {
        if (localized[register] === undefined) {
          issues.push({ code: "CAT-OPTION-LABEL-INCOMPLETE", entryId, detail: `${field}.${value}.${register} 缺失` });
        }
      }
    }
  };

  for (const entry of input.assessment) {
    checkCommon(entry, "assessment");
    checkOptions(entry.id, entry.options, "options");
    // plain/pro 的 dose 键集合允许不同（自助句式和专业句式引用的数字不同），
    // 完整性由 renderHow/fillTemplate 运行时抛错保证，这里不做键集合比对。
    if (!DOSE_EXCEPTIONS.has(entry.id)) {
      for (const register of ["plain", "pro"] as const) {
        if (DOSE_IN_SENTENCE.test(entry.how[register].replace(/\{dose\.[^}]+\}/g, ""))) {
          issues.push({ code: "CAT-DOSE-IN-SENTENCE", entryId: entry.id, detail: `how.${register}` });
        }
      }
      if (DOSE_IN_SENTENCE.test(entry.observe.plain)) issues.push({ code: "CAT-DOSE-IN-SENTENCE", entryId: entry.id, detail: "observe.plain" });
    }
  }
  for (const entry of input.treatment) {
    checkCommon(entry, "treatment");
    if (!DOSE_EXCEPTIONS.has(entry.id) && DOSE_IN_SENTENCE.test(entry.doText.replace(/\{dose\.[^}]+\}/g, ""))) {
      issues.push({ code: "CAT-DOSE-IN-SENTENCE", entryId: entry.id, detail: entry.doText });
    }
    if (!assessmentIds.has(entry.retestOf)) issues.push({ code: "CAT-BAD-RETEST-REF", entryId: entry.id, detail: entry.retestOf });
  }
  for (const entry of input.training) {
    checkCommon(entry, "training");
    if (!DOSE_EXCEPTIONS.has(entry.id)) {
      if (DOSE_IN_SENTENCE.test(entry.how.replace(/\{dose\.[^}]+\}/g, ""))) {
        issues.push({ code: "CAT-DOSE-IN-SENTENCE", entryId: entry.id, detail: "how" });
      }
      if (DOSE_IN_SENTENCE.test(entry.purpose)) issues.push({ code: "CAT-DOSE-IN-SENTENCE", entryId: entry.id, detail: "purpose" });
    }
    // easier / harder 里允许保留各自的退阶·进阶剂量（如「保持10秒」「每组6个」），
    // 它们是变体处方，不与卡头 sets·reps 同屏，不构成 a70af60 那类自相矛盾。
  }
  return issues;
}
