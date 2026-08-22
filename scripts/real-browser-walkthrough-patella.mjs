/**
 * 真实浏览器端到端走读（专业模式·髌骨 patella-mobility-unit）。
 *
 * 验证 P0 #3：专业「协助他人」+ 声明 PROM/触诊/关节处理能力 → 髌骨四方向被动检查
 * 受限 → 处理阶段出现单张「髌骨向上/…滑动辅助」单元卡（一张处理卡、一张复测卡）。
 * 用法：`node scripts/real-browser-walkthrough-patella.mjs`。
 */

import { chromium } from "playwright-core";
import { agreePilotConsent, dismissOnboarding, pilotScenarioUrl } from "./real-browser-test-helpers.mjs";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
  try {
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(`pageerror:${error}`));
page.on("console", (msg) => { if (msg.type() === "error") runtimeErrors.push(`console:${msg.text()}`); });

const snap = () => page.locator("h1").first().textContent().catch(() => "(无)");
const NEXT = /下一步|选好了|进入关键确认|开始评估|查看评估结果|评估完成|完成并继续|处理完成|开始复测|记录本轮|查看训练|完成当前安排|继续填写影像结论|保存，开始评估|下一个检查|完成这项检查|开始处理并复测|^继续$|进入训练|开始训练|保存并继续|进入关键确认|打开检查|评估完成，进入处理|检查相关肌肉|完成触诊/;
const hasJointCapability = process.env.PATELLA_JOINT !== "0";
const patellaAssessmentCardCounts = [];
const patellaTreatmentTitles = [];

await page.goto(pilotScenarioUrl("http://localhost:3000/"), { waitUntil: "networkidle", timeout: 30000 });
await agreePilotConsent(page);
await dismissOnboarding(page);
await page.locator("textarea").fill("右膝下楼时髌骨周围刺痛，有三个月了");
await page.getByRole("button", { name: "帮我整理" }).click();
await page.waitForTimeout(900);
await page.getByRole("button", { name: /康复思路模式/ }).click();
await page.waitForTimeout(800);
await page.getByRole("button", { name: /下一步/ }).click();
await page.waitForTimeout(800);
await page.getByRole("button", { name: /协助他人检查/ }).click();
await page.waitForTimeout(800);
// 声明能力：被动活动度 / 基础触诊 / 关节处理
for (const cap of ["被动活动度", "基础触诊", ...(hasJointCapability ? ["关节处理"] : [])]) {
  const b = page.getByRole("button", { name: cap, exact: true }).first();
  if (await b.count() && !((await b.getAttribute("class")) || "").includes("is-selected")) { await b.click(); await page.waitForTimeout(250); }
}
// 位置：右侧膝盖正面 → 髌骨周围
await page.locator('[aria-label="右侧膝盖正面"]').click();
await page.waitForTimeout(600);
await page.locator('[aria-label="右侧 · 髌骨周围"]').click().catch(async () => {
  await page.locator('[aria-label="右侧 · 髌骨下方 / 髌腱"]').click().catch(() => {});
});
await page.waitForTimeout(500);

const recent = []; const mark = (a) => { recent.push(a); if (recent.length > 10) recent.shift(); };

async function clickUnselected(label) {
  const b = page.getByRole("button", { name: label, exact: true }).first();
  if (await b.count() && !((await b.getAttribute("class")) || "").includes("is-selected")) { await b.click(); await page.waitForTimeout(250); return true; }
  return false;
}

