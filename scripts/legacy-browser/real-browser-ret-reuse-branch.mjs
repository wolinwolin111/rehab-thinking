/**
 * RET-03：真实页面验证“复用最近合法结果后继续下一项”。
 *
 * 先用真实页面完成一条膝关节评估并保存当前处理页，再把本机保存的
 * 快照改成一个已存在处理记录、但没有新增范围记录的队列状态。随后仍
 * 通过“康复记录 → 继续”恢复，验证实际页面出现该分支，点击后记录数
 * 不增加。这个夹具只准备边界状态，不绕过页面渲染和事件处理。
 */

import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { dismissOnboarding } from "./real-browser-test-helpers.mjs";

const URL = process.env.WALKTHROUGH_URL ?? "http://localhost:3000/";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(5000);
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(`pageerror:${error.message}`));
page.on("console", (message) => {
  // This fixture intentionally restores a local-only case. The background
  // sync may receive the expected invite-required 403; it is outside RET-03.
  if (message.type() === "error" && !/responded with a status of 403/.test(message.text())) runtimeErrors.push(`console:${message.text()}`);
});

const normalize = (value) => value.replace(/\s+/g, " ").trim();
const clickExact = async (name) => {
  const button = page.getByRole("button", { name, exact: true }).first();
  await button.click();
  await page.waitForTimeout(160);
};

await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await dismissOnboarding(page);
await page.locator("textarea").fill("右膝内侧疼，有三个月了");
await clickExact("帮我整理");
await page.getByRole("button", { name: /康复思路模式/ }).click();
await page.waitForTimeout(220);
await page.getByRole("button", { name: /下一步/ }).click();
await page.getByRole("button", { name: /自我检查|给自己检查/ }).click();
await page.locator('[aria-label="右侧膝盖正面"]').click();
await page.waitForTimeout(100);
await page.locator('[aria-label="右侧 · 膝内侧关节线"]').click();
for (const select of await page.locator("select").all()) if (!(await select.inputValue())) await select.selectOption({ index: 1 });
await clickExact("疼痛，性质说不清");
await clickExact("没有以上情况");
await clickExact("走路、站立或负重");
await page.locator(".rm-action-picker-grid button").filter({ hasText: "下蹲或起身" }).click();
await page.locator(".rm-action-picker-grid button").filter({ hasText: "上下楼或下台阶" }).click();
await page.getByRole("button", { name: /恢复正常生活/ }).click();
await clickExact("进入关键确认");
for (const button of await page.getByRole("button", { name: "没有", exact: true }).all()) {
  if (!((await button.getAttribute("class")) ?? "").includes("is-selected")) await button.click();
}
await clickExact("继续填写影像结论");
await clickExact("没有做影像");
await clickExact("开始评估检查");
await clickExact("开始评估检查");

const candidates = [
  "做不完或不敢继续", "没力或撑不住", "担心继续会加重", "疼或不舒服", "不知道动作怎么做",
  "接近健侧两侧膝后压平程度相近", "患侧偏小膝后仍明显悬空", "患侧偏小活动范围受限", "无法完成疼痛或担心继续", "暂不判断看不清差异", "暂不检查今天先跳过", "没有不适", "有不适",
  "可以做完", "动作基本稳定", "不会", "保持稳定抬起后膝盖仍笔直", "保持稳定两侧控制接近",
  "力量接近两侧完成质量相近", "没有明显差别没有需要特别标记的区域",
  "接近目标主动活动幅度与健侧接近", "有所改善幅度增加但仍小于健侧", "仍受限主动活动幅度仍小于健侧",
  "未见异常反应没有出现提示信号",
];

for (let round = 0; round < 80; round += 1) {
  const title = normalize(await page.locator("h1").first().textContent().catch(() => ""));
  if (round % 10 === 0) console.log(`RET-03 准备阶段 ${round}: ${title}`);
  if (title === "针对性处理") break;

  const directNext = [
    "打开检查", "下一个检查", "检查相关肌肉", "查看评估结果", "评估完成，进入处理",
    "评估完成，继续", "开始处理并复测", "继续",
  ];
  let acted = false;
  for (const name of directNext) {
    const button = page.getByRole("button", { name, exact: true }).first();
    if (await button.count() && await button.isVisible().catch(() => false) && !await button.isDisabled().catch(() => true)) {
      await button.click();
      await page.waitForTimeout(160);
      if (round < 8) console.log(`  RET-03 点击阶段按钮：${name}`);
      acted = true;
      break;
    }
  }
  if (acted) continue;

  const grids = page.locator(".rm-result-grid:visible");
  for (let gridIndex = 0; gridIndex < await grids.count(); gridIndex += 1) {
    const grid = grids.nth(gridIndex);
    const buttons = grid.locator("button");
    let answered = false;
    for (let buttonIndex = 0; buttonIndex < await buttons.count(); buttonIndex += 1) {
      if (((await buttons.nth(buttonIndex).getAttribute("class")) ?? "").includes("is-selected")) {
        answered = true;
        break;
      }
    }
    if (!answered && await buttons.count()) {
      const preferredPattern = /主动伸直|主动屈曲/.test(title)
        ? /患侧偏小/
        : /功能检查/.test(title)
          ? /做不完或不敢继续/
          : undefined;
      let choice = buttons.first();
      if (preferredPattern) {
        for (let buttonIndex = 0; buttonIndex < await buttons.count(); buttonIndex += 1) {
          const candidate = buttons.nth(buttonIndex);
          if (preferredPattern.test(normalize((await candidate.textContent().catch(() => "")) ?? ""))) {
            choice = candidate;
            break;
          }
        }
      }
      await choice.click();
      await page.waitForTimeout(160);
      if (round < 8) console.log("  RET-03 点击未回答结果组首项");
      acted = true;
      break;
    }
  }
  if (acted) continue;

  for (const name of candidates) {
    const buttons = page.locator("button");
    for (let index = 0; index < await buttons.count(); index += 1) {
      const button = buttons.nth(index);
      if (!await button.isVisible().catch(() => false)) continue;
      if (normalize((await button.textContent().catch(() => "")) ?? "") !== name) continue;
      if (await button.isDisabled().catch(() => true)) continue;
      if (((await button.getAttribute("class")) ?? "").includes("is-selected")) continue;
      await button.click();
      await page.waitForTimeout(160);
      if (round < 8) console.log(`  RET-03 点击评估选项：${name}`);
      acted = true;
      break;
    }
    if (acted) break;
  }
  if (acted) continue;

  const slider = page.locator('input[type="range"]').first();
  if (await slider.count() && await slider.isVisible().catch(() => false) && (await slider.inputValue()) === "0") {
    await slider.fill("3");
    await page.waitForTimeout(160);
    continue;
  }
  throw new Error(`RET-03 夹具准备无法继续：${title}；按钮=${JSON.stringify((await page.locator("button:visible").allTextContents()).slice(-24))}`);
}

