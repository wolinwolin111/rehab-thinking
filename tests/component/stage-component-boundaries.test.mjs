import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stageFiles = [
  "symptom-stage.tsx",
  "confirmation-stage.tsx",
  "assessment-stage.tsx",
  "treatment-retest-stage.tsx",
  "training-stage.tsx",
  "summary-stage.tsx",
];

test("B1 stage boundaries remain presentation-only", async () => {
  for (const file of stageFiles) {
    const source = await readFile(new URL(`../../src/features/rehabmind/components/stages/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /(?:localStorage|fetch\(|better-sqlite3|drizzle-orm|pilot-case-service|dispatchWorkflowEvent)/, file);
  }
});

test("B1 the assembly maps all six stages through named components", async () => {
  const source = await readFile(new URL("../../src/features/rehabmind/components/workbench/rehabmind-workbench.tsx", import.meta.url), "utf8");
  for (const component of ["SymptomStage", "ConfirmationStage", "AssessmentStage", "TreatmentRetestStage", "TrainingStage", "SummaryStage"]) {
    assert.match(source, new RegExp(`<${component}(?:\\s|>)`), component);
  }
});

test("B1 every stage is a real typed component rather than a pass-through wrapper", async () => {
  for (const file of stageFiles) {
    const source = await readFile(new URL(`../../src/features/rehabmind/components/stages/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /ReactNode|\{\s*children\s*\}|return\s+children/, file);
    assert.match(source, /(?:type|interface)\s+\w*Stage(?:Props|View)/, file);
    assert.match(source, /on[A-Z]\w+:/, `${file}: explicit event contract`);
  }
});
