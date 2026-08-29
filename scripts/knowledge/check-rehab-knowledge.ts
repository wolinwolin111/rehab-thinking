import { KNEE_KNOWLEDGE_REVIEW_PACKAGE } from "../../src/knowledge/rehab/knee-review-package.ts";
import { KNEE_OWNER_CONFIRMED_KNOWLEDGE_RELEASE } from "../../src/knowledge/rehab/knee-release.ts";
import { validateRehabKnowledge } from "../../src/knowledge/rehab/knowledge-consistency.ts";

const issues = validateRehabKnowledge(KNEE_KNOWLEDGE_REVIEW_PACKAGE);
if (issues.length) {
  for (const issue of issues) {
    console.error(`${issue.code}: ${issue.ownerId}${issue.reference ? ` -> ${issue.reference}` : ""}`);
  }
  process.exitCode = 1;
} else {
  const cases = KNEE_KNOWLEDGE_REVIEW_PACKAGE.sourceCases;
  const episodes = cases.flatMap((sourceCase) => sourceCase.episodes);
  const findingCount = episodes.reduce((total, episode) => total + episode.findings.length, 0);
  const treatmentCount = episodes.reduce((total, episode) => total + episode.treatmentExperiments.length, 0);
  const retestCount = episodes.reduce((total, episode) => total + episode.retests.length, 0);
  console.log(`rehab knowledge: ok (cases=${cases.length}, episodes=${episodes.length}, findings=${findingCount}, treatments=${treatmentCount}, retests=${retestCount})`);
  console.log(`owner-confirmed release: cases=${KNEE_OWNER_CONFIRMED_KNOWLEDGE_RELEASE.sourceCases.length}, branches=${KNEE_OWNER_CONFIRMED_KNOWLEDGE_RELEASE.complaintBranches.length}`);
}
