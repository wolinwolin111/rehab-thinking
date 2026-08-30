import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors } from "../support/page-helpers";

const PHONE_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
];

test("App shell keeps first use, navigation and records usable at supported phone widths @app-shell @release", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.setViewportSize(PHONE_VIEWPORTS[2]);
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: "你的线上康复助手" })).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "开始康复", exact: true }).click();
  await page.getByLabel("抖音", { exact: true }).check();
  await page.getByRole("dialog", { name: "你从哪里了解到我们？" }).getByRole("button", { name: "继续", exact: true }).click();
  await page.getByLabel("我已了解并同意以上内容", { exact: true }).check();
  await page.getByRole("button", { name: "同意并创建案例", exact: true }).click();
  await expect(page.locator('[data-rehabmind-tutorial="symptom-input"]')).toBeEditable();

  // v3：聚焦教程延迟挂载（约2.5s）——轮询出现即跳过，避免拦截后续点击。
  const tutorial = page.locator(".rm-focus-onboarding");
  const skip = tutorial.getByRole("button", { name: "跳过教程", exact: true });
  try {
    await skip.click({ timeout: 8_000 });
  } catch {
    // 教程未出现则继续
  }
  await expect(tutorial).toHaveCount(0);

  for (const viewport of PHONE_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await expect(page.locator(".rm-mobile-stagebar")).toBeVisible();
    await expect(page.locator(".rm-mobile-top-actions")).toContainText("第1次");
    await assertNoHorizontalOverflow(page);
  }

  await page.getByRole("button", { name: /查看阶段/ }).click();
  const stageDrawer = page.getByRole("dialog", { name: "本次康复阶段" });
  await expect(stageDrawer).toBeVisible();
  await expect(stageDrawer.locator("nav button")).toHaveCount(6);
  await expect(stageDrawer.locator("nav button").nth(1)).toBeDisabled();
  await stageDrawer.getByRole("button", { name: "关闭", exact: true }).click();

  await page.locator(".rm-mobile-summary").click();
  const recordDrawer = page.locator(".rm-case-aside.is-open");
  await expect(recordDrawer).toBeVisible();
  const drawerBox = await recordDrawer.boundingBox();
  expect(drawerBox).not.toBeNull();
  expect(drawerBox!.height).toBeLessThanOrEqual(PHONE_VIEWPORTS.at(-1)!.height * 0.76);
  expect(Math.abs(drawerBox!.y + drawerBox!.height - PHONE_VIEWPORTS.at(-1)!.height)).toBeLessThanOrEqual(2);
  await recordDrawer.getByRole("button", { name: "关闭", exact: true }).click();

  await page.getByRole("button", { name: "更多", exact: true }).click();
  const moreDrawer = page.getByRole("dialog", { name: "更多操作" });
  await expect(moreDrawer).toContainText("案例编号");
  await moreDrawer.getByRole("button", { name: "康复记录", exact: true }).click();
  const recordsPage = page.locator(".rm-records-page");
  await expect(recordsPage).toBeVisible();
  await expect(recordsPage).toContainText("第1次康复");
  await expect(recordsPage).not.toContainText("同步后生成");
  await assertNoHorizontalOverflow(page);
  await recordsPage.getByRole("button", { name: "返回", exact: true }).click();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator(".rm-step-rail")).toBeVisible();
  await expect(page.locator(".rm-top-actions")).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await page.getByRole("button", { name: /康复记录/ }).click();
  await expect(recordsPage).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await recordsPage.getByRole("button", { name: "删除案例", exact: true }).click();
  await expect(recordsPage).toContainText("还没有康复记录");

  await assertNoRuntimeErrors(runtimeErrors);
});
