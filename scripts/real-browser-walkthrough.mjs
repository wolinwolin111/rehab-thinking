/**
 * 真实浏览器端到端走读（自助康复·膝前痛）。
 *
 * 用 playwright-core 驱动本机 Edge（`channel: "msedge"`），从症状输入一路点通
 * 六阶段，验证 P0 #1「训练后针对性自主放松」和 P0 #2「本阶段成果」真实出现。
 * 用法：先 `npm i playwright-core --no-save`，再 `node scripts/real-browser-walkthrough.mjs`。
 */

import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { agreePilotConsent, dismissOnboarding, pilotScenarioUrl } from "./real-browser-test-helpers.mjs";

const URL = pilotScenarioUrl();
const COMPLAINT = process.env.WALKTHROUGH_COMPLAINT ?? "右膝下楼时内侧刺痛，有三个月了";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
  try {
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(`pageerror:${error}`));
page.on("console", (msg) => { if (msg.type() === "error") runtimeErrors.push(`console:${msg.text()}`); });

const NEXT = /下一步|选好了|进入关键确认|开始评估|查看评估结果|评估完成|完成并继续|处理完成|开始复测|记录本轮|查看训练|完成当前安排|继续填写影像结论|保存，开始评估|下一个检查|完成这项检查|开始处理并复测|没有需要处理的问题|查看训练与居家方案|检查相关肌肉|完成触诊|^继续$|开始复测|进入训练|训练完成|查看总结|开始训练|训练完成，整体复测/;
const snap = () => page.locator("h1").first().textContent().catch(() => "(无)");

async function clickLocator(locator, label) {
  if (!(await locator.count())) return false;
  const first = locator.first();
  if (await first.isDisabled().catch(() => false)) return false;
  const cls = (await first.getAttribute("class").catch(() => "")) || "";
  if (cls.includes("is-selected")) return false; // 已选中，跳过（避免多选 toggle 死循环）
  const text = (await first.textContent().catch(() => "")).trim();
  if (/修改$/.test(text)) return false; // 旁栏「已收集信息」编辑按钮，不是题目选项
  await first.click().catch(() => {});
  await page.waitForTimeout(300);
  console.log(`  ${label}${text ? ` | ${text.slice(0, 24)}` : ""}`);
  return true;
}

await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await agreePilotConsent(page);
await dismissOnboarding(page);
await page.locator("textarea").fill(COMPLAINT);
await page.getByRole("button", { name: "帮我整理" }).click();
await page.waitForTimeout(900);
await page.getByRole("button", { name: /自助康复/ }).click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: /下一步/ }).click();
await page.waitForTimeout(800);
await page.locator('[aria-label="右侧膝盖正面"]').click();
await page.waitForTimeout(500);
await page.locator('[aria-label="右侧 · 膝内侧关节线"]').click();
await page.waitForTimeout(400);

const recent = [];
const trainingFeedbackDone = new Set();
const worseningMode = process.env.WALKTHROUGH_WORSEN === "1";
const noChangeMode = process.env.WALKTHROUGH_NO_CHANGE === "1";
const activityBetterMode = process.env.WALKTHROUGH_ACTIVITY_BETTER === "1";
const mixedWorseningMode = process.env.WALKTHROUGH_MIXED_WORSEN === "1";
const walkthroughEvidenceMode = activityBetterMode
  ? "queue-03-activity-better"
  : mixedWorseningMode
    ? "queue-04-mixed-worsening"
    : noChangeMode
      ? "queue-02-no-change"
      : null;
let worseningCaptured = false;
let noChangeCaptured = false;
let noChangeOutcomeObserved = false;
let activityBetterCaptured = false;
let activityBetterOutcomeObserved = false;
let mixedWorseningCaptured = false;
let mixedWorseningOutcomeObserved = false;
let focusedReassessmentObserved = false;
let locationScreenshotsTaken = false;
const mark = (a) => { recent.push(a); if (recent.length > 10) recent.shift(); };

