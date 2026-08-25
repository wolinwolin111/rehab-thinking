/**
 * B-1 / SAFE-03：高分疼痛和多个动作无法完成时停止自助处理。
 *
 * 这个场景只通过用户可见的页面选项完成，不写入 React 或 localStorage 内部状态。
 */

import assert from "node:assert/strict";
import { dismissOnboarding } from "./real-browser-test-helpers.mjs";
import {
  assertNoBrowserRuntimeErrors,
  clickFirstFixedButton,
  clickFixedButton,
  fixedScenarioUrl,
  launchFixedScenario,
} from "./real-browser-fixed-scenario-helpers.mjs";

const { browser, page, runtimeErrors } = await launchFixedScenario();

async function clickVisibleButton(name, label = name) {
  const buttons = page.getByRole("button", { name, exact: true });
  for (const button of await buttons.all()) {
    if (await button.isVisible().catch(() => false) && !await button.isDisabled().catch(() => true)) {
      await button.click();
      await page.waitForTimeout(120);
      console.log(`  ${label}`);
      return true;
    }
  }
  return false;
}

async function selectAssessmentSymptom() {
  const capture = page.locator(".rm-assessment-symptom-capture").first();
  assert.equal(await capture.count(), 1, "高痛动作应展开不适记录区");
  const locationButton = capture.locator('[role="button"][aria-label]').first();
  assert.ok(await locationButton.count() >= 1, "高痛动作应要求选择不适位置");
  await locationButton.click();
  await page.waitForTimeout(120);

  const feeling = capture.locator("select").first();
  assert.equal(await feeling.count(), 1, "高痛动作应要求选择感觉");
  await feeling.selectOption({ label: "疼痛，性质说不清" });

  const score = capture.locator('input[type="range"]').first();
  assert.equal(await score.count(), 1, "高痛动作应要求记录分数");
  await score.fill("9");
  const familiar = page.getByRole("button", { name: "是，就是这种感觉", exact: true }).last();
  if (await familiar.count() && await familiar.isVisible().catch(() => false)) await familiar.click();
  await page.waitForTimeout(120);
}

async function completeIntake() {
  await page.goto(fixedScenarioUrl(), { waitUntil: "networkidle", timeout: 30000 });
  await dismissOnboarding(page);
  await page.locator("textarea").fill("右膝下蹲和下楼都疼，疼痛很重，最近一周越来越不敢做");
  await clickFixedButton(page, "帮我整理");
  await clickFirstFixedButton(page, /自助康复/, "自助康复");
  await clickFirstFixedButton(page, /下一步/, "进入症状信息");
  await page.locator('[aria-label="右侧膝盖正面"]').click();
  await page.waitForTimeout(120);
  await page.locator('[aria-label="右侧 · 膝内侧关节线"]').click();
  await clickFirstFixedButton(page, /下一步/, "确认症状位置");
  await page.locator("select").first().selectOption("2～7天");
  await clickFirstFixedButton(page, /下一步/, "确认病程");
  const noExtra = page.getByRole("button", { name: "没有以上情况", exact: true });
  if (await noExtra.count() && await noExtra.first().isVisible()) await noExtra.first().click();
  await page.locator("select").first().selectOption("没有明确受伤");
  await clickFirstFixedButton(page, /下一步/, "确认发生方式");
  await clickFixedButton(page, "活动受限", "确认目前情况");
  await clickFirstFixedButton(page, /下一步/, "进入不适分数");
  const baseline = page.locator('input[type="range"]').first();
  if (await baseline.count()) await baseline.fill("9");
  await clickFirstFixedButton(page, /下一步/, "确认主诉分数");
  await clickFirstFixedButton(page, /恢复日常活动/, "选择恢复目标");
  await clickFixedButton(page, "进入关键确认");
  for (const button of await page.getByRole("button", { name: "没有", exact: true }).all()) {
    if (await button.isVisible().catch(() => false) && !((await button.getAttribute("class")) || "").includes("is-selected")) await button.click();
  }
  await clickFixedButton(page, "继续填写影像结论");
  await clickFixedButton(page, "没有做影像");
  await clickFixedButton(page, "开始评估检查");
  await clickFixedButton(page, "开始评估检查");
}

await completeIntake();

