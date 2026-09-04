import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const OUT_DIR = process.env.SNAPSHOT_DIR ?? "D:/Study/codex/project";
const SCENARIOS = [
  "assessment-all-normal", "custom-action-assessment", "high-irritability-completed-painful",
  "treatment-improved", "function-flare-retest", "outcome-panel-chief-action-line",
  "training-worse", "second-session", "recurrent-flare-chronic", "treatment-worse-stop",
  "bilateral-per-side-retest", "bilateral-longitudinal",
];

const label = process.argv[2];
if (!label) { console.error("usage: snapshot-render.mjs <label>"); process.exit(1); }

const browser = await chromium.launch();
const out = [];
for (const id of SCENARIOS) {
  const page = await browser.newPage({ viewport: { width: 430, height: 2400 } });
  try {
    await page.goto("http://[::1]:3000/test", { waitUntil: "domcontentloaded" });
    await page.click("text=页面定向");
    await page.waitForTimeout(400);
    await page.click(`[data-testid="test-scenario-${id}"]`);
    await page.click("text=开始测试");
    await page.waitForSelector(".rm-app", { timeout: 20000 });
    await page.waitForTimeout(1200);
    const sig = await page.$eval(".rm-app", (root) => {
      const rows = [];
      for (const el of root.querySelectorAll(".rm-app, .rm-app *")) {
        rows.push([
          el.tagName.toLowerCase(),
          (typeof el.className === "string" ? el.className : "").replace(/\s+/g, "."),
          el.getAttribute("data-candidate-id") ?? "",
          el.getAttribute("data-testid") ?? "",
        ].join("|"));
      }
      return rows.join("\n");
    });
    out.push(`===== ${id} =====\n${sig}`);
  } catch (error) {
    out.push(`===== ${id} ===== ERROR ${String(error).split("\n")[0]}`);
  }
  await page.close();
}
writeFileSync(`${OUT_DIR}/snapshot-${label}.txt`, out.join("\n"), "utf8");
console.log(`snapshot ${label}: ${out.length} scenarios`);
await browser.close();
