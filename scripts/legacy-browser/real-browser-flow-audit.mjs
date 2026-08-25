/**
 * 真实页面验收辅助器。
 *
 * 这个文件不替代浏览器交互，而是给浏览器走读提供统一的断言：
 * 每次点击后先读取新的 domSnapshot，再检查页面是否有明确下一步、
 * 是否错误跳步、是否留下禁用按钮或运行时错误。
 *
 * 用法（在已连接的浏览器会话中）：
 *   const { auditSnapshot, auditPatellaGroup, auditSummaryScore } =
 *     await import(".../scripts/legacy-browser/real-browser-flow-audit.mjs");
 *   await auditSnapshot(tab, { stage: "评估检查", required: ["髌骨四方向被动活动"] });
 */

function fail(message) {
  throw new Error(`[真实页面验收] ${message}`);
}

export async function readSnapshot(tab) {
  if (!tab?.playwright?.domSnapshot) fail("没有提供可读取页面的 tab");
  const snapshot = await tab.playwright.domSnapshot();
  if (!snapshot || !snapshot.includes("main:")) fail("页面没有渲染 main 内容");
  return snapshot;
}

export async function auditSnapshot(tab, {
  stage,
  required = [],
  forbidden = [],
  allowTerminal = false,
} = {}) {
  const snapshot = await readSnapshot(tab);
  for (const text of required) {
    if (!snapshot.includes(text)) fail(`${stage ?? "当前页面"} 缺少“${text}”`);
  }
  for (const text of forbidden) {
    if (snapshot.includes(text)) fail(`${stage ?? "当前页面"} 不应出现“${text}”`);
  }

  const hasButton = /- button /.test(snapshot);
  const hasTerminal = /本次康复完成|本次处理已暂停|还有问题|建议线下|处理复测完成/.test(snapshot);
  if (!hasButton && !(allowTerminal && hasTerminal)) {
    fail(`${stage ?? "当前页面"} 没有按钮，也没有明确结束出口`);
  }
  return snapshot;
}

export async function auditNoRuntimeErrors(tab, { limit = 50 } = {}) {
  if (!tab?.dev?.logs) fail("没有提供浏览器日志读取能力");
  const logs = await tab.dev.logs({ levels: ["error"], limit });
  if (logs.length) {
    fail(`浏览器出现 ${logs.length} 条 error 日志：${JSON.stringify(logs.slice(0, 3))}`);
  }
  return logs;
}

export async function auditPatellaGroup(tab) {
  const snapshot = await auditSnapshot(tab, {
    stage: "髌骨四方向被动活动",
    required: ["髌骨四方向被动活动", "髌骨向上滑动", "髌骨向下滑动", "髌骨向内滑动", "髌骨向外滑动"],
    forbidden: ["主动活动范围", "抗阻力量", "向上向", "向下向", "向内向", "向外向"],
  });
  const cards = await tab.playwright.locator(".rm-patella-direction").count();
  if (cards !== 4) fail(`髌骨组合卡实际渲染 ${cards} 个方向，应为 4 个`);
  return snapshot;
}

export async function auditPatellaTreatmentUnit(tab) {
  const snapshot = await auditSnapshot(tab, {
    stage: "髌骨处理与复测单元",
    required: ["完成后立即复测", "刚才受限的髌骨方向"],
    forbidden: ["髌骨向上向", "髌骨向下向", "髌骨向内向", "髌骨向外向"],
  });
  if (!/髌骨向(?:上|下|内|外)滑动辅助/.test(snapshot)) {
    fail("髌骨处理单元没有明确的滑动方向标题");
  }
  return snapshot;
}

export async function auditConditionalHomeRelaxation(tab, { expected = true } = {}) {
  const snapshot = await readSnapshot(tab);
  const visible = snapshot.includes("训练结束后") && snapshot.includes("针对性自主放松");
  if (visible !== expected) {
    fail(`训练结束后的自主放松显示状态错误：期望 ${expected ? "显示" : "隐藏"}`);
  }
  return snapshot;
}

export async function auditSummaryScore(tab, before, after) {
  const snapshot = await auditSnapshot(tab, {
    stage: "康复总结",
    required: ["本次康复总结", "处理记录", `${before}`, `${after}`],
    allowTerminal: true,
  });
  if (!new RegExp(`generic: "${before}"[\\s\\S]{0,160}strong: "${after}"`).test(snapshot)) {
    fail(`总结未使用最新主诉分数：期望 ${before}→${after}`);
  }
  return snapshot;
}

export async function auditCheckpoint(tab, expected) {
  const snapshot = await auditSnapshot(tab, expected);
  await auditNoRuntimeErrors(tab);
  return snapshot;
}
