import { readFile } from "node:fs/promises";

const uiFiles = [
  "../../src/features/rehabmind/components/workbench/rehabmind-workbench.tsx",
  "../../src/features/rehabmind/components/workbench/workbench-support.tsx",
  "../../src/features/rehabmind/components/stages/symptom-stage.tsx",
  "../../src/features/rehabmind/components/stages/confirmation-stage.tsx",
  "../../src/features/rehabmind/components/stages/assessment-stage.tsx",
  "../../src/features/rehabmind/components/stages/treatment-retest-stage.tsx",
  "../../src/features/rehabmind/components/stages/training-stage.tsx",
  "../../src/features/rehabmind/components/stages/summary-stage.tsx",
  "../../src/features/rehabmind/components/navigation/mobile-app-navigation.tsx",
  "../../src/features/rehabmind/components/records/rehab-records-page.tsx",
];

export async function readRehabMindUiSource() {
  const sources = await Promise.all(uiFiles.map((file) => readFile(new URL(file, import.meta.url), "utf8")));
  return sources.join("\n");
}
