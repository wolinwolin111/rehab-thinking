import { expect, type Page } from "@playwright/test";
import { expectUniqueVisible, openFreshProduct, skipOnboarding, symptomOrganizeButton } from "../support/page-helpers";

async function clickUnique(page: Page, name: string | RegExp, description: string) {
  const button = await expectUniqueVisible(page, description, page.getByRole("button", { name, exact: typeof name === "string" }));
  await button.click();
  return button;
}

async function chooseVisibleSelects(page: Page) {
  const selects = page.locator("select:visible");
  await expect.poll(() => selects.count(), { message: "固定场景必须出现病程/检查条件选择框" }).toBeGreaterThan(0);
  const count = await selects.count();
  for (let index = 0; index < count; index += 1) {
    const select = selects.nth(index);
    const options = await select.locator("option").allTextContents();
    if (options.includes("超过6周")) await select.selectOption({ label: "超过6周" });
    else await select.selectOption({ index: 1 });
  }
}

async function chooseKneeLocation(page: Page) {
  const side = await expectUniqueVisible(page, "右侧侧别按钮", page.locator(".rm-compact-atlas-nav button:visible").filter({ hasText: "右侧" }));
  await side.click();
  const area = await expectUniqueVisible(page, "膝盖部位按钮", page.locator(".rm-compact-atlas-nav button:visible").filter({ hasText: "膝盖" }));
  await area.click();
  const medial = await expectUniqueVisible(page, "右侧膝内侧关节线", page.locator('[aria-label="右侧 · 膝内侧关节线"]:visible'));
  await medial.click();
}

async function completeSafetyToAssessment(page: Page) {
  await clickUnique(page, "进入关键确认", "进入关键确认");
  const safetyItems = page.locator(".rm-safety-list article:visible");
  const safetyCount = await safetyItems.count();
  expect(safetyCount, "安全确认项目必须逐项呈现").toBeGreaterThan(0);
  for (let index = 0; index < safetyCount; index += 1) {
    const item = safetyItems.nth(index);
    const no = await expectUniqueVisible(page, `安全确认第${index + 1}项的“没有”`, item.getByRole("button", { name: "没有", exact: true }));
    await no.click();
  }
  await clickUnique(page, "继续填写影像结论", "继续填写影像结论");
  await clickUnique(page, "没有做影像", "没有做影像");
  await clickUnique(page, "开始评估检查", "开始评估检查");
  await clickUnique(page, "开始评估检查", "确认开始评估检查");
}

export async function prepareGuidedChiefProgression(page: Page, options: { stopAtBaselineScore?: boolean } = {}) {
  await openFreshProduct(page);
  await skipOnboarding(page);
  const input = await expectUniqueVisible(page, "症状输入框", page.locator("textarea:visible"));
  await input.fill("右膝下蹲时疼，有两个月了");
  await (await expectUniqueVisible(page, "症状信息继续按钮", symptomOrganizeButton(page))).click();
  await clickUnique(page, /自助康复/, "自助康复模式");
  await clickUnique(page, /下一步/, "进入症状信息");
  await chooseKneeLocation(page);
  await clickUnique(page, /下一步/, "确认症状位置");
  await chooseVisibleSelects(page);
  await clickUnique(page, /下一步/, "确认病程");
  await clickUnique(page, "没有以上情况", "目前情况没有以上情况");
  await clickUnique(page, /下一步/, "确认目前情况");
  const slider = await expectUniqueVisible(page, "主诉基线分数滑条", page.locator('input[type="range"]:visible'));
  await slider.fill("5");
  if (options.stopAtBaselineScore) return;
  await clickUnique(page, /下一步/, "确认主诉分数");
  await clickUnique(page, /恢复日常活动/, "恢复日常活动");
  await completeSafetyToAssessment(page);
}

export async function prepareProfessionalMultiAction(page: Page) {
  await openFreshProduct(page);
  await skipOnboarding(page);
  const input = await expectUniqueVisible(page, "症状输入框", page.locator("textarea:visible"));
  await input.fill("右膝内侧疼，有三个月了");
  await (await expectUniqueVisible(page, "症状信息继续按钮", symptomOrganizeButton(page))).click();
  await clickUnique(page, /康复思路模式/, "康复思路模式");
  await clickUnique(page, /下一步/, "进入专业工作台");
  await clickUnique(page, /自我检查|给自己检查/, "给自己检查");
  await chooseKneeLocation(page);
  await chooseVisibleSelects(page);
  await clickUnique(page, "疼痛，性质说不清", "疼痛性质");
  await clickUnique(page, "没有以上情况", "其他情况没有以上情况");
  // v3（对照表 #3）：诱发动作统一为多选动作直选制，类别按钮（走路、站立或负重）退役。
  // 只选「下蹲」「下楼或下台阶」两个动作，避免引入额外的走路功能卡。
  const squat = await expectUniqueVisible(page, "下蹲动作", page.locator(".rm-action-picker-grid button:visible").filter({ hasText: /^下蹲$/ }));
  await squat.click();
  const stairs = await expectUniqueVisible(page, "下楼或下台阶动作", page.locator(".rm-action-picker-grid button:visible").filter({ hasText: /^下楼或下台阶$/ }));
  await stairs.click();
  await clickUnique(page, /恢复正常生活/, "恢复正常生活目标");
  await completeSafetyToAssessment(page);
}
