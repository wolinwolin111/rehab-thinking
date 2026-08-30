import { expect, test } from "@playwright/test";
import { assertNoRuntimeErrors, collectRuntimeErrors, expectUniqueVisible, openFreshProduct, skipOnboarding, symptomOrganizeButton } from "../support/page-helpers";

// U 组：非生产区域语义（7c3e734 删除后）——「暂不支持」提示由 UNSUPPORTED_REGION_NAMES 名称表驱动。
// 提示文案：暂不支持<span 区域名>，现在只开放大腿至足部。

async function inputPain(page: import("@playwright/test").Page, text: string) {
  await openFreshProduct(page);
  await skipOnboarding(page);
  const input = await expectUniqueVisible(page, "症状输入框", page.locator("textarea:visible"));
  await input.fill(text);
  await (await expectUniqueVisible(page, "症状信息继续按钮", symptomOrganizeButton(page))).click();
  await expect(page.locator("main:visible")).toContainText(/暂不支持/, { timeout: 8_000 });
}

test("U-1 提肩 → 暂不支持提示（肩关节与肩胛）@scenario", async ({ page }) => {
  test.setTimeout(180_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await inputPain(page, "左边肩膀抬不起来，疼了两天");
  await expect(page.locator("main:visible")).toContainText("暂不支持肩关节与肩胛");
  await expect(page.locator("main:visible")).toContainText("现在只开放大腿至足部");
  await assertNoRuntimeErrors(runtimeErrors);
});

test("U-2 提颈 → 暂不支持提示（颈部）@scenario", async ({ page }) => {
  test.setTimeout(180_000);
  const runtimeErrors = collectRuntimeErrors(page);
  await inputPain(page, "脖子僵硬好几天了，转头疼");
  await expect(page.locator("main:visible")).toContainText("暂不支持颈部");
  await assertNoRuntimeErrors(runtimeErrors);
});
