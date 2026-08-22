import { expect, test, type Locator, type Page } from "@playwright/test";
import { prepareGuidedChiefProgression } from "../drivers/pilot-flow";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors } from "../support/page-helpers";

type Combination = "function-pain" | "range-limited";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function clickFirstUnselected(page: Page, locator: Locator, description: string) {
  const visible = locator;
  const count = await visible.count();
  for (let index = 0; index < count; index += 1) {
    const button = visible.nth(index);
    const selected = ((await button.getAttribute("class")) ?? "").includes("is-selected")
      || (await button.getAttribute("aria-pressed")) === "true"
      || (await button.getAttribute("aria-selected")) === "true";
    if (selected) continue;
    await expect(button, description).toBeVisible();
    await button.click();
    await page.waitForTimeout(100);
    return true;
  }
  return false;
}

async function completePainDetails(page: Page) {
  const location = page.getByRole("button", { name: "右侧 · 膝内侧关节线", exact: true }).first();
  if (await location.count()
    && !((await location.getAttribute("class")) ?? "").includes("is-selected")
    && (await location.getAttribute("aria-pressed")) !== "true"
    && (await location.getAttribute("aria-selected")) !== "true") {
    await location.click();
    await page.waitForTimeout(100);
    return true;
  }
  const feeling = page.locator(".rm-motion-symptom-detail select:visible").first();
  if (await feeling.count() && !(await feeling.inputValue())) {
    await feeling.selectOption({ index: 1 });
    return true;
  }
  const score = page.locator(".rm-motion-symptom-detail input[type=range]:visible").first();
  if (await score.count() && (await score.inputValue()) === "0") {
    await score.fill("4");
    return true;
  }
  return false;
}

async function answerCurrentAssessment(page: Page, combination: Combination) {
  const button = (text: string | RegExp) => page.locator("button:visible").filter({ hasText: typeof text === "string" ? new RegExp(`^${escapeRegExp(text)}$`) : text });
  const functionComplete = button("可以做完");
  if (await functionComplete.count()) {
    await clickFirstUnselected(page, functionComplete, "功能完成状态");
    await clickFirstUnselected(page, button("动作基本稳定"), "功能控制状态");
    const discomfort = combination === "function-pain" ? "会" : "不会";
    const changed = await clickFirstUnselected(page, button(discomfort), "功能动作不适状态");
    if (discomfort === "会") return changed || await completePainDetails(page);
    return changed;
  }

  const activeRange = combination === "range-limited"
    ? button(/患侧偏小/)
    : button(/接近健侧|可以完成.*动作顺畅/);
  if (await clickFirstUnselected(page, activeRange, "主动活动范围")) return true;

  if (await clickFirstUnselected(page, button("没有不适"), "活动不适")) return true;
  if (await clickFirstUnselected(page, button(/保持稳定|力量接近|完成质量正常/), "力量或控制")) return true;
  if (await clickFirstUnselected(page, button(/未见异常反应/), "专项检查")) return true;
  if (await clickFirstUnselected(page, button(/没有明显差别.*需要特别标记/), "肌肉比较")) return true;
}

async function reachAssessmentSummary(page: Page, combination: Combination) {
  for (let index = 0; index < 120; index += 1) {
    const title = (await page.locator("h1:visible").first().textContent()) ?? "";
    if (/先看清问题，再开始处理/.test(title)) return;
    if (/评估检查完成|本阶段成果/.test(title)) throw new Error(`组合场景提前结束：${title}`);

    if (await answerCurrentAssessment(page, combination)) continue;

    const next = page.getByRole("button", { name: /下一个检查|检查相关肌肉|查看评估结果/ }).first();
    if (await next.count() && !await next.isDisabled().catch(() => true)) {
      await next.click();
      await page.waitForTimeout(160);
      continue;
    }

    const visibleButtons = (await page.locator("button:visible").allTextContents()).map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean).slice(-20);
    throw new Error(`组合场景无法继续：${title}；按钮=${visibleButtons.join(" / ")}`);
  }
  throw new Error("组合场景在120步内未到达评估结果");
}

test.describe("发散决策组合", () => {
  test("MIX-06 活动接近健侧但功能动作仍疼痛：功能问题不能被活动正常清除 @divergent", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await prepareGuidedChiefProgression(page);
    await reachAssessmentSummary(page, "function-pain");

    const result = page.locator("main:visible");
    await expect(result).toContainText(/先看清问题，再开始处理/);
    await expect(result).toContainText(/动作|不适|疼/);
    await expect(result).not.toContainText("本次没有找到需要现场处理的明确问题");
    await assertNoHorizontalOverflow(page);
    await assertNoRuntimeErrors(runtimeErrors);
  });

  test("MIX-07 活动受限但没有疼痛：区分活动度问题和疼痛问题 @divergent", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await prepareGuidedChiefProgression(page);
    await reachAssessmentSummary(page, "range-limited");

    const result = page.locator("main:visible");
    await expect(result).toContainText(/先看清问题，再开始处理/);
    await expect(result).toContainText(/活动范围受限|活动受限|偏小/);
    await expect(result).not.toContainText("本次没有找到需要现场处理的明确问题");
    await assertNoHorizontalOverflow(page);
    await assertNoRuntimeErrors(runtimeErrors);
  });
});
