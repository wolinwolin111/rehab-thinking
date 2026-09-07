import { readFileSync, readdirSync } from "node:fs";
import { ACTION_TERMS } from "../../src/knowledge/actions/terms.ts";
import { ASSESSMENT_ENTRIES } from "../../src/knowledge/actions/assessment.ts";
import { TREATMENT_ENTRIES } from "../../src/knowledge/actions/treatment.ts";
import { TRAINING_ENTRIES } from "../../src/knowledge/actions/training.ts";
import { validateActionCatalog } from "../../src/knowledge/actions/validate.ts";
import { GOLDEN_OUTPUTS } from "../../src/knowledge/actions/golden.ts";
import { goldenOutputs } from "../../src/knowledge/actions/bridge.ts";
import { COMPENSATION_GENERIC, COMPENSATION_OPTIONS } from "../../src/knowledge/actions/compensations.ts";

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
const genericIssues = COMPENSATION_GENERIC
  .filter((id) => !COMPENSATION_OPTIONS[id])
  .map((id) => ({ code: "CAT-BAD-GENERIC-COMPENSATION-ID", entryId: "COMPENSATION_GENERIC", detail: id }));

/** 松解剂量防漂移（owner 裁定 f9721b6：松解类 30～60秒→60～90秒）：src 任何文案不得再出现「30～60秒」。 */
function releaseDoseDriftIssues(): Array<{ code: string; entryId: string; detail: string }> {
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (/\.(ts|tsx)$/.test(entry.name) && readFileSync(path, "utf8").includes("30～60秒")) hits.push(path);
    }
  };
  walk("src");
  return hits.map((file) => ({ code: "CAT-RELEASE-DOSE-DRIFT", entryId: file, detail: "松解类时长统一 60～90秒（owner 裁定 f9721b6）" }));
}

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
  ...genericIssues,
  ...releaseDoseDriftIssues(),
];

if (issues.length) {
  for (const issue of issues) console.error(`${issue.code} ${issue.entryId}: ${issue.detail}`);
  process.exitCode = 1;
} else {
  console.log(`action catalog: ok (assessment=${ASSESSMENT_ENTRIES.length}, treatment=${TREATMENT_ENTRIES.length}, training=${TRAINING_ENTRIES.length}, golden=${Object.keys(GOLDEN_OUTPUTS).length})`);
}
