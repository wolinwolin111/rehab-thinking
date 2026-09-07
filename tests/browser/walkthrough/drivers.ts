import { expect, type Page } from "@playwright/test";
import { snap, type WalkSnap } from "./recorder";

// 双视角走查：从"评估完成进入处理"之后的通用链路驱动（评估→处理→训练→总结）。
// 各案例先复用 pilot-flow 走到安全确认/评估入口，再驱动完整后半段。
// 本文件只用于走查（snap 记录），不做严格断言。

async function visibleMainTitle(page: Page): Promise<string> {
  return ((await page.locator("h1:visible").first().innerText().catch(() => "")) ?? "").replace(/\s+/g, " ");
}

async function clickMatching(page: Page, pattern: RegExp, description: string) {
  const buttons = page.locator("button:visible").filter({ hasText: pattern });
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    const selected = ((await button.getAttribute("class")) ?? "").includes("is-selected")
      || (await button.getAttribute("aria-pressed")) === "true";
    if (selected) continue;
    await expect(button, description).toBeEnabled().catch(() => {});
    await button.click().catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 160));
    return true;
  }
  return false;
}

/** 通用自助评估作答：功能卡（定制三联按值索引 complete）→ 各正常口径 → 推进到处理段。 */
export async function answerGuidedAssessment(page: Page, caseId: string): Promise<WalkSnap[]> {
  const snaps: WalkSnap[] = [];
  for (let index = 0; index < 160; index += 1) {
    const title = await visibleMainTitle(page);
    if (/先看清问题，再开始处理/.test(title)) { snaps.push(await snap(page, caseId, `评估小结（${title}）`)); return snaps; }
    if (/本阶段成果|评估检查完成/.test(title)) throw new Error(`评估提前结束：${title}`);
    // 专业工作台总览：点「打开检查」进入逐卡。
    const openCheck = page.getByRole("button", { name: "打开检查", exact: true }).first();
    if (await openCheck.count()) { snaps.push(await snap(page, caseId, `工作台总览（${title}）`)); await openCheck.click(); await page.waitForTimeout(400); continue; }
    // 评估入口（症状信息收集完毕→开始评估检查）。
    const beginEval = page.getByRole("button", { name: /开始评估检查|开始本次功能检查/ }).first();
    if (await beginEval.count()) { snaps.push(await snap(page, caseId, `评估入口（${title}）`)); await beginEval.click(); await page.waitForTimeout(400); continue; }
    // 补充检查义务面板（无作答，需外层处理）→ 安全返回。
    if (await page.locator(".rm-complete-panel.is-caution").filter({ hasText: "还不能结束本次评估" }).count()) {
      snaps.push(await snap(page, caseId, `补充检查义务（${title}）`));
      return snaps;
    }

    const completionBlock = page.locator(".rm-motion-answer-block")
      .filter({ has: page.getByRole("heading", { name: "这个动作能做完吗" }) });
    if (await completionBlock.count()) {
      const completeBtn = completionBlock.locator(".rm-result-grid.is-three button").nth(0);
      if (!((await completeBtn.getAttribute("class")) ?? "").includes("is-selected")) {
        snaps.push(await snap(page, caseId, `评估卡（${title}）`));
        await completeBtn.click();
        await new Promise((resolve) => setTimeout(resolve, 160));
        continue;
      }
    }
    if (await clickMatching(page, /^接近健侧|^可以做完|^可以完成|^角度基本正常|^与另一方向接近|^接近平时范围/, "正常活动范围或功能完成")) continue;
    if (await clickMatching(page, /^没有不适$/, "活动没有不适")) continue;
    if (await clickMatching(page, /^软性终末感$/, "正常终末感")) continue;
    if (await clickMatching(page, /^保持稳定|^动作基本稳定|^力量接近|^完成质量正常|^未见异常反应/, "正常控制或专项检查")) continue;
    if (await clickMatching(page, /^没有明显差别/, "没有明显肌肉差异")) continue;
    if (await clickMatching(page, /^不会$/, "动作没有诱发不适")) continue;

    const next = page.getByRole("button", { name: /下一个检查|检查相关肌肉|查看评估结果/ }).filter({ visible: true }).first();
    if (await next.count() && !await next.isDisabled().catch(() => true)) {
      await next.click();
      await new Promise((resolve) => setTimeout(resolve, 200));
      continue;
    }
    const finish = page.getByRole("button", { name: /评估完成，继续|开始处理并复测/ }).first();
    if (await finish.count() && !await finish.isDisabled().catch(() => true)) { await finish.click(); await new Promise((resolve) => setTimeout(resolve, 400)); continue; }
    const visibleButtons = (await page.locator("button:visible").allTextContents()).map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean).slice(-20);
    throw new Error(`评估作答无法继续：${title}；${visibleButtons.join(" / ")}`);
  }
  throw new Error("评估作答超 160 步");
}

