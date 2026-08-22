import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, assertNoRuntimeErrors, collectRuntimeErrors, expectUniqueVisible, openFreshProduct, skipOnboarding } from "../support/page-helpers";
import { prepareGuidedChiefProgression, prepareProfessionalMultiAction } from "../drivers/pilot-flow";

test.describe("P0 固定决策门禁", () => {
  test("INT-05 主诉动作先独立检查，正常后才开放后续功能 @p0", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await prepareGuidedChiefProgression(page);

    const initialTitle = await page.locator("h1:visible").textContent();
    const initialMain = await page.locator("main:visible").textContent();
    expect(initialTitle).toMatch(/蹲起|下蹲/);
    expect(initialMain).toMatch(/下蹲|蹲起/);
    expect(initialMain).not.toMatch(/单腿蹲|单脚蹲|跳跃落地|单腿静态稳定检查/);

    await page.getByRole("button", { name: "可以做完", exact: true }).click();
    await page.getByRole("button", { name: "动作基本稳定", exact: true }).click();
    await page.getByRole("button", { name: "不会", exact: true }).click();

    const progression = page.locator(".rm-assessment-progress button:visible");
    await expect(progression.filter({ hasText: /单腿|单脚/ })).toHaveCount(1);
    const nextFunction = progression.filter({ hasText: /单腿|单脚/ });
    await expect(nextFunction).toBeDisabled();
    await expect(page.locator("main:visible")).toContainText(/下蹲|蹲起/);
    await assertNoHorizontalOverflow(page);
    await assertNoRuntimeErrors(runtimeErrors);
  });

  test("INT-07 多个功能动作分别进入独立评估队列 @p0", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await prepareProfessionalMultiAction(page);

    await expect(page.locator("h1:visible")).toContainText("按阶段查看这次康复");
    await expectUniqueVisible(page, "台阶下降控制检查", page.getByRole("button", { name: /台阶下降控制检查/ }));
    await expectUniqueVisible(page, "双腿闭链下蹲功能检查", page.getByRole("button", { name: /双腿闭链下蹲功能检查/ }));
    await expect(page.locator("main:visible")).toContainText("下蹲或起身、上下楼或下台阶");
    await expect(page.locator("main:visible")).not.toContainText("多个动作合并成一个主诉分数");
    await assertNoHorizontalOverflow(page);
    await assertNoRuntimeErrors(runtimeErrors);
  });

  test("SAFE-04 麻电和感觉变化进入专业确认出口 @p0", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await openFreshProduct(page);
    await skipOnboarding(page);
    const input = await expectUniqueVisible(page, "症状输入框", page.locator("textarea:visible"));
    await input.fill("右脚外踝以下麻电，脚趾感觉变差，走路越来越没力");
    await expectUniqueVisible(page, "帮我整理", page.getByRole("button", { name: "帮我整理", exact: true })).then((button) => button.click());
    await expectUniqueVisible(page, "自助康复模式", page.getByRole("button", { name: /自助康复/ })).then((button) => button.click());
    await expectUniqueVisible(page, "进入症状信息", page.getByRole("button", { name: /下一步/ })).then((button) => button.click());

    const main = page.locator("main:visible");
    await expect(main).toContainText(/出现麻、?电或感觉变化/);
    await expect(main).toContainText(/专业人员|医学评估|保存本次信息/);
    await expect(main).not.toContainText(/进入训练|开始训练|普通处理/);
    await assertNoHorizontalOverflow(page);
    await assertNoRuntimeErrors(runtimeErrors);
  });

  test("MIX-03 疼痛、肿胀和麻电同时出现时安全确认优先 @p0", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await openFreshProduct(page);
    await skipOnboarding(page);
    const input = await expectUniqueVisible(page, "症状输入框", page.locator("textarea:visible"));
    await input.fill("昨晚崴了右脚，外踝疼、肿，还出现麻电，走路越来越没力");
    await expectUniqueVisible(page, "帮我整理", page.getByRole("button", { name: "帮我整理", exact: true })).then((button) => button.click());
    await expectUniqueVisible(page, "自助康复模式", page.getByRole("button", { name: /自助康复/ })).then((button) => button.click());
    await expectUniqueVisible(page, "进入症状信息", page.getByRole("button", { name: /下一步/ })).then((button) => button.click());

    const main = page.locator("main:visible");
    await expect(main).toContainText(/疼|肿|麻、电|感觉变化/);
    await expect(main).toContainText(/专业人员|医学评估|保存本次信息|先确认/);
    await expect(main).not.toContainText(/进入训练|开始训练|普通处理/);
    await assertNoHorizontalOverflow(page);
    await assertNoRuntimeErrors(runtimeErrors);
  });

  test("PERM-04 取消被动活动能力后关节处理旧入口失效 @p0", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await openFreshProduct(page);
    await skipOnboarding(page);
    const input = await expectUniqueVisible(page, "症状输入框", page.locator("textarea:visible"));
    await input.fill("右膝下楼时疼，有三个月了");
    await expectUniqueVisible(page, "帮我整理", page.getByRole("button", { name: "帮我整理", exact: true })).then((button) => button.click());
    await expectUniqueVisible(page, "康复思路模式", page.getByRole("button", { name: /康复思路模式/ })).then((button) => button.click());
    await expectUniqueVisible(page, "进入专业工作台", page.getByRole("button", { name: /下一步/ })).then((button) => button.click());
    await expectUniqueVisible(page, "协助他人检查", page.getByRole("button", { name: /协助他人检查/ })).then((button) => button.click());

    const joint = await expectUniqueVisible(page, "关节处理", page.getByRole("button", { name: "关节处理", exact: true }));
    await expect(joint).toBeDisabled();
    const passive = await expectUniqueVisible(page, "被动活动度", page.getByRole("button", { name: "被动活动度", exact: true }));
    await passive.click();
    await expect(joint).toBeEnabled();
    await joint.click();
    await passive.click();
    await expect(joint).toBeDisabled();
    await expect(page.locator("main:visible")).not.toContainText(/关节处理.*已安排/);
    await assertNoRuntimeErrors(runtimeErrors);
  });

  test("RET-02 不同活动动作分别完成处理后复测 @p0", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await prepareProfessionalMultiAction(page);

    const click = async (name: string | RegExp, description: string) => {
      const button = await expectUniqueVisible(page, description, page.getByRole("button", { name, exact: typeof name === "string" }));
      await button.click();
    };

    await click("打开检查", "打开评估检查");
    await click("做不完或不敢继续", "台阶动作无法完成");
    await click("没力或撑不住", "台阶动作无法完成原因");
    await click("下一个检查", "进入膝关节主动伸直");
    await click(/患侧偏小.*膝后仍明显悬空/, "主动伸直活动受限");
    await click("没有不适", "主动伸直没有不适");
    await click(/保持稳定.*抬起后膝盖仍笔直/, "主动伸直控制稳定");
    await click("下一个检查", "进入膝关节主动屈曲");
    await click(/患侧偏小.*活动范围受限/, "主动屈曲活动受限");
    await click("没有不适", "主动屈曲没有不适");
    await click("下一个检查", "进入特殊检查");
    await click(/未见异常反应.*没有出现提示信号/, "特殊检查未见异常");
    await click("下一个检查", "进入闭链下蹲检查");
    await click("做不完或不敢继续", "下蹲动作无法完成");
    await click("没力或撑不住", "下蹲动作无法完成原因");
    await click("下一个检查", "进入大腿内侧力量检查");
    await click(/力量接近.*两侧完成质量相近/, "大腿内侧力量接近");
    await click("检查相关肌肉", "进入肌肉紧张度对比");
    await click(/没有明显差别.*没有需要特别标记的区域/, "肌肉紧张度无明显差别");
    await click("查看评估结果", "查看评估结果");
    await expect(page.locator("h1:visible")).toContainText("先看清问题，再开始处理");
    await expect(page.locator("main:visible")).toContainText("膝关节主动伸直");
    await expect(page.locator("main:visible")).toContainText("膝关节主动屈曲");
    await click("评估完成，继续", "确认评估结果");
    await click("开始处理并复测", "开始处理并复测");

    await click("处理完成，复测原来的动作", "完成第一项处理");
    await click(/接近目标.*主动活动幅度与健侧接近/, "复测主动伸直活动范围");
    await click("没有不适", "复测主动伸直不适");
    await click("继续", "完成主动伸直复测");
    await click("处理完成，复测活动范围", "完成第二项处理");
    await click(/接近目标.*主动活动幅度与健侧接近/, "复测主动屈曲活动范围");
    await click("没有不适", "复测主动屈曲不适");
    await click("继续", "完成主动屈曲复测");

    const finalMain = page.locator("main:visible");
    await expect(finalMain).toContainText("膝关节主动伸直");
    await expect(finalMain).toContainText("膝关节主动屈曲");
    await expect(finalMain).toContainText(/不生成单一动作评分|不生成动作评分变化/);
    await expect(finalMain).not.toContainText("使用同一个复测结果");
    await assertNoHorizontalOverflow(page);
    await assertNoRuntimeErrors(runtimeErrors);
  });
});
