// 批次 2b：从本地真实页面导出一个「真实产生的快照」作为回灌夹具。
// 用法：node tests/browser/support/export-real-snapshot.mjs [baseURL]
// 默认 baseURL=http://localhost:3001；产物写入 tests/fixtures/real-snapshot-sample.json。
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const baseURL = process.argv[2] ?? "http://localhost:3001";
const DESCRIPTION = "右脚踝昨天扭伤，上下楼梯疼，恢复目标是正常走路跑步";

const browser = await chromium.launch({ channel: "msedge", headless: true });

async function step(name, action) {
  try {
    await action();
  } catch (error) {
    console.error(`导出失败于步骤：${name}`);
    throw error;
  }
}

try {
  const context = await browser.newContext({ locale: "zh-CN" });
  const page = await context.newPage();
  await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  await step("点击开始康复", () => page.getByRole("button", { name: "开始康复", exact: true }).click());
  // B 批（2026-08-26）：引导卡已移除，开始康复后直接进入来源门。
  await step("选择来源渠道", async () => {
    // 渠道角色化定位：免疫渠道合并/文案调整（2026-08-26 渠道已合并为「抖音」等）。
    await page.getByRole("radio").first().check();
  });
  await step("来源门继续", () => page.getByRole("dialog", { name: "你从哪里了解到我们？" }).getByRole("button", { name: "继续", exact: true }).click());
  await step("勾选同意", () => page.getByLabel("我已了解并同意以上内容", { exact: true }).check());
  await step("同意并创建案例", () => page.getByRole("button", { name: "同意并创建案例", exact: true }).click());
  const input = page.locator('[data-rehabmind-tutorial="symptom-input"]');
  await input.waitFor({ state: "visible", timeout: 15000 });
  await input.fill(DESCRIPTION);

  // 等待防抖自动保存把草稿写入 IndexedDB
  let draft = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    draft = await page.evaluate(async () => {
      // 不带版本号打开：始终使用页面已建立的当前版本（v3 存储已升到 v5）。
      const database = await new Promise((resolve, reject) => {
        const request = window.indexedDB.open("rehabmind-local-cases");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        return await new Promise((resolve, reject) => {
          const request = database.transaction("active-draft", "readonly").objectStore("active-draft").get("current");
          request.onsuccess = () => resolve(request.result ?? null);
          request.onerror = () => reject(request.error);
        });
      } finally {
        database.close();
      }
    });
    if (draft && JSON.stringify(draft).includes(DESCRIPTION)) break;
    await page.waitForTimeout(250);
  }

  if (!draft || !JSON.stringify(draft).includes(DESCRIPTION)) {
    console.error("导出失败：IndexedDB 中未出现包含描述的草稿。");
    process.exit(1);
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    source: `${baseURL}/ 真实页面本地草稿`,
    description: DESCRIPTION,
    draft,
  };
  const target = path.join(rootDir, "tests", "fixtures", "real-snapshot-sample.json");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`已导出真实快照夹具 -> ${target}`);
  console.log(`draft 顶层键：${Object.keys(draft).join(", ")}`);
} finally {
  await browser.close();
}