/** 处理段：逐 target 完成（处理完成→复测→继续/进入训练）。遇「继续检查这些方向」进入评估补查。 */
export async function driveTreatmentRound(page: Page, caseId: string, opts: { chiefScore?: string } = {}): Promise<WalkSnap[]> {
  const snaps: WalkSnap[] = [];
  let guard = 0;
  while (guard < 16) {
    guard += 1;
    const main = page.locator("main:visible");
    const title = await visibleMainTitle(page);

    // 还不能结束本次评估：pending 面板点「返回补充检查」（openAssessmentItem）进入评估卡作答。
    const pendingPanel = main.locator(".rm-complete-panel.is-caution").filter({ hasText: "还不能结束本次评估" });
    if (await pendingPanel.count()) {
      snaps.push(await snap(page, caseId, `补充检查义务（${title}）`));
      const back = pendingPanel.getByRole("button", { name: "返回补充检查", exact: true }).first();
      if (await back.count()) { await back.click(); await page.waitForTimeout(500); }
      snaps.push(...await answerGuidedAssessment(page, caseId));
      continue;
    }

    // 补充检查：进入评估补查队列（再答一轮）
    const continueDirections = main.getByRole("button", { name: "继续检查这些方向", exact: true }).first();
    if (await continueDirections.count()) {
      snaps.push(await snap(page, caseId, `补充检查入口（${title}）`));
      await continueDirections.click();
      await page.waitForTimeout(500);
      snaps.push(...await answerGuidedAssessment(page, caseId));
      continue;
    }

    const start = main.getByRole("button", { name: /开始处理并复测|评估完成，继续/ }).first();
    if (await start.count()) { await start.click(); await page.waitForTimeout(300); snaps.push(await snap(page, caseId, `处理入口（${title}）`)); continue; }

    const finish = main.getByRole("button", { name: /处理完成，复测/ }).first();
    if (await finish.count()) {
      snaps.push(await snap(page, caseId, `处理卡（${title}）`));
      await finish.click();
      await page.waitForTimeout(400);
      snaps.push(await snap(page, caseId, `统一复测（${title}）`));
      const better = main.getByRole("button", { name: /接近目标|均接近目标/ }).first();
      if (await better.count()) { await better.click().catch(() => {}); }
      const noPain = main.getByRole("button", { name: "没有不适", exact: true }).first();
      if (await noPain.count()) { await noPain.click().catch(() => {}); }
      const chiefSlider = main.locator('input[type="range"]:visible').first();
      if (await chiefSlider.count()) { await chiefSlider.fill(opts.chiefScore ?? "4").catch(() => {}); }
      const continueBtn = main.getByRole("button", { name: "继续", exact: true }).first();
      if (await continueBtn.count()) { await expect(continueBtn).toBeEnabled({ timeout: 5_000 }); await continueBtn.click(); }
      await page.waitForTimeout(400);
      continue;
    }

    const canDo = main.getByRole("button", { name: "能完成", exact: true }).first();
    if (await canDo.count()) { snaps.push(await snap(page, caseId, `功能复测（${title}）`)); await canDo.click(); await page.waitForTimeout(300); continue; }

    const toTraining = main.getByRole("button", { name: /进入训练|查看训练与居家方案|查看低强度活动|查看轻柔的基础活动/ }).first();
    if (await toTraining.count()) { snaps.push(await snap(page, caseId, `进入训练（${title}）`)); await toTraining.click(); await page.waitForTimeout(500); return snaps; }
    break;
  }
  snaps.push(await snap(page, caseId, `处理段止步（${await visibleMainTitle(page)}）`));
  return snaps;
}

