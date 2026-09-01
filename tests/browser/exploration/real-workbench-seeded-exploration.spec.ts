import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { openFreshProduct, skipOnboarding } from "../support/page-helpers";

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 0x100000000;
  };
}

async function describeControl(control: ReturnType<Page["locator"]>) {
  return control.evaluate((node) => ({
    tag: node.tagName.toLowerCase(),
    type: node instanceof HTMLInputElement ? node.type : null,
    label: node.getAttribute("aria-label"),
    text: (node.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 80),
  }));
}

async function exploreVisibleControls(page: Page, testInfo: TestInfo, seed: number) {
  const random = seededRandom(seed);
  const operations: Array<Record<string, unknown>> = [];
  try {
    const input = page.locator("textarea:visible").first();
    if (await input.count()) {
      await input.fill(`seed-${seed}：右膝活动时不适`);
      operations.push({ action: "fill", control: await describeControl(input) });
    }

    for (let step = 0; step < 8; step += 1) {
      // 只从最上层真实可操作面板取控件。背景里的可见节点可能被弹层遮挡，
      // 不能把“DOM 可见”误当成“用户当前可以点击”。
      const dialogs = page.locator('[role="dialog"]:visible');
      const surface = (await dialogs.count()) ? dialogs.last() : page.locator("main");
      const controls = surface.locator("button:visible, input:visible, textarea:visible, select:visible");
      const count = await controls.count();
      if (!count) break;
      const control = controls.nth(Math.floor(random() * count));
      if (!(await control.isEnabled().catch(() => false))) continue;
      const description = await describeControl(control);
      const tag = description.tag;
      if (tag === "textarea") {
        await control.fill(`seed-${seed}-step-${step}`);
        operations.push({ action: "fill", control: description });
      } else if (tag === "select") {
        const options = await control.locator("option").count();
        if (options > 1) {
          await control.selectOption({ index: 1 });
          operations.push({ action: "select", control: description });
        }
      } else if (description.type === "radio" || description.type === "checkbox") {
        await control.check();
        operations.push({ action: "check", control: description });
      } else {
        await control.click();
        operations.push({ action: "click", control: description });
      }
    }
    await expect(page.locator("body")).toContainText("悦舒运动康复");
  } catch (error) {
    const screenshotPath = testInfo.outputPath(`seed-${seed}-failure.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    await testInfo.attach("seed", { body: Buffer.from(String(seed)), contentType: "text/plain" });
    await testInfo.attach("operation-trace", { body: Buffer.from(JSON.stringify(operations, null, 2)), contentType: "application/json" });
    await testInfo.attach("failure-screenshot", { path: screenshotPath, contentType: "image/png" });
    throw error;
  }

  await testInfo.attach("seed", { body: Buffer.from(String(seed)), contentType: "text/plain" });
  await testInfo.attach("operation-trace", { body: Buffer.from(JSON.stringify(operations, null, 2)), contentType: "application/json" });
}

test("固定 seed 驱动真实可见控件探索并保存失败证据 @exploration", async ({ page }, testInfo) => {
  const seed = Number.parseInt(process.env.EXPLORATION_SEED ?? "20260827", 10);
  await openFreshProduct(page);
  await skipOnboarding(page);
  await exploreVisibleControls(page, testInfo, Number.isFinite(seed) ? seed : 20260827);
});