for (let i = 0; i < 200; i++) {
  const h1 = await snap();
  if (h1.includes("髌骨四方向被动活动")) {
    const count = await page.locator(".rm-patella-direction").count();
    patellaAssessmentCardCounts.push(count);
    console.log(`[${i}] 髌骨方向卡数: ${count}`);
  }
  if (h1.includes("针对性处理")) {
    const c = await page.content();
    const titles = await page.locator(".rm-treatment-card .rm-treatment-action h2").allTextContents();
    patellaTreatmentTitles.push(...titles.map((title) => title.trim()).filter(Boolean));
    console.log(`[${i}] 处理页 | 含[滑动辅助]: ${c.includes("滑动辅助")} | 含[patella-mobility-unit]: ${c.includes("patella-mobility-unit")} | 含[髌骨向上]: ${c.includes("髌骨向上")}`);
  }
  let acted = false;
  // select（出现多久/发生方式等，全部空 select 都填）
  const sels = page.locator("select");
  let selFilled = false;
  for (let k = 0; k < (await sels.count()); k++) {
    const s = sels.nth(k);
    if (!(await s.inputValue())) { await s.selectOption({ index: 1 }).catch(() => {}); selFilled = true; }
  }
  if (selFilled) { await page.waitForTimeout(250); mark("SEL"); console.log(`[${i}] SELECT | ${h1}`); acted = true; }
  else if (await clickUnselected("活动受限")) { mark("活动受限"); console.log(`[${i}] 活动受限 | ${h1}`); acted = true; }
  else if (await clickUnselected("钝痛或酸胀")) { mark("钝痛"); console.log(`[${i}] 钝痛 | ${h1}`); acted = true; }
  else {
    // 患侧偏小：制造髌骨受限方向（P0 #3 需要受限方向才进 patella-mobility-unit）
    const limited = page.getByRole("button", { name: /患侧偏小/ }).first();
    if (await limited.count() && !((await limited.getAttribute("class")) || "").includes("is-selected")) {
      await limited.click().catch(() => {}); await page.waitForTimeout(250); mark("患侧偏小"); console.log(`[${i}] 患侧偏小 | ${h1}`); acted = true;
    } else {
      const noDifference = page.locator("button:visible").filter({ hasText: "没有明显差别" }).first();
      if (await noDifference.count() && !((await noDifference.getAttribute("class")) || "").includes("is-selected")) {
        await noDifference.click(); await page.waitForTimeout(250); mark("肌肉无明显差别"); console.log(`[${i}] 肌肉无明显差别 | ${h1}`); acted = true;
      }
      // 网格单选（含髌骨四方向）
      const grids = page.locator(".rm-result-grid");
      let gClicked = acted;
      for (let gi = 0; gi < (await grids.count()) && !gClicked; gi++) {
        const btns = grids.nth(gi).locator("button");
        let any = false;
        for (let b = 0; b < (await btns.count()); b++) { if (((await btns.nth(b).getAttribute("class")) || "").includes("is-selected")) { any = true; break; } }
        if (!any && (await btns.count())) {
          const t = (await btns.first().textContent()).trim().slice(0, 18);
          await btns.first().click().catch(() => {}); await page.waitForTimeout(250);
          mark("G:" + t); console.log(`[${i}] GRID | ${t}`); gClicked = true; break;
        }
      }
      if (gClicked) { acted = true; }
      else {
        const range = page.locator('input[type=range]').first();
        if (await range.count() && (await range.inputValue()) === "0") { await range.fill("4").catch(() => {}); await page.waitForTimeout(250); mark("RNG"); console.log(`[${i}] SLIDER | ${h1}`); acted = true; }
        else {
          const goal = page.getByRole("button", { name: /恢复正常生活/ }).first();
          if (await goal.count() && !((await goal.getAttribute("class")) || "").includes("is-selected")) { await goal.click(); await page.waitForTimeout(250); mark("目标"); console.log(`[${i}] 目标 | ${h1}`); acted = true; }
          else {
            const noImg = page.getByRole("button", { name: "没有做影像", exact: true }).first();
            if (await noImg.count() && !((await noImg.getAttribute("class")) || "").includes("is-selected")) { await noImg.click(); await page.waitForTimeout(250); mark("无影像"); console.log(`[${i}] 无影像 | ${h1}`); acted = true; }
            else {
              const noBtns = page.getByRole("button", { name: /^(没有|没有不适)$/ });
              let noClicked = false;
              for (let k = 0; k < (await noBtns.count()); k++) {
                if (((await noBtns.nth(k).getAttribute("class")) || "").includes("is-selected")) continue;
                await noBtns.nth(k).click(); await page.waitForTimeout(250); mark("没有"); console.log(`[${i}] 没有 | ${h1}`); noClicked = true; break;
              }
              if (noClicked) { acted = true; }
              else {
                const nb = page.getByRole("button", { name: NEXT }).first();
                if (await nb.count() && !(await nb.isDisabled())) { const name = (await nb.textContent()).trim(); await nb.click(); await page.waitForTimeout(500); mark("N:" + name); console.log(`[${i}] NEXT | ${h1} | ${name}`); acted = true; }
                else { await page.waitForTimeout(700); const nb2 = page.getByRole("button", { name: NEXT }).first(); if (await nb2.count() && !(await nb2.isDisabled())) { const name = (await nb2.textContent()).trim(); await nb2.click(); await page.waitForTimeout(500); mark("N2:" + name); console.log(`[${i}] NEXT(重试) | ${h1} | ${name}`); acted = true; } else { const miss = await page.locator("button.is-missing").allTextContents(); const btns = await page.locator("button").evaluateAll((es) => es.filter((e) => !e.disabled).map((e) => (e.textContent || "").trim().slice(0, 18))); console.log(`[${i}] STOP | ${h1} | 待补=${JSON.stringify(miss.map((s) => s.trim()))} | 按钮=${JSON.stringify(btns.slice(0, 14))}`); break; } }
              }
            }
          }
        }
      }
    }
  }
  if (!acted) { console.log(`[${i}] 未推进 | ${h1}`); break; }
  if (recent.length >= 5 && new Set(recent.slice(-5)).size === 1) { console.log(`[${i}] 死循环 | ${JSON.stringify(recent)}`); break; }
}

