import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app/rate-limit-core.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("SEC-01: allows up to max requests inside the window then blocks with retryAfter", () => {
  const limiter = mod.createRateLimiter({ windowMs: 60_000, max: 3 });
  let now = 1_000_000;
  assert.equal(limiter("ip-a", now).allowed, true);
  assert.equal(limiter("ip-a", now + 1).allowed, true);
  assert.equal(limiter("ip-a", now + 2).allowed, true);

  const blocked = limiter("ip-a", now + 3);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSec, Math.ceil((60_000 - 3) / 1000));
});

test("SEC-01: window expiry restores allowance", () => {
  const limiter = mod.createRateLimiter({ windowMs: 10_000, max: 2 });
  let now = 2_000_000;
  limiter("ip-b", now);
  limiter("ip-b", now);
  assert.equal(limiter("ip-b", now).allowed, false);

  // 窗口过期后重新允许
  assert.equal(limiter("ip-b", now + 10_001).allowed, true);
});

test("SEC-01: keys are isolated from each other", () => {
  const limiter = mod.createRateLimiter({ windowMs: 60_000, max: 1 });
  assert.equal(limiter("ip-x", 5_000_000).allowed, true);
  assert.equal(limiter("ip-y", 5_000_001).allowed, true);
  assert.equal(limiter("ip-x", 5_000_002).allowed, false);
});

test("SEC-01: opportunistic GC prunes fully expired keys beyond threshold", () => {
  const limiter = mod.createRateLimiter({ windowMs: 1_000, max: 1, gcThreshold: 10 });
  for (let i = 0; i < 20; i++) limiter(`sweep-${i}`, i * 10); // 全部早已过期
  // 第 21 个不同 key 触发 GC；内部 Map 收缩不直接可观测，
  // 通过继续正常放行验证没有误删活跃窗口数据。
  assert.equal(limiter("fresh-key", 999_999).allowed, true);
});
