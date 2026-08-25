/**
 * A-2 / SAFE-04：麻电、感觉变化或新的明显无力必须进入专业确认出口。
 *
 * 只走到安全出口，不继续点击后续处理；普通肌肉处理和训练不是这个场景的
 * 合法出口，脚本会把它们作为禁止内容断言。
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

const URL = fixedScenarioUrl();
const { browser, page, runtimeErrors } = await launchFixedScenario();

async function chooseRightAnkleSensoryZone() {
  const field = (await page.locator(".rm-guided-status h2").textContent().catch(() => "")).trim();
  if (field !== "麻电范围") return false;
  const picker = page.locator(".rm-lower-limb-picker.is-sensory:visible").first();
  if (await picker.locator(".rm-location-selection-list article").count()) return false;
  await picker.locator('[aria-label="右侧脚踝正面"]').click();
  await waitForFixedUi(page);
  await picker.locator('[role="button"][aria-label="右侧 · 外踝 / 前外侧"]').click();
  await waitForFixedUi(page);
  console.log("  麻电范围：右侧 · 外踝 / 前外侧");
  return true;
}

await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
await dismissOnboarding(page);
await page.locator("textarea").fill("右脚外踝以下麻电，脚趾感觉变差，走路越来越没力");
await clickFixedButton(page, "帮我整理");
await clickFirstFixedButton(page, /自助康复/, "自助康复");
await clickFirstFixedButton(page, /下一步/, "进入症状信息");

const firstPicker = page.locator(".rm-lower-limb-picker.is-complaint:visible").first();
if (await firstPicker.count()) {
  await firstPicker.locator('[aria-label="右侧脚踝正面"]').click();
  await waitForFixedUi(page);
  await firstPicker.locator('[role="button"][aria-label="右侧 · 外踝 / 前外侧"]').click();
  await waitForFixedUi(page);
  console.log("  不舒服的位置：右侧 · 外踝 / 前外侧");
}

for (let index = 0; index < 20; index += 1) {
  const body = await page.locator("body").textContent();
  if (await chooseRightAnkleSensoryZone()) continue;
  if (body?.includes("保存本次信息") && !/麻电范围[\s\S]{0,20}待补充/.test(body)) break;

  const sensory = page.getByRole("button", { name: "麻、电或感觉变化", exact: true }).first();
  if (await sensory.count() && await sensory.isVisible().catch(() => false) && !((await sensory.getAttribute("class")) ?? "").includes("is-selected")) {
    await sensory.click();
    await waitForFixedUi(page);
    console.log("  目前情况：麻、电或感觉变化");
    continue;
  }

  const weakness = page.getByRole("button", { name: "力量不足", exact: true }).first();
  if (await weakness.count() && await weakness.isVisible().catch(() => false) && !((await weakness.getAttribute("class")) ?? "").includes("is-selected")) {
    await weakness.click();
    await waitForFixedUi(page);
    console.log("  目前情况：力量不足");
    continue;
  }

  const select = page.locator("select:visible").first();
  if (await select.count() && !(await select.inputValue())) {
    await select.selectOption({ index: 1 });
    await waitForFixedUi(page);
    console.log("  确认病程");
    continue;
  }

  const next = page.getByRole("button", { name: /下一步|进入关键确认/ }).filter({ visible: true }).first();
  if (await next.count() && !await next.isDisabled().catch(() => true)) {
    await next.click();
    await waitForFixedUi(page);
    console.log("  下一步");
    continue;
  }
  break;
}

const finalTitle = await page.locator("h1").first().textContent().catch(() => "");
const finalPage = await page.locator("body").textContent();
console.log(`安全分流页面：${finalTitle ?? "(无标题)"}`);
assert.match(finalPage ?? "", /专业人员|医学评估|先由专业人员/);
assert.doesNotMatch(finalPage ?? "", /进入训练|开始训练|常规处理|普通处理/);
assertNoBrowserRuntimeErrors(runtimeErrors);

await page.screenshot({ path: ".tmp-a-safe-neural.png", fullPage: true });
console.log("A-2 / SAFE-04 页面证据已保存：.tmp-a-safe-neural.png");
await browser.close();
