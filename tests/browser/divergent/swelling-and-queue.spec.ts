import { expect, test, type Locator, type Page } from "@playwright/test";
import { openFreshProduct, skipOnboarding, assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors, expectUniqueVisible, symptomOrganizeButton } from "../support/page-helpers";
import { prepareProfessionalMultiAction } from "../drivers/pilot-flow";

async function clickUnselected(locator: Locator, description: string) {
  const button = locator.first();
  if (!(await button.count()) || !await button.isVisible().catch(() => false)) return false;
  const selected = ((await button.getAttribute("class")) ?? "").includes("is-selected")
    || (await button.getAttribute("aria-pressed")) === "true";
  if (selected) return false;
  await expect(button, description).toBeVisible();
  await button.click();
  await new Promise((resolve) => setTimeout(resolve, 100));
  return true;
}

async function clickMatching(page: Page, pattern: RegExp, description: string) {
  const buttons = page.locator("button:visible").filter({ hasText: pattern });
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    const selected = ((await button.getAttribute("class")) ?? "").includes("is-selected")
      || (await button.getAttribute("aria-pressed")) === "true";
    if (selected) continue;
    await expect(button, description).toBeVisible();
    await button.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    return true;
  }
  return false;
}

async function chooseLocation(page: Page, mode: "complaint" | "swelling", field: string) {
  const currentField = ((await page.locator(".rm-guided-status h2:visible").first().textContent().catch(() => "")) ?? "").trim();
  if (currentField !== field) return false;
  const picker = page.locator(`.rm-lower-limb-picker.is-${mode}:visible`).first();
  if (!(await picker.count())) return false;
  const sideBtn = picker.locator(".rm-compact-atlas-nav button:visible").filter({ hasText: "右侧" });
  if (await sideBtn.count()) {
    await sideBtn.first().click();
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const zone = picker.locator('[role="button"][aria-label="右侧 · 髌骨周围"]');
  if (!(await zone.count())) return false;
  const selected = (await zone.getAttribute("aria-pressed")) === "true";
  if (selected) return false;
  await zone.click();
  await new Promise((resolve) => setTimeout(resolve, 100));
  return true;
}

async function prepareSwellingOnly(page: Page) {
  await openFreshProduct(page);
  await skipOnboarding(page);
  const input = await expectUniqueVisible(page, "症状输入框", page.locator("textarea:visible"));
  await input.fill("右膝运动后出现明显肿胀，目前没有固定疼痛动作");
  await expectUniqueVisible(page, "症状信息继续按钮", symptomOrganizeButton(page)).then((button) => button.click());
  await expectUniqueVisible(page, "自助康复模式", page.getByRole("button", { name: /自助康复/ })).then((button) => button.click());
  await expectUniqueVisible(page, "进入症状信息", page.getByRole("button", { name: /下一步/ })).then((button) => button.click());

  for (let index = 0; index < 50; index += 1) {
    const title = ((await page.locator("h1:visible").first().textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
    if (/先确认能否安全开始检查/.test(title)) return;
    if (await chooseLocation(page, "complaint", "不舒服的位置")) continue;
    if (await chooseLocation(page, "swelling", "肿胀位置")) continue;

    const emptySelect = page.locator("select:visible").filter({ has: page.locator("option[value='']") }).first();
    if (await emptySelect.count() && !(await emptySelect.inputValue())) {
      await emptySelect.selectOption({ index: 1 });
      continue;
    }
    if (await clickUnselected(page.getByRole("button", { name: "说不清的不适", exact: true }), "无固定疼痛动作的不适性质")) continue;
    if (await clickUnselected(page.getByRole("button", { name: "肿胀或淤青", exact: true }), "肿胀情况")) continue;
    // v3（对照表 #3）：诱发动作统一为多选动作直选制，「没有固定动作」是动作网格内的兜底按钮。
    if (await clickUnselected(page.locator(".rm-unified-provocation:visible").getByRole("button", { name: "没有固定动作", exact: true }), "没有固定动作")) continue;
    if (await clickUnselected(page.getByRole("button", { name: /先消肿止痛/ }), "恢复目标")) continue;

    const enterSafety = page.getByRole("button", { name: "进入关键确认", exact: true }).first();
    if (await enterSafety.count() && !await enterSafety.isDisabled().catch(() => true)) {
      await enterSafety.click();
      return;
    }

    const next = page.getByRole("button", { name: /下一步/ }).first();
    if (await next.count() && !await next.isDisabled().catch(() => true)) {
      await next.click();
      continue;
    }

    const visibleButtons = (await page.locator("button:visible").allTextContents()).map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean).slice(-20);
    throw new Error(`肿胀无固定动作场景无法继续：${title}；${visibleButtons.join(" / ")}`);
  }
  throw new Error("肿胀无固定动作场景在50步内未进入安全确认");
}

async function completeNormalAssessment(page: Page) {
  for (let index = 0; index < 160; index += 1) {
    const title = ((await page.locator("h1:visible").first().textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
    if (/先看清问题，再开始处理/.test(title)) return;
    if (/本阶段成果|评估检查完成/.test(title)) throw new Error(`肿胀场景评估提前结束：${title}`);

    if (await clickMatching(page, /^接近健侧|^可以做完|^可以完成|^角度基本正常|^与另一方向接近|^接近平时范围/, "正常活动范围或功能完成")) continue;
    if (await clickMatching(page, /^没有不适$/, "活动没有不适")) continue;
    if (await clickMatching(page, /^软性终末感$/, "正常终末感")) continue;
    if (await clickMatching(page, /^保持稳定|^动作基本稳定|^力量接近|^完成质量正常|^未见异常反应/, "正常控制或专项检查")) continue;
    if (await clickMatching(page, /^没有明显差别/, "没有明显肌肉差异")) continue;
    if (await clickMatching(page, /^不会$/, "动作没有诱发不适")) continue;

    const next = page.getByRole("button", { name: /下一个检查|检查相关肌肉|查看评估结果/ }).filter({ visible: true }).first();
    if (await next.count() && !await next.isDisabled().catch(() => true)) {
      await next.click();
      await new Promise((resolve) => setTimeout(resolve, 150));
      continue;
    }
    const visibleButtons = (await page.locator("button:visible").allTextContents()).map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean).slice(-25);
    throw new Error(`肿胀场景评估无法继续：${title}；${visibleButtons.join(" / ")}`);
  }
  throw new Error("肿胀场景在160步内未到达评估结果");
}

test.describe("发散决策组合：肿胀与队列", () => {
  test("MIX-02 只有肿胀没有固定疼痛动作：保留观察出口 @divergent", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await prepareSwellingOnly(page);
    const main = page.locator("main:visible");
    await expect(main).toContainText(/安全开始检查/);

    const safetyItems = page.locator(".rm-safety-list article:visible");
    for (let index = 0; index < await safetyItems.count(); index += 1) {
      await safetyItems.nth(index).getByRole("button", { name: "没有", exact: true }).click();
    }
    await page.getByRole("button", { name: /继续填写影像结论|继续填写医生结论/ }).click();
    if (await page.getByRole("button", { name: "没有做影像", exact: true }).count()) {
      await page.getByRole("button", { name: "没有做影像", exact: true }).click();
    }
    await page.getByRole("button", { name: "开始评估检查", exact: true }).click();
    const assessmentStart = page.getByRole("button", { name: "开始评估检查", exact: true });
    if (await assessmentStart.count()) await assessmentStart.click();

    await expect(page.locator("h1:visible").first()).toContainText(/评估检查|膝关节|主动|功能/);
    await expect(page.locator("main:visible")).toContainText(/肿胀|没有固定主诉动作|症状/);
    await expect(page.locator("main:visible")).not.toContainText(/主诉动作评分|疼痛处理/);
    await completeNormalAssessment(page);
    const result = page.locator("main:visible");
    await expect(result).toContainText(/先看清问题，再开始处理/);
    await expect(result).toContainText(/肿胀|观察|没有固定主诉动作/);
    await expect(result).not.toContainText(/本次没有找到需要现场处理的明确问题/);
    await assertNoHorizontalOverflow(page);
    await assertNoRuntimeErrors(runtimeErrors);
  });

  test("MIX-11 正常、未知和异常结果混合：分别保留各自出口 @divergent", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await prepareProfessionalMultiAction(page);
    const click = async (name: string | RegExp, description: string) => {
      const button = await expectUniqueVisible(page, description, page.getByRole("button", { name, exact: typeof name === "string" }));
      await button.click();
    };

    await click("打开检查", "打开混合结果评估");
    // v3 队列顺序：功能卡在前——双腿闭链下蹲 → 台阶下降 → 主动伸直 → 主动屈曲 → 力量。
    await click("暂时不做", "未知的双腿闭链下蹲");
    await click("下一个检查", "进入台阶下降控制检查");
    await click("做不完或不敢继续", "异常的台阶下降");
    await click("没力或撑不住", "台阶下降无法完成原因");
    await click("下一个检查", "进入膝关节主动伸直");
    await click(/^患侧偏小/, "异常的主动伸直范围");
    await click("没有不适", "主动伸直没有不适");
    await click("下一个检查", "进入膝关节主动屈曲");
    await click(/接近健侧.*两侧幅度相近|接近健侧/, "正常的主动屈曲范围");
    await click("没有不适", "主动屈曲没有不适");
    await click("下一个检查", "进入力量检查");
    await click(/控制偏弱.*耐力或保持不足|患侧偏弱.*不舒服这侧更差/, "异常的力量控制");
    await click("检查相关肌肉", "进入相关肌群触诊");
    await click("没有明显差别", "正常的肌群触诊");
    await click("查看评估结果", "查看混合评估结果");

    const main = page.locator("main:visible");
    await expect(page.locator("h1:visible").first()).toContainText("先看清问题，再开始处理");
    await expect(main).toContainText(/暂不做|暂未判断|待确认|活动范围受限|偏小/);
    await expect(main).toContainText(/力量|控制/);
    await expect(main).not.toContainText("所有检查结果都正常");
    await assertNoHorizontalOverflow(page);
    await assertNoRuntimeErrors(runtimeErrors);
  });
});
