import { readFileSync } from "node:fs";
import { ACTION_TERMS } from "../../src/knowledge/actions/terms.ts";
import { ASSESSMENT_ENTRIES } from "../../src/knowledge/actions/assessment.ts";
import { TREATMENT_ENTRIES } from "../../src/knowledge/actions/treatment.ts";
import { TRAINING_ENTRIES } from "../../src/knowledge/actions/training.ts";
import { validateActionCatalog } from "../../src/knowledge/actions/validate.ts";
import { GOLDEN_OUTPUTS } from "../../src/knowledge/actions/golden.ts";
import { goldenOutputs } from "../../src/knowledge/actions/bridge.ts";
import { COMPENSATION_OPTIONS } from "../../src/knowledge/actions/compensations.ts";

/** 候选标签全集：从 pilot 知识源码静态扫描 candidate()/tags:[] 的字面量（防代偿归类映射到不存在的标签＝半空转）。 */
function candidateTagUniverse(): Set<string> {
  const files = [
    "src/knowledge/pilot/full-demo-content.ts",
    "src/knowledge/pilot/local-limb-regions.ts",
  ];
  const universe = new Set<string>();
  for (const f of files) {
    const s = readFileSync(f, "utf8");
    const arrays: string[] = [];
    for (const m of s.matchAll(/candidate\([^)]*\[([^\]]*)\]/g)) arrays.push(m[1]);
    for (const m of s.matchAll(/tags:\s*\[([^\]]*)\]/g)) arrays.push(m[1]);
    for (const a of arrays) for (const t of a.matchAll(/"([^"]+)"/g)) universe.add(t[1]);
  }
  return universe;
}

const tagUniverse = candidateTagUniverse();
const deadTagIssues = Object.entries(COMPENSATION_OPTIONS)
  .flatMap(([id, option]) => (option.tags ?? []).filter((tag) => !tagUniverse.has(tag)).map((tag) => ({ code: "CAT-DEAD-COMPENSATION-TAG", entryId: id, detail: tag })));

const issues = [
  ...validateActionCatalog({
    terms: Object.keys(ACTION_TERMS),
    assessment: ASSESSMENT_ENTRIES,
    treatment: TREATMENT_ENTRIES,
    training: TRAINING_ENTRIES,
  }),
  ...Object.entries(goldenOutputs()).flatMap(([id, actual]) =>
    GOLDEN_OUTPUTS[id] === undefined || GOLDEN_OUTPUTS[id] === actual
      ? []
      : [{ code: "CAT-GOLDEN-MISMATCH", entryId: id, detail: `${GOLDEN_OUTPUTS[id]} !== ${actual}` }]),
  ...deadTagIssues,
];

if (issues.length) {
  for (const issue of issues) console.error(`${issue.code} ${issue.entryId}: ${issue.detail}`);
  process.exitCode = 1;
} else {
  console.log(`action catalog: ok (assessment=${ASSESSMENT_ENTRIES.length}, treatment=${TREATMENT_ENTRIES.length}, training=${TRAINING_ENTRIES.length}, golden=${Object.keys(GOLDEN_OUTPUTS).length})`);
}
