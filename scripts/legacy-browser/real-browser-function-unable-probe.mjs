import assert from "node:assert/strict";
import { dismissOnboarding } from "./real-browser-test-helpers.mjs";
import {
  clickFirstFixedButton,
  clickFixedButton,
  fixedScenarioUrl,
  launchFixedScenario,
} from "./real-browser-fixed-scenario-helpers.mjs";

const { browser, page, runtimeErrors } = await launchFixedScenario();

await page.goto(fixedScenarioUrl(), { waitUntil: "networkidle", timeout: 30000 });
await dismissOnboarding(page);
await page.locator("textarea").fill("右膝下楼时疼，有三个月了");
await clickFixedButton(page, "帮我整理");
await clickFirstFixedButton(page, /自助康复/, "自助康复");
await clickFirstFixedButton(page, /下一步/, "进入症状信息");
await page.locator('[aria-label="右侧膝盖正面"]').click();
await page.waitForTimeout(120);
await page.locator('[aria-label="右侧 · 膝内侧关节线"]').click();
await clickFirstFixedButton(page, /下一步/, "确认症状位置");
await page.locator("select").selectOption("超过6周");
await clickFirstFixedButton(page, /下一步/, "确认病程");
await clickFixedButton(page, "没有以上情况");
await clickFirstFixedButton(page, /下一步/, "确认目前情况");
await page.locator('input[type="range"]').fill("5");
await clickFirstFixedButton(page, /下一步/, "确认主诉分数");
await clickFirstFixedButton(page, /恢复日常活动/, "选择恢复目标");
await clickFixedButton(page, "进入关键确认");
for (const button of await page.getByRole("button", { name: "没有", exact: true }).all()) {
  if (!((await button.getAttribute("class")) || "").includes("is-selected")) await button.click();
}
await clickFixedButton(page, "继续填写影像结论");
await clickFixedButton(page, "没有做影像");
await clickFixedButton(page, "开始评估检查");
await clickFixedButton(page, "开始评估检查");

const firstTitle = await page.locator("h1").first().textContent();
const firstBody = await page.locator("body").textContent();
console.log(`首次检查：${firstTitle ?? "(无)"}`);
assert.match(firstTitle ?? "", /下楼|台阶/);
assert.match(firstBody ?? "", /做不完或不敢继续/);

await clickFixedButton(page, "做不完或不敢继续", "首次功能动作无法完成");
await page.getByRole("button", { name: "疼或不舒服", exact: true }).click();
const unableBody = (await page.locator("body").textContent()).replace(/\s+/g, " ");
console.log(`无法完成后页面：${unableBody.slice(0, 1500)}`);
await page.screenshot({ path: ".tmp-function-unable-probe.png", fullPage: true });

assert.match(unableBody, /主要是什么原因停下来？疼或不舒服/);
assert.match(unableBody, /不生成动作前后对比/);
assert.equal(await page.getByRole("button", { name: "疼或不舒服", exact: true }).getAttribute("class"), "is-selected");
assert.equal(runtimeErrors.length, 0, runtimeErrors.join(" | "));
await browser.close();
