/**
 * A-3 / MIX-03：疼痛、肿胀和麻电同时存在时，安全确认优先。
 */

import assert from "node:assert/strict";
import { dismissOnboarding } from "./real-browser-test-helpers.mjs";
import {
  assertNoBrowserRuntimeErrors,
  clickFirstFixedButton,
  clickFixedButton,
  fixedScenarioUrl,
  launchFixedScenario,
  waitForFixedUi,
} from "./real-browser-fixed-scenario-helpers.mjs";

const { browser, page, runtimeErrors } = await launchFixedScenario();

async function clickRightAnkleZone(mode) {
  const picker = page.locator(`.rm-lower-limb-picker.is-${mode}:visible`).first();
  if (!(await picker.count())) return false;
  const field = (await page.locator(".rm-guided-status h2").textContent().catch(() => "")).trim();
  const expectedField = mode === "swelling" ? "肿胀位置" : "麻电范围";
  if (field !== expectedField) return false;
  if (await picker.locator(".rm-location-selection-list article").count()) return false;
  await picker.locator('[aria-label="右侧脚踝正面"]').click();
  await waitForFixedUi(page);
  await picker.locator('[role="button"][aria-label="右侧 · 外踝 / 前外侧"]').click();
  await waitForFixedUi(page);
  console.log(`  ${expectedField}：右侧 · 外踝 / 前外侧`);
  return true;
}

async function clickUnselectedExact(name, label) {
  const button = page.getByRole("button", { name, exact: true }).first();
  if (!(await button.count()) || !await button.isVisible().catch(() => false)) return false;
  if (((await button.getAttribute("class")) ?? "").includes("is-selected")) return false;
  await button.click();
  await waitForFixedUi(page);
  console.log(`  ${label}`);
  return true;
}

await page.goto(fixedScenarioUrl(), { waitUntil: "networkidle", timeout: 30000 });
await dismissOnboarding(page);
await page.locator("textarea").fill("昨晚崴了右脚，外踝疼、肿，还出现麻电，走路越来越没力");
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

for (let index = 0; index < 24; index += 1) {
  const body = await page.locator("body").textContent();
  if (await clickRightAnkleZone("swelling")) continue;
  if (await clickRightAnkleZone("sensory")) continue;
  if (body?.includes("保存本次信息") && !/肿胀位置[\s\S]{0,20}待补充/.test(body)) break;
  if (await clickUnselectedExact("肿胀或淤青", "目前情况：肿胀或淤青")) continue;
  if (await clickUnselectedExact("麻、电或感觉变化", "目前情况：麻、电或感觉变化")) continue;
  if (await clickUnselectedExact("力量不足", "目前情况：力量不足")) continue;

  const select = page.locator("select:visible").first();
  if (await select.count() && !(await select.inputValue())) {
    await select.selectOption({ index: 1 });
    await waitForFixedUi(page);
    console.log("  确认病程");
    continue;
  }

  const next = page.getByRole("button", { name: /下一步|进入关键确认/ }).first();
  if (await next.count() && !await next.isDisabled().catch(() => true)) {
    await next.click();
    await waitForFixedUi(page);
    console.log("  下一步");
    continue;
  }
  break;
}

const finalPage = await page.locator("body").textContent();
assert.match(finalPage ?? "", /肿胀|淤青/);
assert.match(finalPage ?? "", /麻电|麻、电|感觉变化/);
assert.match(finalPage ?? "", /保存本次信息|先由专业人员|线下/);
assert.doesNotMatch(finalPage ?? "", /进入训练|开始训练|普通处理/);
assertNoBrowserRuntimeErrors(runtimeErrors);

await page.screenshot({ path: ".tmp-a-mix-symptoms.png", fullPage: true });
console.log("A-3 / MIX-03 页面证据已保存：.tmp-a-mix-symptoms.png");
await browser.close();
