import { expect, test } from "@playwright/test";
import { prepareProfessionalMultiAction } from "../drivers/pilot-flow";

test("TEMP 枚举评估队列卡片顺序", async ({ page }) => {
  await prepareProfessionalMultiAction(page);
  await page.getByRole("button", { name: "打开检查", exact: true }).click();
  await expect(page.locator("h1:visible").first()).not.toContainText("按阶段查看这次康复");

  const seen: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    const title = ((await page.locator("h1:visible").first().textContent().catch(() => "")) ?? "").trim();
    const question = ((await page.locator("h3:visible").first().textContent().catch(() => "")) ?? "").trim();
    const options = (await page.locator("button:visible").allTextContents())
      .map((t) => t.replace(/\s+/g, " ").trim())
      .filter((t) => t && !/^(RM|关于|问题反馈|保存草稿|返回|下一个检查|上一个检查|查看评估结果|检查相关肌肉|🛠|关闭)/.test(t));
    seen.push(`${i + 1}. [${title}] (${question}) 选项: ${options.slice(0, 8).join(" | ")}`);
    // 点击第一个可答选项
    const answerable = page.getByRole("button", { name: /可以做完|接近健侧|保持稳定|力量接近|未见异常反应|没有明显差别|没有不适/ }).first();
    if (await answerable.count()) {
      await answerable.click();
      await page.waitForTimeout(250);
    }
    const next = page.getByRole("button", { name: "下一个检查" }).first();
    if (!(await next.count()) || await next.isDisabled().catch(() => true)) break;
    await next.click();
    await page.waitForTimeout(400);
  }
  console.log("=== 卡片序列 ===\n" + seen.join("\n"));
});
