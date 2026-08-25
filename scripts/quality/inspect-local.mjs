// 本地巡检（批次 3 + 5）：证据道的自动化执行入口。
// 用法：
//   node scripts/quality/inspect-local.mjs <baseURL>            # HTTP/API/SSR 层检查（秒级）
//   node scripts/quality/inspect-local.mjs <baseURL> --visual   # 追加：6 视口溢出/console/遮挡/基线比对
//   node scripts/quality/inspect-local.mjs <baseURL> --axe      # 追加：同意门弹层 axe 可访问性扫描
// 产物：artifacts/quality/inspect-local/<时间戳>/report.md 与 shots/、baselines/。
// 约定：只打本地窗口；发现的问题以报告条目转交开发会话，不在本脚本内修复。
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const baseURL = (args.find((a) => !a.startsWith("-")) ?? "http://localhost:3001").replace(/\/$/, "");
const withVisual = args.includes("--visual");
const withAxe = args.includes("--axe");

const STEPS = ["症状信息", "关键确认", "评估检查", "处理复测", "训练居家", "康复总结"];
const results = [];
function record(area, name, passed, detail = "") {
  results.push({ area, name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"} [${area}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function checkHttp() {
  const pageResponse = await fetch(`${baseURL}/`);
  record("HTTP", "首页可达", pageResponse.status === 200, `status=${pageResponse.status}`);
  const html = await pageResponse.text();
  record("SSR", "标题存在", /<title>RehabMind｜运动康复思路工作台<\/title>/i.test(html));
  for (const stepLabel of STEPS) {
    record("SSR", `六步导航文案：${stepLabel}`, html.includes(stepLabel));
  }
  // 发现项（转开发会话定性）：若 SSR 首屏不再含该文案，确认是否 cf47910 有意迁移。
  record("SSR", "价值页主标题（你的线上康复助手）", html.includes("你的线上康复助手"));

  const assets = [
    ...[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"/g)].map((m) => m[1]),
  ].filter((src) => src.startsWith("/") || src.startsWith(baseURL))
    .filter((src) => !src.includes("__x00__virtual") && !src.includes("/@id/"));
  let assetFailures = 0;
  for (const asset of assets) {
    const url = asset.startsWith("http") ? asset : `${baseURL}${asset}`;
    try {
      const response = await fetch(url);
      const type = response.headers.get("content-type") ?? "";
      const expectedCss = /\.(css\b)/.test(asset);
      const isJs = type.includes("javascript");
      // dev 模式下 CSS 由 vite 以 JS 注入模块返回；生产才是 text/css。
      const ok = response.status === 200 && (expectedCss ? type.includes("text/css") || isJs : isJs);
      if (!ok) assetFailures += 1;
      if (!ok) {
        record("资源", `${asset}`, false, `status=${response.status} type=${type}`);
      }
    } catch (error) {
      assetFailures += 1;
      record("资源", `${asset}`, false, String(error.message));
    }
  }
  if (assets.length && assetFailures === 0) record("资源", `全部 ${assets.length} 个静态资源`, true);

  const emptyCreate = await fetch(`${baseURL}/api/pilot/cases`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ source: null, consent: null }),
  });
  const emptyBody = await emptyCreate.json().catch(() => ({}));
  record(
    "API",
    "空来源/同意创建被拒绝为 400 validation",
    emptyCreate.status === 400 && emptyBody.code === "validation",
    `status=${emptyCreate.status} code=${emptyBody.code}`,
  );

  const adminProbe = await fetch(`${baseURL}/api/pilot/admin/cases`);
  const adminNote = adminProbe.status === 503 ? "503=本地窗口未配置 PILOT_ADMIN_KEY（环境项，VPS 必须为 401）" : `status=${adminProbe.status}`;
  record("API", "匿名管理员接口不可读取（401；未配密钥时允许 503）", [401, 503].includes(adminProbe.status), adminNote);

  try {
    const oversize = await fetch(`${baseURL}/api/pilot/cases`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pad: "x".repeat(1600 * 1024) }),
    });
    record("API", "超大载荷被拒绝（413 或 400）", [413, 400].includes(oversize.status), `status=${oversize.status}`);
  } catch (error) {
    record("API", "超大载荷被拒绝（413 或 400）", false, `连接层失败：${error.message}`);
  }
}

async function main() {
  console.log(`== RehabMind 本地巡检 ==\n目标：${baseURL}\n`);
  try {
    await checkHttp();
  } catch (error) {
    record("HTTP", "巡检前置失败（服务不可达？）", false, String(error.message));
  }

  if (withVisual || withAxe) {
    await runBrowserChecks({ axe: withAxe });
  }

  const failed = results.filter((r) => !r.passed);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(rootDir, "artifacts", "quality", "inspect-local", stamp);
  await fs.mkdir(outDir, { recursive: true });
  const lines = [
    "# RehabMind 本地巡检报告",
    "",
    `- 时间：${new Date().toISOString()}`,
    `- 目标：${baseURL}`,
    `- 模式：${["http", withVisual && "visual", withAxe && "axe"].filter(Boolean).join(" + ")}`,
    `- 结果：${results.length - failed.length}/${results.length} 通过`,
    "",
    "| 区域 | 检查项 | 结果 | 详情 |",
    "| --- | --- | --- | --- |",
    ...results.map((r) => `| ${r.area} | ${r.name} | ${r.passed ? "✅" : "❌"} | ${r.detail.replace(/\|/g, "\\|")} |`),
  ];
  await fs.writeFile(path.join(outDir, "report.md"), lines.join("\n"), "utf8");
  console.log(`\n报告已写入：${path.relative(process.cwd(), outDir)}\\report.md`);
  console.log(failed.length ? `巡检未通过：${failed.length} 项，请按上表转交开发会话。` : "巡检全部通过。");
  process.exitCode = failed.length ? 1 : 0;
}

