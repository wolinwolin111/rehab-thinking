import { ACTION_TERMS } from "../../src/knowledge/actions/terms.ts";
import { ASSESSMENT_ENTRIES } from "../../src/knowledge/actions/assessment.ts";
import { TREATMENT_ENTRIES } from "../../src/knowledge/actions/treatment.ts";
import { TRAINING_ENTRIES } from "../../src/knowledge/actions/training.ts";
import { validateActionCatalog } from "../../src/knowledge/actions/validate.ts";
import { GOLDEN_OUTPUTS } from "../../src/knowledge/actions/golden.ts";
import { goldenOutputs } from "../../src/knowledge/actions/bridge.ts";

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
];

if (issues.length) {
  for (const issue of issues) console.error(`${issue.code} ${issue.entryId}: ${issue.detail}`);
  process.exitCode = 1;
} else {
  console.log(`action catalog: ok (assessment=${ASSESSMENT_ENTRIES.length}, treatment=${TREATMENT_ENTRIES.length}, training=${TRAINING_ENTRIES.length}, golden=${Object.keys(GOLDEN_OUTPUTS).length})`);
}
