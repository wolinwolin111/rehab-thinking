// 源码字符串合同测试的共享断言助手（批次 4）。
// 目标：合同失败时输出「期望片段 vs 实际最接近片段」的精准差异，
// 取代 assert.match 失败时整文件数十万字符的全文转储。
import assert from "node:assert/strict";

/** 在 source 中查找 snippet 的最佳匹配位置；找不到时返回 -1。 */
function bestMatchIndex(source, needle) {
  return source.indexOf(needle);
}

/**
 * 断言 source 包含 expected 片段；失败时输出期望片段与实际文件中最接近的行上下文。
 * @param {string} source 组件源码全文
 * @param {{file: string, snippet: string}} item 期望项，file 仅用于报告定位
 * @param {string} oracle 合同出处（如 "SAVE-01 验收文案表"），写入失败信息
 */
export function expectSourceContains(source, item, oracle = "") {
  const { file, snippet } = item;
  if (bestMatchIndex(source, snippet) >= 0) return;
  const sourceLines = source.split(/\r?\n/);
  const snippetHead = snippet.split(/\r?\n/)[0].trim().slice(0, 24);
  let nearestLine = -1;
  let nearestScore = Number.POSITIVE_INFINITY;
  for (let i = 0; i < sourceLines.length; i += 1) {
    const line = sourceLines[i];
    const score = levenshteinHead(line, snippetHead);
    if (score < nearestScore) {
      nearestScore = score;
      nearestLine = i;
    }
  }
  const context = sourceLines
    .slice(Math.max(0, nearestLine - 2), nearestLine + 3)
    .map((line, offset) => `${Math.max(0, nearestLine - 2) + offset + 1}: ${line.trim().slice(0, 120)}`)
    .join("\n  ");
  const hint = nearestScore <= Math.max(2, Math.floor(snippetHead.length / 3))
    ? `\n  疑似近似存在于第 ${nearestLine + 1} 行附近（可能有细微改词）：\n  ${context}`
    : `\n  全文未找到相似内容（最近邻第 ${nearestLine + 1} 行）：\n  ${context}`;
  assert.fail(
    `[源码合同] ${file} 缺少期望片段${oracle ? `（${oracle}）` : ""}\n`
    + `  期望包含：${JSON.stringify(snippet.length > 160 ? `${snippet.slice(0, 157)}...` : snippet)}`
    + hint,
  );
}

/**
 * 断言 source 不包含 forbidden 片段（禁止文案/禁止接线）。
 */
export function expectSourceNotContains(source, item, oracle = "") {
  const { file, snippet } = item;
  if (bestMatchIndex(source, snippet) < 0) return;
  const index = bestMatchIndex(source, snippet);
  const line = source.slice(0, index).split(/\r?\n/).length;
  assert.fail(
    `[源码合同] ${file} 出现禁止片段${oracle ? `（${oracle}）` : ""}\n`
    + `  禁止片段：${JSON.stringify(snippet.length > 120 ? `${snippet.slice(0, 117)}...` : snippet)}\n`
    + `  位置：第 ${line} 行`,
  );
}

function levenshteinHead(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m || !n) return Math.max(m, n);
  let previous = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i += 1) {
    const current = [i];
    for (let j = 1; j <= n; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[n];
}
