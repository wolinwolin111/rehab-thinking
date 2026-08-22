/**
 * B-1 / SAFE-02：急性踝伤出现高风险安全信号时停止普通流程。
 */

import assert from "node:assert/strict";
import { deletePilotCase, dismissOnboarding } from "./real-browser-test-helpers.mjs";
import {
  clickFirstFixedButton,
  clickFixedButton,
  fixedScenarioUrl,
  launchFixedScenario,
  readLocalCaseRecords,
  waitForFixedUi,
  waitForSyncedLocalCase,
} from "./real-browser-fixed-scenario-helpers.mjs";

const { browser, page, runtimeErrors } = await launchFixedScenario();
if (process.env.PILOT_OFFLINE === "1") {
  await page.route("**/api/pilot/**", (route) => route.abort());
}

async function chooseAnklePicker(mode, field) {
  if ((await page.locator(".rm-guided-status h2").textContent().catch(() => "")).trim() !== field) return false;
  const picker = page.locator(`.rm-lower-limb-picker.is-${mode}:visible`).first();
  if (!(await picker.count()) || await picker.locator(".rm-location-selection-list article").count()) return false;
  await picker.locator('[aria-label="右侧脚踝正面"]').click();
  await waitForFixedUi(page);
  await picker.locator('[role="button"][aria-label="右侧 · 外踝 / 前外侧"]').click();
  await waitForFixedUi(page);
  return true;
}

await page.goto(fixedScenarioUrl(), { waitUntil: "networkidle", timeout: 30000 });
await dismissOnboarding(page);
await page.locator("textarea").fill("昨晚崴了右脚，外踝肿痛");
await clickFixedButton(page, "帮我整理");
await clickFirstFixedButton(page, /自助康复/, "自助康复");
await clickFirstFixedButton(page, /下一步/, "进入症状信息");

const complaintPicker = page.locator(".rm-lower-limb-picker.is-complaint:visible").first();
if (await complaintPicker.count()) {
  await complaintPicker.locator('[aria-label="右侧脚踝正面"]').click();
  await waitForFixedUi(page);
  await complaintPicker.locator('[role="button"][aria-label="右侧 · 外踝 / 前外侧"]').click();
  await waitForFixedUi(page);
}

for (let index = 0; index < 30; index += 1) {
  const title = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
  if (title.includes("先确认能否安全开始检查")) break;
  if (await chooseAnklePicker("complaint", "不舒服的位置")) continue;
  if (await chooseAnklePicker("swelling", "肿胀位置")) continue;

  const selects = page.locator("select:visible");
  let selected = false;
  for (let selectIndex = 0; selectIndex < await selects.count(); selectIndex += 1) {
    const select = selects.nth(selectIndex);
    if (await select.inputValue()) continue;
    const options = await select.locator("option").allTextContents();
    if (options.includes("扭转或崴伤")) await select.selectOption("扭转或崴伤");
    else if (options.includes("今天或昨天")) await select.selectOption("今天或昨天");
    else await select.selectOption({ index: 1 });
    await waitForFixedUi(page);
    selected = true;
    break;
  }
  if (selected) continue;

  const unknownAction = page.getByRole("button", { name: "说不清 / 没有固定动作", exact: true }).first();
  if (await unknownAction.count() && !((await unknownAction.getAttribute("class")) || "").includes("is-selected")) {
    await unknownAction.click();
    await waitForFixedUi(page);
    continue;
  }

  const swelling = page.getByRole("button", { name: "肿胀或淤青", exact: true }).first();
  if (await swelling.count() && !((await swelling.getAttribute("class")) || "").includes("is-selected")) {
    await swelling.click();
    await waitForFixedUi(page);
    continue;
  }

  const goal = page.getByRole("button", { name: /恢复日常活动/ }).first();
  if (await goal.count() && !((await goal.getAttribute("class")) || "").includes("is-selected")) {
    await goal.click();
    await waitForFixedUi(page);
    continue;
  }

  const next = page.getByRole("button", { name: /下一步|进入关键确认/ }).filter({ visible: true }).first();
  if (await next.count() && !await next.isDisabled().catch(() => true)) {
    await next.click();
    await waitForFixedUi(page);
    continue;
  }
  throw new Error(`安全场景症状收集无法继续：${title}；字段=${(await page.locator(".rm-guided-status h2").allTextContents()).join(" / ")}；按钮=${(await page.locator("button:visible").allTextContents()).map((text) => text.replace(/\s+/g, " ").trim()).slice(-20).join(" / ")}`);
}

