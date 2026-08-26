import { expect, test } from "@playwright/test";
import { assertNoRuntimeErrors, collectRuntimeErrors, expectUniqueVisible, openFreshProduct, skipOnboarding } from "../support/page-helpers";

test("SAVE-01 输入后自动保存本机草稿，刷新优先恢复且不重复创建案例 @p0", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await openFreshProduct(page);
  await skipOnboarding(page);
  const input = await expectUniqueVisible(page, "症状输入框", page.locator("textarea:visible"));
  const description = "右膝下楼时内侧不适，今天先记录后再继续";
  await input.fill(description);

  await page.waitForTimeout(1_000);
  await expect(page.getByRole("button", { name: /康复记录 1/ })).toHaveCount(1);

  await page.reload({ waitUntil: "networkidle" });
  await skipOnboarding(page);
  const restoredInput = await expectUniqueVisible(page, "刷新后恢复的症状输入框", page.locator("textarea:visible"));
  await expect(restoredInput).toHaveValue(description);
  await expect(page.getByRole("button", { name: /康复记录 1/ })).toHaveCount(1);
  await assertNoRuntimeErrors(runtimeErrors);
});
