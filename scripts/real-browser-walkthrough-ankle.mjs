/**
 * 真实浏览器端到端走读（自助康复·急性踝足外翻主诉）。
 *
 * 覆盖本轮最容易回归的踝足边界：
 * - 用户原话“脚底向外转”与踝外翻/小腿外翻动作归一；
 * - 实际完成踝足主动外翻后形成普通主诉基线；
 * - 肿胀目标完成后继续进入其他处理队列；
 * - 处理后和训练后仍能进入主诉复测与总结；
 * - 肌肉紧张度页面使用独立肌肉区域图；
 * - 训练反馈未完成时不能直接结束训练。
 *
 * 用法：先启动 dev server，再运行：
 *   node scripts/real-browser-walkthrough-ankle.mjs
 *
 * 可用 WALKTHROUGH_URL 覆盖默认地址。
 */

import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { agreePilotConsent, dismissOnboarding, pilotScenarioUrl } from "./real-browser-test-helpers.mjs";

const URL = pilotScenarioUrl();
const trainingGateProbe = process.env.TRAINING_GATE_PROBE === "1";
const trainingWorsenProbe = process.env.TRAINING_WORSEN_PROBE === "1";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const viewport = process.env.MOBILE_SMOKE === "1"
  ? { width: 390, height: 844 }
  : { width: 1440, height: 1000 };
const page = await browser.newPage({ viewport }); 
  try {
// Fail fast when a selector no longer matches the real page; a browser run
// should report the missing transition instead of waiting through Playwright's
// default 30-second timeout on every candidate selector.
page.setDefaultTimeout(3000);
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(`pageerror:${error}`));
page.on("console", (message) => {
  if (message.type() === "error") {
    const expectedLocalInviteBlock = process.env.ALLOW_LOCAL_PILOT_SYNC_FAILURE === "1"
      && /responded with a status of 403/.test(message.text());
    if (!expectedLocalInviteBlock) runtimeErrors.push(`console:${message.text()}`);
  }
});

const NEXT = /下一步|进入关键确认|开始评估检查|下一个检查|检查相关肌肉|查看评估结果|评估完成，继续|开始处理并复测|查看低刺激基础活动|进入训练|开始训练|处理完成|完成这项处理|记录本轮最终结果|^继续$|训练完成，整体复测|查看训练|查看总结|完成并查看总结|训练完成，查看总结|查看本次康复总结/;
const snapTitle = () => page.locator("h1").first().textContent().catch(() => "(无)");

async function waitForUi() {
  await page.waitForTimeout(120);
}

async function isUnselected(locator) {
  return (await locator.getAttribute("class").catch(() => ""))?.includes("is-selected") !== true;
}

async function clickUnselected(locator, label) {
  if (!(await locator.count())) return false;
  const first = locator.first();
  if (await first.isDisabled().catch(() => false)) return false;
  if (!(await isUnselected(first))) return false;
  await first.click();
  await waitForUi();
  console.log(`  ${label}`);
  return true;
}

async function clickNamed(name, label = name) {
  return clickUnselected(page.getByRole("button", { name, exact: true }), label);
}

async function fillEmptySelects() {
  const selects = page.locator("select");
  let changed = false;
  for (let index = 0; index < await selects.count(); index += 1) {
    const select = selects.nth(index);
    if (await select.inputValue()) continue;
    await select.selectOption({ index: 1 }).catch(() => {});
    changed = true;
  }
  if (changed) await waitForUi();
  return changed;
}

async function fillFirstEmptySlider(value) {
  const sliders = page.locator('input[type="range"]');
  for (let index = 0; index < await sliders.count(); index += 1) {
    const slider = sliders.nth(index);
    if ((await slider.inputValue()) !== "0") continue;
    await slider.fill(String(value));
    await waitForUi();
    return true;
  }
  return false;
}

async function clickFirstUnansweredGrid() {
  const grids = page.locator(".rm-result-grid");
  for (let gridIndex = 0; gridIndex < await grids.count(); gridIndex += 1) {
    const grid = grids.nth(gridIndex);
    if (!await grid.isVisible().catch(() => false)) continue;
    const buttons = grid.locator("button");
    let selected = false;
    for (let buttonIndex = 0; buttonIndex < await buttons.count(); buttonIndex += 1) {
      if (!await isUnselected(buttons.nth(buttonIndex))) {
        selected = true;
        break;
      }
    }
    if (selected || !(await buttons.count())) continue;
    await buttons.first().click();
    await waitForUi();
    return true;
  }
  return false;
}

async function clickFirstUnansweredMuscleLocation() {
  const card = page.locator(".rm-muscle-location-card").first();
  if (await card.count() && await isUnselected(card)) {
    await card.click();
    await waitForUi();
    return true;
  }
  return false;
}

