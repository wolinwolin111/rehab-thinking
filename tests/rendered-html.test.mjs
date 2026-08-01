import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the RehabMind workflow", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>RehabMind｜教练康复思路助手<\/title>/i);
  assert.match(html, /症状信息收集/);
  assert.match(html, /先确认/);
  assert.match(html, /<span>检查<\/span>/);
  assert.match(html, /<span>处理<\/span>/);
  assert.match(html, /<span>训练复查<\/span>/);
  assert.match(html, /也可以输入系统里没有的情况/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("ships gated active-passive, chief-complaint and follow-up pathways", async () => {
  const [modules, system, complaintRules] = await Promise.all([
    readFile(new URL("../app/first-batch-modules.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/rehab-system.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/chief-complaint-rules.ts", import.meta.url), "utf8"),
  ]);
  for (const name of ["膝关节", "踝关节与足部", "腰椎、骨盆与髋"]) assert.match(modules, new RegExp(name));
  for (const phrase of ["activeHow", "passiveHow", "muscleCandidates", "jointCandidates", "trainingTags", "groups", "reps", "return:"]) assert.match(modules, new RegExp(phrase));
  assert.match(system, /disabled=\{index > maxUnlocked\}/);
  for (const phrase of ["先做主动活动", "再轻柔比较被动活动", "肌肉控制路径", "关节＋肌肉路径", "疼痛动作排查", "特殊检查", "始终复测主诉", "明显改善，保留并结束", "部分改善，保留后继续", "不要求当场消失", "不做当场反复测试", "视频演示 · 后续上传", "第二次康复", "第三次及以后", "记录已保存到当前设备"]) assert.match(system, new RegExp(phrase));
  for (const phrase of ["膝内侧", "下楼/下台阶", "大腿外侧链", "鹅足肌群", "内收肌与内侧链", "胫骨前肌、胫骨后肌与足部支撑", "髌骨活动与对位", "踝背屈、距骨与足部关节"]) assert.match(complaintRules, new RegExp(phrase));
});