assert.equal(normalize(await page.locator("h1").first().textContent()), "针对性处理", "没有进入真实处理页面");
const card = page.locator(".rm-treatment-card:visible").first();
assert.ok(await card.count(), "处理页面没有可识别的候选卡");
assert.doesNotMatch(await card.getAttribute("class"), /is-swelling/, "RET-03 夹具不能使用时间性肿胀卡");
const candidateId = await card.getAttribute("data-candidate-id");
const treatmentPage = page.locator('[data-rehabmind-test="treatment-page"]');
const plannedRetestKey = await treatmentPage.getAttribute("data-planned-retest-action-key");
assert.ok(candidateId, "处理卡缺少候选身份");
assert.ok(plannedRetestKey, "处理页缺少计划复测身份");

await clickExact("保存");
const readIndexedDbRecords = () => page.evaluate(() => new Promise((resolve, reject) => {
  const request = indexedDB.open("rehabmind-local-cases");
  request.onerror = () => reject(request.error ?? new Error("无法读取本机案例"));
  request.onsuccess = () => {
    const transaction = request.result.transaction("case-records", "readonly");
    const read = transaction.objectStore("case-records").get("all");
    read.onerror = () => reject(read.error ?? new Error("无法读取本机案例"));
    read.onsuccess = () => resolve(Array.isArray(read.result) ? read.result : []);
  };
}));
const writeIndexedDbRecords = (nextRecords) => page.evaluate((recordsToWrite) => new Promise((resolve, reject) => {
  const request = indexedDB.open("rehabmind-local-cases");
  request.onerror = () => reject(request.error ?? new Error("无法写入本机案例夹具"));
  request.onsuccess = () => {
    const transaction = request.result.transaction("case-records", "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("无法写入本机案例夹具"));
    transaction.objectStore("case-records").put(recordsToWrite, "all");
  };
}), nextRecords);
await page.waitForFunction(async () => {
  const request = indexedDB.open("rehabmind-local-cases");
  const database = await new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
  const transaction = database.transaction("case-records", "readonly");
  const read = transaction.objectStore("case-records").get("all");
  const records = await new Promise((resolve, reject) => {
    read.onerror = () => reject(read.error);
    read.onsuccess = () => resolve(read.result);
  });
  return Array.isArray(records) && records.length > 0;
}, null, { timeout: 5000 });
const records = await readIndexedDbRecords();
assert.ok(records.length, "真实页面保存后没有产生本机案例");
const record = records[0];
assert.ok(record.snapshot, "本机案例没有可恢复快照");
record.snapshot.trialRecords = [{
  candidateId,
  targetId: "target:ret-03-fixture",
  targetTitle: "上一项已完成处理",
  candidateTitle: "上一项已完成处理",
  treatmentName: "上一项已完成处理",
  action: "轻柔处理",
  measurement: "range",
  beforeScore: 5,
  afterScore: 5,
  result: "same",
  movement: "same",
  retestOnly: false,
  reviewOnly: false,
  timeBased: false,
  retestActionKey: plannedRetestKey,
  rangeOutcomes: {},
  rangeDiscomforts: {},
  rangeScores: {},
}];
await writeIndexedDbRecords(records);
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("button", { name: /康复记录/ }).click();
await page.getByRole("button", { name: "继续", exact: true }).first().click();
await page.waitForTimeout(450);

const reuseButton = page.locator('[data-rehabmind-test="retest-reuse-next"]');
assert.equal(await reuseButton.count(), 1, "真实恢复页面没有出现 RET-03“继续下一项”分支");
assert.equal(await page.locator("main.rm-app").getAttribute("data-trial-record-count"), "1");
assert.equal(await reuseButton.getAttribute("data-retest-action-key"), plannedRetestKey);
await reuseButton.click();
await page.waitForTimeout(300);
assert.equal(await page.locator('[data-rehabmind-test="retest-reuse-next"]').count(), 0, "点击后仍停留在复用分支");
assert.equal(await page.locator("main.rm-app").getAttribute("data-trial-record-count"), "1", "复用历史结果不应新增 trialRecord");
assert.equal(runtimeErrors.length, 0, `RET-03 浏览器运行时错误：${runtimeErrors.join(" | ")}`);
await page.screenshot({ path: ".tmp-ret-reuse-branch.png", fullPage: true });
console.log(`RET-03：真实处理页保存并恢复后出现“继续下一项”，点击后 trialRecord 数量保持 1；动作身份 ${plannedRetestKey}`);
await browser.close();