async function clickCurrentLocationField() {
  const field = (await page.locator(".rm-guided-status h2").textContent().catch(() => "")).trim();
  const mode = field === "不舒服的位置"
    ? "complaint"
    : field === "肿胀位置"
      ? "swelling"
      : field === "按压痛位置"
        ? "tenderness"
        : field === "麻电范围"
          ? "sensory"
          : "";
  if (!mode) return false;
  const pickers = page.locator(`.rm-lower-limb-picker.is-${mode}`);
  let picker = null;
  for (let index = 0; index < await pickers.count(); index += 1) {
    const candidate = pickers.nth(index);
    if (await candidate.isVisible().catch(() => false)) {
      picker = candidate;
      break;
    }
  }
  if (!picker) return false;
  if (await picker.locator(".rm-location-selection-list article").count()) return false;

  const overview = picker.locator('[aria-label="右侧脚踝正面"]').first();
  if (await overview.count() && !(await overview.getAttribute("class").catch(() => ""))?.includes("is-active")) {
    await overview.click();
    await waitForUi();
  }
  const zone = picker.locator('[role="button"][aria-label="右侧 · 外踝 / 前外侧"]').first();
  if (!(await zone.count()) || !(await isUnselected(zone))) return false;
  await zone.click();
  await waitForUi();
  console.log(`  ${field}：右侧 · 外踝 / 前外侧`);
  return true;
}

async function handleNextTrainingExercise(completedIndexes) {
  const exercises = page.locator(".rm-exercise");
  for (let index = 0; index < await exercises.count(); index += 1) {
    if (completedIndexes.has(index)) continue;
    const exercise = exercises.nth(index);
    const summary = exercise.locator(".rm-exercise-summary").first();
    if ((await summary.getAttribute("aria-expanded")) !== "true") {
      await summary.click();
      await page.waitForTimeout(420);
      return "opened";
    }
    const feedback = exercise.locator(".rm-feedback-quick");
    const selected = feedback.locator("button.is-selected");
    if (await feedback.count() && !(await selected.count())) {
      const button = trainingWorsenProbe
        ? feedback.getByRole("button", { name: "做完更不舒服", exact: true }).first()
        : feedback.locator("button").first();
      if (await button.count()) {
        await button.click();
        await waitForUi();
        completedIndexes.add(index);
        return trainingWorsenProbe ? "worse" : "feedback";
      }
    }
    completedIndexes.add(index);
  }
  return "";
}

async function clickDefaultGoal() {
  const goals = page.getByRole("button", { name: /恢复日常活动/ });
  const goal = goals.first();
  if (!(await goal.count()) || await goal.isDisabled().catch(() => true) || !(await isUnselected(goal))) return false;
  await goal.click();
  await waitForUi();
  return true;
}

async function clickNext() {
  const matches = page.getByRole("button", { name: NEXT });
  let button = null;
  for (let index = 0; index < await matches.count(); index += 1) {
    const candidate = matches.nth(index);
    const candidateText = (await candidate.textContent().catch(() => "")).trim();
    if (/^[1-6].*(待解锁|可进入|进行中|可回看)$/.test(candidateText)) continue;
    if (await candidate.isVisible().catch(() => false) && !await candidate.isDisabled().catch(() => true)) {
      button = candidate;
      break;
    }
  }
  if (!button) return false;
  const text = (await button.textContent().catch(() => "")).trim();
  await button.click();
  await page.waitForTimeout(300);
  console.log(`  NEXT | ${text}`);
  return true;
}

await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await agreePilotConsent(page);
await dismissOnboarding(page);
await page.locator("textarea").fill("昨晚崴了右脚，外踝肿，脚底向外转会痛，脚趾没有受伤");
await page.getByRole("button", { name: "帮我整理" }).click();
await page.waitForTimeout(850);
await page.getByRole("button", { name: /自助康复/ }).click();
await page.waitForTimeout(320);
await page.getByRole("button", { name: /下一步/ }).click();
await page.waitForTimeout(500);

let baselineSet = false;
let eversionBaselineCompleted = false;
let trainingFeedbackDone = 0;
let trainingGateVerified = false;
let trainingWorseningObserved = false;
let selectiveAvoidanceObserved = false;
let swellingTreatmentSeen = false;
let postSwellingTreatmentSeen = false;
const completedExerciseIndexes = new Set();
let savedSummary = false;
const recent = [];
const mark = (value) => {
  recent.push(value);
  if (recent.length > 10) recent.shift();
};