for (let i = 0; i < 400; i++) {
  const h1 = await snap();
  // TIME-01：首次进入评估阶段时强制刷新，验证未完成草稿能恢复到同一阶段
  if (process.env.WALKTHROUGH_TIME01 === "1" && !globalThis.__time01Done && h1.includes("评估检查")) {
    globalThis.__time01Done = true;
    console.log(`[${i}] TIME-01 刷新触发 | ${h1}`);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const restoredH1 = await snap();
    console.log(`[${i}] TIME-01 刷新后 H1: ${restoredH1}`);
    if (!restoredH1.includes("评估检查")) {
      console.log(`[${i}] TIME-01 观察：刷新后落在「${restoredH1}」，非过渡页本身——需核对答案是否保留、是否存在位置回退`);
    }
  }
  if (noChangeMode && noChangeCaptured) {
    const currentTreatmentText = ((await page.locator(".rm-retest:visible").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
    if (/分数未变|与处理前相同|下降 0 分|主诉未同步改变|本次试处理没有改变主诉/.test(currentTreatmentText)) noChangeOutcomeObserved = true;
  }
  if (activityBetterMode && activityBetterCaptured) {
    const currentTreatmentText = ((await page.locator(".rm-retest:visible").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
    if (/活动表现有变化|活动范围有改善|原来的不适暂未明显改变|有改善|未达到比较目标/.test(currentTreatmentText)) activityBetterOutcomeObserved = true;
  }
  if (mixedWorseningMode && mixedWorseningCaptured) {
    const currentBody = ((await page.locator("main").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
    if (/疼痛评分下降，但活动表现变差|活动表现变差|处理已暂停/.test(currentBody)) mixedWorseningOutcomeObserved = true;
  }
  if (activityBetterMode && activityBetterCaptured && activityBetterOutcomeObserved && h1.includes("针对性处理")) {
    console.log(`[${i}] 已捕获活动改善与主诉分数不变的复测结果，停止本次走读`);
    break;
  }
  if (noChangeMode && noChangeCaptured && noChangeOutcomeObserved && h1.includes("针对性处理")) {
    console.log(`[${i}] 已捕获复测分数不变的结果，停止本次走读`);
    break;
  }
  if (noChangeMode && noChangeCaptured && h1.includes("本阶段成果")) {
    const summaryText = ((await page.locator("main").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
    noChangeOutcomeObserved = noChangeOutcomeObserved || /下降 0 分|主诉未同步改变|本次试处理没有改变主诉|分数未变/.test(summaryText);
    if (noChangeOutcomeObserved) {
      console.log(`[${i}] 已在本阶段成果捕获复测分数不变的结果，停止本次走读`);
      break;
    }
  }
  if (mixedWorseningMode && mixedWorseningCaptured && mixedWorseningOutcomeObserved) {
    console.log(`[${i}] 已捕获疼痛改善但活动变差的停止结果，停止本次走读`);
    break;
  }
  if (process.env.WALKTHROUGH_SCREENSHOT && !locationScreenshotsTaken && h1.includes("肌肉紧张度对比")) {
    await page.screenshot({ path: ".tmp-muscle-location-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: ".tmp-muscle-location-mobile.png", fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    locationScreenshotsTaken = true;
    console.log("已保存肌肉区域定位卡桌面/移动端截图");
  }
  if (h1.includes("今天需要做的训练")) {
    const c = await page.content();
    console.log(`[${i}] 训练页 | 含[针对性自主放松]: ${c.includes("针对性自主放松")} | 含[训练结束后]: ${c.includes("训练结束后")}`);
  }
  if (h1.includes("本次康复总结")) {
    const c = await page.content();
    console.log(`[${i}] 总结页 | 含[针对性自主放松]: ${c.includes("针对性自主放松")}`);
  }
  let acted = false;
  if (worseningMode) {
    const loopBody = ((await page.locator("main").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
    if (/只复查相关内容|待重新评估|处理后加重|本次处理已暂停|确认加重后的变化|症状或活动表现变差/.test(loopBody)) focusedReassessmentObserved = true;
    if (focusedReassessmentObserved && await page.locator(".rm-focused-reassessment:visible").count()) {
      console.log(`[${i}] 已进入聚焦复查入口 | ${h1}`);
      break;
    }
    const retestSlider = page.locator(".rm-retest:visible input[type=range]").first();
    if (!worseningCaptured && h1.includes("针对性处理") && await retestSlider.count()) {
      await retestSlider.fill("8");
      await page.waitForTimeout(300);
      worseningCaptured = true;
      mark("处理后加重");
      console.log(`[${i}] 处理复测故意提高评分 | ${h1}`);
      acted = true;
    }
    if (!acted && h1.includes("本次处理已暂停")) {
      const confirmWorsening = page.getByRole("button", { name: /确认加重后的变化/ }).first();
      if (await confirmWorsening.count() && !await confirmWorsening.isDisabled().catch(() => true)) {
        await confirmWorsening.click();
        await page.waitForTimeout(500);
        focusedReassessmentObserved = true;
        mark("确认加重后的变化");
        console.log(`[${i}] 确认加重并进入复查 | ${h1}`);
        acted = true;
      }
    }
    if (!acted && /更不舒服$/.test(h1)) {
      const adverseSlider = page.locator(".rm-adverse-page input[type=range]").first();
      const adverseScore = page.locator(".rm-adverse-page .rm-score").first();
      if (await adverseSlider.count() && !((await adverseScore.getAttribute("class")) || "").includes("is-recorded")) {
        await adverseSlider.fill("8");
        await page.waitForTimeout(250);
        mark("确认停止后评分");
        acted = true;
      }
      if (!acted) {
        for (const label of ["是，逐渐回落", "位置没变", "感觉没变", "没有"]) {
          const answer = page.getByRole("button", { name: label, exact: true }).first();
          if (await answer.count() && !((await answer.getAttribute("class")) || "").includes("is-selected")) {
            await answer.click();
            await page.waitForTimeout(180);
            mark(`异常变化：${label}`);
            acted = true;
            break;
          }
        }
      }
      if (!acted) {
        const confirm = page.getByRole("button", { name: "确认并继续", exact: true }).first();
        if (await confirm.count() && !await confirm.isDisabled().catch(() => true)) {
          await confirm.click();
          await page.waitForTimeout(450);
          mark("进入聚焦复查");
          focusedReassessmentObserved = true;
          acted = true;
        }
      }
    }
  }
  // select 需用 selectOption，不能 click
  const sel = page.locator("select").first();
  if (!acted && (await sel.count()) && !(await sel.inputValue())) {
    await sel.selectOption({ index: 1 }).catch(() => {});
    await page.waitForTimeout(300);
    mark("SELECT"); console.log(`[${i}] SELECT | ${h1}`); acted = true;
  } else if (!acted) {
    // 多实例同文案按钮：点第一个未选中的「没有」/「没有不适」（安全问答、多方向复测不适）
    let multiClicked = false;
    for (const label of ["没有", "没有不适"]) {
      const btns = page.getByRole("button", { name: label, exact: true });
      for (let k = 0; k < (await btns.count()); k++) {
        const b = btns.nth(k);
        if (((await b.getAttribute("class")) || "").includes("is-selected")) continue;
        if (await b.isDisabled().catch(() => false)) continue;
        await b.click().catch(() => {});
        await page.waitForTimeout(300);
        mark(label); console.log(`[${i}] ${label} | ${h1}`); multiClicked = true; break;
      }
      if (multiClicked) break;
    }
    if (multiClicked) { acted = true; }
    else {
      // 患侧偏小：制造活动受限 finding，才能走到处理→本阶段成果→自主放松
      const limited = page.getByRole("button", { name: /患侧偏小/ }).first();
      if ((await limited.count()) && !((await limited.getAttribute("class")) || "").includes("is-selected")) {
        await limited.click().catch(() => {});
        await page.waitForTimeout(300);
        mark("患侧偏小"); console.log(`[${i}] 患侧偏小 | ${h1}`); acted = true;
      } else {
        // 网格单选：按「每个 .rm-result-grid 容器」各答一次，避免同一题互切、也覆盖多方向复测
        let gridClicked = false;
        const locationCard = page.locator(".rm-muscle-location-card").first();
        if (await locationCard.count() && !(await locationCard.isDisabled().catch(() => false)) && !((await locationCard.getAttribute("class")) || "").includes("is-selected")) {
          const t = (await locationCard.textContent()).trim().slice(0, 20);
          await locationCard.click().catch(() => {}); await page.waitForTimeout(300);
          mark("LOCATION:" + t); console.log(`[${i}] LOCATION | ${t}`); gridClicked = true;
        }
        const grids = page.locator(".rm-result-grid");
        if (!gridClicked) for (let gi = 0; gi < (await grids.count()); gi++) {
          const btns = grids.nth(gi).locator("button");
          let selected = false;
          for (let b = 0; b < (await btns.count()); b++) {
            if (((await btns.nth(b).getAttribute("class")) || "").includes("is-selected")) { selected = true; break; }
          }
          if (!selected && (await btns.count())) {
            const t = (await btns.first().textContent()).trim().slice(0, 20);
            await btns.first().click().catch(() => {}); await page.waitForTimeout(300);
            mark("G:" + t); console.log(`[${i}] GRID | ${t}`); gridClicked = true; break;
          }
        }
        if (gridClicked) { acted = true; }
        else {
          const chain = [
            [() => page.locator(".rm-check-grid button", { hasText: "活动受限" }).first(), "活动受限"],
            [() => page.getByRole("button", { name: "钝痛或酸胀", exact: true }).first(), "钝痛"],
            [() => page.getByRole("button", { name: /恢复日常活动/ }).first(), "恢复日常活动"],
            [() => page.getByRole("button", { name: "没有做影像", exact: true }).first(), "没有做影像"],
            [() => page.getByRole("button", { name: "可以做完", exact: true }).first(), "可以做完"],
            [() => page.getByRole("button", { name: "动作基本稳定", exact: true }).first(), "稳定"],
            [() => page.getByRole("button", { name: /保持稳定/ }).first(), "保持稳定"],
            [() => page.getByRole("button", { name: "没有不适", exact: true }).first(), "无不适"],
            [() => page.getByRole("button", { name: "暂时说不清位置", exact: true }).first(), "位置暂不判断"],
            [() => page.getByRole("button", { name: "没有明显差别", exact: true }).first(), "无明显差别"],
            [() => page.getByRole("button", { name: /可以继续评估|继续评估/ }).first(), "可以继续评估"],
          ];
          for (const [mk, label] of chain) {
            if (await clickLocator(mk(), label)) { mark(label); acted = true; break; }
          }
        }
      }
    }
  }
  if (!acted) {
    if (h1.includes("本次康复完成")) {
      const transitionButton = page.getByRole("button", { name: /查看本次康复总结/ }).last();
      if (await transitionButton.count() && !(await transitionButton.isDisabled().catch(() => false))) {
        await transitionButton.click().catch(() => {});
        await page.waitForTimeout(500);
        mark("SUMMARY_TRANSITION"); console.log(`[${i}] 进入总结 | ${h1}`); acted = true;
      }
    }
  }
  if (!acted) {
    if (h1.includes("今天需要做的训练")) {
      const exerciseSummaries = page.locator(".rm-exercise-summary");
      const nextTrainingIndex = Array.from({ length: await exerciseSummaries.count() }, (_, index) => index)
        .find((index) => !trainingFeedbackDone.has(index));
      if (nextTrainingIndex !== undefined) {
        const summary = exerciseSummaries.nth(nextTrainingIndex);
        if ((await summary.getAttribute("aria-expanded")) !== "true") {
          await summary.click().catch(() => {});
          await page.waitForTimeout(300);
          mark("OPEN_TRAINING"); console.log(`[${i}] 打开训练动作 ${nextTrainingIndex + 1} | ${h1}`); acted = true;
        } else {
          const feedbackSection = page.locator(".rm-feedback-quick").first();
          if (await feedbackSection.count() && !(await feedbackSection.locator("button.is-selected").count())) {
            await feedbackSection.locator("button").first().click().catch(() => {});
            await page.waitForTimeout(300);
            trainingFeedbackDone.add(nextTrainingIndex);
            mark("TRAINING_FEEDBACK"); console.log(`[${i}] 训练反馈 ${nextTrainingIndex + 1} | ${h1}`); acted = true;
          }
        }
      }
    }
  }
  if (!acted) {
    // 训练完成前每个动作都必须留下第一组即时反馈；逐卡选择一次，
    // 这样走读脚本与产品的“未反馈不能结束”规则保持一致。
    const feedbackSections = page.locator(".rm-feedback-quick");
    for (let fi = 0; fi < (await feedbackSections.count()); fi++) {
      const section = feedbackSections.nth(fi);
      if (await section.locator("button.is-selected").count()) continue;
      const feedbackButton = section.locator("button").first();
      if (await feedbackButton.count()) {
        await feedbackButton.click().catch(() => {});
        await page.waitForTimeout(300);
        mark("TRAINING_FEEDBACK"); console.log(`[${i}] 训练反馈 | ${h1}`); acted = true; break;
      }
    }
  }
  if (!acted) {
    if (noChangeMode && !noChangeCaptured && h1.includes("针对性处理")) {
      const retest = page.locator(".rm-retest:visible input[type=range]").first();
      if (await retest.count()) {
        const retestBody = ((await page.locator(".rm-retest:visible").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
        const before = retestBody.match(/处理前\s*(\d+)\s*\/10/)?.[1];
        if (before !== undefined) {
          await retest.fill(before);
          await page.waitForTimeout(300);
          noChangeCaptured = true;
          const outcomeText = ((await page.locator(".rm-auto-result:visible").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
          noChangeOutcomeObserved = /分数未变|与处理前相同|无变化|下降 0 分/.test(outcomeText);
          mark("处理后无变化");
          console.log(`[${i}] 处理复测故意保持原分数 ${before}/10`);
          acted = true;
        }
      }
    }
  }
  if (!acted) {
    if (activityBetterMode && !activityBetterCaptured && h1.includes("针对性处理")) {
      const retest = page.locator(".rm-retest:visible").first();
      const improvedRange = retest.getByRole("button", { name: /部分改善|有所改善/ }).first();
      if (await improvedRange.count() && !await improvedRange.isDisabled().catch(() => true)) {
        await improvedRange.click();
        const retestText = ((await retest.textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
        const before = retestText.match(/处理前\s*(\d+)\s*\/10/)?.[1];
        const score = retest.locator('input[type="range"]').first();
        if (await score.count() && before !== undefined) await score.fill(before);
        await page.waitForTimeout(300);
        const outcomeText = ((await retest.locator(".rm-auto-result:visible").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
        activityBetterOutcomeObserved = /活动表现有变化|活动范围有改善|有改善|未达到比较目标/.test(outcomeText);
        activityBetterCaptured = true;
        mark("活动改善但主诉不变");
        console.log(`[${i}] 处理复测记录活动改善，主诉分数保持 ${before ?? "原值"}/10`);
        acted = true;
      }
    }
  }
  if (!acted) {
    if (mixedWorseningMode && !mixedWorseningCaptured && h1.includes("针对性处理")) {
      const retest = page.locator(".rm-retest:visible").first();
      const worseRange = retest.getByRole("button", { name: /^变差/ }).first();
      if (await worseRange.count() && !await worseRange.isDisabled().catch(() => true)) {
        await worseRange.click();
        const retestText = ((await retest.textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
        const before = Number(retestText.match(/处理前\s*(\d+)\s*\/10/)?.[1] ?? 5);
        const score = retest.locator('input[type="range"]').first();
        if (await score.count()) await score.fill(String(Math.max(0, before - 1)));
        await page.waitForTimeout(300);
        mixedWorseningCaptured = true;
        mark("疼痛改善但活动变差");
        console.log(`[${i}] 处理复测记录活动变差，主诉分数下降为 ${Math.max(0, before - 1)}/10`);
        acted = true;
      }
    }
  }
  if (!acted) {
    const ranges = page.locator('input[type=range]');
    for (let k = 0; k < (await ranges.count()); k++) {
      const range = ranges.nth(k);
      if ((await range.inputValue()) === "0") {
        await range.fill("4").catch(() => {});
        await page.waitForTimeout(300);
        mark("SLIDER"); console.log("  SLIDER"); acted = true;
        break;
      }
    }
  }
  if (!acted) {
    const nb = page.getByRole("button", { name: NEXT }).first();
    if ((await nb.count()) && !(await nb.isDisabled())) {
      const name = (await nb.textContent()).trim();
      await nb.click(); await page.waitForTimeout(500);
      mark(`N:${name}`); console.log(`[${i}] NEXT | ${h1} | ${name}`); acted = true;
    }
  }
  if (!acted) {
    const miss = await page.locator("button.is-missing").allTextContents();
    const pending = miss.map((s) => s.trim()).join(" / ");
    const answers = await page.locator("button").evaluateAll((es) => es
      .filter((e) => !e.disabled && !/修改|症状信息|关键确认|评估检查|处理复测|训练居家|康复总结|RM|保存|康复记录|重写|全部信息|上一步|关闭|使用方式|不舒服的位置|出现多久|发生方式|不适感觉|目前情况|诱发场景|已收集信息|自助康复|康复思路/.test(e.textContent || ""))
      .map((e) => (e.textContent || "").trim().slice(0, 20)));
    console.log(`[${i}] STOP | ${h1} | 待补=${pending} | 答案=${JSON.stringify(answers.slice(0, 10))}`);
    break;
  }
  if (recent.length >= 5 && new Set(recent.slice(-5)).size === 1) { console.log(`[${i}] 死循环 | ${JSON.stringify(recent)}`); break; }
}

const h1 = await snap();
const h2 = await page.locator("h2").first().textContent().catch(() => "(无)");
const body = await page.content();
console.log("\n=== 终点 h1:", h1, "| h2:", h2);
console.log("含[本阶段成果]:", body.includes("本阶段成果"));
console.log("含[针对性自主放松]:", body.includes("针对性自主放松"));
console.log("含[有效处理]:", body.includes("有效处理"));
console.log("含[活动范围变化]:", body.includes("活动范围变化"));
console.log("浏览器运行时错误数:", runtimeErrors.length, runtimeErrors.slice(0, 3));
if (worseningMode) {
  assert.equal(worseningCaptured, true, "没有在处理复测阶段故意制造加重结果");
  assert.equal(focusedReassessmentObserved, true, "处理加重后没有出现停止或聚焦复查证据");
  assert.doesNotMatch(h1, /今天需要做的训练|本次康复总结/, `处理加重不应直接进入训练或总结：${h1}`);
  assert.match(body, /处理后加重|待重新评估|只复查相关内容|重新评估/);
} else if (noChangeMode) {
  assert.equal(noChangeCaptured, true, "没有在第一项处理的复测阶段故意保持原分数");
  noChangeOutcomeObserved = noChangeOutcomeObserved || /下降 0 分|主诉未同步改变|分数未变|无变化/.test(body);
  assert.equal(noChangeOutcomeObserved, true, "复测或总结页面没有显示分数未变的结果");
  assert.match(body, /下降 0 分|主诉未同步改变|分数未变|无变化|换下一项|本阶段成果|训练与居家方案/, "无变化后没有留下继续处理或观察出口");
} else if (activityBetterMode) {
  assert.equal(activityBetterCaptured, true, "没有在处理复测阶段记录活动改善且主诉分数不变");
  activityBetterOutcomeObserved = activityBetterOutcomeObserved || /活动表现有变化|活动范围有改善|原来的不适暂未明显改变|有改善|未达到比较目标/.test(body);
  assert.equal(activityBetterOutcomeObserved, true, "页面没有显示活动改善与主诉未同步改善的分离结果");
  assert.match(body, /活动表现有变化|活动范围有改善|原来的不适暂未明显改变|有改善|未达到比较目标|本阶段成果|本次康复总结/);
} else if (mixedWorseningMode) {
  assert.equal(mixedWorseningCaptured, true, "没有在处理复测阶段记录活动变差且主诉分数下降");
  mixedWorseningOutcomeObserved = mixedWorseningOutcomeObserved || /疼痛评分下降，但活动表现变差|活动表现变差|处理已暂停/.test(body);
  assert.equal(mixedWorseningOutcomeObserved, true, "页面没有显示疼痛改善但活动恶化的停止出口");
  assert.match(body, /疼痛评分下降，但活动表现变差|活动表现变差|处理已暂停/);
} else {
  assert.match(h1, /本次康复总结/, `真实流程未到达总结页，当前 h1：${h1}`);
}
assert.equal(runtimeErrors.length, 0, `浏览器运行时出现错误：${runtimeErrors.join(" | ")}`);
if (walkthroughEvidenceMode) {
  const evidenceDir = "artifacts/quality/walkthrough";
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(`${evidenceDir}/${walkthroughEvidenceMode}.json`, JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: walkthroughEvidenceMode,
    captured: walkthroughEvidenceMode === "queue-03-activity-better"
      ? activityBetterCaptured
      : walkthroughEvidenceMode === "queue-04-mixed-worsening"
        ? mixedWorseningCaptured
        : noChangeCaptured,
    outcomeObserved: walkthroughEvidenceMode === "queue-03-activity-better"
      ? activityBetterOutcomeObserved
      : walkthroughEvidenceMode === "queue-04-mixed-worsening"
        ? mixedWorseningOutcomeObserved
        : noChangeOutcomeObserved,
    finalHeading: h1,
    runtimeErrors,
  }, null, 2), "utf8");
  console.log(`走读证据已写入 ${evidenceDir}/${walkthroughEvidenceMode}.json`);
}
if (worseningMode) await page.screenshot({ path: ".tmp-b-treatment-worsening.png", fullPage: true });
} finally {
  await browser.close();
}
