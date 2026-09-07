import { test } from "@playwright/test";

// 走查审查资产（非回归断言）：默认跳过，仅 WALKTHROUGH_REVIEW=1 时执行。
const WALK = process.env.WALKTHROUGH_REVIEW === "1";
test.skip(!WALK, "走查默认跳过（WALKTHROUGH_REVIEW=1 启用）");
import { launchWorkbenchScenario, collectRuntimeErrors, assertNoRuntimeErrors } from "../support/page-helpers";
import { beginWalk, walkLog, snap } from "./recorder";
import { writeFileSync } from "node:fs";

async function saveLog(caseId: string) {
  const snaps = walkLog(caseId);
  writeFileSync(`artifacts/quality/walkthrough/${caseId}.json`, JSON.stringify(snaps, null, 1), "utf8");
  console.log(`WALK-${caseId}: ${snaps.length} snaps`);
}

test("WALK-R2 康复师·急性踝崴脚+肿胀：评估队列（四方向/承重/专项） @walkthrough", async ({ page }) => {
  const caseId = "R2-ankle-acute";
  beginWalk(caseId);
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await launchWorkbenchScenario(page, "ankle-assessment-cards");
  await page.waitForTimeout(800);
  await snap(page, caseId, "踝评估队列（四方向/承重/下蹲）");
  const { answerGuidedAssessment } = await import("./drivers");
  await answerGuidedAssessment(page, caseId);
  await snap(page, caseId, "踝评估完成");
  assertNoRuntimeErrors(runtimeErrors);
  await saveLog(caseId);
});

test("WALK-R3 康复师·膝扭转后不稳：专项+转介判定 @walkthrough", async ({ page }) => {
  const caseId = "R3-knee-unstable";
  beginWalk(caseId);
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const { prepareProfessionalOther, completeProfessionalAssessment } = await import("../drivers/pilot-flow");
  await prepareProfessionalOther(page, {
    description: "右膝昨天打球扭转时听到响，现在走路感觉不稳，有点肿",
    capabilities: ["专项检查", "被动活动度"],
    onset: "今天或昨天",
    mechanism: "扭转或崴伤",
  });
  await page.waitForTimeout(600);
  await snap(page, caseId, "膝扭转专业评估开始");
  const { answerGuidedAssessment } = await import("./drivers");
  await answerGuidedAssessment(page, caseId);
  await snap(page, caseId, "膝扭转评估完成（专项/转介）");
  assertNoRuntimeErrors(runtimeErrors);
  await saveLog(caseId);
});

test("WALK-R4 康复师·膝伸不直（被动受限→关节处理） @walkthrough", async ({ page }) => {
  const caseId = "R4-knee-extend";
  beginWalk(caseId);
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  const { prepareProfessionalOther, completeProfessionalAssessmentWithPassive } = await import("../drivers/pilot-flow");
  await prepareProfessionalOther(page, {
    description: "右膝伸不直，膝盖后面紧，有三周了",
    capabilities: ["被动活动度", "抗阻力量", "关节处理"],
  });
  await page.waitForTimeout(600);
  await snap(page, caseId, "膝伸不直专业评估开始");
  await completeProfessionalAssessmentWithPassive(page, { flexion: "normal" });
  await snap(page, caseId, "膝伸不直评估完成（被动/关节路径）");
  assertNoRuntimeErrors(runtimeErrors);
  await saveLog(caseId);
});

test("WALK-R5 康复师·双侧膝下蹲：双侧规则 @walkthrough", async ({ page }) => {
  const caseId = "R5-bilateral";
  beginWalk(caseId);
  test.setTimeout(240_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await launchWorkbenchScenario(page, "bilateral-per-side-retest");
  await page.waitForTimeout(800);
  await snap(page, caseId, "双侧逐侧复测台账");
  assertNoRuntimeErrors(runtimeErrors);
  await saveLog(caseId);
});
