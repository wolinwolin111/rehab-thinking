import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL?.trim() || "msedge", headless: true });
const context = await browser.newContext({ locale: "zh-CN", viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });

const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "✅" : "❌"} ${name}${detail ? ` | ${detail}` : ""}`);
}

// ===== 1. 欢迎页 =====
await page.goto(BASE, { waitUntil: "networkidle", timeout: 30_000 });
await page.waitForTimeout(2000);
const welcome = await page.locator(".rm-product-welcome").isVisible().catch(() => false);
check("1 欢迎页出现", welcome);
if (!welcome) { console.log("FATAL"); await browser.close(); process.exit(1); }

// ===== 2. 开始康复 → 直达来源渠道（引导卡已按产品决策移除，B 批） =====
await page.getByRole("button", { name: "开始康复" }).click();
await page.waitForTimeout(800);
check("2 开始康复后直达来源渠道", await page.locator(".rm-source-gate").isVisible().catch(() => false));
check("2a 引导卡已不存在", !(await page.locator(".rm-guide-cards-backdrop").isVisible().catch(() => false)));

// ===== 3. 来源 =====
const src = await page.locator(".rm-source-gate").isVisible().catch(() => false);
check("3 来源渠道", src);
if (src) {
  await page.locator(".rm-source-options label").nth(1).click();
  await page.waitForTimeout(300);
  const contBtn = page.locator(".rm-source-gate footer button").first();
  const enabled = await contBtn.isEnabled().catch(() => false);
  check("3a 选后继续可点", enabled);
  if (enabled) { await contBtn.click(); await page.waitForTimeout(400); }
}

// ===== 4. 同意 =====
const con = await page.locator(".rm-consent-gate").isVisible().catch(() => false);
check("4 同意页", con);
if (con) {
  const ct = await page.textContent(".rm-consent-gate").catch(() => "");
  check("4a 同意页条目", ct.includes("匿名案例编号") && ct.includes("删除案例") && !ct.includes("因人而异"), "3条且不含重复效果提醒");
  await page.locator(".rm-consent-check input").check();
  await page.getByRole("button", { name: "同意并创建案例" }).click();
  await page.waitForTimeout(800);
}

// ===== 4b. 聚焦教程（同意后首次自动弹出，4 步——B 批精简后） =====
const focusShown = await page.locator(".rm-focus-onboarding").isVisible().catch(() => false);
check("4b 聚焦教程弹出", focusShown);
if (focusShown) {
  for (let s = 0; s < 8; s++) {
    const nextBtn = page.locator(".rm-focus-next");
    if (!(await nextBtn.isVisible().catch(() => false))) break;
    const label = (await nextBtn.textContent().catch(() => "")) || "";
    const title = (await page.textContent(".rm-focus-copy h1").catch(() => "")) || "";
    if (s === 0) check("4b1 第1步=描述你的不适", title.includes("描述"), title);
    if (s === 2) check("4b2 第3步含流程", title.includes("康复") || title.includes("流程"), title);
    await nextBtn.click();
    await page.waitForTimeout(400);
    if (label.includes("开始使用")) break;
  }
  check("4b3 聚焦教程关闭", !(await page.locator(".rm-focus-onboarding").isVisible().catch(() => false)));
  check("4b4 标记已看", await page.evaluate(() => localStorage.getItem("rehabmind-focus-tutorial-seen")) === "seen");
}

// ===== 5. 保存降噪 =====
await page.waitForTimeout(1500);
const syncTxt = await page.evaluate(() => {
  for (const s of document.querySelectorAll('[aria-live="polite"]')) {
    const t = s.textContent?.trim();
    if (t && (t.includes("保存") || t.includes("同步"))) return t;
  }
  return null;
});
check("5 保存降噪", syncTxt === null || (!syncTxt.includes("已保存到本机") && !syncTxt.includes("已同步")), `显示="${syncTxt}"`);

// ===== 6. 填写症状推进到总结 =====
const ta = page.locator("textarea").first();
check("6 症状输入框", await ta.isVisible().catch(() => false));
await ta.fill("右膝下楼时刺痛，有三个月了");
await page.getByRole("button", { name: "继续", exact: true }).click();
await page.waitForTimeout(1000);
console.log("  → h1:", await page.locator("h1").first().textContent());
// 整理确认页：选自助康复 → 下一步
const zizhu = page.getByRole("button", { name: /自助康复/ }).first();
if (await zizhu.isVisible().catch(() => false)) { await zizhu.click(); await page.waitForTimeout(500); }
const stepNext = page.locator("button:visible").filter({ hasText: /^下一步/ }).first();
if (await stepNext.count() && !(await stepNext.isDisabled())) {
  await stepNext.click(); await page.waitForTimeout(800);
  // 人体图：右侧按钮 → 膝盖部位按钮 → 膝内侧关节线（细分区域是 SVG path）
  const sideBtn = page.locator(".rm-compact-atlas-nav button:visible").filter({ hasText: "右侧" }).first();
  if (await sideBtn.count()) {
    await sideBtn.click(); await page.waitForTimeout(400);
    const areaBtn = page.locator(".rm-compact-atlas-nav button:visible").filter({ hasText: "膝盖" }).first();
    if (await areaBtn.count()) { await areaBtn.click(); await page.waitForTimeout(400); }
    const spot = page.locator('path[aria-label="右侧 · 膝内侧关节线"]');
    if (await spot.count()) { await spot.click({ force: true }); await page.waitForTimeout(500); console.log("  → spot clicked"); }
  }
}

const NEXT = /下一步|下一题|下一项|下一个$|^下一个|选好了|进入关键确认|开始评估|查看评估结果|评估完成|完成并继续|处理完成|开始复测|记录本轮|查看训练|完成当前安排|继续填写影像结论|保存，开始评估|下一个检查|完成这项检查|开始处理并复测|没有需要处理的问题|查看训练与居家方案|检查相关肌肉|完成触诊|^继续$|进入训练|开始训练|保存并继续|打开检查|评估完成，进入处理|训练完成，整体复测|训练完成，稍后复查|训练完成，查看总结|完成并查看总结|查看本次康复总结/;
let reached = false;
let safetyAllShown = false;
for (let i = 0; i < 200; i++) {
  const h1 = await page.locator("h1").first().textContent().catch(() => "");
  if (h1.includes("本次康复总结")) { reached = true; check("6 全流程总结", true, `iter=${i}`); break; }
  if (!safetyAllShown && h1.includes("安全")) {
    safetyAllShown = true;
    const articleCount = await page.locator(".rm-safety-list article:visible").count().catch(() => 0);
    const noCount = await page.locator(".rm-safety-list article button:visible").filter({ hasText: "没有" }).count().catch(() => 0);
    check("6a 安全确认4题同屏", articleCount === 4 && noCount === 4, `articles=${articleCount} 没有=${noCount}`);
    check("6b 无上一项/下一项分页", !(await page.locator(".rm-safety-list button").filter({ hasText: /上一项|下一项/ }).count()));
  }
  let acted = false;
  const sel = page.locator("select").first();
  if (!acted && (await sel.count())) { const v = await sel.inputValue().catch(() => "x"); if (!v) { await sel.selectOption({ index: 1 }).catch(() => {}); await page.waitForTimeout(250); acted = true; } }
  if (!acted) {
    outer: for (const label of ["没有", "没有不适"]) {
      const btns = page.getByRole("button", { name: label, exact: true });
      for (let k = 0; k < (await btns.count()); k++) {
        const b = btns.nth(k);
        if (((await b.getAttribute("class").catch(() => "")) || "").includes("is-selected")) continue;
        if (await b.isDisabled().catch(() => false)) continue;
        await b.click().catch(() => {}); await page.waitForTimeout(250); acted = true; break outer;
      }
    }
  }
  if (!acted) {
    const lim = page.getByRole("button", { name: /患侧偏小/ }).first();
    if ((await lim.count()) && !(((await lim.getAttribute("class").catch(() => "")) || "").includes("is-selected"))) { await lim.click().catch(() => {}); await page.waitForTimeout(250); acted = true; }
  }
  if (!acted) {
    const grids = page.locator(".rm-result-grid");
    for (let gi = 0; gi < (await grids.count()); gi++) {
      const bs = grids.nth(gi).locator("button");
      let sel2 = false;
      for (let b = 0; b < (await bs.count()); b++) { if (((await bs.nth(b).getAttribute("class").catch(() => "")) || "").includes("is-selected")) { sel2 = true; break; } }
      if (!sel2 && (await bs.count())) { await bs.first().click().catch(() => {}); await page.waitForTimeout(250); acted = true; break; }
    }
  }
  if (!acted) {
    const chain = [
      [() => page.locator('.rm-check-grid button', { hasText: "活动受限" }).first(), ""],
      [() => page.getByRole("button", { name: "钝痛或酸胀", exact: true }).first(), ""],
      [() => page.getByRole("button", { name: /恢复日常活动/ }).first(), ""],
      [() => page.getByRole("button", { name: "没有做影像", exact: true }).first(), ""],
      [() => page.getByRole("button", { name: "可以做完", exact: true }).first(), ""],
      [() => page.getByRole("button", { name: /保持稳定/ }).first(), ""],
      [() => page.getByRole("button", { name: "没有明显差别", exact: true }).first(), ""],
    ];
    for (const [mk] of chain) {
      const loc = mk();
      if ((await loc.count()) && !(((await loc.getAttribute("class").catch(() => "")) || "").includes("is-selected")) && !(await loc.isDisabled().catch(() => false))) {
        await loc.click().catch(() => {}); await page.waitForTimeout(250); acted = true; break;
      }
    }
  }
  if (!acted && h1.includes("今天需要做的训练")) {
    const anySelected = await page.locator(".rm-feedback-quick button.is-selected").count();
    if (!anySelected) {
      const pagBefore = await page.locator(".rm-exercise-pagination span").textContent().catch(() => "");
      const fbBtns = page.locator(".rm-feedback-quick button");
      const fbn = await fbBtns.count();
      for (let fi = 0; fi < fbn; fi++) {
        const b = fbBtns.nth(fi);
        if (!(await b.isVisible().catch(() => false))) continue;
        let clicked = true;
        try { await b.click({ timeout: 2500 }); } catch { clicked = false; }
        if (!clicked) continue;
        await page.waitForTimeout(450);
        const pagAfter = await page.locator(".rm-exercise-pagination span").textContent().catch(() => "");
        if (pagAfter !== pagBefore || (await page.locator(".rm-feedback-quick button.is-selected").count())) { acted = true; }
        break;
      }
    }
  }
  if (!acted) {
    const rgs = page.locator('input[type=range]');
    for (let k = 0; k < (await rgs.count()); k++) {
      if ((await rgs.nth(k).inputValue()) === "0") { await rgs.nth(k).fill("3").catch(() => {}); await page.waitForTimeout(250); acted = true; break; }
    }
  }
  if (!acted) {
    const nbs = page.getByRole("button", { name: NEXT });
    const nbc = await nbs.count();
    for (let k = 0; k < nbc; k++) {
      const nb = nbs.nth(k);
      if (!(await nb.isVisible().catch(() => false))) continue;
      if (await nb.isDisabled().catch(() => false)) continue;
      await nb.click(); await page.waitForTimeout(400); acted = true; break;
    }
  }
  if (!acted) {
    console.log(`\n=== STUCK at "${h1}" iter=${i} ===`);
    const dump = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll("button, select, input[type=radio], input[type=checkbox]").forEach((e) => {
        if (e.offsetParent === null) return;
        const tag = e.tagName.toLowerCase();
        let d = tag;
        if (tag === "button") d += `:"${e.textContent?.trim().slice(0, 25)}" disabled=${e.disabled}`;
        else if (tag === "select") d += `:[${Array.from(e.options).map((o) => o.text).join("/")}]`;
        else d += `[${e.getAttribute("type")}] value=${e.value} checked=${e.checked}`;
        out.push(d);
      });
      return out;
    });
    console.log(dump.join("\n"));
    check("6 全流程", false, `STOP at ${h1} iter=${i}`);
    break;
  }
}
if (!reached) {
  const h1 = await page.locator("h1").first().textContent().catch(() => "");
  check("6 全流程到达总结", false, `终点=${h1}`);
}

// ===== 7. 运行时错误 =====
check("7 运行时错误=0", errors.length === 0, errors.slice(0, 3).join("|"));

// ===== 8. 移动端人体图布局（390px 视口） =====
const mob = await browser.newContext({ locale: "zh-CN", viewport: { width: 390, height: 844 } });
await mob.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
const mp = await mob.newPage();
await mp.goto(BASE, { waitUntil: "networkidle", timeout: 30_000 });
await mp.waitForTimeout(1500);
await mp.getByRole("button", { name: "开始康复" }).click();
await mp.waitForTimeout(400);
await mp.locator(".rm-source-options label").nth(1).click();
await mp.locator(".rm-source-gate footer button").first().click();
await mp.waitForTimeout(400);
await mp.locator(".rm-consent-check input").check();
await mp.getByRole("button", { name: "同意并创建案例" }).click();
await mp.waitForTimeout(800);
// 移动端也会弹聚焦教程，直接跳过
if (await mp.locator(".rm-focus-onboarding").isVisible().catch(() => false)) {
  await mp.locator(".rm-focus-skip").click().catch(() => {});
  await mp.waitForTimeout(300);
}
await mp.locator("textarea").first().fill("右膝下楼时刺痛，有三个月了");
await mp.getByRole("button", { name: "继续", exact: true }).click();
await mp.waitForTimeout(1000);
await mp.getByRole("button", { name: /自助康复/ }).first().click();
await mp.waitForTimeout(500);
await mp.locator("button:visible").filter({ hasText: /^下一步/ }).first().click();
await mp.waitForTimeout(800);
// 移动端人体图断言
const mobOverviewLoc = mp.locator(".rm-atlas-overview");
const mobOverviewCount = await mobOverviewLoc.count().catch(() => 0);
const mobOverviewHidden = mobOverviewCount === 0 || !(await mobOverviewLoc.first().isVisible().catch(() => false));
check("8a 移动端隐藏大人体图", mobOverviewHidden);
const mobNavVisible = await mp.locator(".rm-compact-atlas-nav").first().isVisible().catch(() => false);
check("8b 移动端显示按钮导航", mobNavVisible);
const mobSideBtn = mp.locator(".rm-compact-atlas-nav button", { hasText: "右侧" }).first();
check("8c 侧别按钮=左侧/右侧", await mobSideBtn.isVisible().catch(() => false));
if (mobNavVisible) {
  await mobSideBtn.click();
  await mp.waitForTimeout(400);
  const spot = mp.locator('path[aria-label="右侧 · 膝内侧关节线"]');
  const spotVisible = await spot.isVisible().catch(() => false);
  check("8d 选侧别后细分图可用", spotVisible);
  if (spotVisible) { await spot.click({ force: true }); await mp.waitForTimeout(300); }
}
await mob.close();

// ===== 汇总 =====
console.log("\n===== 汇总 =====");
const p = results.filter(r => r.pass).length;
const f = results.filter(r => !r.pass).length;
console.log(`通过 ${p}/${results.length} | 失败 ${f}`);
for (const r of results.filter(r => !r.pass)) console.log(`  ❌ ${r.name}: ${r.detail}`);
if (!f) console.log("全部通过 ✅");

await browser.close();
process.exitCode = f > 0 ? 1 : 0;
