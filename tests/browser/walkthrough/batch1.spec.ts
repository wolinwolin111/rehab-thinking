import { test } from "@playwright/test";

// 走查审查资产（非回归断言）：默认跳过，仅 WALKTHROUGH_REVIEW=1 时执行。
const WALK = process.env.WALKTHROUGH_REVIEW === "1";
test.skip(!WALK, "走查默认跳过（WALKTHROUGH_REVIEW=1 启用）");
import { collectRuntimeErrors } from "../support/page-helpers";
import { prepareGuidedChiefProgression, prepareProfessionalSingleAction, completeSingleActionAssessment, completeSingleActionTreatment } from "../drivers/pilot-flow";
import { answerGuidedAssessment, driveTreatmentRound, driveTraining, driveSummary } from "./drivers";
import { beginWalk, walkLog, snap } from "./recorder";
import { writeFileSync } from "node:fs";

// 双视角走查 · 第一批：P1（自助膝前侧痛+下蹲受限）完整六阶段。
// prepare 已覆盖：症状信息→关键确认→评估入口（自助下蹲队列）。

test("WALK-P1 自助膝前侧痛+下蹲受限：完整六阶段 @walkthrough", async ({ page }) => {
  const caseId = "P1-knee-self";
  beginWalk(caseId);
  const runtimeErrors = collectRuntimeErrors(page);
  test.setTimeout(360_000);

  await prepareGuidedChiefProgression(page);
  await page.waitForTimeout(800);
  await snap(page, caseId, "评估开始");

  await answerGuidedAssessment(page, caseId);
  await snap(page, caseId, "评估完成→处理");

  // P1 自助全正常口径会落「还有问题需要补充检查」（无处理候选→引导补查）；
  // 记录该分支后优雅收尾（处理→训练→总结完整链路由 R1 覆盖）。
  const main = page.locator("main:visible");
  const continueDirs = main.getByRole("button", { name: "继续检查这些方向", exact: true });
  const pendingPanel = main.locator(".rm-complete-panel.is-caution").filter({ hasText: "还不能结束本次评估" });
  if (await continueDirs.count() || await pendingPanel.count()) {
    await snap(page, caseId, "评估后无处理候选（继续检查这些方向 / 补充检查）");
  } else {
    await driveTreatmentRound(page, caseId, { chiefScore: "4" });
    await driveTraining(page, caseId);
  }

  const snaps = walkLog(caseId);
  writeFileSync(`artifacts/quality/walkthrough/${caseId}.json`, JSON.stringify(snaps, null, 1), "utf8");
  console.log(`WALK-${caseId}: ${snaps.length} snaps`);
});

test("WALK-R1 专业膝前侧痛+下蹲受限：完整六阶段 @walkthrough", async ({ page }) => {
  const caseId = "R1-knee-professional";
  beginWalk(caseId);
  const runtimeErrors = collectRuntimeErrors(page);
  test.setTimeout(360_000);

  // 专业单动作（下蹲）：症状→评估→处理复测→训练→总结
  await prepareProfessionalSingleAction(page);
  await page.waitForTimeout(600);
  await snap(page, caseId, "专业评估开始");
  await completeSingleActionAssessment(page);
  await snap(page, caseId, "评估完成→处理");
  await completeSingleActionTreatment(page, { chiefScore: "4" });
  await snap(page, caseId, "处理完成→训练");
  await driveTraining(page, caseId);
  // 总结卡渲染用定向场景（step5 outcome-panel-chief-action-line）补记录，见 batch2。
  if (await page.locator("main:visible").getByRole("button", { name: "保存本次记录", exact: true }).count()) {
    await driveSummary(page, caseId);
  }

  const snaps = walkLog(caseId);
  writeFileSync(`artifacts/quality/walkthrough/${caseId}.json`, JSON.stringify(snaps, null, 1), "utf8");
  console.log(`WALK-${caseId}: ${snaps.length} snaps`);
});