async function runBrowserChecks({ axe }) {
  const { chromium } = await import("@playwright/test");
  const viewports = [[320, 720], [360, 760], [390, 844], [412, 892], [430, 932], [1440, 1000]];
  const baselineDir = path.join(rootDir, "tests", "browser", "inspection-baselines");
  const browser = await chromium.launch({ channel: "msedge", headless: true });

  try {
    for (const [width, height] of viewports) {
      const context = await browser.newContext({ viewport: { width, height }, locale: "zh-CN" });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => consoleErrors.push(String(error)));

      await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });
      await page.evaluate(() => window.localStorage.clear());
      await page.reload({ waitUntil: "networkidle" });

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      record(
        "布局",
        `${width}px 无横向溢出`,
        overflow.scrollWidth <= overflow.clientWidth + 1,
        `scroll=${overflow.scrollWidth} client=${overflow.clientWidth}`,
      );
      record("运行时", `${width}px 控制台零错误`, consoleErrors.length === 0, consoleErrors.join(" | ").slice(0, 200));

      // 首屏关键控件遮挡抽查：可见且命中检测落点为自己
      if ([390, 1440].includes(width)) {
        for (const probe of ["开始康复", "问题反馈"]) {
          const locator = page.getByRole("button", { name: probe, exact: true }).first();
          try {
            await locator.waitFor({ state: "visible", timeout: 5000 });
            const hit = await locator.evaluate((element) => {
              const rect = element.getBoundingClientRect();
              const point = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
              return element === point || element.contains(point);
            });
            record("遮挡", `${width}px「${probe}」可点击命中`, hit);
          } catch {
            record("遮挡", `${width}px「${probe}」存在`, false, "控件未出现");
          }
        }
      }

      // 基线截图：首建保存；已有则做像素级比对（容忍少量抗锯齿差异）
      const shotDir = path.join(outDirStatic(), "shots");
      await fs.mkdir(shotDir, { recursive: true });
      const shotPath = path.join(shotDir, `home-${width}.png`);
      await page.screenshot({ path: shotPath, fullPage: width !== 1440 });
      const baselinePath = path.join(baselineDir, `home-${width}.png`);
      const baselineExists = await fs.stat(baselinePath).then(() => true, () => false);
      if (!baselineExists) {
        await fs.mkdir(baselineDir, { recursive: true });
        await fs.copyFile(shotPath, baselinePath);
        record("视觉基线", `${width}px 基线首建`, true, "已保存当前截图作为基线");
      } else {
        const diffRatio = await compareImages(baselinePath, shotPath);
        record("视觉基线", `${width}px 与基线一致`, diffRatio <= 0.02, `差异像素占比 ${(diffRatio * 100).toFixed(2)}%`);
      }

      if (axe && width === 390) {
        await scanAxe(page, baseURL);
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }
}

let outDirCache = null;
function outDirStatic() {
  if (!outDirCache) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    outDirCache = path.join(rootDir, "artifacts", "quality", "inspect-local", stamp);
  }
  return outDirCache;
}

async function compareImages(leftPath, rightPath) {
  const [{ PNG }, pixelmatch] = await Promise.all([
    import("pngjs").then((m) => ({ PNG: m.PNG })),
    import("pixelmatch").then((m) => m.default),
  ]);
  const left = PNG.sync.read(await fs.readFile(leftPath));
  const right = PNG.sync.read(await fs.readFile(rightPath));
  if (left.width !== right.width || left.height !== right.height) return 1;
  const diff = new Uint8Array(left.width * left.height * 4);
  const mismatched = pixelmatch(left.data, right.data, diff, left.width, left.height, { threshold: 0.1 });
  return mismatched / (left.width * left.height);
}

async function scanAxe(page, baseURL) {
  const axeSource = await fs
    .readFile(path.join(rootDir, "node_modules", "axe-core", "axe.min.js"), "utf8")
    .catch(() => null);
  if (!axeSource) {
    record("可访问性", "axe-core 未安装", false, "npm i -D axe-core 后重试");
    return;
  }
  await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "开始康复", exact: true }).click().catch(() => {});
  const skipGuide = page.getByRole("button", { name: "跳过引导", exact: true });
  if (await skipGuide.isVisible().catch(() => false)) {
    for (let i = 0; i < 4 && await skipGuide.isVisible().catch(() => false); i += 1) {
      await skipGuide.click().catch(() => {});
    }
  }
  await page.getByRole("dialog", { name: "你从哪里了解到我们？" }).waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  await page.addScriptTag({ content: axeSource });
  const axeResult = await page.evaluate(() => window.axe.run(document, { resultTypes: ["violations"] }));
  const serious = axeResult.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = serious.map((v) => `${v.id}(${v.nodes.length})`).join(", ");
  record("可访问性", "同意/来源弹层无 serious/critical 违规", serious.length === 0, summary || "0");
}

await main();