for (let index = 0; index < 500; index += 1) {
  const title = await snapTitle();
  const body = await page.locator("body").textContent().catch(() => "");
  let acted = false;

  if (title.includes("针对性处理")) {
    const swellingCard = page.locator(".rm-treatment-card.is-swelling:visible");
    const otherTreatmentCards = page.locator(".rm-treatment-card:visible:not(.is-swelling)");
    if (await swellingCard.count()) swellingTreatmentSeen = true;
    if (swellingTreatmentSeen && !(await swellingCard.count()) && await otherTreatmentCards.count()) postSwellingTreatmentSeen = true;
  }

  if (title.includes("先确认能否安全开始检查")) {
    const safetyArticles = page.getByRole("article");
    let answered = false;
    for (let articleIndex = 0; articleIndex < await safetyArticles.count(); articleIndex += 1) {
      const no = safetyArticles.nth(articleIndex).getByRole("button", { name: "没有", exact: true });
      if (await no.count() && await isUnselected(no)) {
        await no.click();
        answered = true;
      }
    }
    if (answered) {
      await waitForUi();
      acted = true;
      mark("安全确认");
    }
    if (!acted) {
      const boneAnswers = ["不是", "能", "能"];
      const boneArticles = page.locator(".rm-bone-check article");
      let boneAnswered = false;
      for (let articleIndex = 0; articleIndex < await boneArticles.count(); articleIndex += 1) {
        const answer = boneArticles.nth(articleIndex).getByRole("button", { name: boneAnswers[articleIndex], exact: true });
        if (await answer.count() && await isUnselected(answer)) {
          await answer.click();
          boneAnswered = true;
        }
      }
      if (boneAnswered) {
        await waitForUi();
        acted = true;
        mark("骨性风险确认");
      }
    }
    if (!acted && await clickNamed("继续填写影像结论", "无影像前置")) {
      acted = true;
      mark("进入影像");
    }
    if (!acted && await clickNamed("没有做影像", "没有做影像")) {
      acted = true;
      mark("没有做影像");
    }
  } else if (await clickNamed("继续填写影像结论", "无影像前置")) {
    acted = true;
    mark("进入影像");
  } else if (await clickNamed("没有做影像", "没有做影像")) {
    acted = true;
    mark("没有做影像");
  } else if (await clickNamed("钝痛或酸胀", "症状性质")) {
    acted = true;
    mark("症状性质");
  } else if (!baselineSet && /现在的疼痛或不适有多重/.test(body)) {
    const slider = page.getByRole("slider", { name: "现在的疼痛或不适有多重？" });
    if (await slider.count() && (await slider.inputValue()) === "0") {
      await slider.fill("6");
      await waitForUi();
      baselineSet = true;
      acted = true;
      mark("基线6");
    }
  } else if (!eversionBaselineCompleted && /外翻/.test(title)) {
    const eversionLimited = page.getByRole("button", { name: /^患侧偏小/ }).first();
    if (await eversionLimited.count() && await isUnselected(eversionLimited)) {
      await eversionLimited.click();
      await waitForUi();
      eversionBaselineCompleted = true;
      acted = true;
      mark("外翻基线");
    }
  } else if (await clickCurrentLocationField()) {
    acted = true;
    mark("不适位置");
  } else if (await fillEmptySelects()) {
    acted = true;
    mark("下拉选择");
  } else if (/恢复目标/.test(body) && await clickDefaultGoal()) {
    acted = true;
    mark("恢复目标");
  } else if (await clickFirstUnansweredMuscleLocation()) {
    acted = true;
    mark("肌肉区域");
  } else if (await clickNamed("左侧反应更明显", "肌肉反应")) {
    acted = true;
    mark("肌肉反应");
  } else if (await clickNamed("没有明显差别", "肌肉无明显差别")) {
    acted = true;
    mark("肌肉无明显差别");
  } else if (await clickNamed("没有不适", "无不适")) {
    acted = true;
    mark("无不适");
  } else if (await clickFirstUnansweredGrid()) {
    acted = true;
    mark("检查选项");
  } else if (await fillFirstEmptySlider(3)) {
    acted = true;
    mark("复测分数3");
  } else if (title.includes("今天需要做的训练")) {
    if (body.includes("避开肿胀部位")) selectiveAvoidanceObserved = true;
    if (trainingWorsenProbe && /训练后加重|后不适更重/.test(body)) {
      trainingWorseningObserved = true;
      console.log("  训练后加重提示：正常完成训练入口已关闭");
      break;
    }
    if (trainingGateProbe && !trainingGateVerified) {
      const finishTraining = page.locator(".rm-training-actions .rm-primary").first();
      if (!(await finishTraining.count())) throw new Error("训练页缺少完成训练按钮");
      if (!await finishTraining.isDisabled()) throw new Error("未填写训练反馈时，完成训练按钮不应可用");
      trainingGateVerified = true;
      acted = true;
      mark("训练反馈门槛");
      console.log("  训练反馈门槛：未填写反馈时完成按钮保持禁用");
    }
    const trainingAction = acted ? "" : await handleNextTrainingExercise(completedExerciseIndexes);
    if (trainingAction === "opened") {
      acted = true;
      mark("打开训练");
    } else if (trainingAction === "feedback") {
      trainingFeedbackDone += 1;
      acted = true;
      mark(`训练反馈${trainingFeedbackDone}`);
    } else if (trainingAction === "worse") {
      acted = true;
      mark("训练后加重");
    }
  }

  if (!acted && title.includes("本次康复完成")) {
    const summaryButton = page.getByRole("button", { name: /查看本次康复总结/ }).last();
    if (await summaryButton.count() && !await summaryButton.isDisabled().catch(() => true)) {
      await summaryButton.click();
      await waitForUi();
      acted = true;
      mark("进入总结");
    }
  }

  if (!acted && title.includes("本次康复总结")) {
    const saveButton = page.getByRole("button", { name: "保存本次记录", exact: true });
    if (await saveButton.count() && !await saveButton.isDisabled().catch(() => true)) {
      await saveButton.click();
      await waitForUi();
      savedSummary = true;
      mark("保存本次记录");
      break;
    }
  }

  if (!acted) acted = await clickNext();

  if (!acted) {
    const missing = await page.locator("button.is-missing").allTextContents();
    const visibleButtons = await page.getByRole("button").evaluateAll((buttons) => buttons
      .filter((button) => {
        const style = window.getComputedStyle(button);
        const rect = button.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      })
      .map((button) => ({ text: (button.textContent ?? "").trim(), aria: button.getAttribute("aria-label"), disabled: button.hasAttribute("disabled") }))
      .slice(-30));
    throw new Error(`[踝足真实走读] 第${index}步无法继续：${title}；待补=${missing.join(" / ")}；最近操作=${recent.join(" → ")}；可见按钮=${JSON.stringify(visibleButtons)}`);
  }
  if (recent.length >= 6 && new Set(recent.slice(-6)).size === 1) {
    throw new Error(`[踝足真实走读] 疑似死循环：${recent.join(" → ")}`);
  }
}

