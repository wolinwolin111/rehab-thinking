/**
 * 真实浏览器端到端走读（自助康复·膝前痛）。
 *
 * 用 playwright-core 驱动本机 Edge（`channel: "msedge"`），从症状输入一路点通
 * 六阶段，验证 P0 #1「训练后针对性自主放松」和 P0 #2「本阶段成果」真实出现。
 * 用法：先 `npm i playwright-core --no-save`，再 `node scripts/real-browser-walkthrough.mjs`。
 */

import { chromium } from "playwright-core";
import assert from "node:assert/strict";

const URL = process.env.WALKTHROUGH_URL ?? "http://localhost:3000/";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
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
await page.locator("textarea").fill("右膝下楼时内侧刺痛，有三个月了");
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
let locationScreenshotsTaken = false;
const mark = (a) => { recent.push(a); if (recent.length > 10) recent.shift(); };

for (let i = 0; i < 400; i++) {
  const h1 = await snap();
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
  // select 需用 selectOption，不能 click
  const sel = page.locator("select").first();
  if ((await sel.count()) && !(await sel.inputValue())) {
    await sel.selectOption({ index: 1 }).catch(() => {});
    await page.waitForTimeout(300);
    mark("SELECT"); console.log(`[${i}] SELECT | ${h1}`); acted = true;
  } else {
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
assert.match(h1, /本次康复总结/, `真实流程未到达总结页，当前 h1：${h1}`);
assert.equal(runtimeErrors.length, 0, `浏览器运行时出现错误：${runtimeErrors.join(" | ")}`);
await browser.close();
