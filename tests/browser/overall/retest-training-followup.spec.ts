import { expect, test } from "@playwright/test";
import { expectUniqueVisible, openFreshProduct, skipOnboarding } from "../support/page-helpers";

test("刷新后恢复未完成阶段、原答案和本机草稿", async ({ page }) => {
  await openFreshProduct(page);
  await skipOnboarding(page);
  const input = await expectUniqueVisible(page, "本机草稿输入框", page.locator("textarea:visible"));
  const draft = "右膝下楼时内侧不适，刷新后应保留这段内容";
  await input.fill(draft);
  // 草稿保存是 800ms 防抖且桌面端状态提示不渲染为可见文案；等待写入完成后
  // 用真实刷新验证恢复结果，而不是绑定一个不存在的桌面提示。
  await page.waitForTimeout(1_000);
  await page.reload({ waitUntil: "networkidle" });
  await skipOnboarding(page);
  await expect(page.locator("textarea:visible")).toHaveValue(draft);
});

test("多标签页保存发生交错时给出冲突或重新加载提示，而不是静默覆盖", async ({ context, page }) => {
  await openFreshProduct(page);
  await skipOnboarding(page);
  const otherTab = await context.newPage();
  await openFreshProduct(otherTab);
  await skipOnboarding(otherTab);

  await (await expectUniqueVisible(page, "主标签输入框", page.locator("textarea:visible"))).fill("主标签版本");
  await expect(page.locator('[aria-live="polite"]:visible')).toContainText("已保存到本机", { timeout: 5000 });
  await (await expectUniqueVisible(otherTab, "第二标签输入框", otherTab.locator("textarea:visible"))).fill("第二标签版本");
  await expect(otherTab.locator('[aria-live="polite"]:visible')).toContainText("已保存到本机", { timeout: 5000 });
  await expect(page.locator("main")).toContainText(/多标签|冲突|其他标签|重新加载/);
  await otherTab.close();
});

test("处理后加重和训练后加重必须进入独立的停止与聚焦复查证据", async () => {
  test.fixme(true, "本用例需要真实完成处理/训练路径后才能执行，暂未接入稳定的可见控件驱动");
});
