import { expect, test } from "@playwright/test";
import { assertNoRuntimeErrors, collectRuntimeErrors, expectUniqueVisible, openFreshProduct, skipOnboarding } from "../support/page-helpers";

test("SAVE-01 输入后自动保存本机草稿，刷新优先恢复且不生成案例记录 @p0", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await openFreshProduct(page);
  await skipOnboarding(page);
  const input = await expectUniqueVisible(page, "症状输入框", page.locator("textarea:visible"));
  const description = "右膝下楼时内侧不适，今天先记录后再继续";
  await input.fill(description);

  await expect(page.locator('[aria-live="polite"]:visible')).toContainText("已保存到本机", { timeout: 5000 });
  await expect(page.getByRole("button", { name: /康复记录 0/ })).toHaveCount(1);

  await page.reload({ waitUntil: "networkidle" });
  await skipOnboarding(page);
  const restoredInput = await expectUniqueVisible(page, "刷新后恢复的症状输入框", page.locator("textarea:visible"));
  await expect(restoredInput).toHaveValue(description);
  await expect(page.getByRole("button", { name: /康复记录 0/ })).toHaveCount(1);
  await assertNoRuntimeErrors(runtimeErrors);
});