const finalH1 = await snap();
const body = await page.content();
await page.screenshot({ path: hasJointCapability ? ".tmp-patella.png" : ".tmp-patella-no-joint.png", fullPage: true });
console.log("\n=== 终点 h1:", finalH1);
console.log("含[patella-mobility-unit]:", body.includes("patella-mobility-unit"));
console.log("含[滑动辅助]:", body.includes("滑动辅助"));
console.log("含[髌骨向上]:", body.includes("髌骨向上"));
console.log("含[本阶段成果]:", body.includes("本阶段成果"));
console.log("髌骨方向卡数:", patellaAssessmentCardCounts.join(","));
console.log("髌骨处理标题:", [...new Set(patellaTreatmentTitles)].join(" | "));
console.log("关节处理能力:", hasJointCapability ? "已声明" : "未声明");
console.log("浏览器运行时错误数:", runtimeErrors.length, runtimeErrors.slice(0, 3));
if (!patellaAssessmentCardCounts.includes(4)) throw new Error(`髌骨场景未实际渲染四张方向卡：${patellaAssessmentCardCounts.join(",")}`);
const patellaTreatmentTitlesOnly = patellaTreatmentTitles.filter((title) => /髌骨向(?:上|下|内|外)滑动辅助/.test(title));
const uniquePatellaTreatmentTitles = [...new Set(patellaTreatmentTitlesOnly)];
if (hasJointCapability && (uniquePatellaTreatmentTitles.length !== 1 || uniquePatellaTreatmentTitles[0] !== "髌骨向上滑动辅助")) {
  throw new Error(`髌骨场景处理卡方向不符合预期：${uniquePatellaTreatmentTitles.join(" | ")}`);
}
if (!hasJointCapability && uniquePatellaTreatmentTitles.length) throw new Error(`未声明关节处理能力却生成髌骨处理卡：${uniquePatellaTreatmentTitles.join(" | ")}`);
if (uniquePatellaTreatmentTitles.some((title) => /髌骨向下|髌骨向内|髌骨向外/.test(title))) throw new Error("髌骨场景错误生成了其他方向处理卡");
if (!/针对性处理|处理复测|本阶段成果|今天需要做的训练|本次康复完成/.test(finalH1)) throw new Error(`髌骨场景未到达处理或明确结果出口：${finalH1}`);
if (hasJointCapability && !body.includes("髌骨向上")) throw new Error("髌骨场景缺少实际方向结果文本");
if (runtimeErrors.length) throw new Error(`浏览器运行时出现错误：${runtimeErrors.join(" | ")}`);
} finally {
  await browser.close();
}