const finalTitle = await snapTitle();
const finalBody = await page.locator("body").textContent().catch(() => "");
console.log(`终点：${finalTitle}`);
console.log(`训练反馈数量：${trainingFeedbackDone}`);
console.log(`训练后加重提示：${trainingWorseningObserved}`);
console.log(`RET-01 肿胀处理卡：${swellingTreatmentSeen}；后续其他处理卡：${postSwellingTreatmentSeen}`);
console.log(`浏览器运行时错误数：${runtimeErrors.length}`);

if (trainingWorsenProbe) {
  assert.match(finalTitle, /今天需要做的训练/, `训练加重场景不应离开训练提示页：${finalTitle}`);
  assert.equal(trainingWorseningObserved, true, "训练后加重没有显示停止/复查提示");
  assert.match(finalBody, /训练后加重|后不适更重|处理这次加重/);
  assert.doesNotMatch(finalBody, /训练完成，整体复测|训练完成，查看总结/);
} else {
  assert.match(finalTitle, /本次康复总结/, `未到达总结页，当前标题：${finalTitle}`);
}
assert.equal(runtimeErrors.length, 0, `浏览器出现运行时错误：${runtimeErrors.join(" | ")}`);
assert.equal(baselineSet, true, "没有形成初始6分基线");
assert.equal(eversionBaselineCompleted, true, "没有实际完成踝外翻受限评估，主诉基线回归未覆盖");
assert.equal(swellingTreatmentSeen, true, "急性踝足场景没有实际出现肿胀处理卡");
assert.equal(postSwellingTreatmentSeen, true, "肿胀处理完成后没有继续出现其他处理卡");
if (!trainingWorsenProbe) assert.equal(savedSummary, true, "没有执行保存本次记录");
assert.match(finalBody, /脚底向外转/, "总结没有保留用户原话动作");
assert.doesNotMatch(finalBody, /尚未形成可比较动作基线/, "踝外翻实际基线没有进入普通复测资格");
assert.match(finalBody, /自主放松/, "总结或训练流程没有保留训练后自主放松出口");
assert.equal(selectiveAvoidanceObserved, true, "有肿胀风险时训练页自主放松没有显示选择性避开提示");
if (trainingGateProbe) assert.equal(trainingGateVerified, true, "没有验证训练反馈门槛");
if (trainingWorsenProbe) await page.screenshot({ path: ".tmp-b-training-worsening.png", fullPage: true });

} finally {
  await browser.close();
}
