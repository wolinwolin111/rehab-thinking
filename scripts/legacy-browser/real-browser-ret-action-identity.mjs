import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { dismissOnboarding } from "./real-browser-test-helpers.mjs";

const baseURL = process.env.WALKTHROUGH_URL ?? "http://localhost:3000/";
const inviteToken = process.env.PILOT_INVITE_TOKEN?.trim();
if (!inviteToken) throw new Error("PILOT_INVITE_TOKEN is required");
const withInvite = new globalThis.URL(baseURL);
withInvite.searchParams.set("invite", inviteToken);
const normalize = (value) => value.replace(/\s+/g, " ").trim();
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const retestTitles = [];
page.on("pageerror", (error) => console.log("PAGEERROR", error.message));
page.on("console", (message) => { if (message.type() === "error") console.log("CONSOLE", message.text()); });

await page.goto(withInvite.toString(), { waitUntil: "networkidle", timeout: 30000 });
await dismissOnboarding(page);
await page.locator("textarea").fill("右膝内侧疼，有三个月了");
await page.getByRole("button", { name: "帮我整理", exact: true }).click();
await page.getByRole("button", { name: /康复思路模式/ }).click();
await page.getByRole("button", { name: /下一步/ }).click();
await page.getByRole("button", { name: /自我检查|给自己检查/ }).click();
await page.locator('[aria-label="右侧膝盖正面"]').click();
await page.waitForTimeout(100);
await page.locator('[aria-label="右侧 · 膝内侧关节线"]').click();
for (const select of await page.locator("select").all()) if (!(await select.inputValue())) await select.selectOption({ index: 1 });
await page.getByRole("button", { name: "疼痛，性质说不清", exact: true }).click();
await page.getByRole("button", { name: "没有以上情况", exact: true }).click();
await page.getByRole("button", { name: "走路、站立或负重", exact: true }).click();
await page.locator(".rm-action-picker-grid button").filter({ hasText: "下蹲或起身" }).click();
await page.locator(".rm-action-picker-grid button").filter({ hasText: "上下楼或下台阶" }).click();
await page.getByRole("button", { name: /恢复正常生活/ }).click();
await page.getByRole("button", { name: "进入关键确认", exact: true }).click();
for (const button of await page.getByRole("button", { name: "没有", exact: true }).all()) if (!((await button.getAttribute("class")) ?? "").includes("is-selected")) await button.click();
await page.getByRole("button", { name: "继续填写影像结论", exact: true }).click();
await page.getByRole("button", { name: "没有做影像", exact: true }).click();
await page.getByRole("button", { name: "开始评估检查", exact: true }).click();
await page.getByRole("button", { name: "开始评估检查", exact: true }).click();

