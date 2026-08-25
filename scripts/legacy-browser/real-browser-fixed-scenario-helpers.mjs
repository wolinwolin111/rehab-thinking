import { chromium } from "playwright-core";
import { pilotScenarioUrl } from "./real-browser-test-helpers.mjs";

export const fixedScenarioUrl = () => pilotScenarioUrl();

export async function readLocalCaseRecords(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const fallback = () => {
      try {
        return JSON.parse(window.localStorage.getItem("rehabmind-complete-demo-records") || "[]");
      } catch {
        return [];
      }
    };
    if (typeof indexedDB === "undefined") {
      resolve(fallback());
      return;
    }
    const request = indexedDB.open("rehabmind-local-cases");
    request.onerror = () => resolve(fallback());
    request.onsuccess = () => {
      if (!request.result.objectStoreNames.contains("case-records")) {
        resolve(fallback());
        return;
      }
      const transaction = request.result.transaction("case-records", "readonly");
      const read = transaction.objectStore("case-records").get("all");
      read.onerror = () => resolve(fallback());
      read.onsuccess = () => resolve(Array.isArray(read.result) ? read.result : fallback());
    };
  }));
}

export async function waitForLocalCaseRecords(page, minimum = 1) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    const records = await readLocalCaseRecords(page);
    if (records.length >= minimum) return records;
    await page.waitForTimeout(150);
  }
  throw new Error(`本机案例在 8 秒内未达到 ${minimum} 条`);
}

export async function waitForSyncedLocalCase(page) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const records = await readLocalCaseRecords(page);
    const record = records[0];
    if (record?.pilotCaseId && Number.isInteger(record.pilotRevision) && record.pilotDirty === false) return records;
    await page.waitForTimeout(250);
  }
  throw new Error("服务器案例在 30 秒内未回写到本机记录");
}

export async function launchFixedScenario({ width = 1440, height = 1000 } = {}) {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width, height } });
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(`pageerror:${error}`));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(`console:${message.text()}`);
  });
  return { browser, page, runtimeErrors };
}

export async function waitForFixedUi(page, milliseconds = 180) {
  await page.waitForTimeout(milliseconds);
}

export async function clickFixedButton(page, name, label = name) {
  const button = page.getByRole("button", { name, exact: true }).first();
  await button.click({ timeout: 5000 });
  await waitForFixedUi(page);
  console.log(`  ${label}`);
}

export async function clickFirstFixedButton(page, name, label = name) {
  const button = page.getByRole("button", { name }).first();
  await button.click({ timeout: 5000 });
  await waitForFixedUi(page);
  console.log(`  ${label}`);
}

export function assertNoBrowserRuntimeErrors(runtimeErrors) {
  if (runtimeErrors.length) throw new Error(`浏览器运行时出现错误：${runtimeErrors.join(" | ")}`);
}