/** 训练段：进入训练 → 逐动作第一组反馈（默认 hold）→ 最终复测 → 完成并查看总结。 */
export async function driveTraining(page: Page, caseId: string): Promise<WalkSnap[]> {
  const snaps: WalkSnap[] = [];
  // 若停在处理完成面板（本阶段成果/针对性处理），先点「进入训练」。
  const enter = page.locator("main:visible").getByRole("button", { name: "进入训练", exact: true }).first();
  if (await enter.count()) { snaps.push(await snap(page, caseId, "进入训练")); await enter.click(); await page.waitForTimeout(600); }
  // 训练前过渡页「处理复测完成」→ 开始训练。
  const begin = page.locator("main:visible").getByRole("button", { name: "开始训练", exact: true }).first();
  if (await begin.count()) { snaps.push(await snap(page, caseId, "开始训练")); await begin.click(); await page.waitForTimeout(600); }
  let guard = 0;
  let answered = 0;
  while (guard < 40) {
    guard += 1;
    const main = page.locator("main:visible");
    const title = await visibleMainTitle(page);

    // 记录训练卡结构（首动作完整记录）
    if (answered === 0) snaps.push(await snap(page, caseId, `训练卡结构（${title}）`));

    // 当前动作反馈：点第一个未选中的训练反馈按钮。
    const feedbackBtn = main.locator('[data-rehabmind-test^="training-feedback-"]:visible').first();
    if (await feedbackBtn.count()) {
      const selected = ((await feedbackBtn.getAttribute("class")) ?? "").includes("is-selected");
      if (!selected) {
        await feedbackBtn.click().catch(() => {});
        await page.waitForTimeout(220);
        answered += 1;
        // 记录 2 个动作反馈后收尾（训练页结构已记录，完整走完由定向场景补）。
        if (answered >= 2) { snaps.push(await snap(page, caseId, `训练反馈2个动作后收尾（${title}）`)); break; }
        continue;
      }
    }

    // 切换下一个动作（当前动作已反馈）。
    const next = main.getByRole("button", { name: "下一个", exact: true }).first();
    if (await next.count() && !await next.isDisabled().catch(() => true)) {
      await next.click();
      await page.waitForTimeout(250);
      continue;
    }

    // 全部反馈完成 → 训练完成按钮。
    const done = main.getByRole("button", { name: /训练完成.*查看总结|完成当前安排，查看总结|训练完成，整体复测/ }).first();
    if (await done.count() && await done.isEnabled()) { snaps.push(await snap(page, caseId, `训练完成按钮（${title}）`)); await done.click(); await page.waitForTimeout(500); break; }
    break;
  }
  snaps.push(await snap(page, caseId, `训练段收尾（${await visibleMainTitle(page)}）`));
  return snaps;
}

/** 总结段：记录关键模块 + 保存本次记录。 */
export async function driveSummary(page: Page, caseId: string): Promise<WalkSnap[]> {
  const snaps: WalkSnap[] = [];
  const main = page.locator("main:visible");
  await page.waitForTimeout(600);
  snaps.push(await snap(page, caseId, "康复总结"));
  const save = main.getByRole("button", { name: "保存本次记录", exact: true }).first();
  if (await save.count()) { await save.click(); await page.waitForTimeout(500); snaps.push(await snap(page, caseId, "保存后")); }
  return snaps;
}
