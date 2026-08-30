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

async function chooseKneeLocation(page: Page, areaLabel = "膝内侧关节线") {
  // 集中填写页与分步页的图区按钮结构不同：优先精确角色名（可能重复渲染，取首个），回退到紧凑图导航。
  const sideExact = page.getByRole("button", { name: "右侧", exact: true });
  const sideButton = (await sideExact.count()) ? sideExact.first() : page.locator(".rm-compact-atlas-nav button:visible").filter({ hasText: "右侧" });
  await expect(sideButton, "右侧侧别按钮必须可见").toBeVisible();
  await sideButton.click();
  const areaExact = page.getByRole("button", { name: "膝盖", exact: true });
  const areaButton = (await areaExact.count()) ? areaExact.first() : page.locator(".rm-compact-atlas-nav button:visible").filter({ hasText: "膝盖" });
  await expect(areaButton, "膝盖部位按钮必须可见").toBeVisible();
  await areaButton.click();
  const medial = page.locator(`[aria-label="右侧 · ${areaLabel}"]:visible`).first();
  await expect(medial, `右侧${areaLabel}必须可见`).toBeVisible();
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

/** 专业模式评估队列的固定答案序列（与 RET-02 一致，供 C/B 组链路复用）。 */
export async function completeProfessionalAssessment(page: Page) {
  const click = async (name: string | RegExp, description: string) => {
    const button = await expectUniqueVisible(page, description, page.getByRole("button", { name, exact: typeof name === "string" }));
    await button.click();
  };
  await click("打开检查", "打开评估检查");
  await click("做不完或不敢继续", "下蹲功能无法完成");
  await click("没力或撑不住", "下蹲功能无法完成原因");
  await click("下一个检查", "进入台阶下降控制检查");
  await click("做不完或不敢继续", "台阶动作无法完成");
  await click("没力或撑不住", "台阶动作无法完成原因");
  await click("下一个检查", "进入膝关节主动伸直");
  await click(/患侧偏小.*膝后仍明显悬空/, "主动伸直活动受限");
  await click("没有不适", "主动伸直没有不适");
  await click("下一个检查", "进入膝关节主动屈曲");
  await click(/患侧偏小.*活动范围受限/, "主动屈曲活动受限");
  await click("没有不适", "主动屈曲没有不适");
  await click("下一个检查", "进入大腿内侧力量检查");
  await click(/力量接近.*两侧完成质量相近/, "大腿内侧力量接近");
  await click("检查相关肌肉", "进入肌肉紧张度对比");
  await click("没有明显差别", "肌肉紧张度无明显差别");
  await click("查看评估结果", "查看评估结果");
  await expect(page.locator("h1:visible")).toContainText("先看清问题，再开始处理");
  await click("评估完成，继续", "确认评估结果");
  await click("开始处理并复测", "开始处理并复测");
}

export type ProfessionalFunctionRetest = "complete" | "unable";

/**
 * 专业自我检查 + 单一主诉动作（下蹲）+ 基线评分确认。
 * C 组前提：单动作才有可比较的主诉分数（处理前后同分 → 主诉未解决）。
 */
export async function prepareProfessionalSingleAction(page: Page) {
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
  const squat = await expectUniqueVisible(page, "下蹲动作", page.locator(".rm-action-picker-grid button:visible").filter({ hasText: /^下蹲$/ }));
  await squat.click();
  // 单一动作 → 出现基线不适评分。
  const slider = page.locator('input[type="range"]:visible').first();
  if (await slider.count()) await slider.fill("5");
  const advance = page.getByRole("button", { name: /下一步|确认/, exact: false }).first();
  if (await advance.count() && await advance.isEnabled()) await advance.click();
  await clickUnique(page, /恢复正常生活/, "恢复正常生活目标");
  await completeSafetyToAssessment(page);
}

/**
 * 单动作专业链路的评估段：下蹲功能无法完成 + 伸直/屈曲受限 + 内侧力量正常。
 * 屏幕按当前标题自适应，兼容省略台阶动作卡的单动作队列。
 */
export async function completeSingleActionAssessment(page: Page) {
  const main = page.locator("main:visible");
  const clickNextIfPresent = async () => {
    const next = main.getByRole("button", { name: "下一个检查", exact: true });
    if (await next.count()) await next.click();
  };
  const click = async (name: string | RegExp, description: string) => {
    const button = await expectUniqueVisible(page, description, page.getByRole("button", { name, exact: typeof name === "string" }));
    await button.click();
  };
  await click("打开检查", "打开评估检查");
  await click("可以做完", "下蹲功能正常完成");
  await click("动作基本稳定", "下蹲功能稳定");
  await click("不会", "下蹲功能没有不适");
  await clickNextIfPresent();
  let guard = 0;
  while (guard < 10) {
    guard += 1;
    const title = (await page.locator("h1:visible").first().textContent().catch(() => "")) ?? "";
    if (/台阶下降/.test(title)) {
      await click("做不完或不敢继续", "台阶动作无法完成");
      await click("没力或撑不住", "台阶动作无法完成原因");
      await clickNextIfPresent();
      continue;
    }
    if (/伸直/.test(title)) {
      await click(/患侧偏小.*膝后仍明显悬空/, "主动伸直活动受限");
      await click("没有不适", "主动伸直没有不适");
      await clickNextIfPresent();
      continue;
    }
    if (/屈曲/.test(title)) {
      await click(/患侧偏小.*活动范围受限/, "主动屈曲活动受限");
      await click("没有不适", "主动屈曲没有不适");
      await clickNextIfPresent();
      continue;
    }
    if (/大腿内侧|力量/.test(title)) {
      await click(/力量接近.*两侧完成质量相近/, "大腿内侧力量接近");
      const tension = main.getByRole("button", { name: "检查相关肌肉", exact: true });
      if (await tension.count()) {
        await tension.click();
        await click("没有明显差别", "肌肉紧张度无明显差别");
      }
      await clickNextIfPresent();
      continue;
    }
    break;
  }
  await expect(page.locator("h1:visible").first()).toContainText(/先看清问题|评估检查|肌肉紧张度/, { timeout: 10_000 });
  const summaryButton = main.getByRole("button", { name: "查看评估结果", exact: true });
  if (await summaryButton.count()) {
    await summaryButton.click();
  }
  await expect(page.locator("h1:visible")).toContainText("先看清问题，再开始处理");
  await click("评估完成，继续", "确认评估结果");
  await click("开始处理并复测", "开始处理并复测");
}

/**
 * 单动作处理段：处理 + 统一复测（分数维持 5 不变、功能复测能完成），停在完成面板。
 * 分数未降 + 主诉动作结论不变 → 继续排查卡的出现前提。
 */
export async function completeSingleActionTreatment(page: Page, options: { chiefScore?: string } = {}) {
  const click = async (name: string | RegExp, description: string) => {
    const button = await expectUniqueVisible(page, description, page.getByRole("button", { name, exact: typeof name === "string" }));
    await button.click();
  };
  let guard = 0;
  while (guard < 6) {
    guard += 1;
    const main = page.locator("main:visible");
    const nextTreatment = main.getByRole("button", { name: /处理完成，复测/ }).first();
    if (!(await nextTreatment.count())) break;
    await nextTreatment.click();
    const title = (await page.locator("h1:visible").first().textContent().catch(() => "")) ?? "";
    if (/活动范围/.test(title) && !/原来的动作/.test((await main.textContent()) ?? "")) {
      // 范围复测：给「接近目标」口径。
      const better = main.getByRole("button", { name: /接近目标.*与健侧接近/ }).first();
      if (await better.count()) await better.click();
      const noPain = main.getByRole("button", { name: "没有不适", exact: true }).first();
      if (await noPain.count()) await noPain.click();
    } else {
      // 统一批量复测：范围接近健侧（闭合复查义务）+ 主诉分数不变 + 下蹲能完成。
      const better = main.getByRole("button", { name: /接近目标.*与健侧接近/ }).first();
      if (await better.count()) await better.click();
      const noPain = main.getByRole("button", { name: "没有不适", exact: true }).first();
      if (await noPain.count()) await noPain.click();
      const chiefSlider = main.locator('input[type="range"]:visible').first();
      if (await chiefSlider.count()) await chiefSlider.fill(options.chiefScore ?? "5");
      const squatRetest = main.locator("article").filter({ has: page.getByRole("heading", { name: "下蹲", exact: true }) });
      if (await squatRetest.count()) {
        const complete = squatRetest.getByRole("button", { name: "能完成", exact: true });
        await expect(complete).toHaveCount(1);
        await complete.click();
      }
    }
    await click("继续", "完成本轮复测");
  }
  // 终末主诉复测：能完成 + 分数维持不变。
  const finalRetest = page.getByRole("heading", { name: /现在能完成了吗/ });
  if (await finalRetest.count()) {
    await page.getByRole("button", { name: "能完成", exact: true }).first().click();
    const finalSlider = page.locator('input[type="range"]:visible').first();
    if (await finalSlider.count()) await finalSlider.fill(options.chiefScore ?? "5");
    const record = page.getByRole("button", { name: "记录本轮最终结果", exact: true });
    await expect(record).toBeEnabled({ timeout: 10_000 });
    await record.click();
  }
  await expect(page.locator("main:visible")).toContainText(/本阶段成果|针对性处理/, { timeout: 10_000 });
}

/**
 * 专业「协助他人检查」评估完成序列：主动受限 + 被动受限 + 力量正常。
 * flexion = "normal" 时屈曲卡给正常口径（B-1 场景：只有伸直受限，复查才仅伸直方向）。
 */
export async function completeProfessionalAssessmentWithPassive(page: Page, options: { flexion?: "limited" | "normal" } = {}) {
  const flexionNormal = options.flexion === "normal";
  const main = page.locator("main:visible");
  // 其他模式先落在阶段工作台，需要显式打开第一项检查。
  const open = main.getByRole("button", { name: "打开检查", exact: true });
  if (await open.count()) await open.click();
  let guard = 0;
  while (guard < 20) {
    guard += 1;
    const summaryButton = main.getByRole("button", { name: "查看评估结果", exact: true });
    // 末卡未答完时按钮存在但禁用；必须先答题再点。
    if (await summaryButton.count() && await summaryButton.isEnabled()) {
      await summaryButton.click();
      break;
    }
    // 功能卡：正常完成口径。
    const canDo = main.getByRole("button", { name: "可以做完", exact: true });
    if (await canDo.count()) {
      await canDo.click();
      await page.waitForTimeout(120);
      const stable = main.getByRole("button", { name: "动作基本稳定", exact: true });
      if (await stable.count()) await stable.click();
      const noPain = main.getByRole("button", { name: "不会", exact: true });
      if (await noPain.count()) await noPain.click();
      const next = main.getByRole("button", { name: "下一个检查", exact: true });
      if (await next.count()) {
        await expect(next).toBeEnabled();
        await next.click();
      }
      continue;
    }
    // 活动度卡：主动 → 主动不适 → 配对抗阻（如有）→ 被动 → 被动不适。
    const currentTitle = (await page.locator("h1:visible").first().textContent()) ?? "";
    const flexionNormalCard = flexionNormal && /屈曲/.test(currentTitle);
    const active = main.getByRole("button", { name: flexionNormalCard ? /接近健侧/ : /患侧偏小/ }).first();
    if (await active.count()) {
      const activeSelected = ((await active.getAttribute("class")) ?? "").includes("is-selected");
      if (!activeSelected) await active.click();
      await page.waitForTimeout(120);
      const activeDiscomfort = main.locator(".rm-motion-answer-block", { hasText: "活动到最大范围时" }).getByRole("button", { name: "没有不适", exact: true });
      if (await activeDiscomfort.count() && !((await activeDiscomfort.first().getAttribute("class")) ?? "").includes("is-selected")) {
        await activeDiscomfort.first().click();
        await page.waitForTimeout(120);
      }
      const paired = main.locator(".rm-motion-answer-block", { hasText: "同一个动作：检查抗阻力量" }).getByRole("button", { name: /抗阻接近/ });
      if (await paired.count()) {
        const pairedSelected = ((await paired.first().getAttribute("class")) ?? "").includes("is-selected");
        if (!pairedSelected) {
          await paired.first().click();
          await page.waitForTimeout(120);
        }
      }
      const passive = main.getByRole("button", { name: flexionNormalCard ? /接近健侧｜被动范围差异不明显/ : /患侧偏小｜仍明显受限/ }).first();
      if (await passive.count()) {
        const passiveSelected = ((await passive.getAttribute("class")) ?? "").includes("is-selected");
        if (!passiveSelected) {
          await passive.click();
          await page.waitForTimeout(120);
        }
        const passiveDiscomfort = main.locator(".rm-motion-answer-block", { hasText: "被动活动时有没有不适" }).getByRole("button", { name: "没有不适", exact: true });
        if (await passiveDiscomfort.count() && !((await passiveDiscomfort.first().getAttribute("class")) ?? "").includes("is-selected")) {
          await passiveDiscomfort.first().click();
          await page.waitForTimeout(120);
        }
      }
      const next = main.getByRole("button", { name: "下一个检查", exact: true });
      if (await next.count()) {
        await expect(next).toBeEnabled();
        await next.click();
      }
      continue;
    }
    // 力量卡：抗阻/力量正常。
    const strength = main.getByRole("button", { name: /抗阻接近|力量接近/ }).first();
    if (await strength.count()) {
      const strengthSelected = ((await strength.getAttribute("class")) ?? "").includes("is-selected");
      if (!strengthSelected) {
        await strength.click();
        await page.waitForTimeout(120);
      }
      const tension = main.getByRole("button", { name: "检查相关肌肉", exact: true });
      if (await tension.count()) {
        await tension.click();
        await page.waitForTimeout(120);
        await main.getByRole("button", { name: "没有明显差别", exact: true }).first().click();
        continue;
      }
      const next = main.getByRole("button", { name: "下一个检查", exact: true });
      if (await next.count()) {
        await expect(next).toBeEnabled();
        await next.click();
      }
      continue;
    }
    const next = main.getByRole("button", { name: "下一个检查", exact: true });
    if (await next.count()) {
      await next.click();
      continue;
    }
    throw new Error("补查评估循环卡住：既没有可答选项，也没有下一个检查按钮");
  }
  await expect(page.locator("h1:visible")).toContainText("先看清问题，再开始处理");
  await main.getByRole("button", { name: "评估完成，继续", exact: true }).click();
  await main.getByRole("button", { name: "开始处理并复测", exact: true }).click();
}

/**
 * 专业「协助他人检查」入口：集中填写页（部位/病程/性质/动作/目标/检查条件/备注）。
 * - acute 场景把病程/发生机制/伴随表现换成外伤口径，并要求 capability 含「专项检查」。
 */
export async function prepareProfessionalOther(page: Page, options: {
  description?: string;
  capabilities?: string[];
  actions?: string[];
  onset?: string;
  mechanism?: string;
  companion?: string;
  goal?: string | RegExp;
  areaLabel?: string;
} = {}) {
  const description = options.description ?? "右膝内侧疼，有三个月了";
  const capabilities = options.capabilities ?? ["被动活动度", "抗阻力量"];
  const actions = options.actions ?? ["下蹲", "下楼或下台阶"];
  const onset = options.onset ?? "超过6周";
  const mechanism = options.mechanism ?? "没有明确受伤";
  const companion = options.companion ?? "没有以上情况";
  await openFreshProduct(page);
  await skipOnboarding(page);
  const input = await expectUniqueVisible(page, "症状输入框", page.locator("textarea:visible"));
  await input.fill(description);
  await (await expectUniqueVisible(page, "症状信息继续按钮", symptomOrganizeButton(page))).click();
  await clickUnique(page, /康复思路模式/, "康复思路模式");
  await clickUnique(page, /下一步/, "进入专业工作台");
  // 集中填写页：一次展开 01~07。
  await expect(page.locator("h1:visible")).toContainText(/记录主诉与评估条件|专业症状收集/, { timeout: 10_000 });
  await chooseKneeLocation(page, options.areaLabel ?? "膝内侧关节线");
  const onsetSelect = page.getByRole("combobox", { name: "病程", exact: true });
  await expect(onsetSelect).toHaveCount(1);
  await onsetSelect.selectOption({ label: onset });
  const mechanismSelect = page.getByRole("combobox", { name: "发生机制", exact: true });
  await expect(mechanismSelect).toHaveCount(1);
  await mechanismSelect.selectOption({ label: mechanism });
  await clickUnique(page, "疼痛，性质说不清", "疼痛性质");
  // 伴随按钮名带勾选符号前缀，不能精确匹配。
  const companionButton = page.locator("main:visible").locator("button:visible").filter({ hasText: companion }).first();
  if (!(companion.includes("没有以上情况"))) {
    await expect(companionButton, "伴随表现按钮必须可见").toBeVisible();
    await companionButton.click();
  } else {
    await clickUnique(page, companion, "伴随表现");
  }
  for (const action of actions) {
    const button = page.locator("main:visible").locator("button:visible").filter({ has: page.locator("strong", { hasText: new RegExp(`^${action}$`) }) });
    await expect(button, `诱发动作${action}必须唯一`).toHaveCount(1);
    await button.click();
  }
  // 单一主诉动作时需要基线不适评分（其余场景滑条不出现）。
  const baselineSlider = page.locator('input[type="range"]:visible').first();
  if (await baselineSlider.count()) {
    await baselineSlider.fill("5");
    await page.waitForTimeout(120);
  }
  const goalButton = options.goal ?? "恢复正常生活";
  const goal = page.locator("main:visible").locator("button:visible").filter({ hasText: goalButton instanceof RegExp ? goalButton : new RegExp(goalButton) }).first();
  await expect(goal).toBeVisible();
  await goal.click();
  // 检查条件：协助他人检查 + 能力项。
  await clickUnique(page, /协助他人检查/, "协助他人检查");
  for (const capability of capabilities) {
    const button = await expectUniqueVisible(page, `能力项${capability}`, page.getByRole("button", { name: capability, exact: true }));
    await button.click();
  }
  await completeSafetyToAssessment(page);
}

/**
 * 完成首轮处理与统一批量复测，停在第4步完成面板。
 * functionRetest 决定批量复测面板里两个功能动作（下蹲/下台阶）的答案：
 * unable = 「还是做不完 + 没力或撑不住」（主诉保持未解决，继续排查卡出现的前提）。
 */
export async function completeProfessionalTreatmentRound(page: Page, options: { functionRetest?: ProfessionalFunctionRetest } = {}) {
  const functionRetest = options.functionRetest ?? "unable";
  const click = async (name: string | RegExp, description: string) => {
    const button = await expectUniqueVisible(page, description, page.getByRole("button", { name, exact: typeof name === "string" }));
    await button.click();
  };
  await click("处理完成，复测原来的动作", "完成第一项处理");
  await click(/仍受限.*主动活动幅度仍小于健侧/, "复测主动伸直仍受限");
  await click("没有不适", "复测主动伸直不适");
  for (const heading of ["下蹲", "下台阶"] as const) {
    const retest = page.locator("article").filter({ has: page.getByRole("heading", { name: heading, exact: true }) });
    const label = functionRetest === "complete" ? "能完成" : "还是做不完";
    await expect(retest.getByRole("button", { name: label, exact: true })).toHaveCount(1);
    await retest.getByRole("button", { name: label, exact: true }).click();
    if (functionRetest === "unable") {
      await expect(retest.getByRole("button", { name: "没力或撑不住", exact: true })).toHaveCount(1);
      await retest.getByRole("button", { name: "没力或撑不住", exact: true }).click();
    }
  }
  await click("继续", "完成批量复测");
  await click("处理完成，复测活动范围", "完成第二项处理");
  await click(/接近目标.*主动活动幅度与健侧接近/, "复测主动屈曲活动范围");
  await click("没有不适", "复测主动屈曲不适");
  await click("继续", "完成主动屈曲复测");
  // 完成面板出现后等待继续排查区渲染完成。
  await expect(page.locator("main:visible")).toContainText(/本阶段成果|针对性处理/, { timeout: 10_000 });
}