assert.match(await page.locator("h1").first().textContent(), /先确认能否安全开始检查/);
const safetyArticles = page.locator(".rm-safety-list article");
assert.ok(await safetyArticles.count() >= 3, "急性踝伤应出现安全信号确认项");
for (let index = 0; index < await safetyArticles.count(); index += 1) {
  const article = safetyArticles.nth(index);
  const answer = article.getByRole("button", { name: /远端持续发白|发凉|感觉明显下降/.test(await article.textContent()) ? "有" : "没有", exact: true });
  await answer.click();
}
await clickFixedButton(page, "继续填写医生结论", "安全信号后继续");

const boneArticles = page.locator(".rm-bone-check article");
assert.equal(await boneArticles.count(), 3, "急性踝伤应出现三项骨性风险确认");
await boneArticles.nth(0).getByRole("button", { name: "是", exact: true }).click();
await boneArticles.nth(1).getByRole("button", { name: "不能", exact: true }).click();
await boneArticles.nth(2).getByRole("button", { name: "不能", exact: true }).click();
await clickFixedButton(page, "继续填写影像结论", "骨性风险后继续");
await clickFixedButton(page, "没有做影像", "没有做影像");

const safetyBody = (await page.locator("body").textContent()).replace(/\s+/g, " ");
const startAssessment = page.getByRole("button", { name: "开始评估检查", exact: true });
assert.match(safetyBody, /先完成针对性医学评估|保存本次信息/);
assert.equal(await startAssessment.isDisabled(), true, "高风险且无影像/医生结论时不得开始普通评估");
assert.doesNotMatch(safetyBody, /进入训练|开始训练/);
await page.getByRole("button", { name: "保存本次信息", exact: true }).click();
await page.waitForTimeout(process.env.PILOT_OFFLINE === "1" ? 700 : 180);

if (process.env.PILOT_OFFLINE === "1") {
  const localRecords = await page.evaluate(() => JSON.parse(window.localStorage.getItem("rehabmind-complete-demo-records") || "[]"));
  assert.ok(Array.isArray(localRecords) && localRecords.length === 1, "网络失败时仍应保存一条本机案例记录");
  const offlineText = ((await page.locator("main").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
  assert.match(offlineText, /本机已保存|服务器暂时未同步/);
  await page.reload({ waitUntil: "networkidle", timeout: 30000 });
  await dismissOnboarding(page);
  const restoredRecords = await page.evaluate(() => JSON.parse(window.localStorage.getItem("rehabmind-complete-demo-records") || "[]"));
  assert.equal(restoredRecords.length, 1, "刷新后本机案例记录不能丢失");
  console.log("离线保存与刷新恢复：本机案例仍保留，页面未伪装成已同步");
}

const unexpectedRuntimeErrors = process.env.PILOT_OFFLINE === "1"
  ? runtimeErrors.filter((error) => !error.includes("net::ERR_FAILED"))
  : runtimeErrors;
if (unexpectedRuntimeErrors.length) throw new Error(`浏览器运行时出现错误：${unexpectedRuntimeErrors.join(" | ")}`);
await page.screenshot({ path: ".tmp-b-acute-high-risk.png", fullPage: true });
if (process.env.PILOT_PRESERVE_TEST_DATA !== "1") {
  const records = process.env.PILOT_OFFLINE === "1" ? await readLocalCaseRecords(page) : await waitForSyncedLocalCase(page);
  const record = records[0];
  if (record?.pilotCaseId && record?.pilotAccessToken) {
    const cleanup = await deletePilotCase(page, { caseId: record.pilotCaseId, accessToken: record.pilotAccessToken });
    assert.equal(cleanup?.status, 200, `急性高风险场景测试案例清理失败：${JSON.stringify(cleanup)}`);
    console.log("测试数据清理：已删除急性高风险场景案例");
  }
}
await browser.close();
