import { expect, type Page } from "@playwright/test";

// 双视角走查记录器：逐屏 dump 当前关键状态，供审查分析（非断言测试）。
// 用法：snap(page, label) 在当前屏收集信息 → walkSnaps[caseId].push(...) → writeWalkLog(caseId) 落盘。

export type WalkSnap = {
  label: string;
  h1: string;
  mainText: string;
  buttons: string[];
  rail: string[];
  progress: string;
};

const walkSnaps: Record<string, WalkSnap[]> = {};

export function beginWalk(caseId: string) {
  walkSnaps[caseId] = [];
}

/** 在当前屏收集可读状态。mainText 截断避免日志爆炸。 */
export async function snap(page: Page, caseId: string, label: string): Promise<WalkSnap> {
  const h1 = await page.locator("h1:visible").first().innerText().catch(() => "(无 h1)");
  const mainText = (await page.locator("main:visible").first().innerText().catch(() => ""))
    .replace(/\s+/g, " ").trim().slice(0, 1200);
  const buttons = (await page.locator("button:visible").allInnerTexts().catch(() => []))
    .map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 24);
  const rail = (await page.locator('nav[aria-label="康复流程"] button, .rm-step-rail button').allInnerTexts().catch(() => []))
    .map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean);
  const progress = (await page.locator(".rm-step-progress, .rm-assessment-progress summary, .rm-step-heading").first().innerText().catch(() => "")).replace(/\s+/g, " ").trim();
  const rec: WalkSnap = { label, h1, mainText, buttons, rail, progress };
  (walkSnaps[caseId] ??= []).push(rec);
  return rec;
}

export function walkLog(caseId: string): WalkSnap[] {
  return walkSnaps[caseId] ?? [];
}