for (let round = 0; round < 40; round += 1) {
  const h1 = (await page.locator("h1").first().textContent().catch(() => ""))?.replace(/\s+/g, " ").trim();
  const body = ((await page.locator("main").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
  const visibleRetestTitles = (await page.locator(".rm-batch-range-list article strong").allTextContents().catch(() => []))
    .map((text) => normalize(text))
    .filter(Boolean);
  for (const title of visibleRetestTitles) if (!retestTitles.includes(title)) retestTitles.push(title);
  const buttons = (await page.getByRole("button").allTextContents()).map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean);
  console.log(`ROUND ${round} H1=${h1} BODY=${body.slice(0, 260)}`);
  console.log("BUTTONS", JSON.stringify(buttons.slice(-35)));
  const opened = page.getByRole("button", { name: /打开检查/ }).first();
  if (await opened.count() && await opened.isVisible().catch(() => false) && !await opened.isDisabled().catch(() => true)) {
    await opened.click();
    await page.waitForTimeout(140);
    continue;
  }
  const nextCheck = page.getByRole("button", { name: "下一个检查", exact: true }).first();
  if (await nextCheck.count() && await nextCheck.isVisible().catch(() => false) && !await nextCheck.isDisabled().catch(() => true)) {
    await nextCheck.click();
    await page.waitForTimeout(140);
    continue;
  }
  const finishAssessment = page.getByRole("button", { name: "评估完成，进入处理", exact: true }).first();
  if (await finishAssessment.count() && !await finishAssessment.isDisabled().catch(() => true)) break;
  const functionFinding = /台阶下降控制检查|双腿闭链下蹲功能检查/.test(h1 ?? "");
  const motionFinding = /主动伸直/.test(h1 ?? "")
    ? ["患侧偏小膝后仍明显悬空"]
    : /主动屈曲/.test(h1 ?? "")
      ? ["患侧偏小活动范围受限"]
      : [];
  const retestRange = body.includes("复测清单") ? ["接近目标主动活动幅度与健侧接近"] : [];
  const functionRetest = body.includes("现在这个动作能完成了吗？") ? ["能完成"] : [];
  const tensionFinding = /肌肉紧张度对比/.test(h1 ?? "")
    ? ["大腿外侧髋外侧下方到膝盖外侧上方之间不沿骨头或膝外侧骨点重压肌肉范围示意 · 目标区已标出"]
    : [];
  const candidates = [
    ...(functionFinding ? ["做不完或不敢继续", "没力或撑不住", "担心继续会加重"] : []),
    ...motionFinding,
    ...retestRange,
    ...functionRetest,
    ...tensionFinding,
    "可以做完", "动作基本稳定", "不会", "没有不适", "正常", "没有明显差别", "没有以上情况", "未见明显异常", "未见异常反应没有出现提示信号",
    "保持稳定抬起后膝盖仍笔直", "保持稳定两侧控制接近", "力量接近两侧完成质量相近", "保持稳定完成质量正常动作可稳定完成",
    "接近健侧两侧膝后压平程度相近", "接近健侧两侧幅度相近", "接近健侧", "没有明显差异", "没有明显异常", "没有明显差别没有需要特别标记的区域",
  ];
  let clicked = false;
  for (const name of candidates) {
    if (clicked) break;
    const buttonsOnPage = await page.locator("button").all();
    for (const button of buttonsOnPage) {
      if (!await button.isVisible().catch(() => false)) continue;
      if (normalize((await button.textContent().catch(() => "")) ?? "") !== name) continue;
      const className = (await button.getAttribute("class")) ?? "";
      console.log("CANDIDATE", JSON.stringify(name), "CLASS", className);
      if (className.includes("is-selected") || await button.isDisabled().catch(() => true)) continue;
      await button.click();
      await page.waitForTimeout(140);
      clicked = true;
      break;
    }
    if (clicked) break;
  }
  if (!clicked) {
    const sharedTension = page.getByRole("button", { name: "检查相关肌肉", exact: true }).first();
    if (await sharedTension.count() && await sharedTension.isVisible().catch(() => false) && !await sharedTension.isDisabled().catch(() => true)) {
      await sharedTension.click();
      await page.waitForTimeout(140);
      continue;
    }
    const assessmentSummary = page.getByRole("button", { name: "查看评估结果", exact: true }).first();
    if (await assessmentSummary.count() && await assessmentSummary.isVisible().catch(() => false) && !await assessmentSummary.isDisabled().catch(() => true)) {
      await assessmentSummary.click();
      await page.waitForTimeout(140);
      continue;
    }
    const startTreatment = page.getByRole("button", { name: "开始处理并复测", exact: true }).first();
    if (await startTreatment.count() && await startTreatment.isVisible().catch(() => false) && !await startTreatment.isDisabled().catch(() => true)) {
      await startTreatment.click();
      await page.waitForTimeout(180);
      continue;
    }
    const finishTreatment = page.getByRole("button", { name: /处理完成/ }).first();
    if (await finishTreatment.count() && await finishTreatment.isVisible().catch(() => false) && !await finishTreatment.isDisabled().catch(() => true)) {
      await finishTreatment.click();
      await page.waitForTimeout(180);
      continue;
    }
    const next = page.getByRole("button", { name: /下一步|完成这项检查|继续|评估完成/ }).first();
    if (await next.count() && await next.isVisible().catch(() => false) && !await next.isDisabled().catch(() => true)) { await next.click(); await page.waitForTimeout(140); continue; }
    break;
  }
}
const finalBody = ((await page.locator("main").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
const physicalRetestTitles = [...new Set(retestTitles.filter((title) => /膝关节主动(?:伸直|屈曲)（AROM）/.test(title)))];
assert.ok(physicalRetestTitles.includes("膝关节主动伸直（AROM）"), "RET-02 should expose knee extension retest");
assert.ok(physicalRetestTitles.includes("膝关节主动屈曲（AROM）"), "RET-02 should expose knee flexion retest");
assert.deepEqual(new Set(physicalRetestTitles), new Set(["膝关节主动屈曲（AROM）", "膝关节主动伸直（AROM）"]), "RET-02 should keep distinct physical retest actions");
assert.match(finalBody, /下蹲或起身、上下楼或下台阶/);
assert.match(finalBody, /本次(?:未生成动作评分变化|不生成单一动作评分)/);
console.log(`RET-02：${physicalRetestTitles.join(" -> ")}；功能动作保持为训练/成果记录，不错误复用活动范围复测结果`);
await page.screenshot({ path: ".tmp-ret-action-identity.png", fullPage: true });
await browser.close();