let functionUnable = false;
let painfulMotionUnable = 0;
const visitedTitles = [];

for (let index = 0; index < 80; index += 1) {
  const title = ((await page.locator("h1").first().textContent().catch(() => "")) ?? "").trim();
  visitedTitles.push(title);
  if (/评估结果|先看清问题/.test(title)) break;

  const card = page.locator(".rm-check-card").first();
  assert.equal(await card.count(), 1, `评估页面缺少检查卡：${title}`);
  const cardText = ((await card.textContent()) ?? "").replace(/\s+/g, " ");

  if (/功能动作检查/.test(cardText)) {
    if (await clickVisibleButton("做不完或不敢继续", "功能动作无法完成")) {
      await clickVisibleButton("疼或不舒服", "功能动作因疼痛停止");
      await selectAssessmentSymptom();
      functionUnable = true;
    }
  } else if (/关节活动度检查/.test(cardText)) {
    const unable = card.locator("button").filter({ hasText: "无法完成" }).first();
    if (painfulMotionUnable < 2 && await unable.count() && await unable.isVisible().catch(() => false)) {
      await unable.click();
      await page.waitForTimeout(120);
      console.log("  活动度因疼痛无法完成");
      await clickVisibleButton("疼或不舒服", "活动度因疼痛停止");
      await selectAssessmentSymptom();
      painfulMotionUnable += 1;
    } else {
      const normal = card.getByRole("button", { name: /接近健侧|患侧偏小|与对侧接近/ }).first();
      if (await normal.count() && await normal.isVisible().catch(() => false)) {
        await normal.click();
        await page.waitForTimeout(100);
        const noDiscomfort = card.getByRole("button", { name: "没有不适", exact: true }).first();
        if (await noDiscomfort.count() && await noDiscomfort.isVisible().catch(() => false)) await noDiscomfort.click();
      }
    }
  } else {
    if (/肌肉紧张度对比/.test(title)) {
      const noDifference = card.locator("button").filter({ hasText: "没有明显差别" }).first();
      if (await noDifference.count() && await noDifference.isVisible().catch(() => false)) {
        await noDifference.click();
        await page.waitForTimeout(120);
        console.log("  肌肉区域无明显差别");
      }
    }
    else {
      const skip = card.getByRole("button", { name: /暂不检查|今天先跳过|不会做或暂不做/ }).first();
      if (await skip.count() && await skip.isVisible().catch(() => false)) await skip.click();
      else {
        const normal = card.getByRole("button", { name: /力量接近|保持稳定|未见异常反应/ }).first();
        if (await normal.count() && await normal.isVisible().catch(() => false)) await normal.click();
      }
    }
  }

  const next = page.getByRole("button", { name: /下一个检查|检查相关肌肉|查看评估结果/ }).first();
  if (await next.count() && !await next.isDisabled().catch(() => true)) {
    await next.click();
    await page.waitForTimeout(180);
    continue;
  }

  const body = ((await page.locator("main").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
  throw new Error(`高痛场景无法继续：${title}；卡片=${cardText.slice(0, 180)}；页面=${body.slice(-500)}`);
}

const resultTitle = (await page.locator("h1").first().textContent()) ?? "";
const resultBody = ((await page.locator("main").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
assert.equal(functionUnable, true, `应记录功能动作无法完成；经过=${visitedTitles.join(" / ")}`);
assert.equal(painfulMotionUnable, 2, `应记录两项高分疼痛活动度无法完成；实际=${painfulMotionUnable}`);
assert.match(resultTitle, /评估结果|先看清问题/);
assert.match(resultBody, /先不要继续自助处理/);
assert.match(resultBody, /多项检查因明显疼痛无法完成/);
assert.match(resultBody, /保存并结束本次/);
assert.doesNotMatch(resultBody, /评估完成，继续/);
assertNoBrowserRuntimeErrors(runtimeErrors);
await page.screenshot({ path: ".tmp-b-high-pain-stop.png", fullPage: true });
console.log(`SAFE-03：${painfulMotionUnable}项高分疼痛活动度无法完成 + 功能动作无法完成`);
console.log("高痛停止：页面锁定自助处理并提供保存出口");
console.log("浏览器运行时错误数: 0");
await browser.close();
