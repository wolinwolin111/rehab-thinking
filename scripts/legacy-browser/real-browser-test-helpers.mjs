/** Close the first-use guide so automated flows can reach the actual product UI. */
export async function dismissOnboarding(page) {
  const skip = page.getByRole("button", { name: "跳过教程", exact: true });
  if (!(await skip.count())) return false;
  if (!(await skip.first().isVisible().catch(() => false))) return false;
  await skip.first().click();
  await page.waitForTimeout(200);
  return true;
}

/**
 * 处理首次访问的知情同意层：勾选并同意，使云端同步路径可用。
 * 新开浏览器上下文没有 localStorage，同意层必然出现；未处理会挡住所有既有走读。
 */
export async function agreePilotConsent(page) {
  const gate = page.locator("#rm-consent-title");
  if (!(await gate.count())) return false;
  await gate.waitFor({ timeout: 20_000 });
  await page.check('[data-rehabmind-tutorial="consent-checkbox"]');
  await page.click('[data-rehabmind-tutorial="consent-agree"]');
  await page.waitForSelector("#rm-consent-title", { state: "detached", timeout: 5_000 });
  return true;
}

export function pilotScenarioUrl(base = process.env.WALKTHROUGH_URL ?? "http://localhost:3000/") {
  const inviteToken = process.env.PILOT_INVITE_TOKEN?.trim();
  if (!inviteToken) return base;
  const url = new URL(base);
  url.searchParams.set("invite", inviteToken);
  return url.toString();
}

export async function deletePilotCase(page, access) {
  if (process.env.PILOT_PRESERVE_TEST_DATA === "1" || !access?.caseId || !access?.accessToken) return null;
  return page.evaluate(async ({ caseId, accessToken }) => {
    const response = await fetch(`/api/pilot/cases/${encodeURIComponent(caseId)}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    let body = null;
    try { body = await response.json(); } catch { /* cleanup only needs the status */ }
    return { status: response.status, body };
  }, { caseId: access.caseId, accessToken: access.accessToken });
}
